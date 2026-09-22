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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Camera, Image as ImageIcon, Video, X, Send } from "lucide-react-native";
import { postService } from "../../services/post.service";
import { useAuthStore } from "../../store/auth.store";

export default function CreatePostTabScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickMedia = async (mediaType: "images" | "videos") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photos/videos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        mediaType === "images"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setMedia(result.assets[0]);
    }
  };

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
      const formData = new FormData();
      formData.append("description", description.trim());

      if (media) {
        const fileExt = media.uri.split(".").pop() || "jpg";
        const isVid = media.type === "video";
        const fileObj = {
          uri: media.uri,
          name: `upload_${Date.now()}.${fileExt}`,
          type: isVid ? "video/mp4" : "image/jpeg",
        } as any;
        formData.append("file", fileObj);
      }

      await postService.createPost(formData);
      setDescription("");
      setMedia(null);
      Alert.alert("Success", "Your post has been published!");
      router.push("/" as any);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to publish post.";
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
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Post</Text>
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
                <Text style={styles.publishBtnText}>Publish</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* User Info Row */}
          <View style={styles.userRow}>
            <Image source={{ uri: avatarUri }} style={styles.userAvatar} contentFit="cover" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.userName}>{user?.fullName || "Guest User"}</Text>
              <Text style={styles.userHandle}>
                @{user?.username || "guest"} • Public
              </Text>
            </View>
          </View>

          {/* Caption Input */}
          <TextInput
            placeholder="What's happening on Stalk today?"
            placeholderTextColor="#94A3B8"
            style={styles.textInput}
            value={description}
            onChangeText={setDescription}
            multiline
            autoFocus
          />

          {/* Media Preview Box */}
          {media ? (
            <View style={styles.previewBox}>
              <Image source={{ uri: media.uri }} style={styles.previewImage} contentFit="cover" />
              <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setMedia(null)}>
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Media Attachment Options */}
          <View style={styles.attachmentBar}>
            <Text style={styles.attachmentTitle}>Add to your post</Text>
            <View style={styles.attachmentActions}>
              <TouchableOpacity
                style={styles.attachmentBtn}
                onPress={() => handlePickMedia("images")}
              >
                <ImageIcon size={22} color="#10B981" />
                <Text style={styles.attachmentText}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachmentBtn}
                onPress={() => handlePickMedia("videos")}
              >
                <Video size={22} color="#EF4444" />
                <Text style={styles.attachmentText}>Video</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    padding: 16,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  publishBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  publishBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  userHandle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 1,
  },
  textInput: {
    fontSize: 16,
    color: "#0F172A",
    minHeight: 120,
    marginTop: 16,
    textAlignVertical: "top",
    lineHeight: 24,
  },
  previewBox: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    marginVertical: 16,
    backgroundColor: "#F1F5F9",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeMediaBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentBar: {
    marginTop: "auto",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  attachmentTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 10,
  },
  attachmentActions: {
    flexDirection: "row",
    gap: 12,
  },
  attachmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  attachmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
});

