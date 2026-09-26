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
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Haptics from "expo-haptics";
import { FileText, Play, Pause, Mic, X, Download } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { IMessage } from "../../interfaces/message.interface";
import { getMediaUrl } from "../../utils/media";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface MediaMessageViewProps {
  message: IMessage;
  isMine: boolean;
}

function formatAudioTime(ms?: number | null): string {
  if (!ms || ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "File";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

const AudioMessagePlayer: React.FC<{ audioUri: string; isMine: boolean }> = ({
  audioUri,
  isMine,
}) => {
  const player = useAudioPlayer(audioUri ? { uri: audioUri } : null);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const currentTime = status.currentTime || 0;
  const duration = status.duration || 0;

  const handleTogglePlay = () => {
    try {
      Haptics.selectionAsync();
      if (isPlaying) {
        player.pause();
      } else {
        if (duration > 0 && currentTime >= duration) {
          player.seekTo(0).catch(() => {});
        }
        player.play();
      }
    } catch {
      // Non-blocking
    }
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const waveformHeights = [10, 16, 22, 14, 28, 20, 12, 26, 18, 24, 14, 20, 26, 16, 22, 12, 18, 10];

  return (
    <View style={[styles.audioCard, isMine ? styles.audioCardMine : styles.audioCardTheirs]}>
      <TouchableOpacity
        style={[styles.audioPlayBtn, isMine ? styles.audioPlayBtnMine : styles.audioPlayBtnTheirs]}
        activeOpacity={0.8}
        onPress={handleTogglePlay}
      >
        {isPlaying ? (
          <Pause
            size={18}
            color={isMine ? "#0A7CFF" : "#FFFFFF"}
            fill={isMine ? "#0A7CFF" : "#FFFFFF"}
          />
        ) : (
          <Play
            size={18}
            color={isMine ? "#0A7CFF" : "#FFFFFF"}
            fill={isMine ? "#0A7CFF" : "#FFFFFF"}
            style={{ marginLeft: 2 }}
          />
        )}
      </TouchableOpacity>

      <View style={styles.audioBody}>
        {/* Animated Waveform Visualization */}
        <View style={styles.waveformContainer}>
          {waveformHeights.map((h, i) => {
            const barProgress = i / waveformHeights.length;
            const isPlayed = barProgress <= progress;
            return (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  { height: h },
                  isMine
                    ? isPlayed
                      ? styles.waveformBarMineActive
                      : styles.waveformBarMineInactive
                    : isPlayed
                    ? styles.waveformBarTheirsActive
                    : styles.waveformBarTheirsInactive,
                ]}
              />
            );
          })}
        </View>

        {/* Audio Duration & Timer */}
        <View style={styles.audioMetaRow}>
          <Text style={[styles.audioDurationText, isMine ? styles.textWhiteSub : styles.textGrey]}>
            {isPlaying || currentTime > 0
              ? `${formatAudioTime(currentTime * 1000)} / ${formatAudioTime(duration * 1000)}`
              : formatAudioTime(duration * 1000) || "Voice note"}
          </Text>
          <Mic size={12} color={isMine ? "rgba(255, 255, 255, 0.7)" : "#94A3B8"} />
        </View>
      </View>
    </View>
  );
};

export const MediaMessageView: React.FC<MediaMessageViewProps> = ({ message, isMine }) => {
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [fullscreenVideo, setFullscreenVideo] = useState(false);

  const rawUri = message.mediaUrl || "";
  const mediaUri = getMediaUrl(rawUri);

  const isAudio =
    message.messageType === "audio" ||
    /\.(m4a|mp3|wav|aac|ogg)$/i.test(rawUri) ||
    /\.(m4a|mp3|wav|aac|ogg)$/i.test(message.fileName || "");

  const isImage =
    !isAudio &&
    (message.messageType === "image" ||
      /\.(jpg|jpeg|png|gif|webp|heic|bmp|svg)$/i.test(rawUri));

  const isVideo =
    !isAudio &&
    (message.messageType === "video" ||
      /\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(rawUri));

  const isDoc =
    !isAudio &&
    (message.messageType === "file" ||
      (message.messageType as string) === "document" ||
      Boolean(!isImage && !isVideo && (rawUri || message.fileName)));

  const videoPlayer = useVideoPlayer(isVideo ? mediaUri : "", (p) => {
    p.loop = true;
    p.muted = false;
  });

  if (isAudio && mediaUri) {
    return <AudioMessagePlayer audioUri={mediaUri} isMine={isMine} />;
  }

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
  audioCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 12,
    minWidth: 230,
    maxWidth: 280,
  },
  audioCardMine: {
    backgroundColor: "transparent",
  },
  audioCardTheirs: {
    backgroundColor: "transparent",
  },
  audioPlayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  audioPlayBtnMine: {
    backgroundColor: "#FFFFFF",
  },
  audioPlayBtnTheirs: {
    backgroundColor: "#0A7CFF",
  },
  audioBody: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 28,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
  waveformBarMineActive: {
    backgroundColor: "#FFFFFF",
  },
  waveformBarMineInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  waveformBarTheirsActive: {
    backgroundColor: "#0A7CFF",
  },
  waveformBarTheirsInactive: {
    backgroundColor: "#CBD5E1",
  },
  audioMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  audioDurationText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
