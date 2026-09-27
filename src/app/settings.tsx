import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import {
  ArrowLeft,
  User,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Bell,
  MessageCircle,
  Volume2,
  Vibrate,
  Moon,
  Trash2,
  LogOut,
  ChevronRight,
  Check,
  Smartphone,
  Globe,
  HelpCircle,
  Info,
  Sparkles,
} from "lucide-react-native";
import { useAuthStore } from "../store/auth.store";
import { useSettingsStore } from "../store/settings.store";
import { useChatHeadStore } from "../store/chathead.store";
import { userService } from "../services/user.service";
import { getMediaUrl, DEFAULT_AVATAR } from "../utils/media";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuthStore();
  const settings = useSettingsStore();
  const chatHeadStore = useChatHeadStore();

  // Modals state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [audienceModalVisible, setAudienceModalVisible] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile edit state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profileLoading, setProfileLoading] = useState(false);

  // Cache state
  const [cacheSize, setCacheSize] = useState("18.4 MB");
  const [cacheClearing, setCacheClearing] = useState(false);

  useEffect(() => {
    settings.loadSettings();
    chatHeadStore.loadPreferences();
  }, []);

  // Handle password change
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Required", "Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Weak Password", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New password and confirm password do not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      await userService.changePassword({ currentPassword, newPassword });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your password has been changed successfully!");
      setPasswordModalVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err.response?.data?.message || "Failed to update password. Check your current password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle profile details update
  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert("Required", "Full name cannot be empty.");
      return;
    }

    try {
      setProfileLoading(true);
      if (user?.id) {
        const updated = await userService.updateUser(user.id, {
          fullName: fullName.trim(),
          bio: bio.trim(),
        });
        updateUser(updated);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Updated", "Profile information updated successfully!");
      setProfileModalVisible(false);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err.response?.data?.message || "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Clear Cache
  const handleClearCache = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCacheClearing(true);
    setTimeout(() => {
      setCacheSize("0.0 KB");
      setCacheClearing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Cleaned", "App cache has been cleared successfully.");
    }, 900);
  };

  // Handle Logout
  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert("Log Out", "Are you sure you want to log out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  // Handle Delete Account
  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be wiped.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: async () => {
            try {
              if (user?.id) {
                await userService.deleteAccount(user.id);
              }
              await logout();
              router.replace("/login");
            } catch (err: any) {
              Alert.alert("Error", "Could not delete account. Please try again later.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.selectionAsync();
            setProfileModalVisible(true);
          }}
        >
          <Image
            source={{ uri: getMediaUrl(user?.profilePicUrl) || DEFAULT_AVATAR }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.fullName || "User"}
            </Text>
            <Text style={styles.profileUsername} numberOfLines={1}>
              @{user?.username || "username"}
            </Text>
            <Text style={styles.profileActionText}>Tap to edit details</Text>
          </View>
          <ChevronRight size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* SECTION 1: ACCOUNT & SECURITY */}
        <Text style={styles.sectionHeader}>Account & Security</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync();
              setProfileModalVisible(true);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: "#EEF2FF" }]}>
              <User size={18} color="#4F46E5" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Personal Information</Text>
              <Text style={styles.rowSubtitle}>Name, bio, and contact info</Text>
            </View>
            <ChevronRight size={18} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync();
              setPasswordModalVisible(true);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}>
              <Lock size={18} color="#D97706" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Password & Security</Text>
              <Text style={styles.rowSubtitle}>Change account password</Text>
            </View>
            <ChevronRight size={18} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconBox, { backgroundColor: "#E0F2FE" }]}>
              <Smartphone size={18} color="#0284C7" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Active Device</Text>
              <Text style={styles.rowSubtitle}>
                {Platform.OS === "android" ? "Android Device" : "iOS Device"} • Online
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: PRIVACY & VISIBILITY */}
        <Text style={styles.sectionHeader}>Privacy & Visibility</Text>
        <View style={styles.cardGroup}>
          <View style={styles.rowItem}>
            <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
              <Eye size={18} color="#16A34A" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Active Status</Text>
              <Text style={styles.rowSubtitle}>Show when you're online to friends</Text>
            </View>
            <Switch
              value={settings.activeStatus}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                settings.setActiveStatus(val);
              }}
              trackColor={{ false: "#CBD5E1", true: "#22C55E" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.rowItem}>
            <View style={[styles.iconBox, { backgroundColor: "#F3E8FF" }]}>
              <Check size={18} color="#9333EA" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Read Receipts</Text>
              <Text style={styles.rowSubtitle}>Let others know when you read messages</Text>
            </View>
            <Switch
              value={settings.readReceipts}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                settings.setReadReceipts(val);
              }}
              trackColor={{ false: "#CBD5E1", true: "#22C55E" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            style={[styles.rowItem, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync();
              setAudienceModalVisible(true);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: "#FFEDD5" }]}>
              <Shield size={18} color="#EA580C" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Post & Profile Audience</Text>
              <Text style={styles.rowSubtitle}>
                {settings.profileAudience === "public"
                  ? "Public (Anyone)"
                  : settings.profileAudience === "friends"
                  ? "Friends Only"
                  : "Only Me"}
              </Text>
            </View>
            <ChevronRight size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* SECTION 3: MESSAGING & CHAT HEADS */}
        <Text style={styles.sectionHeader}>Chat & Overlay</Text>
        <View style={styles.cardGroup}>
          <View style={styles.rowItem}>
            <View style={[styles.iconBox, { backgroundColor: "#E0E7FF" }]}>
              <MessageCircle size={18} color="#4338CA" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>System Chat Heads</Text>
              <Text style={styles.rowSubtitle}>Floating bubble over other apps (Messenger style)</Text>
            </View>
            <Switch
              value={chatHeadStore.isChatHeadEnabled}
              onValueChange={async () => {
                Haptics.selectionAsync();
                await chatHeadStore.toggleChatHeadEnabled();
              }}
              trackColor={{ false: "#CBD5E1", true: "#22C55E" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconBox, { backgroundColor: "#FEF2F2" }]}>
              <Sparkles size={18} color="#DC2626" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Data Saver</Text>
              <Text style={styles.rowSubtitle}>Reduce image and video quality on mobile data</Text>
            </View>
            <Switch
              value={settings.dataSaver}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                settings.setDataSaver(val);
              }}
              trackColor={{ false: "#CBD5E1", true: "#22C55E" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* SECTION 4: NOTIFICATIONS & SOUNDS */}
        <Text style={styles.sectionHeader}>Notifications & Sounds</Text>
        <View style={styles.cardGroup}>
          <View style={styles.rowItem}>
            <View style={[styles.iconBox, { backgroundColor: "#EFF6FF" }]}>
              <Bell size={18} color="#2563EB" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Text style={styles.rowSubtitle}>Alerts for messages, calls & posts</Text>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                settings.setPushNotifications(val);
              }}
              trackColor={{ false: "#CBD5E1", true: "#22C55E" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.rowItem}>
            <View style={[styles.iconBox, { backgroundColor: "#FDF2F8" }]}>
              <Volume2 size={18} color="#DB2777" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Notification Sound</Text>
              <Text style={styles.rowSubtitle}>Play sound on incoming message & call</Text>
            </View>
            <Switch
              value={settings.notificationSound}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                settings.setNotificationSound(val);
              }}
              trackColor={{ false: "#CBD5E1", true: "#22C55E" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconBox, { backgroundColor: "#F5F3FF" }]}>
              <Vibrate size={18} color="#7C3AED" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Vibration</Text>
              <Text style={styles.rowSubtitle}>Vibrate on incoming notification</Text>
            </View>
            <Switch
              value={settings.notificationVibration}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                settings.setNotificationVibration(val);
              }}
              trackColor={{ false: "#CBD5E1", true: "#22C55E" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* SECTION 5: APP PREFERENCES */}
        <Text style={styles.sectionHeader}>Preferences & Storage</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync();
              setThemeModalVisible(true);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: "#F1F5F9" }]}>
              <Moon size={18} color="#475569" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Dark Mode</Text>
              <Text style={styles.rowSubtitle}>
                {settings.darkMode === "system"
                  ? "System Default"
                  : settings.darkMode === "dark"
                  ? "On (Dark)"
                  : "Off (Light)"}
              </Text>
            </View>
            <ChevronRight size={18} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowItem, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={handleClearCache}
          >
            <View style={[styles.iconBox, { backgroundColor: "#ECFDF5" }]}>
              <Trash2 size={18} color="#059669" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Clear Cache</Text>
              <Text style={styles.rowSubtitle}>Free up temporary storage ({cacheSize})</Text>
            </View>
            {cacheClearing ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <Text style={styles.actionBadge}>Clear</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* SECTION 6: ACTIONS */}
        <Text style={styles.sectionHeader}>Account Actions</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <View style={[styles.iconBox, { backgroundColor: "#FEF2F2" }]}>
              <LogOut size={18} color="#EF4444" />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: "#EF4444", fontWeight: "600" }]}>
                Log Out
              </Text>
              <Text style={styles.rowSubtitle}>Log out of this device</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowItem, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={handleDeleteAccount}
          >
            <View style={[styles.iconBox, { backgroundColor: "#FFF1F2" }]}>
              <Trash2 size={18} color="#BE123C" />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowTitle, { color: "#BE123C", fontWeight: "600" }]}>
                Delete Account
              </Text>
              <Text style={styles.rowSubtitle}>Permanently wipe your account & data</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer Version Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Stalk Social & Messenger v1.0.0</Text>
          <Text style={styles.footerSub}>Protected by End-to-End Encryption & Security</Text>
        </View>
      </ScrollView>

      {/* MODAL 1: CHANGE PASSWORD */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalSubtitle}>
              Ensure your new password is at least 6 characters long.
            </Text>

            {/* Current Password */}
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Current Password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showCurrentPass}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPass(!showCurrentPass)}
                style={styles.eyeBtn}
              >
                {showCurrentPass ? (
                  <EyeOff size={20} color="#64748B" />
                ) : (
                  <Eye size={20} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showNewPass}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity
                onPress={() => setShowNewPass(!showNewPass)}
                style={styles.eyeBtn}
              >
                {showNewPass ? (
                  <EyeOff size={20} color="#64748B" />
                ) : (
                  <Eye size={20} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showNewPass}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: EDIT PROFILE DETAILS */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Personal Information</Text>
            <Text style={styles.modalSubtitle}>Update your display name and public bio.</Text>

            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#94A3B8"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={[styles.inputWrap, { height: 90, alignItems: "flex-start" }]}>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="Bio (e.g. Dreamer, Developer)"
                placeholderTextColor="#94A3B8"
                multiline
                maxLength={200}
                value={bio}
                onChangeText={setBio}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setProfileModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleUpdateProfile}
                disabled={profileLoading}
              >
                {profileLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: THEME SELECTOR */}
      <Modal
        visible={themeModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setThemeModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Dark Mode</Text>
            <Text style={styles.modalSubtitle}>Choose your preferred app appearance</Text>

            {(["system", "light", "dark"] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={styles.optionRow}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.selectionAsync();
                  settings.setDarkMode(mode);
                  setThemeModalVisible(false);
                }}
              >
                <Text style={styles.optionText}>
                  {mode === "system"
                    ? "System Default"
                    : mode === "light"
                    ? "Off (Light Mode)"
                    : "On (Dark Mode)"}
                </Text>
                {settings.darkMode === mode && <Check size={20} color="#2563EB" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 4: AUDIENCE SELECTOR */}
      <Modal
        visible={audienceModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAudienceModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAudienceModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Default Audience</Text>
            <Text style={styles.modalSubtitle}>Who can see your posts and profile?</Text>

            {(
              [
                { key: "public", label: "Public (Anyone on Stalk)" },
                { key: "friends", label: "Friends Only" },
                { key: "only_me", label: "Only Me (Private)" },
              ] as const
            ).map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.optionRow}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.selectionAsync();
                  settings.setProfileAudience(item.key);
                  setAudienceModalVisible(false);
                }}
              >
                <Text style={styles.optionText}>{item.label}</Text>
                {settings.profileAudience === item.key && (
                  <Check size={20} color="#2563EB" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E2E8F0",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  profileUsername: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  profileActionText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowContent: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  rowSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  actionBadge: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  footerSub: {
    fontSize: 11,
    color: "#CBD5E1",
    marginTop: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 16,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  eyeBtn: {
    padding: 6,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  modalSaveBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#0F172A",
  },
});
