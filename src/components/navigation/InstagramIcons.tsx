import React from "react";
import { View, StyleSheet } from "react-native";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  isFocused?: boolean;
}

export const InstagramPostIcon: React.FC<IconProps> = ({
  size = 26,
  color = "#0F172A",
  strokeWidth = 2,
  isFocused = false,
}) => {
  const border = isFocused ? Math.max(strokeWidth, 2.4) : strokeWidth;
  const dimension = size - 2;

  return (
    <View
      style={[
        styles.postBox,
        {
          width: dimension,
          height: dimension,
          borderColor: color,
          borderWidth: border,
        },
      ]}
    >
      {/* Vertical Bar */}
      <View
        style={[
          styles.verticalBar,
          {
            backgroundColor: color,
            width: border,
            height: dimension * 0.48,
          },
        ]}
      />
      {/* Horizontal Bar */}
      <View
        style={[
          styles.horizontalBar,
          {
            backgroundColor: color,
            height: border,
            width: dimension * 0.48,
          },
        ]}
      />
    </View>
  );
};

export const InstagramReelsIcon: React.FC<IconProps> = ({
  size = 26,
  color = "#0F172A",
  strokeWidth = 2,
  isFocused = false,
}) => {
  const border = isFocused ? Math.max(strokeWidth, 2.4) : strokeWidth;
  const dimension = size - 2;

  return (
    <View
      style={[
        styles.reelsBox,
        {
          width: dimension,
          height: dimension,
          borderColor: color,
          borderWidth: border,
        },
      ]}
    >
      {/* Upper Clapperboard Strip */}
      <View
        style={[
          styles.reelsHeader,
          {
            borderBottomColor: color,
            borderBottomWidth: border * 0.9,
          },
        ]}
      >
        <View
          style={[
            styles.reelsStripe,
            { backgroundColor: color, width: border * 0.9, left: "28%" },
          ]}
        />
        <View
          style={[
            styles.reelsStripe,
            { backgroundColor: color, width: border * 0.9, left: "62%" },
          ]}
        />
      </View>

      {/* Center Play Arrow */}
      <View style={styles.playArrowContainer}>
        <View
          style={[
            styles.playTriangle,
            {
              borderLeftColor: color,
              borderLeftWidth: dimension * 0.28,
              borderTopWidth: dimension * 0.16,
              borderBottomWidth: dimension * 0.16,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postBox: {
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  verticalBar: {
    position: "absolute",
    borderRadius: 1,
  },
  horizontalBar: {
    position: "absolute",
    borderRadius: 1,
  },
  reelsBox: {
    borderRadius: 7,
    overflow: "hidden",
  },
  reelsHeader: {
    height: "34%",
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  reelsStripe: {
    position: "absolute",
    top: -3,
    bottom: -3,
    transform: [{ rotate: "25deg" }],
  },
  playArrowContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 2,
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightWidth: 0,
  },
});
