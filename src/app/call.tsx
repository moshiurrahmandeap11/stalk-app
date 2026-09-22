import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Volume2,
  VolumeX,
  Lock,
  ChevronDown,
} from "lucide-react-native";
import { useCallStore } from "../store/call.store";

const { width } = Dimensions.get("window");

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function CallScreen() {
  const router = useRouter();
  const {
    callState,
    callType,
    partner,
    callDuration,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
  } = useCallStore();

  const pulseRing1 = useSharedValue(1);
  const pulseRing2 = useSharedValue(1);

  useEffect(() => {
    pulseRing1.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1200 }),
        withTiming(1.0, { duration: 1200 })
      ),
      -1,
      true
    );

    setTimeout(() => {
      pulseRing2.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 1400 }),
          withTiming(1.0, { duration: 1400 })
        ),
        -1,
        true
      );
    }, 400);
  }, []);

  // Auto exit screen when call ends or resets
  useEffect(() => {
    if (callState === "idle") {
      router.back();
    }
  }, [callState]);

  const animatedRingStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseRing1.value }],
    opacity: 1.5 - pulseRing1.value,
  }));

  const animatedRingStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseRing2.value }],
    opacity: 1.6 - pulseRing2.value,
  }));

  const avatarUri =
    partner?.avatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300";

  const getStatusText = () => {
    switch (callState) {
      case "calling":
        return "Ringing...";
      case "incoming":
        return "Incoming Call...";
      case "connected":
        return formatDuration(callDuration);
      case "ended":
        return "Call Ended";
      default:
        return "Connecting...";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.minimizeBtn} onPress={() => router.back()}>
          <ChevronDown size={28} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.securityBadge}>
          <Lock size={12} color="#10B981" />
          <Text style={styles.securityText}>End-to-end encrypted</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Center Avatar & Info */}
      <View style={styles.centerSection}>
        <View style={styles.avatarContainer}>
          {callState !== "ended" ? (
            <>
              <Animated.View style={[styles.pulseRingOuter, animatedRingStyle2]} />
              <Animated.View style={[styles.pulseRingInner, animatedRingStyle1]} />
            </>
          ) : null}
          <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
        </View>

        <Text style={styles.partnerName}>{partner?.name || "User"}</Text>
        <Text style={[styles.statusText, callState === "connected" && styles.connectedText]}>
          {getStatusText()}
        </Text>
      </View>

      {/* Bottom Control Bar */}
      <View style={styles.controlIsland}>
        {/* Mute Toggle */}
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          activeOpacity={0.7}
          onPress={toggleMute}
        >
          {isMuted ? (
            <MicOff size={24} color="#EF4444" />
          ) : (
            <Mic size={24} color="#FFFFFF" />
          )}
          <Text style={styles.controlLabel}>{isMuted ? "Unmute" : "Mute"}</Text>
        </TouchableOpacity>

        {/* Video Toggle */}
        <TouchableOpacity
          style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
          activeOpacity={0.7}
          onPress={toggleVideo}
        >
          {isVideoOff ? (
            <VideoOff size={24} color="#EF4444" />
          ) : (
            <VideoIcon size={24} color="#FFFFFF" />
          )}
          <Text style={styles.controlLabel}>{isVideoOff ? "Start Video" : "Stop Video"}</Text>
        </TouchableOpacity>

        {/* Speaker Toggle */}
        <TouchableOpacity
          style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActiveBlue]}
          activeOpacity={0.7}
          onPress={toggleSpeaker}
        >
          {isSpeakerOn ? (
            <Volume2 size={24} color="#3B82F6" />
          ) : (
            <VolumeX size={24} color="#FFFFFF" />
          )}
          <Text style={styles.controlLabel}>Speaker</Text>
        </TouchableOpacity>

        {/* End Call Button */}
        <TouchableOpacity
          style={styles.endCallBtn}
          activeOpacity={0.7}
          onPress={endCall}
        >
          <PhoneOff size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F19",
    justifyContent: "space-between",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  minimizeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  securityText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B981",
  },
  centerSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    position: "relative",
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  pulseRingOuter: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: "rgba(59, 130, 246, 0.35)",
  },
  pulseRingInner: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 2,
    borderColor: "rgba(59, 130, 246, 0.6)",
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: "#3B82F6",
  },
  partnerName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#94A3B8",
  },
  connectedText: {
    color: "#10B981",
    fontSize: 18,
    fontWeight: "700",
  },
  controlIsland: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#1E293B",
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  controlBtnActive: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  controlBtnActiveBlue: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 4,
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
});

