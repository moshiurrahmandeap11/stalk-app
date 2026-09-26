import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { X, Camera, Check, MapPin, Globe, Calendar, User, AlignLeft } from "lucide-react-native";
import { IUser } from "../../interfaces/user.interface";
import { userService } from "../../services/user.service";
import { useAuthStore } from "../../store/auth.store";
import { getMediaUrl, DEFAULT_AVATAR, DEFAULT_COVER } from "../../utils/media";

interface EditProfileModalProps {
  visible: boolean;
  user: IUser;
  onClose: () => void;
  onProfileUpdated?: (updated: IUser) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  user,
  onClose,
  onProfileUpdated,
}) => {
  const updateUserStore = useAuthStore((s) => s.updateUser);
  const refreshUserStore = useAuthStore((s) => s.refreshUser);

  const [fullName, setFullName] = useState(user.fullName || user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [location, setLocation] = useState(user.location || "");
  const [website, setWebsite] = useState(user.website || "");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">(
    (user.gender as "male" | "female" | "other") || ""
  );
  const [dob, setDob] = useState(
    user.dob ? new Date(user.dob).toISOString().split("T")[0] : ""
  );

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setFullName(user.fullName || user.name || "");
      setBio(user.bio || "");
      setLocation(user.location || "");
      setWebsite(user.website || "");
      setGender((user.gender as "male" | "female" | "other") || "");
      setDob(user.dob ? new Date(user.dob).toISOString().split("T")[0] : "");
      setAvatarUri(null);
      setCoverUri(null);
    }
  }, [visible, user]);

  const currentAvatar =
    avatarUri ||
    getMediaUrl(user.profilePicUrl || user.avatar) ||
    DEFAULT_AVATAR;

  const currentCover =
    coverUri ||
    getMediaUrl(user.coverPhotoUrl || user.coverImage) ||
    DEFAULT_COVER;

  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Please allow photo library access to change your avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        Haptics.selectionAsync();
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const handlePickCover = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Please allow photo library access to change your cover photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        Haptics.selectionAsync();
        setCoverUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Could not pick cover image.");
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Full Name is required.");
      return;
    }

    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const userId = user.id || (user as any)._id;

      // 1. Upload new Avatar if picked
      if (avatarUri) {
        const formData = new FormData();
        const uriParts = avatarUri.split(".");
        const ext = uriParts[uriParts.length - 1] || "jpg";
        (formData as any).append("profilePic", {
          uri: avatarUri,
          name: `avatar.${ext}`,
          type: `image/${ext === "jpg" ? "jpeg" : ext}`,
        });
        await userService.uploadProfilePic(formData);
      }

      // 2. Upload new Cover Photo if picked
      if (coverUri) {
        const formData = new FormData();
        const uriParts = coverUri.split(".");
        const ext = uriParts[uriParts.length - 1] || "jpg";
        (formData as any).append("coverPhoto", {
          uri: coverUri,
          name: `cover.${ext}`,
          type: `image/${ext === "jpg" ? "jpeg" : ext}`,
        });
        await userService.uploadCoverPhoto(formData);
      }

      // 3. Update Text Details
      const payload: Partial<IUser> = {
        fullName: fullName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        gender: gender || null,
        dob: dob.trim() || null,
      };

      const updated = await userService.updateUser(userId, payload);

      // 4. Sync store & callback
      if (updated) {
        await updateUserStore(updated);
        await refreshUserStore();
        onProfileUpdated?.(updated);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Profile updated successfully!");
      onClose();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.response?.data?.message || err.message || "Failed to update profile.";
      Alert.alert("Error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => !isSaving && onClose()}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSaving}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Edit Profile</Text>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Visual Cover Photo Picker */}
            <View style={styles.coverWrapper}>
              <Image source={{ uri: currentCover }} style={styles.coverPhoto} contentFit="cover" />
              <TouchableOpacity
                style={styles.changeCoverBtn}
                onPress={handlePickCover}
                activeOpacity={0.8}
              >
                <Camera size={16} color="#FFFFFF" />
                <Text style={styles.changeCoverText}>Edit Cover</Text>
              </TouchableOpacity>
            </View>

            {/* Visual Avatar Picker */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrapper}>
                <Image source={{ uri: currentAvatar }} style={styles.avatar} contentFit="cover" />
                <TouchableOpacity
                  style={styles.avatarCameraBadge}
                  onPress={handlePickAvatar}
                  activeOpacity={0.8}
                >
                  <Camera size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handlePickAvatar}>
                <Text style={styles.changeAvatarText}>Change profile photo</Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.form}>
              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Name</Text>
                <View style={styles.inputWrapper}>
                  <User size={18} color="#94A3B8" style={styles.fieldIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Your Full Name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Bio */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Bio</Text>
                <View style={[styles.inputWrapper, { height: 90, alignItems: "flex-start", paddingTop: 10 }]}>
                  <AlignLeft size={18} color="#94A3B8" style={[styles.fieldIcon, { marginTop: 2 }]} />
                  <TextInput
                    style={[styles.textInput, { height: 75, textAlignVertical: "top" }]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Write a bio to tell people about yourself..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    maxLength={500}
                  />
                </View>
                <Text style={styles.charCount}>{bio.length}/500</Text>
              </View>

              {/* Location */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Location</Text>
                <View style={styles.inputWrapper}>
                  <MapPin size={18} color="#94A3B8" style={styles.fieldIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. Dhaka, Bangladesh"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Website */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Website</Text>
                <View style={styles.inputWrapper}>
                  <Globe size={18} color="#94A3B8" style={styles.fieldIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={website}
                    onChangeText={setWebsite}
                    placeholder="https://yourwebsite.com"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>

              {/* Gender selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {(["male", "female", "other"] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderChip,
                        gender === g && styles.genderChipActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setGender(gender === g ? "" : g);
                      }}
                    >
                      <Text
                        style={[
                          styles.genderChipText,
                          gender === g && styles.genderChipTextActive,
                        ]}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date of Birth */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Date of Birth (YYYY-MM-DD)</Text>
                <View style={styles.inputWrapper}>
                  <Calendar size={18} color="#94A3B8" style={styles.fieldIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={dob}
                    onChangeText={setDob}
                    placeholder="YYYY-MM-DD (e.g. 2000-01-15)"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  cancelText: {
    fontSize: 15,
    color: "#64748B",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  saveBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 64,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  coverWrapper: {
    height: 140,
    width: "100%",
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  coverPhoto: {
    width: "100%",
    height: "100%",
  },
  changeCoverBtn: {
    position: "absolute",
    right: 14,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  changeCoverText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  avatarSection: {
    alignItems: "center",
    marginTop: -40,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "#E2E8F0",
  },
  avatarCameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#3B82F6",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  changeAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
  form: {
    paddingHorizontal: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 0,
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  genderRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  genderChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  genderChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  genderChipTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
});
