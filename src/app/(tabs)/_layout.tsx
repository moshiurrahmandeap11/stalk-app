import React, { useRef } from "react";
import { View, PanResponder } from "react-native";
import { Tabs, useRouter, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { AnimatedTabBar } from "../../components/navigation/AnimatedTabBar";

const SLIDE_TABS = ["index", "videos", "create", "messages"];
const ALL_TABS = ["index", "videos", "create", "messages", "profile"];

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const hasTriggeredRef = useRef(false);

  const getCurrentTab = () => {
    if (pathname === "/" || pathname === "" || pathname === "/(tabs)") {
      return "index";
    }
    for (const tab of ALL_TABS) {
      if (pathname.includes(tab)) {
        return tab;
      }
    }
    return "index";
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Instantly capture clear horizontal swipes without interfering with vertical feeds
        return (
          Math.abs(gestureState.dx) > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.2
        );
      },
      onPanResponderGrant: () => {
        hasTriggeredRef.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (hasTriggeredRef.current) return;

        // Instant slide trigger without waiting for touch release
        if (
          Math.abs(gestureState.dx) > 26 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.2
        ) {
          const currentTab = getCurrentTab();
          const currentIndex = SLIDE_TABS.indexOf(currentTab);
          if (currentIndex === -1) return;

          // Drag Right-to-Left (dx < -26) -> Next Tab
          if (gestureState.dx < -26 && currentIndex < SLIDE_TABS.length - 1) {
            hasTriggeredRef.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const nextTab = SLIDE_TABS[currentIndex + 1];
            router.navigate(nextTab === "index" ? "/(tabs)" : (`/(tabs)/${nextTab}` as any));
          }
          // Drag Left-to-Right (dx > 26) -> Previous Tab
          else if (gestureState.dx > 26 && currentIndex > 0) {
            hasTriggeredRef.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const prevTab = SLIDE_TABS[currentIndex - 1];
            router.navigate(prevTab === "index" ? "/(tabs)" : (`/(tabs)/${prevTab}` as any));
          }
        }
      },
      onPanResponderRelease: () => {
        hasTriggeredRef.current = false;
      },
      onPanResponderTerminate: () => {
        hasTriggeredRef.current = false;
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Tabs
        tabBar={(props) => <AnimatedTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Feed" }} />
        <Tabs.Screen name="videos" options={{ title: "Reels" }} />
        <Tabs.Screen name="create" options={{ title: "Post" }} />
        <Tabs.Screen name="messages" options={{ title: "Chats" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
    </View>
  );
}
