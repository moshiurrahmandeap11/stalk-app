import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import {
  Home,
  Film,
  SquarePlus,
  MessageCircle,
  User,
} from "lucide-react-native";
import { useAuthStore } from "../../store/auth.store";
import { getMediaUrl } from "../../utils/media";

export interface AnimatedTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

interface TabItemProps {
  name: string;
  isFocused: boolean;
  isDarkTab: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const TabItem: React.FC<TabItemProps> = ({
  name,
  isFocused,
  isDarkTab,
  onPress,
  onLongPress,
}) => {
  const scale = useSharedValue(1);
  const user = useAuthStore((s) => s.user);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    scale.value = withSpring(0.85, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1.08, { damping: 12, stiffness: 200 }, () => {
        scale.value = withSpring(1);
      });
    });
    onPress();
  };

  const color = isDarkTab
    ? isFocused
      ? "#FFFFFF"
      : "rgba(255, 255, 255, 0.6)"
    : isFocused
    ? "#0F172A"
    : "#64748B";

  const size = 26;
  const strokeWidth = isFocused ? 2.5 : 1.8;

  const renderIcon = () => {
    switch (name) {
      case "index":
        return <Home size={size} color={color} strokeWidth={strokeWidth} />;
      case "videos":
        return <Film size={size} color={color} strokeWidth={strokeWidth} />;
      case "create":
        return <SquarePlus size={size} color={color} strokeWidth={strokeWidth} />;
      case "messages":
        return <MessageCircle size={size} color={color} strokeWidth={strokeWidth} />;
      case "profile": {
        const avatarUrl = user?.profilePicUrl || user?.avatar;
        if (avatarUrl) {
          return (
            <View
              style={[
                styles.avatarRing,
                isFocused &&
                  (isDarkTab ? styles.avatarRingFocusedDark : styles.avatarRingFocused),
              ]}
            >
              <Image
                source={{ uri: getMediaUrl(avatarUrl) }}
                style={styles.avatarImg}
                contentFit="cover"
              />
            </View>
          );
        }
        return <User size={size} color={color} strokeWidth={strokeWidth} />;
      }
      default:
        return <Home size={size} color={color} strokeWidth={strokeWidth} />;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.iconWrapper, animatedStyle]}>
        {renderIcon()}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index]?.name;
  const isDarkTab = currentRoute === "videos";

  return (
    <View
      style={[
        styles.container,
        isDarkTab && styles.darkContainer,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];

        // Skip hidden routes if any
        if (options.tabBarItemStyle?.display === "none" || options.href === null) {
          return null;
        }

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <TabItem
            key={route.key}
            name={route.name}
            isFocused={isFocused}
            isDarkTab={isDarkTab}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
    elevation: 8,
  },
  darkContainer: {
    backgroundColor: "#000000",
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    elevation: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: 32,
  },
  avatarRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    padding: 1.5,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRingFocused: {
    borderColor: "#0F172A",
  },
  avatarRingFocusedDark: {
    borderColor: "#FFFFFF",
  },
  avatarImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
});
