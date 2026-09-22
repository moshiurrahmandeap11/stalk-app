import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const TELEGRAM_EMOJIS = ["❤️", "👍", "🔥", "😂", "👏", "😮", "😢", "🎉"];

interface ReactionPickerProps {
  visible: boolean;
  onSelectReaction: (emoji: string) => void;
  onDismiss: () => void;
  currentReaction?: string | null;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  visible,
  onSelectReaction,
  onDismiss,
  currentReaction,
}) => {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      scale.value = withTiming(0.4, { duration: 120 });
      opacity.value = withTiming(0, { duration: 120 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Pressable style={styles.backdrop} onPress={onDismiss}>
      <Animated.View style={[styles.pickerContainer, animatedStyle]}>
        <View style={styles.bubbleArrow} />
        {TELEGRAM_EMOJIS.map((emoji) => {
          const isSelected = currentReaction === emoji;
          return (
            <TouchableOpacity
              key={emoji}
              style={[styles.emojiItem, isSelected && styles.emojiItemSelected]}
              activeOpacity={0.6}
              onPress={(e) => {
                e.stopPropagation();
                Haptics.selectionAsync();
                onSelectReaction(emoji);
              }}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
              {isSelected ? <View style={styles.selectedDot} /> : null}
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  pickerContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  bubbleArrow: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    width: 12,
    height: 12,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
  },
  emojiItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiItemSelected: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#3B82F6",
  },
  emojiText: {
    fontSize: 24,
  },
  selectedDot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3B82F6",
  },
});
