# Stalk Mobile App — Project TODO & Roadmap

## 📌 Features & Development Status

---

### 1. Real WebRTC Audio & Video Calling Implementation
- **Status:** ✅ **COMPLETED (Ready for APK Build & Testing)**
- **What Was Implemented:**
  - **Native Packages Installed:** `react-native-webrtc` and `@config-plugins/react-native-webrtc`.
  - **App Permissions Configured (`app.json`):** `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `BLUETOOTH`, `BLUETOOTH_CONNECT`, Android package `com.stalk.app`, iOS descriptions, and WebRTC config plugin.
  - **WebRTC Service Engine (`src/services/webrtc.service.ts`):**
    - Google STUN servers configured (`stun.l.google.com:19302`, `stun1.l.google.com:19302`, `stun2.l.google.com:19302`).
    - Media acquisition: `mediaDevices.getUserMedia` for microphone and HD front camera.
    - PeerConnection lifecycle: real SDP offer/answer generation, local/remote descriptions, and ICE candidate exchange.
    - Hardware controls: real microphone mute/unmute, camera on/off, and front ⇄ back camera flipping (`_switchCamera`).
    - Safe runtime fallback: ensures zero crashes when developing in standard Expo Go.
  - **Store Integration (`src/store/call.store.ts` & `src/store/socket.store.ts`):**
    - Real WebRTC streams (`localStream`, `remoteStream`) managed in Zustand.
    - Signaling wired for `call_user`, `incoming_call`, `answer_call`, `call_accepted`, `ice_candidate`, `reject_call`, and `end_call`.
  - **Call Screen UI (`src/app/call.tsx`):**
    - Full-screen `<RTCView>` rendering partner's live video stream.
    - Floating Picture-in-Picture (PIP) `<RTCView>` previewing self camera with camera flip button.
    - Floating call tag and duration timer.
    - Center animated audio pulse wave for audio calls.
    - Glassmorphism bottom control island with Mute, Video, Speaker, and End Call buttons.

#### 🚀 How to Build Standalone APK:
1. **Prebuild Native Android Project:**
   ```bash
   npx expo prebuild --platform android
   ```
2. **Build and Run on Connected Physical Phone:**
   ```bash
   npx expo run:android --device
   ```
3. **Or Build Standalone APK via EAS:**
   ```bash
   npx eas-cli build -p android --profile preview
   ```

---

### 2. Standalone Android APK Build & Startup Crash Resolution
- **Status:** ✅ **COMPLETED & DEPLOYED (Build #2 Success)**
- **Issues Resolved:**
  - Removed unconfigured `expo-notifications` (missing `google-services.json` caused fatal `Default FirebaseApp is not initialized` crash on startup).
  - Made `react-native-webrtc` native module lazy-loaded to prevent native binding stalls during boot.
  - Fortified `SplashScreen` with promise rejection catchers and safety timeout fallback.
  - Added explicit environment variables into `eas.json` for reliable build-time inlining.
- **Latest APK Download:** [Download stalk-app.apk](https://expo.dev/artifacts/eas/RmLogvYUPP8XojeKtzsxrOW-Nx5LJb3GWFtBia-yfcc.apk)

---

### 3. Push Notifications (FCM / Expo Notifications)
- **Status:** 🟡 Planned (Requires Firebase project registration & google-services.json)
- Integration of remote push notifications for incoming messages and calls when app is in the background or killed.

---

### 4. Story / Status Uploads
- **Status:** ⚪ Backlog
- 24-hour disappearing photo & video stories feed at the top of the home screen.
