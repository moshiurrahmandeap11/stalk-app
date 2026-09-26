import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
  DimensionValue,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface AppBottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  showHandle?: boolean;
  showCloseButton?: boolean;
  transparentBackdrop?: boolean;
  avoidKeyboard?: boolean;
  maxHeight?: DimensionValue;
  sheetStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const AppBottomSheetModal: React.FC<AppBottomSheetModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  showHandle = true,
  showCloseButton = false,
  transparentBackdrop = true,
  avoidKeyboard = false,
  maxHeight,
  sheetStyle,
  contentStyle,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const finishClose = useCallback(() => {
    setIsRendered(false);
  }, []);

  const handleDismiss = useCallback(() => {
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
          runOnJS(onClose)();
        }
      }
    );
    backdropOpacity.value = withTiming(0, { duration: 200 });
  }, [finishClose, onClose, translateY, backdropOpacity]);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      translateY.value = withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else if (isRendered) {
      translateY.value = withTiming(
        SCREEN_HEIGHT,
        { duration: 220, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(finishClose)();
          }
        }
      );
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, isRendered, finishClose, translateY, backdropOpacity]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!isRendered && !visible) return null;

  const sheetContent = (
    <Animated.View
      style={[
        styles.sheet,
        { paddingBottom: Math.max(insets.bottom, 16) },
        maxHeight ? { maxHeight } : undefined,
        sheetStyle,
        animatedSheetStyle,
      ]}
    >
      {/* Universal Drag Handle */}
      {showHandle && (
        <View style={styles.handleWrapper}>
          <View style={styles.handle} />
        </View>
      )}

      {/* Universal Header (if title or close button provided) */}
      {(title || subtitle || showCloseButton) && (
        <View style={styles.header}>
          <View style={styles.headerTextWrapper}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {showCloseButton && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main Body Content */}
      <View style={[styles.body, contentStyle]}>{children}</View>
    </Animated.View>
  );

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <Animated.View
          style={[
            styles.backdrop,
            !transparentBackdrop && styles.darkBackdrop,
            animatedBackdropStyle,
          ]}
        >
          <TouchableWithoutFeedback onPress={(e) => e?.stopPropagation?.()}>
            {avoidKeyboard ? (
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.keyboardAvoid}
              >
                {sheetContent}
              </KeyboardAvoidingView>
            ) : (
              sheetContent
            )}
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  darkBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  keyboardAvoid: {
    width: "100%",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 16,
    // Crisp modern shadow & border
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 24,
  },
  handleWrapper: {
    alignItems: "center",
    paddingVertical: 6,
  },
  handle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
    marginBottom: 8,
  },
  headerTextWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginLeft: 12,
  },
  body: {
    width: "100%",
  },
});
