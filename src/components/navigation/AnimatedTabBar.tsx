import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Home, Film, Plus, User, Compass } from "lucide-react-native";

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

  const renderIcon = () => {
    let color: string;
    if (isDarkTab) {
      color = isFocused ? "#FFFFFF" : "rgba(255, 255, 255, 0.55)";
    } else {
      color = isFocused ? "#3B82F6" : "#64748B";
    }
    const size = 23;

    switch (name) {
      case "index":
        return <Home size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case "videos":
        return <Film size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case "explore":
        return <Compass size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      case "profile":
        return <User size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
      default:
        return <Home size={size} color={color} strokeWidth={2} />;
    }
  };

  const getLabel = () => {
    switch (name) {
      case "index":
        return "Feed";
      case "videos":
        return "Videos";
      case "explore":
        return "Explore";
      case "profile":
        return "Profile";
      default:
        return name;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.iconWrapper, animatedStyle]}>
        {renderIcon()}
        {isFocused && (
          <View
            style={[
              styles.activeDot,
              isDarkTab && { backgroundColor: "#FFFFFF" },
            ]}
          />
        )}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          isDarkTab && styles.darkTabLabel,
          isFocused && (isDarkTab ? styles.darkActiveTabLabel : styles.activeTabLabel),
        ]}
      >
        {getLabel()}
      </Text>
    </TouchableOpacity>
  );
};

// Distinctive Center (+) Button
const CenterCreateButton: React.FC<{ onPress: () => void; isDarkTab: boolean }> = ({
  onPress,
  isDarkTab,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    scale.value = withSpring(0.85, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.createBtnWrapper}>
      <Animated.View style={[styles.createBtn, animatedStyle]}>
        <Plus size={24} color="#FFFFFF" strokeWidth={3} />
      </Animated.View>
      <Text
        style={[
          styles.createBtnLabel,
          isDarkTab && { color: "rgba(255, 255, 255, 0.85)" },
        ]}
      >
        Post
      </Text>
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

        // Center button for "create" route
        if (route.name === "create") {
          return (
            <CenterCreateButton
              key={route.key}
              isDarkTab={isDarkTab}
              onPress={() => {
                navigation.navigate("create");
              }}
            />
          );
        }

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
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  darkContainer: {
    backgroundColor: "rgba(10, 15, 29, 0.96)",
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    shadowOpacity: 0,
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
    height: 30,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3B82F6",
    marginTop: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  darkTabLabel: {
    color: "rgba(255, 255, 255, 0.55)",
  },
  activeTabLabel: {
    color: "#3B82F6",
    fontWeight: "700",
  },
  darkActiveTabLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  createBtnWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -16,
  },
  createBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  createBtnLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 4,
  },
});
