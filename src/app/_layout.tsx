import React, { useEffect, useState } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
  useRouter,
  useSegments,
} from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { useAuthStore } from "../store/auth.store";
import { useSocketStore } from "../store/socket.store";
import { IncomingCallBanner } from "../components/call/IncomingCallBanner";
import { OngoingCallBar } from "../components/call/OngoingCallBar";
import { InAppNotificationBanner } from "../components/notification/InAppNotificationBanner";
import { FloatingChatHead } from "../components/chathead/FloatingChatHead";
import {
  setupNotificationChannels,
  addNotificationResponseListener,
} from "../utils/notifications";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const connectSocket = useSocketStore((s) => s.connectSocket);
  const disconnectSocket = useSocketStore((s) => s.disconnectSocket);
  const router = useRouter();
  const segments = useSegments();

  const [showLaunchOverlay, setShowLaunchOverlay] = useState(true);
  const launchOpacity = useSharedValue(1);
  const launchScale = useSharedValue(1);

  const animatedLaunchStyle = useAnimatedStyle(() => ({
    opacity: launchOpacity.value,
    transform: [{ scale: launchScale.value }],
  }));

  useEffect(() => {
    // Safety fallback: Ensure launch overlay is always dismissed after 1.2s max
    const fallbackTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      setShowLaunchOverlay(false);
    }, 1200);

    restoreSession()
      .catch((err) => {
        console.warn("[RootLayout] restoreSession warning:", err);
      })
      .finally(() => {
        SplashScreen.hideAsync().catch(() => {});
        launchScale.value = withTiming(1.06, { duration: 450 });
        launchOpacity.value = withTiming(0, { duration: 350 }, (finished) => {
          if (finished) {
            runOnJS(setShowLaunchOverlay)(false);
          }
        });
      });

    setupNotificationChannels().catch(() => {});

    const unsubscribe = addNotificationResponseListener((data) => {
      if (data?.type === "message" && data?.conversationId) {
        router.push(`/chat/${data.conversationId}` as any);
      } else if (data?.type === "notification") {
        if (data?.postId) {
          router.push(`/post/${data.postId}` as any);
        } else {
          router.push("/notifications" as any);
        }
      }
    });

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  // Global Auth Guard: Mandatory login
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "login" || segments[0] === "register";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login" as any);
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)" as any);
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" options={{ gestureEnabled: false }} />
          <Stack.Screen name="register" options={{ gestureEnabled: false }} />
          <Stack.Screen name="messages" />
          <Stack.Screen name="search" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="post/[id]" />
          <Stack.Screen name="s/[username]" />
          <Stack.Screen name="call" options={{ animation: "fade" }} />
        </Stack>
        <IncomingCallBanner />
        <OngoingCallBar />
        <InAppNotificationBanner />
        <FloatingChatHead />

        {/* Seamless Stalk Launch Screen with Brand Logo */}
        {showLaunchOverlay && (
          <Animated.View
            pointerEvents="none"
            style={[styles.launchOverlay, animatedLaunchStyle]}
          >
            <Image
              source={require("../../assets/images/splash-icon.png")}
              style={styles.launchLogo}
              contentFit="contain"
            />
          </Animated.View>
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  launchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999999,
  },
  launchLogo: {
    width: 240,
    height: 85,
  },
});
