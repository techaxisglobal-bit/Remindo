# Smart App Build Instructions

This project has been converted to support cross-platform deployment on **Windows**, **macOS**, and **Android**.

## Prerequisites

- **Node.js**: Ensure Node.js is installed.
- **Android Studio**: Required for building the final Android APK.

## Desktop (Windows & macOS)

The desktop application is built using **Electron**.

### 1. Development
To run the desktop app in development mode:
```bash
npm run electron:dev
```

### 2. Build via Command Line
To build the installers for your current platform:
```bash
npm run electron:build
```
- **macOS**: Creates a `.dmg` file in `release/`.
- **Windows**: Creates an `.exe` installer. If you are on a Mac, you can try `npx electron-builder --win --x64` to build for Windows x64.

## Android

The Android application is built using **Capacitor**.

### 1. sync
Sync the latest web build to the Android project:
```bash
npm run build
npm run android:sync
```

### 2. Build APK
Open the Android project in Android Studio:
```bash
npm run android:open
```
- In Android Studio, go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
- The APK will be generated in `android/app/build/outputs/apk/debug/`.

Alternatively, if you have the Android SDK and Gradle configured in your terminal:
```bash
cd android
./gradlew assembleDebug
```
The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.

### 3. Transfer & Install on Device
Once the APK is built (via Android Studio or Gradle):
1.  **Locate the file**: Go to `android/app/build/outputs/apk/debug/app-debug.apk`.
2.  **Transfer to Phone**:
    - **USB**: Connect your phone to your PC, select "File Transfer" mode on the phone, and copy the `.apk` file to your phone's "Downloads" folder.
    - **Cloud**: Upload the file to Google Drive/Dropbox and download it on your phone.
3.  **Install**:
    - On your phone, open your File Manager app.
    - Navigate to the file and tap to install.
    - *Note: You may need to allow "Install from Unknown Sources" in your phone settings.*
