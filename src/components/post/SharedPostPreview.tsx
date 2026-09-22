import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { IPost } from "../../interfaces/post.interface";
import { getMediaUrl } from "../../utils/media";

interface SharedPostPreviewProps {
  originalPost?: IPost | null;
  onPress?: () => void;
}

export const SharedPostPreview: React.FC<SharedPostPreviewProps> = ({ originalPost, onPress }) => {
  if (!originalPost) return null;

  const authorName = originalPost.userName || originalPost.user?.fullName || "User";
  const authorHandle = originalPost.username || originalPost.user?.username || "user";
  const avatarUri =
    getMediaUrl(originalPost.userProfilePicture || originalPost.user?.profilePicUrl) ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
  const mediaUri = getMediaUrl(originalPost.media?.url || originalPost.mediaUrl);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{authorName}</Text>
          <Text style={styles.handle}>@{authorHandle}</Text>
        </View>
      </View>

      {originalPost.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {originalPost.description}
        </Text>
      ) : null}

      {mediaUri ? (
        <Image
          source={{ uri: mediaUri }}
          style={styles.media}
          contentFit="cover"
          transition={200}
        />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  headerInfo: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  handle: {
    fontSize: 12,
    color: "#64748B",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: "#334155",
    marginBottom: 8,
  },
  media: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
});

