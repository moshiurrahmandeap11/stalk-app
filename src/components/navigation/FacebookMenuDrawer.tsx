import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  X,
  ChevronRight,
  Settings,
  Bookmark,
  Users,
  Film,
  MessageCircle,
  HelpCircle,
  Moon,
  LogOut,
  Edit3,
  Search,
} from "lucide-react-native";
import { useAuthStore } from "../../store/auth.store";
import { getMediaUrl } from "../../utils/media";

interface FacebookMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  onLogoutPress: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 350);

export const FacebookMenuDrawer: React.FC<FacebookMenuDrawerProps> = ({
  visible,
  onClose,
  onLogoutPress,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [modalRendered, setModalRendered] = useState(visible);
  const translateX = useSharedValue(DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  const handleClosed = () => {
    setModalRendered(false);
    onClose();
  };

  const closeDrawer = () => {
    translateX.value = withTiming(
      DRAWER_WIDTH,
      { duration: 220, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(handleClosed)();
        }
      }
    );
    backdropOpacity.value = withTiming(0, { duration: 200 });
  };

  useEffect(() => {
    if (visible) {
      setModalRendered(true);
      // Fluid slide-in from right edge with Facebook-like spring
      translateX.value = DRAWER_WIDTH;
      translateX.value = withSpring(0, {
        damping: 24,
        stiffness: 220,
        mass: 0.85,
      });
      backdropOpacity.value = withTiming(1, { duration: 240 });
    } else if (modalRendered) {
      closeDrawer();
    }
  }, [visible]);

  // Swipe right to dismiss gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.dx > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.value = gestureState.dx;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 80 || gestureState.vx > 0.45) {
          closeDrawer();
        } else {
          translateX.value = withSpring(0, { damping: 22, stiffness: 240 });
        }
      },
    })
  ).current;

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!modalRendered) return null;

  const avatarUri = getMediaUrl(
    user?.profilePicUrl ||
    user?.avatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
  );

  const navigateTo = (path: string) => {
    Haptics.selectionAsync();
    closeDrawer();
    setTimeout(() => {
      router.push(path as any);
    }, 180);
  };

  return (
    <Modal
      visible={modalRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeDrawer}
    >
      <View style={styles.modalOverlay}>
        {/* Animated Dark Backdrop */}
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Fluid Animated Drawer (Sliding from Right) */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              paddingTop: insets.top,
              paddingBottom: Math.max(insets.bottom, 16),
            },
            drawerAnimatedStyle,
          ]}
          {...panResponder.panHandlers}
        >
          {/* Top Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Menu</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => navigateTo("/search")}
                activeOpacity={0.7}
              >
                <Search size={20} color="#0F172A" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={closeDrawer}
                activeOpacity={0.7}
              >
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* User Profile Card */}
            <TouchableOpacity
              style={styles.profileCard}
              activeOpacity={0.8}
              onPress={() => navigateTo("/(tabs)/profile")}
            >
              <View style={styles.profileCardContent}>
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  contentFit="cover"
                />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {user?.fullName || user?.name || "My Account"}
                  </Text>
                  <Text style={styles.profileSubText}>View your profile</Text>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            {/* Shortcuts Section */}
            <Text style={styles.sectionTitle}>Shortcuts</Text>
            <View style={styles.shortcutsGrid}>
              <TouchableOpacity
                style={styles.shortcutCard}
                activeOpacity={0.7}
                onPress={() => navigateTo("/(tabs)/videos")}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: "#EEF2FF" }]}>
                  <Film size={22} color="#4F46E5" />
                </View>
                <Text style={styles.shortcutLabel}>Reels & Video</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutCard}
                activeOpacity={0.7}
                onPress={() => navigateTo("/(tabs)/messages")}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: "#EFF6FF" }]}>
                  <MessageCircle size={22} color="#2563EB" />
                </View>
                <Text style={styles.shortcutLabel}>Messages</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutCard}
                activeOpacity={0.7}
                onPress={() => navigateTo("/search")}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: "#F0FDF4" }]}>
                  <Users size={22} color="#16A34A" />
                </View>
                <Text style={styles.shortcutLabel}>Find Friends</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutCard}
                activeOpacity={0.7}
                onPress={() => navigateTo("/(tabs)/profile")}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: "#FEF3C7" }]}>
                  <Edit3 size={22} color="#D97706" />
                </View>
                <Text style={styles.shortcutLabel}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Settings & Info Section */}
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.settingsGroup}>
              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => navigateTo("/(tabs)/profile")}
              >
                <Bookmark size={20} color="#64748B" style={styles.settingsIcon} />
                <Text style={styles.settingsLabel}>Saved Posts</Text>
                <ChevronRight size={18} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.selectionAsync();
                }}
              >
                <Moon size={20} color="#64748B" style={styles.settingsIcon} />
                <Text style={styles.settingsLabel}>Dark Mode</Text>
                <Text style={styles.settingsValue}>System</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsRow}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.selectionAsync();
                }}
              >
                <Settings size={20} color="#64748B" style={styles.settingsIcon} />
                <Text style={styles.settingsLabel}>Settings & Privacy</Text>
                <ChevronRight size={18} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsRow, { borderBottomWidth: 0 }]}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.selectionAsync();
                }}
              >
                <HelpCircle size={20} color="#64748B" style={styles.settingsIcon} />
                <Text style={styles.settingsLabel}>Help & Support</Text>
                <ChevronRight size={18} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {/* Log Out Button */}
            <TouchableOpacity
              style={styles.logoutBtn}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                closeDrawer();
                setTimeout(() => {
                  onLogoutPress();
                }, 200);
              }}
            >
              <LogOut size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            <Text style={styles.brandFooter}>Stalk • BDBook App v1.0.0</Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  drawer: {
    backgroundColor: "#F8FAFC",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 25,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  profileCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E2E8F0",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  profileSubText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  shortcutCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  shortcutIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  shortcutLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  settingsGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 20,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  settingsIcon: {
    marginRight: 14,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#0F172A",
  },
  settingsValue: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginBottom: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
  },
  brandFooter: {
    textAlign: "center",
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 8,
  },
});
