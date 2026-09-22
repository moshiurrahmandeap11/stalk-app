import React, { useEffect } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { useAuthStore } from "../store/auth.store";
import { useSocketStore } from "../store/socket.store";
import { IncomingCallBanner } from "../components/call/IncomingCallBanner";

SplashScreen.preventAutoHideAsync();

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
  const connectSocket = useSocketStore((s) => s.connectSocket);

  useEffect(() => {
    restoreSession().finally(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  const disconnectSocket = useSocketStore((s) => s.disconnectSocket);

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" options={{ presentation: "modal" }} />
          <Stack.Screen name="register" options={{ presentation: "modal" }} />
          <Stack.Screen name="messages" />
          <Stack.Screen name="search" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="post/[id]" />
          <Stack.Screen name="s/[username]" />
          <Stack.Screen name="call" options={{ animation: "fade" }} />
        </Stack>
        <IncomingCallBanner />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

