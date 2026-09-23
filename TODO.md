# Stalk Mobile App — Project TODO & Roadmap

## 📌 Pending High-Priority Features

---

### 1. Real WebRTC Audio & Video Calling Implementation
- **Status:** Planned / Pending Custom Dev Build
- **Why Pending:** The app is currently running in **Expo Go**. WebRTC requires low-level C++ & Java native drivers (`react-native-webrtc`), which are **not supported in standard Expo Go**. This will be implemented once the app is ready for a **Development Build / Custom APK** (`expo-dev-client` / `npx expo run:android`).

#### Current State:
- Socket.io signaling works (Call Ringing, Incoming Call Notification, Accept/Reject/End flow, Call Duration Timer).
- `call.store.ts` sends dummy SDP string (`{ type: "offer", sdp: "mobile-signaling" }`).
- Screen `src/app/call.tsx` currently shows user avatar placeholder with mock Mute/Video/Speaker toggles.

#### Implementation Steps for APK Phase:
1. **Install Native WebRTC Dependencies:**
   ```bash
   npx expo install react-native-webrtc @config-plugins/react-native-webrtc expo-dev-client
   ```
2. **Configure Permissions in `app.json`:**
   - Android: `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `BLUETOOTH`, `BLUETOOTH_CONNECT`.
   - iOS: `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`.
   - Add `@config-plugins/react-native-webrtc` to `plugins`.
3. **WebRTC Core Setup (`src/services/webrtc.service.ts` or `src/store/call.store.ts`):**
   - Initialize `RTCPeerConnection` with STUN servers:
     ```typescript
     const ICE_SERVERS = {
       iceServers: [
         { urls: "stun:stun.l.google.com:19302" },
         { urls: "stun:stun1.l.google.com:19302" },
         { urls: "stun:stun2.l.google.com:19302" },
       ],
     };
     ```
   - Capture local media:
     ```typescript
     const localStream = await mediaDevices.getUserMedia({
       audio: true,
       video: callType === "video" ? { facingMode: "user" } : false,
     });
     ```
   - Exchange real SDP offer/answer through Socket.io (`offer`, `answer`).
   - Exchange real ICE candidates (`ice_candidate`).
   - Listen to `pc.ontrack` to receive and store `remoteStream`.
4. **Call UI Integration (`src/app/call.tsx`):**
   - Render `<RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />` for full-screen remote video.
   - Render floating PIP `<RTCView streamURL={localStream.toURL()} style={styles.localVideoPip} zOrder={1} />` for self camera preview.
   - For audio calls, display audio waveform / live pulse indicator with real audio active.
5. **Hardware Audio Controls:**
   - **Mute/Unmute:** Toggle `localStream.getAudioTracks()[0].enabled`.
   - **Video On/Off:** Toggle `localStream.getVideoTracks()[0].enabled`.
   - **Speakerphone / Earpiece Toggle:** Route audio using native audio manager or `InCallManager`.
6. **Build & Test:**
   - Run `npx expo prebuild`
   - Run `npx expo run:android` or generate APK with EAS Build.
   - Install APK on two physical Android phones and test live end-to-end voice and video.

---

### 2. Push Notifications (FCM / Expo Notifications)
- **Status:** Planned
- Integration of remote push notifications for incoming messages and calls when app is in the background or killed.

---

### 3. Story / Status Uploads
- **Status:** Backlog
- 24-hour disappearing photo & video stories feed at the top of the home screen.

