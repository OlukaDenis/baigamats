const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Populate process.env from appropriate .env file if present
const lifecycle = process.env.npm_lifecycle_event || '';
let defaultEnv = '.env';
if (lifecycle.includes('horeca:staging')) defaultEnv = '.env.horeca.staging';
else if (lifecycle.includes('horeca:release')) defaultEnv = '.env.horeca.prod';
else if (lifecycle.includes('horeca')) defaultEnv = '.env.horeca.dev';
else if (lifecycle.includes('sacco:staging')) defaultEnv = '.env.sacco.staging';
else if (lifecycle.includes('sacco:release')) defaultEnv = '.env.sacco.prod';
else if (lifecycle.includes('sacco')) defaultEnv = '.env.sacco.dev';

const envFileName = process.env.ENVFILE || (fs.existsSync(path.resolve(__dirname, defaultEnv)) ? defaultEnv : '.env');
const envFilePath = path.resolve(__dirname, envFileName);
if (fs.existsSync(envFilePath)) {
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native-metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@sacco': path.resolve(__dirname, 'src/apps/sacco'),
      '@horeca': path.resolve(__dirname, 'src/apps/horeca'),
    },
  },
};

module.exports = withNativeWind(mergeConfig(getDefaultConfig(__dirname), config), {
  input: './global.css',
});
