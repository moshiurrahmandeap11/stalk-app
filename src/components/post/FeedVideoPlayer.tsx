import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Volume2, VolumeX, Play } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface FeedVideoPlayerProps {
  uri: string;
  isVisible: boolean;
}

export const FeedVideoPlayer: React.FC<FeedVideoPlayerProps> = ({ uri, isVisible }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const playIconOpacity = useSharedValue(0);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = isMuted;
  });

  // Facebook-style auto-play when in viewport
  useEffect(() => {
    if (!player) return;
    if (isVisible && isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, isPlaying, player]);

  // Handle Mute toggle
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [isMuted, player]);

  const handleTogglePlay = () => {
    Haptics.selectionAsync();
    playIconOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 400 })
    );
    setIsPlaying(!isPlaying);
  };

  const handleToggleMute = (e: any) => {
    e.stopPropagation?.();
    Haptics.selectionAsync();
    setIsMuted(!isMuted);
  };

  const playOverlayStyle = useAnimatedStyle(() => ({
    opacity: playIconOpacity.value,
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handleTogglePlay}
      style={styles.container}
    >
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Center Play/Pause Flash Icon */}
      <Animated.View style={[styles.centerIndicator, playOverlayStyle]} pointerEvents="none">
        <View style={styles.iconCircle}>
          <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
        </View>
      </Animated.View>

      {/* Bottom Mute Button */}
      <TouchableOpacity
        style={styles.muteBtn}
        activeOpacity={0.8}
        onPress={handleToggleMute}
      >
        {isMuted ? (
          <VolumeX size={16} color="#FFFFFF" />
        ) : (
          <Volume2 size={16} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#0F172A",
    position: "relative",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  centerIndicator: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
  muteBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
