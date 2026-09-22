import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  LogOut,
  LogIn,
  UserPlus,
  Settings,
  MapPin,
  Globe,
  Share2,
  Calendar,
} from "lucide-react-native";
import { useAuthStore } from "../../store/auth.store";

export default function ProfileTabScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Stalk?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.guestContainer} edges={["top"]}>
        <View style={styles.guestCard}>
          <View style={styles.guestAvatarPlaceholder}>
            <UserPlus size={44} color="#3B82F6" />
          </View>
          <Text style={styles.guestTitle}>Join Stalk</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to view your profile, share moments, upvote posts, and chat with friends!
          </Text>

          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => router.push("/login" as any)}
          >
            <LogIn size={18} color="#FFFFFF" />
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signUpBtn}
            onPress={() => router.push("/register" as any)}
          >
            <Text style={styles.signUpBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avatarUri =
    user.profilePicUrl ||
    user.avatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

  const coverUri =
    user.coverPhotoUrl ||
    user.coverImage ||
    "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?w=800";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cover Photo */}
        <View style={styles.coverWrapper}>
          <Image source={{ uri: coverUri }} style={styles.coverPhoto} contentFit="cover" />
          <SafeAreaView style={styles.coverOverlay} edges={["top"]}>
            <TouchableOpacity style={styles.logoutTopBtn} onPress={handleLogout}>
              <LogOut size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.shareProfileBtn}
              onPress={() => router.push(`/s/${user.username}` as any)}
            >
              <Share2 size={16} color="#0F172A" />
              <Text style={styles.shareProfileText}>Public View</Text>
            </TouchableOpacity>
          </View>

          {/* User Names */}
          <Text style={styles.fullName}>{user.fullName}</Text>
          <Text style={styles.username}>@{user.username || "user"}</Text>

          {/* Bio */}
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          {/* Metadata */}
          <View style={styles.metaRow}>
            {user.location ? (
              <View style={styles.metaItem}>
                <MapPin size={14} color="#64748B" />
                <Text style={styles.metaText}>{user.location}</Text>
              </View>
            ) : null}
            {user.website ? (
              <View style={styles.metaItem}>
                <Globe size={14} color="#3B82F6" />
                <Text style={[styles.metaText, { color: "#3B82F6" }]}>{user.website}</Text>
              </View>
            ) : null}
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followersCount || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.friendsCount || 0}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
          </View>

          {/* Account Settings Menu */}
          <View style={styles.menuSection}>
            <Text style={styles.menuHeader}>Account</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <LogOut size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  guestContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  guestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  guestAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  guestSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 24,
  },
  signInBtn: {
    width: "100%",
    backgroundColor: "#3B82F6",
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  signUpBtn: {
    width: "100%",
    backgroundColor: "#F1F5F9",
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpBtnText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
  },
  coverWrapper: {
    height: 180,
    width: "100%",
    backgroundColor: "#CBD5E1",
  },
  coverPhoto: {
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    position: "absolute",
    top: 12,
    right: 16,
  },
  logoutTopBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    marginTop: -52,
    backgroundColor: "#E2E8F0",
  },
  actionRow: {
    position: "absolute",
    top: 16,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  shareProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shareProfileText: {
    color: "#0F172A",
    fontWeight: "600",
    fontSize: 13,
  },
  fullName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
  },
  username: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
    marginTop: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#64748B",
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
  menuSection: {
    marginTop: 28,
  },
  menuHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
});

