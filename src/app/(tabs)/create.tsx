import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import {
  Camera,
  Image as ImageIcon,
  Video,
  X,
  Send,
  Globe,
  Users,
  Lock,
  Smile,
  MapPin,
  Hash,
  Play,
  Check,
  ChevronDown,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { postService } from "../../services/post.service";
import { useAuthStore } from "../../store/auth.store";
import { Storage } from "../../utils/storage";
import { prependToFeedCache } from "../../utils/feedCache";

const TRENDING_HASHTAGS = [
  "#stalk",
  "#bangladesh",
  "#tech",
  "#trending",
  "#vibes",
  "#photography",
  "#reels",
  "#dev",
];

const FEELINGS = [
  { emoji: "😊", label: "Happy" },
  { emoji: "🔥", label: "Excited" },
  { emoji: "💡", label: "Inspired" },
  { emoji: "☕", label: "Relaxed" },
  { emoji: "🎧", label: "Listening" },
  { emoji: "🚀", label: "Building" },
  { emoji: "🌟", label: "Blessed" },
];

export default function CreatePostTabScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [description, setDescription] = useState("");
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [privacy, setPrivacy] = useState<"public" | "friends" | "only_me">("public");
  const [selectedFeeling, setSelectedFeeling] = useState<{ emoji: string; label: string } | null>(null);
  const [location, setLocation] = useState<string | null>(null);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gallery Picker
  const handlePickMedia = async (mediaType: "images" | "videos") => {
    Haptics.selectionAsync();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photos and videos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === "images" ? ["images"] : ["videos"],
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setMedia(result.assets[0]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Camera Capture
  const handleCaptureCamera = async () => {
    Haptics.selectionAsync();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your camera to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setMedia(result.assets[0]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Insert Hashtag
  const handleAddHashtag = (tag: string) => {
    Haptics.selectionAsync();
    setDescription((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${tag} ` : `${tag} `;
    });
  };

  // Discard Post
  const handleDiscard = () => {
    if (description.trim() || media) {
      Alert.alert("Discard Post?", "You have unsaved changes that will be lost.", [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setDescription("");
            setMedia(null);
            setSelectedFeeling(null);
            setLocation(null);
            router.replace("/(tabs)" as any);
          },
        },
      ]);
    } else {
      router.replace("/(tabs)" as any);
    }
  };

  // Publish Post
  const handlePublish = async () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to publish a post.", [
        { text: "Sign In", onPress: () => router.push("/login" as any) },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }

    if (!description.trim() && !media) {
      Alert.alert("Empty Post", "Please write a caption or attach media.");
      return;
    }

    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const formData = new FormData();

      let fullDescription = description.trim();
      if (selectedFeeling) {
        fullDescription = `${fullDescription} — feeling ${selectedFeeling.label} ${selectedFeeling.emoji}`;
      }
      if (location) {
        fullDescription = `${fullDescription} 📍 ${location}`;
      }

      formData.append("description", fullDescription);

      if (media) {
        const fileExt = media.uri.split(".").pop() || "jpg";
        const isVid = media.type === "video";
        const fileObj = {
          uri: media.uri,
          name: `upload_${Date.now()}.${fileExt}`,
          type: isVid ? "video/mp4" : "image/jpeg",
        } as any;
        // Server expects field name "media"
        formData.append("media", fileObj);
      }

      const newPost = await postService.createPost(formData);

      if (newPost) {
        queryClient.setQueryData(["posts", 1], (old: any) => {
          if (!old?.data) return { data: [newPost], meta: { total: 1, page: 1 } };
          return {
            ...old,
            data: [newPost, ...old.data.filter((p: any) => p.id !== newPost.id)],
            meta: { ...old.meta, total: (old.meta?.total || 0) + 1 },
          };
        });

        await prependToFeedCache(newPost);
      }

      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setDescription("");
      setMedia(null);
      setSelectedFeeling(null);
      setLocation(null);

      router.replace("/(tabs)" as any);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to publish post.";
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarUri =
    user?.profilePicUrl ||
    user?.avatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={handleDiscard} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.navTitle}>New Post</Text>

          <TouchableOpacity
            style={[
              styles.publishBtn,
              (!description.trim() && !media) && styles.publishBtnDisabled,
            ]}
            onPress={handlePublish}
            disabled={isSubmitting || (!description.trim() && !media)}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.publishBtnContent}>
                <Send size={14} color="#FFFFFF" />
                <Text style={styles.publishBtnText}>Publish</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* User Profile & Privacy Row */}
          <View style={styles.authorSection}>
            <Image source={{ uri: avatarUri }} style={styles.userAvatar} contentFit="cover" />
            <View style={styles.authorDetails}>
              <View style={styles.authorNameRow}>
                <Text style={styles.userName}>{user?.fullName || "Guest User"}</Text>
                {selectedFeeling && (
                  <TouchableOpacity
                    style={styles.feelingBadge}
                    onPress={() => setSelectedFeeling(null)}
                  >
                    <Text style={styles.feelingBadgeText}>
                      feeling {selectedFeeling.label} {selectedFeeling.emoji}
                    </Text>
                    <X size={12} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Privacy Selector Pill */}
              <TouchableOpacity
                style={styles.privacyPill}
                activeOpacity={0.7}
                onPress={() => setShowPrivacyModal(true)}
              >
                {privacy === "public" ? (
                  <Globe size={13} color="#2563EB" />
                ) : privacy === "friends" ? (
                  <Users size={13} color="#2563EB" />
                ) : (
                  <Lock size={13} color="#2563EB" />
                )}
                <Text style={styles.privacyText}>
                  {privacy === "public"
                    ? "Public"
                    : privacy === "friends"
                    ? "Friends"
                    : "Only Me"}
                </Text>
                <ChevronDown size={12} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Chip (if added) */}
          {location && (
            <View style={styles.locationChip}>
              <MapPin size={13} color="#2563EB" />
              <Text style={styles.locationChipText}>{location}</Text>
              <TouchableOpacity onPress={() => setLocation(null)}>
                <X size={13} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {/* Caption Input */}
          <TextInput
            placeholder="What's on your mind? Share your thoughts, links or stories..."
            placeholderTextColor="#94A3B8"
            style={styles.textInput}
            value={description}
            onChangeText={setDescription}
            multiline
            autoFocus
            maxLength={2000}
          />

          {/* Character Count */}
          <View style={styles.counterRow}>
            <Text style={styles.counterText}>{description.length} / 2000</Text>
          </View>

          {/* Media Preview Box */}
          {media ? (
            <View
              style={[
                styles.mediaCard,
                {
                  aspectRatio:
                    media.width && media.height
                      ? Math.max(0.75, Math.min(media.width / media.height, 1.91))
                      : 1,
                },
              ]}
            >
              <Image source={{ uri: media.uri }} style={styles.previewImage} contentFit="cover" />
              {media.type === "video" && (
                <View style={styles.videoBadge}>
                  <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.videoBadgeText}>VIDEO</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeMediaBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setMedia(null);
                }}
              >
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Quick Hashtags Scroller */}
          <View style={styles.hashtagSection}>
            <View style={styles.sectionHeader}>
              <Hash size={14} color="#64748B" />
              <Text style={styles.sectionTitle}>Trending Hashtags</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hashtagRow}
            >
              {TRENDING_HASHTAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.hashtagChip}
                  onPress={() => handleAddHashtag(tag)}
                >
                  <Text style={styles.hashtagChipText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Media & Attachments Bar */}
          <View style={styles.attachmentBar}>
            <Text style={styles.attachmentTitle}>Add to your post</Text>
            <View style={styles.attachmentGrid}>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={() => handlePickMedia("images")}
              >
                <View style={[styles.attachIconBg, { backgroundColor: "#ECFDF5" }]}>
                  <ImageIcon size={20} color="#10B981" />
                </View>
                <Text style={styles.attachBtnLabel}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachBtn}
                onPress={() => handlePickMedia("videos")}
              >
                <View style={[styles.attachIconBg, { backgroundColor: "#FEF2F2" }]}>
                  <Video size={20} color="#EF4444" />
                </View>
                <Text style={styles.attachBtnLabel}>Video</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handleCaptureCamera}
              >
                <View style={[styles.attachIconBg, { backgroundColor: "#EFF6FF" }]}>
                  <Camera size={20} color="#3B82F6" />
                </View>
                <Text style={styles.attachBtnLabel}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachBtn}
                onPress={() => setShowFeelingModal(true)}
              >
                <View style={[styles.attachIconBg, { backgroundColor: "#FFFBEB" }]}>
                  <Smile size={20} color="#F59E0B" />
                </View>
                <Text style={styles.attachBtnLabel}>Feeling</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachBtn}
                onPress={() => setShowLocationInput(true)}
              >
                <View style={[styles.attachIconBg, { backgroundColor: "#F5F3FF" }]}>
                  <MapPin size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.attachBtnLabel}>Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Privacy Selection Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPrivacyModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalHeading}>Who can see your post?</Text>

                <TouchableOpacity
                  style={[styles.modalOption, privacy === "public" && styles.modalOptionActive]}
                  onPress={() => {
                    setPrivacy("public");
                    setShowPrivacyModal(false);
                    Haptics.selectionAsync();
                  }}
                >
                  <Globe size={20} color={privacy === "public" ? "#2563EB" : "#64748B"} />
                  <View style={styles.modalOptionText}>
                    <Text style={styles.modalOptionTitle}>Public</Text>
                    <Text style={styles.modalOptionDesc}>Anyone on or off Stalk</Text>
                  </View>
                  {privacy === "public" && <Check size={18} color="#2563EB" />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalOption, privacy === "friends" && styles.modalOptionActive]}
                  onPress={() => {
                    setPrivacy("friends");
                    setShowPrivacyModal(false);
                    Haptics.selectionAsync();
                  }}
                >
                  <Users size={20} color={privacy === "friends" ? "#2563EB" : "#64748B"} />
                  <View style={styles.modalOptionText}>
                    <Text style={styles.modalOptionTitle}>Friends</Text>
                    <Text style={styles.modalOptionDesc}>Your mutual friends on Stalk</Text>
                  </View>
                  {privacy === "friends" && <Check size={18} color="#2563EB" />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalOption, privacy === "only_me" && styles.modalOptionActive]}
                  onPress={() => {
                    setPrivacy("only_me");
                    setShowPrivacyModal(false);
                    Haptics.selectionAsync();
                  }}
                >
                  <Lock size={20} color={privacy === "only_me" ? "#2563EB" : "#64748B"} />
                  <View style={styles.modalOptionText}>
                    <Text style={styles.modalOptionTitle}>Only Me</Text>
                    <Text style={styles.modalOptionDesc}>Private to you only</Text>
                  </View>
                  {privacy === "only_me" && <Check size={18} color="#2563EB" />}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Feeling / Mood Modal */}
      <Modal
        visible={showFeelingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeelingModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowFeelingModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalHeading}>How are you feeling?</Text>
                <View style={styles.feelingsGrid}>
                  {FEELINGS.map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      style={styles.feelingItem}
                      onPress={() => {
                        setSelectedFeeling(item);
                        setShowFeelingModal(false);
                        Haptics.selectionAsync();
                      }}
                    >
                      <Text style={styles.feelingEmoji}>{item.emoji}</Text>
                      <Text style={styles.feelingLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Location Modal */}
      <Modal
        visible={showLocationInput}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationInput(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowLocationInput(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalHeading}>Add Location</Text>
                <TextInput
                  style={styles.locationInput}
                  placeholder="e.g. Dhaka, Bangladesh"
                  placeholderTextColor="#94A3B8"
                  value={locationInput}
                  onChangeText={setLocationInput}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setShowLocationInput(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSaveBtn}
                    onPress={() => {
                      if (locationInput.trim()) {
                        setLocation(locationInput.trim());
                        setLocationInput("");
                      }
                      setShowLocationInput(false);
                      Haptics.selectionAsync();
                    }}
                  >
                    <Text style={styles.modalSaveText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  publishBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  publishBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  publishBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  publishBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13.5,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  authorSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E2E8F0",
  },
  authorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  userName: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  feelingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  feelingBadgeText: {
    fontSize: 11.5,
    color: "#92400E",
    fontWeight: "600",
  },
  privacyPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
  },
  privacyText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#2563EB",
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 8,
  },
  locationChipText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },
  textInput: {
    fontSize: 16,
    color: "#0F172A",
    minHeight: 140,
    textAlignVertical: "top",
    lineHeight: 24,
    marginTop: 6,
  },
  counterRow: {
    alignItems: "flex-end",
    marginBottom: 10,
  },
  counterText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  mediaCard: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
    marginBottom: 16,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  videoBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  videoBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  removeMediaBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  hashtagSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  hashtagRow: {
    flexDirection: "row",
    gap: 8,
  },
  hashtagChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  hashtagChipText: {
    fontSize: 12.5,
    color: "#2563EB",
    fontWeight: "600",
  },
  attachmentBar: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 14,
    marginTop: "auto",
  },
  attachmentTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 12,
  },
  attachmentGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  attachBtn: {
    alignItems: "center",
    gap: 6,
  },
  attachIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  attachBtnLabel: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 12,
  },
  modalOptionActive: {
    backgroundColor: "#EFF6FF",
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  modalOptionDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  feelingsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  feelingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  feelingEmoji: {
    fontSize: 18,
  },
  feelingLabel: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "600",
  },
  locationInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalCancelText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
