import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { Image } from "expo-image";
import { Phone, Video, PhoneOff } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useCallStore } from "../../store/call.store";
import { getMediaUrl, DEFAULT_AVATAR } from "../../utils/media";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function OngoingCallBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const { callState, callType, partner, callDuration, endCall } = useCallStore();

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1.0, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Don't show if on the call screen itself, or if no active call
  if (pathname === "/call" || callState === "idle" || callState === "ended") {
    return null;
  }

  const handleReturnToCall = () => {
    router.push("/call" as any);
  };

  const handleHangUp = () => {
    endCall();
  };

  const avatarUri =
    getMediaUrl(partner?.avatar) ||
    DEFAULT_AVATAR;

  return (
    <View style={[styles.container, { top: insets.top + (Platform.OS === "android" ? 4 : 0) }]}>
      <TouchableOpacity
        style={styles.innerBar}
        activeOpacity={0.88}
        onPress={handleReturnToCall}
      >
        {/* Left: Avatar with pulsing indicator */}
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
          <Animated.View style={[styles.pulseDot, animatedDotStyle]} />
        </View>

        {/* Center: Partner name & live status / duration */}
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            {callType === "video" ? (
              <Video size={13} color="#34D399" style={styles.typeIcon} />
            ) : (
              <Phone size={13} color="#34D399" style={styles.typeIcon} />
            )}
            <Text style={styles.nameText} numberOfLines={1}>
              {partner?.name || "Active Call"}
            </Text>
          </View>
          <Text style={styles.statusText}>
            {callState === "connected"
              ? formatDuration(callDuration)
              : callState === "incoming"
              ? "Incoming..."
              : "Calling..."}{" "}
            • Tap to return
          </Text>
        </View>

        {/* Right: Quick Hang-up button */}
        <TouchableOpacity
          style={styles.hangUpBtn}
          activeOpacity={0.8}
          onPress={handleHangUp}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <PhoneOff size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 12,
  },
  innerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#064E3B",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.35)",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1F2937",
  },
  pulseDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#064E3B",
  },
  infoCol: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeIcon: {
    marginRight: 5,
  },
  nameText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: 160,
  },
  statusText: {
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  hangUpBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
