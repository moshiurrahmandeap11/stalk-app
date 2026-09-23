import React, { useRef } from "react";
import { View, PanResponder } from "react-native";
import { Tabs, useRouter, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { AnimatedTabBar } from "../../components/navigation/AnimatedTabBar";

const TAB_ROUTES = ["index", "videos", "create", "messages", "profile"];

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const getCurrentTab = () => {
    if (pathname === "/" || pathname === "" || pathname === "/(tabs)") {
      return "index";
    }
    for (const tab of TAB_ROUTES) {
      if (pathname.includes(tab)) {
        return tab;
      }
    }
    return "index";
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger on clear horizontal swipes without interfering with vertical feeds
        return (
          Math.abs(gestureState.dx) > 35 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.8
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentTab = getCurrentTab();
        const currentIndex = TAB_ROUTES.indexOf(currentTab);
        if (currentIndex === -1) return;

        // Swiped Left (Drag Right-to-Left) -> Next Tab
        if (gestureState.dx < -60 && currentIndex < TAB_ROUTES.length - 1) {
          Haptics.selectionAsync().catch(() => {});
          const nextTab = TAB_ROUTES[currentIndex + 1];
          router.navigate(nextTab === "index" ? "/(tabs)" : (`/(tabs)/${nextTab}` as any));
        }
        // Swiped Right (Drag Left-to-Right) -> Previous Tab
        else if (gestureState.dx > 60 && currentIndex > 0) {
          Haptics.selectionAsync().catch(() => {});
          const prevTab = TAB_ROUTES[currentIndex - 1];
          router.navigate(prevTab === "index" ? "/(tabs)" : (`/(tabs)/${prevTab}` as any));
        }
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
