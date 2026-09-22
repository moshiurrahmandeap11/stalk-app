import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Phone, PhoneOff, Video } from "lucide-react-native";
import { useCallStore } from "../../store/call.store";

export const IncomingCallBanner: React.FC = () => {
  const router = useRouter();
  const { callState, callType, partner, acceptCall, rejectCall } = useCallStore();

  const pulseScale = useSharedValue(1);
  const translateY = useSharedValue(-120);

  useEffect(() => {
    if (callState === "incoming") {
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 700 }),
          withTiming(1, { duration: 700 })
        ),
        -1,
        true
      );
    } else {
      translateY.value = withTiming(-140, { duration: 200 });
      pulseScale.value = 1;
    }
  }, [callState]);

  const animatedBannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  if (callState !== "incoming" || !partner) return null;

  const avatarUri =
    partner.avatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

  const handleAccept = () => {
    acceptCall();
    router.push("/call" as any);
  };

  return (
    <Animated.View style={[styles.container, animatedBannerStyle]}>
      <View style={styles.card}>
        {/* Caller Info */}
        <View style={styles.callerRow}>
          <View style={styles.avatarWrapper}>
            <Animated.View style={[styles.pulseRing, animatedPulseStyle]} />
            <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
          </View>

          <View style={styles.info}>
            <Text style={styles.callerName} numberOfLines={1}>
              {partner.name}
            </Text>
            <View style={styles.callTypeRow}>
              {callType === "video" ? (
                <Video size={14} color="#3B82F6" />
              ) : (
                <Phone size={14} color="#3B82F6" />
              )}
              <Text style={styles.callTypeText}>
                Incoming {callType === "video" ? "Video" : "Audio"} Call...
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.declineBtn}
            activeOpacity={0.7}
            onPress={rejectCall}
          >
            <PhoneOff size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            activeOpacity={0.7}
            onPress={handleAccept}
          >
            <Phone size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 99999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    borderRadius: 22,
    padding: 12,
    paddingRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  callerRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatarWrapper: {
    position: "relative",
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  info: {
    flex: 1,
  },
  callerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  callTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  callTypeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 10,
  },
  declineBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
});

