import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

interface TypingBubbleProps {
  avatarUri?: string | null;
}

export const TypingBubble: React.FC<TypingBubbleProps> = ({ avatarUri }) => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 250 }),
        withTiming(0, { duration: 250 })
      ),
      -1,
      false
    );

    dot2.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 250 }),
          withTiming(0, { duration: 250 })
        ),
        -1,
        false
      )
    );

    dot3.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 250 }),
          withTiming(0, { duration: 250 })
        ),
        -1,
        false
      )
    );
  }, []);

  const dotStyle1 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1.value }],
  }));

  const dotStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2.value }],
  }));

  const dotStyle3 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3.value }],
  }));

  const defaultAvatar =
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: avatarUri || defaultAvatar }}
        style={styles.avatar}
        contentFit="cover"
      />
      <View style={styles.bubble}>
        <Animated.View style={[styles.dot, dotStyle1]} />
        <Animated.View style={[styles.dot, dotStyle2]} />
        <Animated.View style={[styles.dot, dotStyle3]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E4E6EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#65676B",
  },
});

