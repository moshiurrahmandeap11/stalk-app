import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
  MessageCircle,
  User,
  LogOut,
} from "lucide-react-native";
import { InstagramReelsIcon, InstagramPostIcon } from "./InstagramIcons";
import { FacebookMenuDrawer } from "./FacebookMenuDrawer";
import { FacebookActionSheet } from "../ui/FacebookActionSheet";
import { useAuthStore } from "../../store/auth.store";
import { useChatHeadStore } from "../../store/chathead.store";
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
  const unreadMessagesCount = useChatHeadStore((s) => s.unreadMessagesCount);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    // Instant execution with zero latency
    onPress();
    Haptics.selectionAsync().catch(() => {});
    // Parallel micro-bounce animation
    scale.value = withSpring(0.88, { damping: 14, stiffness: 350 }, () => {
      scale.value = withSpring(1);
    });
  };

  const color = isDarkTab
    ? isFocused
      ? "#FFFFFF"
      : "rgba(255, 255, 255, 0.6)"
    : isFocused
    ? "#0F172A"
    : "#64748B";

  const size = 26;
  const strokeWidth = isFocused ? 2.5 : 1.9;

  const renderIcon = () => {
    switch (name) {
      case "index":
        return <Home size={size} color={color} strokeWidth={strokeWidth} />;
      case "videos":
        return (
          <InstagramReelsIcon
            size={size}
            color={color}
            strokeWidth={strokeWidth}
            isFocused={isFocused}
          />
        );
      case "create":
        return (
          <InstagramPostIcon
            size={size}
            color={color}
            strokeWidth={strokeWidth}
            isFocused={isFocused}
          />
        );
      case "messages":
        return (
          <View style={styles.iconContainer}>
            <MessageCircle size={size} color={color} strokeWidth={strokeWidth} />
            {unreadMessagesCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                </Text>
              </View>
            )}
          </View>
        );
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
      delayPressIn={0}
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
  const logout = useAuthStore((s) => s.logout);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [logoutSheetVisible, setLogoutSheetVisible] = useState(false);

  const currentRoute = state.routes[state.index]?.name;
  const isDarkTab = currentRoute === "videos";

  return (
    <>
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
            // Profile tab opens the Facebook sidebar drawer
            if (route.name === "profile") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDrawerVisible(true);
              return;
            }

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

      {/* Facebook Menu Sidebar Drawer */}
      <FacebookMenuDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogoutPress={() => setLogoutSheetVisible(true)}
      />

      {/* Facebook-style Logout Confirmation Action Sheet */}
      <FacebookActionSheet
        visible={logoutSheetVisible}
        title="Log Out of Stalk?"
        subtitle="You can always log back in at any time."
        actions={[
          {
            id: "logout",
            label: "Log Out",
            icon: LogOut,
            destructive: true,
            onPress: () => {
              logout();
            },
          },
        ]}
        onClose={() => setLogoutSheetVisible(false)}
        cancelLabel="Stay Logged In"
      />
    </>
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
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
});
