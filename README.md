# Baigamats

Bare React Native (0.88) mobile application supporting two application variants (**SACCO** & **HORECA**) across multiple environments (**dev**, **staging**, **prod**), structured with Atomic Design UI primitives alongside feature modules.

---

---

## Flavor Version Tracking (pp.versions.json)

App versions for each flavor and environment are centrally tracked in [pp.versions.json](file:///d:/Projects/MobileProjects/baigamats/app.versions.json). Gradle automatically reads this file on every build and stamps the exact ersionCode and ersionName onto the resulting APKs and AAB bundles.

`json
{
  "sacco": {
    "dev":     { "versionCode": 100, "versionName": "1.0.0-dev.1" },
    "staging": { "versionCode": 101, "versionName": "1.0.0-rc.1" },
    "prod":    { "versionCode": 102, "versionName": "1.0.0" }
  },
  "horeca": {
    "dev":     { "versionCode": 200, "versionName": "1.0.0-dev.1" },
    "staging": { "versionCode": 201, "versionName": "1.0.0-rc.1" },
    "prod":    { "versionCode": 202, "versionName": "1.0.0" }
  }
}
`

To bump the version for any flavor/environment before release, edit pp.versions.json.

---

## Swift Build Scripts

Use the preconfigured build scripts to rapidly build APKs and bundles without needing to memorize Gradle commands:

### Using pnpm run build:*
`ash
# Build HORECA Release APK
pnpm run build:apk:horeca

# Build HORECA Release App Bundle (.aab for Play Store)
pnpm run build:bundle:horeca

# Build SACCO Release APK
pnpm run build:apk:sacco

# Build SACCO Release App Bundle (.aab for Play Store)
pnpm run build:bundle:sacco

# Build Staging or Dev APKs
pnpm run build:apk:horeca:staging
pnpm run build:apk:horeca:dev
pnpm run build:apk:sacco:staging
pnpm run build:apk:sacco:dev

# Build All Variants in One Step
pnpm run build:all:apk
pnpm run build:all:bundle
`

### Direct Script Usage
`ash
# Using Node cross-platform CLI runner:
node scripts/build-android.js --app horeca --env prod --type apk
node scripts/build-android.js --app sacco --env prod --type bundle --clean

# Using PowerShell (Windows):
.\scripts\build.ps1 -App horeca -Env prod -Type apk
.\scripts\build.ps1 -App sacco -Env prod -Type bundle -Clean
`

## Technology Stack

- **Platform:** Bare React Native `0.88.0` (New Architecture / Fabric & Hermes enabled)
- **Language:** TypeScript (`strict: true`)
- **Styling & Design System:** NativeWind `4.2.7` + Tailwind CSS `3.4`, driven by dynamic runtime CSS variables enforcing the brand palette and WCAG AA contrast ratios
- **Navigation:** React Navigation v7 (`@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `react-native-screens`)
- **Client State:** Zustand v5
- **Server State & Offline Persistence:** TanStack Query v5 + `@react-native-community/netinfo` + `react-native-keychain`
- **Validation & API Boundary:** Zod v4
- **Icons:** `react-native-heroicons` + `react-native-svg`
- **Testing:** Jest + React Native Testing Library v14

---

## Product Flavors & Variants

The Android project is configured using two Gradle `flavorDimensions`:
1. **`app`**: Application variant
   - **`sacco`**: Baigamats Mobile Sacco application (`com.baigamats.app`)
   - **`horeca`**: Baigamats HORECA POS application (`com.baigamats.horeca`)
2. **`env`**: Target environment
   - **`dev`**: Developer build (`.dev` suffix)
   - **`staging`**: Staging/QA test build (`.staging` suffix)
   - **`prod`**: Production store-ready build (no suffix)

### Flavor Combinations Table

| Flavor Variant | Build Type | Output Target | Application ID | App Name |
| :--- | :--- | :--- | :--- | :--- |
| `saccoDevDebug` | `Debug` | Development testing | `com.baigamats.app.dev` | Baigamats |
| `saccoStagingRelease` | `Release` | QA / Staging testing | `com.baigamats.app.staging` | Baigamats |
| `saccoProdRelease` | `Release` | Google Play Store | `com.baigamats.app` | Baigamats |
| `horecaDevDebug` | `Debug` | Development testing | `com.baigamats.horeca.dev` | Baigamats HORECA |
| `horecaStagingRelease`| `Release` | QA / Staging testing | `com.baigamats.horeca.staging` | Baigamats HORECA |
| `horecaProdRelease` | `Release` | Google Play Store | `com.baigamats.horeca` | Baigamats HORECA |

---

## Building APKs & App Bundles (AAB)

All Gradle commands can be run from the root directory or from the `android/` subfolder.

> [!TIP]
> On Windows PowerShell, invoke Gradle using `.\android\gradlew.bat` or `cd android && .\gradlew`.  
> On macOS / Linux, use `./android/gradlew` or `cd android && ./gradlew`.

### 1. Building Standalone APKs (for Direct Device Install / QA)

To build universal APK files for testing without publishing to Google Play:

#### **SACCO Variant APKs**
```bash
# Build SACCO Dev APK
cd android && ./gradlew assembleSaccoDevDebug

# Build SACCO Staging APK
cd android && ./gradlew assembleSaccoStagingRelease

# Build SACCO Production APK
cd android && ./gradlew assembleSaccoProdRelease
```
*Generated APK location:*  
`android/app/build/outputs/apk/sacco[Dev|Staging|Prod]/[debug|release]/`

#### **HORECA Variant APKs**
```bash
# Build HORECA Dev APK
cd android && ./gradlew assembleHorecaDevDebug

# Build HORECA Staging APK
cd android && ./gradlew assembleHorecaStagingRelease

# Build HORECA Production APK
cd android && ./gradlew assembleHorecaProdRelease
```
*Generated APK location:*  
`android/app/build/outputs/apk/horeca[Dev|Staging|Prod]/[debug|release]/`

---

### 2. Building Android App Bundles (.aab) (for Google Play Console)

Google Play Store requires Android App Bundle (`.aab`) format for publishing:

#### **SACCO Production App Bundle**
```bash
cd android && ./gradlew bundleSaccoProdRelease
```
*Generated Bundle location:*  
`android/app/build/outputs/bundle/saccoProdRelease/app-sacco-prod-release.aab`

#### **HORECA Production App Bundle**
```bash
cd android && ./gradlew bundleHorecaProdRelease
```
*Generated Bundle location:*  
`android/app/build/outputs/bundle/horecaProdRelease/app-horeca-prod-release.aab`

#### **Staging App Bundles (Internal Testing Track)**
```bash
# SACCO Staging Bundle
cd android && ./gradlew bundleSaccoStagingRelease

# HORECA Staging Bundle
cd android && ./gradlew bundleHorecaStagingRelease
```

---

### 3. Quick Build All Command

To compile all release APKs across all flavors in one step:
```bash
cd android && ./gradlew assembleRelease
```

To compile all App Bundles across all flavors in one step:
```bash
cd android && ./gradlew bundleRelease
```

---

## Running in Development

### Run Specific Flavor on Connected Device / Emulator

Use the preconfigured npm/pnpm run scripts:

```sh
# Start Metro bundler
pnpm start

# Run SACCO Flavors
pnpm run android:sacco           # Sacco Dev Debug
pnpm run android:sacco:staging   # Sacco Staging Debug
pnpm run android:sacco:release   # Sacco Prod Release

# Run HORECA Flavors
pnpm run android:horeca          # HORECA Dev Debug
pnpm run android:horeca:staging  # HORECA Staging Debug
pnpm run android:horeca:release  # HORECA Prod Release
```

For iOS (macOS only):
```sh
pnpm run ios:sacco               # Sacco Scheme
pnpm run ios:horeca              # HORECA Scheme
```

---

## Quality & Verification

```sh
pnpm run typecheck   # TypeScript strict check (tsc --noEmit)
pnpm run lint        # ESLint
pnpm test            # Jest unit & component test suites
```

---

## Production Release Signing Configuration

Release builds are configured in `android/app/build.gradle`. For local development and test builds, they utilize `debug.keystore`.

Before deploying to Google Play Store:
1. Generate your production release keystore:
   ```bash
   keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Place the keystore in `android/app/` and reference it via Gradle properties or environment variables (`MYAPP_UPLOAD_STORE_FILE`, `MYAPP_UPLOAD_KEY_ALIAS`, etc.).
3. Update `signingConfigs.release` in `android/app/build.gradle` accordingly.
