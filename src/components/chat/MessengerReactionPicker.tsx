import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { CornerUpLeft, Copy } from "lucide-react-native";

export const MESSENGER_EMOJIS = ["👍", "❤️", "😆", "😮", "😢", "😡"];

interface MessengerReactionPickerProps {
  visible: boolean;
  onSelectReaction: (emoji: string) => void;
  onDismiss: () => void;
  currentReaction?: string | null;
  onReply?: () => void;
  onCopy?: () => void;
  canCopy?: boolean;
}

export const MessengerReactionPicker: React.FC<MessengerReactionPickerProps> = ({
  visible,
  onSelectReaction,
  onDismiss,
  currentReaction,
  onReply,
  onCopy,
  canCopy = true,
}) => {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 120 });
    } else {
      scale.value = withTiming(0.3, { duration: 100 });
      opacity.value = withTiming(0, { duration: 100 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Pressable style={styles.backdrop} onPress={onDismiss}>
      <Animated.View style={[styles.modalContent, animatedStyle]}>
        {/* Floating Emoji Bar */}
        <View style={styles.pickerContainer}>
          {MESSENGER_EMOJIS.map((emoji) => {
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
        </View>

        {/* Quick Context Actions: Reply & Copy */}
        {(onReply || onCopy) && (
          <View style={styles.actionsContainer}>
            {onReply ? (
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.selectionAsync();
                  onReply();
                }}
              >
                <CornerUpLeft size={16} color="#0A7CFF" strokeWidth={2.2} />
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            ) : null}

            {onReply && onCopy && canCopy ? (
              <View style={styles.actionDivider} />
            ) : null}

            {onCopy && canCopy ? (
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.selectionAsync();
                  onCopy();
                }}
              >
                <Copy size={16} color="#475569" strokeWidth={2} />
                <Text style={styles.actionText}>Copy</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modalContent: {
    alignItems: "center",
    gap: 12,
  },
  pickerContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emojiItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiItemSelected: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#0A7CFF",
  },
  emojiText: {
    fontSize: 26,
  },
  selectedDot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#0A7CFF",
  },
  actionsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
  },
});
