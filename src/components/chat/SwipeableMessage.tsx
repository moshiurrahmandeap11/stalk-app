import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  View,
  StyleSheet,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import * as Haptics from "expo-haptics";
import { CornerUpLeft } from "lucide-react-native";

interface SwipeableMessageProps {
  children: React.ReactNode;
  onReply: () => void;
  isMine: boolean;
}

const SWIPE_THRESHOLD = 50;
const MAX_SWIPE_DISTANCE = 75;

export const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  children,
  onReply,
  isMine,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isTriggered = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (
        _: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        // Only capture intentional horizontal rightward swipes
        return (
          gestureState.dx > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderMove: (
        _: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        if (gestureState.dx > 0) {
          const clampedX = Math.min(gestureState.dx, MAX_SWIPE_DISTANCE);
          translateX.setValue(clampedX);

          if (clampedX >= SWIPE_THRESHOLD && !isTriggered.current) {
            isTriggered.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else if (clampedX < SWIPE_THRESHOLD - 10 && isTriggered.current) {
            isTriggered.current = false;
          }
        }
      },
      onPanResponderRelease: () => {
        if (isTriggered.current) {
          onReply();
        }
        isTriggered.current = false;

        Animated.spring(translateX, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        isTriggered.current = false;
        Animated.spring(translateX, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const iconOpacity = translateX.interpolate({
    inputRange: [0, 20, SWIPE_THRESHOLD],
    outputRange: [0, 0.4, 1],
    extrapolate: "clamp",
  });

  const iconScale = translateX.interpolate({
    inputRange: [0, 20, SWIPE_THRESHOLD],
    outputRange: [0.4, 0.7, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      {/* Background Reply Circle Icon */}
      <Animated.View
        style={[
          styles.replyIconContainer,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        <View style={styles.replyIconCircle}>
          <CornerUpLeft size={16} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </Animated.View>

      {/* Swipeable Message Content */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX }],
          width: "100%",
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
  },
  replyIconContainer: {
    position: "absolute",
    left: 12,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  replyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0A7CFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0A7CFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});

