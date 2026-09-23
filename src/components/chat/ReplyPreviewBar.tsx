import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { X, CornerUpLeft, FileText, Film, Camera } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { IMessage } from "../../interfaces/message.interface";
import { getMediaUrl } from "../../utils/media";

interface ReplyPreviewBarProps {
  replyMessage: IMessage | null;
  onCancelReply: () => void;
}

export const ReplyPreviewBar: React.FC<ReplyPreviewBarProps> = ({
  replyMessage,
  onCancelReply,
}) => {
  if (!replyMessage) return null;

  const isImage = replyMessage.messageType === "image";
  const isVideo = replyMessage.messageType === "video";
  const isFile = replyMessage.messageType === "file";
  const hasMediaThumbnail = (isImage || isVideo) && Boolean(replyMessage.mediaUrl);

  const getPreviewText = () => {
    if (isImage) return "📷 Photo";
    if (isVideo) return "🎥 Video";
    if (isFile) {
      return `📎 ${replyMessage.fileName || "File"}`;
    }
    return replyMessage.message || "Message";
  };

  const handleCancel = () => {
    Haptics.selectionAsync();
    onCancelReply();
  };

  return (
    <View style={styles.container}>
      <View style={styles.accentBar} />

      {/* Media thumbnail if replying to photo/video */}
      {hasMediaThumbnail ? (
        <Image
          source={{ uri: getMediaUrl(replyMessage.mediaUrl!) }}
          style={styles.mediaThumbnail}
          contentFit="cover"
        />
      ) : isFile ? (
        <View style={styles.fileIconBadge}>
          <FileText size={18} color="#0A7CFF" />
        </View>
      ) : null}

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <CornerUpLeft size={13} color="#0A7CFF" />
          <Text style={styles.replyingTo}>
            Replying to <Text style={styles.senderName}>{replyMessage.senderName || "User"}</Text>
          </Text>
        </View>
        <Text style={styles.snippet} numberOfLines={1}>
          {getPreviewText()}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.closeBtn}
        activeOpacity={0.7}
        onPress={handleCancel}
      >
        <X size={16} color="#64748B" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: "#E4E6EB",
    gap: 10,
  },
  accentBar: {
    width: 3.5,
    height: "100%",
    minHeight: 36,
    borderRadius: 2,
    backgroundColor: "#0A7CFF",
  },
  mediaThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  fileIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  replyingTo: {
    fontSize: 12,
    color: "#65676B",
  },
  senderName: {
    fontWeight: "700",
    color: "#0A7CFF",
  },
  snippet: {
    fontSize: 13,
    color: "#050505",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E4E6EB",
    alignItems: "center",
    justifyContent: "center",
  },
});
