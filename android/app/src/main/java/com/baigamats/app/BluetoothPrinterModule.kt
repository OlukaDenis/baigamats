package com.baigamats.app

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.IOException
import java.io.OutputStream
import java.util.UUID
import java.util.concurrent.Executors

/**
 * Native Bluetooth Classic (SPP / RFCOMM) Thermal Printer Module for ESC/POS printers.
 * Supports listing paired (bonded) Bluetooth printers, opening/reusing RFCOMM sockets,
 * and streaming chunked ESC/POS byte payloads off the main thread.
 */
class BluetoothPrinterModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "BluetoothPrinterModule"
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private const val CHUNK_SIZE = 256
    private const val CHUNK_DELAY_MS = 15L
  }

  private val ioExecutor = Executors.newSingleThreadExecutor()
  private val socketLock = Any()

  @Volatile private var activeSocket: BluetoothSocket? = null
  @Volatile private var activeOutputStream: OutputStream? = null
  @Volatile private var connectedAddress: String? = null

  override fun getName(): String = NAME

  private fun getBluetoothAdapter(): BluetoothAdapter? {
    val manager =
      reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    return manager?.adapter
  }

  private fun hasConnectPermission(): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      return ContextCompat.checkSelfPermission(
        reactContext,
        android.Manifest.permission.BLUETOOTH_CONNECT,
      ) == PackageManager.PERMISSION_GRANTED
    }
    return true
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun getPairedDevices(promise: Promise) {
    ioExecutor.execute {
      try {
        val adapter = getBluetoothAdapter()
        if (adapter == null) {
          promise.reject("BT_UNSUPPORTED", "Bluetooth is not supported on this device.")
          return@execute
        }
        if (!adapter.isEnabled) {
          promise.reject("BT_DISABLED", "Bluetooth is turned off. Please enable Bluetooth.")
          return@execute
        }
        if (!hasConnectPermission()) {
          promise.reject(
            "BT_PERMISSION_DENIED",
            "Bluetooth Connect permission is required to list paired printers.",
          )
          return@execute
        }

        val bondedDevices = adapter.bondedDevices ?: emptySet<BluetoothDevice>()
        val list = Arguments.createArray()

        for (device in bondedDevices) {
          val map = Arguments.createMap()
          val address = device.address ?: ""
          val name = device.name ?: "Bluetooth Device ($address)"
          val majorDeviceClass = device.bluetoothClass?.majorDeviceClass ?: 0
          // 0x0600 (1536) is IMAGING (Printers, Scanners, etc.) in Bluetooth CoD
          val isImagingClass = majorDeviceClass == 1536
          val looksLikePrinter =
            isImagingClass ||
              name.contains("print", ignoreCase = true) ||
              name.contains("pos", ignoreCase = true) ||
              name.contains("mtp", ignoreCase = true) ||
              name.contains("rpp", ignoreCase = true) ||
              name.contains("xp-", ignoreCase = true) ||
              name.contains("xprinter", ignoreCase = true) ||
              name.contains("sunmi", ignoreCase = true) ||
              name.contains("innerprinter", ignoreCase = true) ||
              name.contains("bt-", ignoreCase = true) ||
              name.contains("tm-", ignoreCase = true) ||
              name.contains("star", ignoreCase = true) ||
              name.contains("bixolon", ignoreCase = true)

          map.putString("address", address)
          map.putString("name", name)
          map.putBoolean("isPrinterCandidate", looksLikePrinter)
          map.putBoolean(
            "isConnected",
            connectedAddress.equals(address, ignoreCase = true) && activeSocket?.isConnected == true,
          )
          list.pushMap(map)
        }

        promise.resolve(list)
      } catch (e: Exception) {
        promise.reject("BT_LIST_ERROR", e.message ?: "Failed to query paired Bluetooth devices.", e)
      }
    }
  }

  @SuppressLint("MissingPermission")
  private fun connectInternal(address: String): BluetoothSocket {
    synchronized(socketLock) {
      val normalized = address.trim().uppercase()
      val existing = activeSocket
      if (
        existing != null &&
          existing.isConnected &&
          connectedAddress.equals(normalized, ignoreCase = true) &&
          activeOutputStream != null
      ) {
        return existing
      }

      closeSocketLocked()

      val adapter =
        getBluetoothAdapter()
          ?: throw IOException("Bluetooth adapter is unavailable on this terminal.")
      if (!adapter.isEnabled) {
        throw IOException("Bluetooth is turned off. Please enable Bluetooth in Settings.")
      }
      if (!hasConnectPermission()) {
        throw SecurityException("BLUETOOTH_CONNECT permission has not been granted.")
      }

      if (adapter.isDiscovering) {
        adapter.cancelDiscovery()
      }

      val device: BluetoothDevice =
        try {
          adapter.getRemoteDevice(normalized)
        } catch (e: IllegalArgumentException) {
          throw IOException("Invalid Bluetooth MAC address: $normalized")
        }

      var socket: BluetoothSocket? = null
      var lastException: Exception? = null

      // 1. Standard secure RFCOMM SPP socket
      try {
        socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
        socket.connect()
      } catch (secureErr: Exception) {
        lastException = secureErr
        try {
          socket?.close()
        } catch (_: Exception) {}
        socket = null
      }

      // 2. Fallback: Insecure RFCOMM SPP socket (common on portable 58mm/80mm ESC/POS printers)
      if (socket == null || !socket.isConnected) {
        try {
          socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID)
          socket.connect()
        } catch (insecureErr: Exception) {
          lastException = insecureErr
          try {
            socket?.close()
          } catch (_: Exception) {}
          socket = null
        }
      }

      // 3. Fallback: Reflection on channel 1 for legacy/quirky SPP firmware
      if (socket == null || !socket.isConnected) {
        try {
          val method =
            device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
          socket = method.invoke(device, 1) as BluetoothSocket
          socket.connect()
        } catch (fallbackErr: Exception) {
          try {
            socket?.close()
          } catch (_: Exception) {}
          throw IOException(
            "Unable to open Bluetooth printer connection (${lastException?.message ?: fallbackErr.message}). Ensure the printer is powered on and within range.",
          )
        }
      }

      val connected =
        socket ?: throw IOException("Failed to establish Bluetooth RFCOMM socket to $normalized.")
      activeSocket = connected
      activeOutputStream = connected.outputStream
      connectedAddress = normalized
      return connected
    }
  }

  private fun closeSocketLocked() {
    try {
      activeOutputStream?.flush()
    } catch (_: Exception) {}
    try {
      activeOutputStream?.close()
    } catch (_: Exception) {}
    try {
      activeSocket?.close()
    } catch (_: Exception) {}
    activeOutputStream = null
    activeSocket = null
    connectedAddress = null
  }

  @ReactMethod
  fun connect(address: String, promise: Promise) {
    ioExecutor.execute {
      try {
        val socket = connectInternal(address)
        val result = Arguments.createMap()
        result.putString("address", connectedAddress)
        result.putString("name", try {
          socket.remoteDevice?.name ?: address
        } catch (_: SecurityException) {
          address
        })
        result.putBoolean("connected", socket.isConnected)
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("BT_CONNECT_ERROR", e.message ?: "Failed to connect to Bluetooth printer.", e)
      }
    }
  }

  @ReactMethod
  fun disconnect(promise: Promise) {
    ioExecutor.execute {
      synchronized(socketLock) {
        closeSocketLocked()
      }
      promise.resolve(true)
    }
  }

  @ReactMethod
  fun isConnected(address: String?, promise: Promise) {
    ioExecutor.execute {
      synchronized(socketLock) {
        val connected =
          activeSocket?.isConnected == true &&
            (address.isNullOrBlank() || connectedAddress.equals(address.trim(), ignoreCase = true))
        promise.resolve(connected)
      }
    }
  }

  /**
   * Connects (or reuses an open socket) to `address` and writes a Base64-encoded ESC/POS byte array
   * in 256-byte chunks with a short inter-chunk pause to prevent thermal printer buffer overflow.
   * Automatically retries once if a stale idle socket threw a broken pipe IOException on first write.
   */
  @ReactMethod
  fun writeBase64(address: String, base64Payload: String, promise: Promise) {
    ioExecutor.execute {
      try {
        val bytes = Base64.decode(base64Payload, Base64.DEFAULT)
        if (bytes.isEmpty()) {
          promise.resolve(true)
          return@execute
        }

        try {
          writeChunkedLocked(address, bytes)
        } catch (firstWriteError: IOException) {
          // If the printer had dropped an idle socket, force close and reconnect once
          synchronized(socketLock) {
            closeSocketLocked()
          }
          writeChunkedLocked(address, bytes)
        }

        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("BT_WRITE_ERROR", e.message ?: "Failed to send print data to printer.", e)
      }
    }
  }

  private fun writeChunkedLocked(address: String, bytes: ByteArray) {
    synchronized(socketLock) {
      connectInternal(address)
      val out =
        activeOutputStream
          ?: throw IOException("Printer output stream is unavailable after connection.")

      var offset = 0
      while (offset < bytes.size) {
        val length = minOf(CHUNK_SIZE, bytes.size - offset)
        out.write(bytes, offset, length)
        out.flush()
        offset += length
        if (offset < bytes.size) {
          try {
            Thread.sleep(CHUNK_DELAY_MS)
          } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
          }
        }
      }
      // Give the thermal head and serial buffer a brief moment to drain before returning
      try {
        Thread.sleep(60L)
      } catch (_: InterruptedException) {
        Thread.currentThread().interrupt()
      }
    }
  }
}
