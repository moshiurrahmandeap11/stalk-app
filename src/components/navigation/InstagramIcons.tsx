import React from "react";
import Svg, { Rect, Line, Polygon } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  isFocused?: boolean;
}

export const InstagramReelsIcon: React.FC<IconProps> = ({
  size = 26,
  color = "#0F172A",
  strokeWidth = 2,
  isFocused = false,
}) => {
  const finalStroke = isFocused ? Math.max(strokeWidth, 2.4) : strokeWidth;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer Rounded Frame */}
      <Rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.5"
        stroke={color}
        strokeWidth={finalStroke}
      />
      {/* Upper Clapperboard Divider */}
      <Line
        x1="2.5"
        y1="8.5"
        x2="21.5"
        y2="8.5"
        stroke={color}
        strokeWidth={finalStroke}
      />
      {/* Slanted Stripes */}
      <Line
        x1="8.5"
        y1="2.5"
        x2="6.5"
        y2="8.5"
        stroke={color}
        strokeWidth={finalStroke}
      />
      <Line
        x1="15"
        y1="2.5"
        x2="13"
        y2="8.5"
        stroke={color}
        strokeWidth={finalStroke}
      />
      {/* Center Play Arrow */}
      <Polygon points="10,12 16,15.5 10,19" fill={color} />
    </Svg>
  );
};

export const InstagramPostIcon: React.FC<IconProps> = ({
  size = 26,
  color = "#0F172A",
  strokeWidth = 2,
  isFocused = false,
}) => {
  const finalStroke = isFocused ? Math.max(strokeWidth, 2.4) : strokeWidth;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Rounded Square */}
      <Rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.5"
        stroke={color}
        strokeWidth={finalStroke}
      />
      {/* Plus Symbol */}
      <Line
        x1="12"
        y1="7.5"
        x2="12"
        y2="16.5"
        stroke={color}
        strokeWidth={finalStroke}
        strokeLinecap="round"
      />
      <Line
        x1="7.5"
        y1="12"
        x2="16.5"
        y2="12"
        stroke={color}
        strokeWidth={finalStroke}
        strokeLinecap="round"
      />
    </Svg>
  );
};

