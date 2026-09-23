import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { X, MessageCircle, ArrowUp } from "lucide-react-native";
import { IPost } from "../../interfaces/post.interface";
import { getMediaUrl } from "../../utils/media";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ImageViewerModalProps {
  visible: boolean;
  post: IPost;
  onClose: () => void;
  onPressComment?: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  post,
  onClose,
  onPressComment,
}) => {
  const [showControls, setShowControls] = useState(true);

  if (!visible) return null;

  const rawMediaUri = post.media?.url || post.mediaUrl || "";
  const mediaUri = getMediaUrl(rawMediaUri);

  const authorName = post.userName || post.user?.fullName || "User";
  const authorHandle = post.username || post.user?.username || authorName.toLowerCase().replace(/\s+/g, "");
  const avatarUri = getMediaUrl(
    post.userProfilePicture ||
      post.user?.profilePicUrl ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
  );

  const toggleControls = () => {
    setShowControls((prev) => !prev);
  };

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Fullscreen Image Content */}
        <TouchableWithoutFeedback onPress={toggleControls}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: mediaUri }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          </View>
        </TouchableWithoutFeedback>

        {/* Top Header Overlay */}
        {showControls && (
          <SafeAreaView edges={["top"]} style={styles.topHeader}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.closeBtn}
                activeOpacity={0.8}
                onPress={handleClose}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.authorInfo}>
                <Image source={{ uri: avatarUri }} style={styles.authorAvatar} contentFit="cover" />
                <View>
                  <Text style={styles.authorName} numberOfLines={1}>
                    {authorName}
                  </Text>
                  <Text style={styles.authorHandle} numberOfLines={1}>
                    @{authorHandle}
                  </Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        )}

        {/* Bottom Description & Actions Overlay */}
        {showControls && (
          <SafeAreaView edges={["bottom"]} style={styles.bottomOverlay}>
            <View style={styles.bottomContent}>
              {post.description ? (
                <ScrollView style={styles.descriptionScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.descriptionText}>{post.description}</Text>
                </ScrollView>
              ) : null}

              <View style={styles.actionRow}>
                <View style={styles.actionItem}>
                  <ArrowUp size={18} color="#FFFFFF" />
                  <Text style={styles.actionText}>{post.likesCount || post.likes?.length || 0}</Text>
                </View>

                <TouchableOpacity
                  style={styles.actionItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    handleClose();
                    onPressComment?.();
                  }}
                >
                  <MessageCircle size={18} color="#FFFFFF" />
                  <Text style={styles.actionText}>
                    {post.commentsCount || post.comments?.length || 0} Comments
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  authorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  authorHandle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 10,
  },
  bottomContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  descriptionScroll: {
    maxHeight: 90,
  },
  descriptionText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingTop: 4,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

