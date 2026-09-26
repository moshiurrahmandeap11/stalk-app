import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { FileText, Play, X, Download } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { IMessage } from "../../interfaces/message.interface";
import { getMediaUrl } from "../../utils/media";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface MediaMessageViewProps {
  message: IMessage;
  isMine: boolean;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "File";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export const MediaMessageView: React.FC<MediaMessageViewProps> = ({ message, isMine }) => {
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [fullscreenVideo, setFullscreenVideo] = useState(false);

  const rawUri = message.mediaUrl || "";
  const mediaUri = getMediaUrl(rawUri);

  const isImage =
    message.messageType === "image" ||
    /\.(jpg|jpeg|png|gif|webp|heic|bmp|svg)$/i.test(rawUri);

  const isVideo =
    message.messageType === "video" ||
    /\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(rawUri);

  const isDoc =
    message.messageType === "file" ||
    (message.messageType as string) === "document" ||
    Boolean(!isImage && !isVideo && (rawUri || message.fileName));

  const videoPlayer = useVideoPlayer(isVideo ? mediaUri : "", (p) => {
    p.loop = true;
    p.muted = false;
  });

  if (isImage && mediaUri) {
    return (
      <View style={styles.imageWrapper}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setFullscreenImage(true)}
          style={styles.imageTouch}
        >
          <Image
            source={{ uri: mediaUri }}
            style={styles.mediaImage}
            contentFit="cover"
            transition={200}
          />
        </TouchableOpacity>

        {/* Fullscreen Image Lightbox Modal */}
        <Modal
          visible={fullscreenImage}
          transparent={false}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setFullscreenImage(false)}
        >
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.fullscreenContainer}>
            <SafeAreaView edges={["top"]} style={styles.lightboxHeader}>
              <TouchableOpacity
                style={styles.lightboxCloseBtn}
                onPress={() => setFullscreenImage(false)}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.lightboxTitle} numberOfLines={1}>
                {message.senderName || "Photo"}
              </Text>
              <View style={{ width: 40 }} />
            </SafeAreaView>

            <Image
              source={{ uri: mediaUri }}
              style={styles.fullscreenImage}
              contentFit="contain"
            />
          </View>
        </Modal>
      </View>
    );
  }

  if (isVideo && mediaUri) {
    return (
      <View style={styles.videoWrapper}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setFullscreenVideo(true);
            videoPlayer.play();
          }}
          style={styles.videoPreview}
        >
          <View style={styles.videoPlaceholder}>
            <View style={styles.playIconCircle}>
              <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Fullscreen Video Modal */}
        <Modal
          visible={fullscreenVideo}
          transparent={false}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {
            videoPlayer.pause();
            setFullscreenVideo(false);
          }}
        >
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.fullscreenContainer}>
            <SafeAreaView edges={["top"]} style={styles.lightboxHeader}>
              <TouchableOpacity
                style={styles.lightboxCloseBtn}
                onPress={() => {
                  videoPlayer.pause();
                  setFullscreenVideo(false);
                }}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.lightboxTitle} numberOfLines={1}>
                {message.senderName || "Video"}
              </Text>
              <View style={{ width: 40 }} />
            </SafeAreaView>

            <VideoView
              player={videoPlayer}
              style={styles.fullscreenVideo}
              contentFit="contain"
              nativeControls={true}
            />
          </View>
        </Modal>
      </View>
    );
  }

  if (isDoc || rawUri || message.fileName) {
    const displayFileName =
      message.fileName ||
      (rawUri ? rawUri.split("/").pop()?.split("?")[0] : null) ||
      "Document";

    return (
      <TouchableOpacity
        style={[styles.fileCard, isMine ? styles.fileCardMine : styles.fileCardTheirs]}
        activeOpacity={0.8}
        onPress={() => {
          if (mediaUri) {
            WebBrowser.openBrowserAsync(mediaUri);
          }
        }}
      >
        <View style={[styles.fileIconWrapper, isMine && styles.fileIconWrapperMine]}>
          <FileText size={22} color={isMine ? "#FFFFFF" : "#0A7CFF"} />
        </View>
        <View style={styles.fileDetails}>
          <Text
            style={[styles.fileName, isMine && styles.textWhite]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {displayFileName}
          </Text>
          <Text style={[styles.fileSize, isMine ? styles.textWhiteSub : styles.textGrey]}>
            {formatBytes(message.fileSize)}
          </Text>
        </View>
        <Download size={18} color={isMine ? "#FFFFFF" : "#64748B"} />
      </TouchableOpacity>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  imageWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 2,
  },
  imageTouch: {
    width: 220,
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  videoWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 2,
  },
  videoPreview: {
    width: 220,
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
  },
  playIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 10,
    minWidth: 210,
    maxWidth: 270,
  },
  fileCardMine: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  fileCardTheirs: {
    backgroundColor: "#F0F2F5",
    borderWidth: 1,
    borderColor: "#E4E6EB",
  },
  fileIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E7F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconWrapperMine: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  fileDetails: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#050505",
  },
  fileSize: {
    fontSize: 12,
  },
  textWhite: {
    color: "#FFFFFF",
  },
  textWhiteSub: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  textGrey: {
    color: "#65676B",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
  },
  lightboxHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 10,
  },
  lightboxCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
