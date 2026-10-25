# Baigamats

Bare React Native (0.88) mobile application for **Baigamats** (`com.baigamats.app`), structured with Atomic Design UI primitives alongside feature modules.

## Technology Stack

- **Platform:** Bare React Native `0.88.0` (New Architecture / Fabric & Hermes enabled)
- **Language:** TypeScript (`strict: true`)
- **Styling & Design System:** NativeWind `4.2.7` + Tailwind CSS `3.4`, driven by dynamic runtime CSS variables (`src/theme/colors.ts` & `src/theme/ThemeProvider.tsx`) enforcing the light/dark brand palette and WCAG AA contrast ratios
- **Navigation:** React Navigation v7 (`@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens`)
- **Client State:** Zustand v5 (`src/features/preferences/store/preferencesStore.ts`)
- **Server State & Network:** TanStack Query v5 + `@react-native-community/netinfo` (`src/services/api/queryClient.ts`)
- **Validation & API Boundary:** Zod v4 (`src/services/api/client.ts`)
- **Icons:** `react-native-heroicons` + `react-native-svg`
- **Testing:** Jest + React Native Testing Library v14

## Project Structure

```text
src/
  app/
    navigation/      # RootNavigator and typed navigation param lists
    providers/       # AppProviders (SafeArea, QueryClient, ThemeProvider)
    App.tsx          # Root application component
  components/
    atoms/           # Primitive UI components (AppText, Button)
    templates/       # Reusable screen layouts (ScreenTemplate)
  features/
    home/
      screens/       # HomeScreen
    preferences/
      components/    # ThemePreferenceSelector
      store/         # Zustand preferences store
  services/
    api/             # Centralized API client (Zod-validated) & QueryClient setup
  theme/             # Brand colour tokens, WCAG utilities, and ThemeProvider
```

## Getting Started

### Prerequisites

- **Node.js** `>= 22.11.0`
- **pnpm** (`nodeLinker: hoisted` configured in `pnpm-workspace.yaml`)
- **JDK 21** & **Android SDK** (for Android builds)
- **Xcode** & **CocoaPods** (on macOS, for iOS builds)

### Install Dependencies

```sh
pnpm install
```

### Quality Checks

```sh
pnpm run typecheck   # TypeScript strict check (tsc --noEmit)
pnpm run lint        # ESLint
pnpm test            # Jest unit & component test suites
```

### Run the App

1. Start Metro:
   ```sh
   pnpm start
   ```
2. Run on Android:
   ```sh
   pnpm android
   ```
3. Run on iOS (macOS only):
   ```sh
   bundle install
   cd ios && bundle exec pod install && cd ..
   pnpm ios
   ```
