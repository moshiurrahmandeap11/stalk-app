import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Share,
  ActivityIndicator,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Send, Link2, Share2, Check } from "lucide-react-native";
import { IPost } from "../../interfaces/post.interface";
import { postService } from "../../services/post.service";
import { AppBottomSheetModal } from "../ui/AppBottomSheetModal";

interface ShareModalProps {
  visible: boolean;
  post: IPost;
  onClose: () => void;
  onShared?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  post,
  onClose,
  onShared,
}) => {
  const [description, setDescription] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showFeedInput, setShowFeedInput] = useState(false);

  const postUrl = `https://stalk.com/post/details/${post.id || post._id}`;

  const handleShareToFeed = async () => {
    setIsSharing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await postService.sharePost(post.id || (post as any)._id, description.trim() || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDescription("");
      setShowFeedInput(false);
      onClose();
      onShared?.();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(postUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
      onClose();
    }, 1200);
  };

  const handleNativeShare = async () => {
    Haptics.selectionAsync();
    try {
      await Share.share({
        message: post.description ? `${post.description}\n\n${postUrl}` : postUrl,
        url: postUrl,
      });
      onClose();
    } catch {}
  };

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Share Post"
      showCloseButton={true}
      showHandle={true}
      transparentBackdrop={true}
      avoidKeyboard={true}
    >
      {/* Feed Share Composer (if expanded) */}
      {showFeedInput ? (
        <View style={styles.composerBox}>
          <TextInput
            style={styles.input}
            placeholder="Say something about this post..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            autoFocus
          />
          <View style={styles.composerActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowFeedInput(false)}
            >
              <Text style={styles.cancelBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleShareToFeed}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Share to Feed</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Action Items */
        <View style={styles.actionsList}>
          {/* Share to Feed */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setShowFeedInput(true)}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
              <Send size={20} color="#2563EB" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Share to Your Feed</Text>
            </View>
          </TouchableOpacity>

          {/* Copy Link */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleCopyLink}
          >
            <View style={[styles.iconCircle, { backgroundColor: isCopied ? "#DCFCE7" : "#F1F5F9" }]}>
              {isCopied ? (
                <Check size={20} color="#16A34A" />
              ) : (
                <Link2 size={20} color="#0F172A" />
              )}
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={[styles.actionTitle, isCopied && { color: "#16A34A" }]}>
                {isCopied ? "Link Copied to Clipboard!" : "Copy Post Link"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Native Share */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleNativeShare}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#F5F3FF" }]}>
              <Share2 size={20} color="#7C3AED" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Share via other apps...</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </AppBottomSheetModal>
  );
};

const styles = StyleSheet.create({
  actionsList: {
    gap: 10,
    marginVertical: 4,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  composerBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 4,
  },
  input: {
    fontSize: 15,
    color: "#0F172A",
    minHeight: 80,
    textAlignVertical: "top",
  },
  composerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelBtnText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
