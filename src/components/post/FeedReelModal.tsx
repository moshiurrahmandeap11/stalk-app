import React, { useState, useEffect } from "react";
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
import { useVideoPlayer, VideoView } from "expo-video";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  X,
  Volume2,
  VolumeX,
  Play,
  ArrowUp,
  MessageCircle,
  Share2,
  Bookmark,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { IPost } from "../../interfaces/post.interface";
import { getMediaUrl, DEFAULT_AVATAR } from "../../utils/media";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface FeedReelModalProps {
  visible: boolean;
  post: IPost;
  onClose: () => void;
  onPressComment?: () => void;
  onPressLike?: () => void;
  onPressSave?: () => void;
  isLiked?: boolean;
  isSaved?: boolean;
  likesCount?: number;
}

export const FeedReelModal: React.FC<FeedReelModalProps> = ({
  visible,
  post,
  onClose,
  onPressComment,
  onPressLike,
  onPressSave,
  isLiked = false,
  isSaved = false,
  likesCount = 0,
}) => {
  const rawMediaUri = post.media?.url || post.mediaUrl || "";
  const mediaUri = getMediaUrl(rawMediaUri);

  const [isMuted, setIsMuted] = useState(false); // Unmuted by default like Reels!
  const [isPlaying, setIsPlaying] = useState(true);
  const playIconOpacity = useSharedValue(0);

  const player = useVideoPlayer(mediaUri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (!player) return;
    if (visible) {
      player.muted = isMuted;
      player.volume = isMuted ? 0 : 1;
      player.play();
      setIsPlaying(true);
    } else {
      player.pause();
      player.muted = true;
      player.volume = 0;
    }
  }, [visible, isMuted, player]);

  useEffect(() => {
    if (player) {
      player.muted = isMuted;
      player.volume = isMuted ? 0 : 1;
    }
  }, [isMuted, player]);

  const handleTogglePlay = () => {
    Haptics.selectionAsync();
    playIconOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 400 })
    );
    if (isPlaying) {
      player?.pause();
      setIsPlaying(false);
    } else {
      player?.play();
      setIsPlaying(true);
    }
  };

  const handleToggleMute = (e: any) => {
    e.stopPropagation?.();
    Haptics.selectionAsync();
    setIsMuted(!isMuted);
  };

  const handleClose = () => {
    Haptics.selectionAsync();
    player?.pause();
    onClose();
  };

  const authorName = post.userName || post.user?.fullName || "User";
  const authorHandle = post.username || post.user?.username || authorName.toLowerCase().replace(/\s+/g, "");
  const avatarUri =
    getMediaUrl(post.userProfilePicture || post.user?.profilePicUrl) ||
    DEFAULT_AVATAR;

  const playOverlayStyle = useAnimatedStyle(() => ({
    opacity: playIconOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Fullscreen Video */}
        <TouchableWithoutFeedback onPress={handleTogglePlay}>
          <View style={StyleSheet.absoluteFill}>
            <VideoView
              player={player}
              style={styles.videoPlayer}
              contentFit="cover"
              nativeControls={false}
            />

            {/* Centered Play / Pause flash */}
            <Animated.View style={[styles.centeredPlayIndicator, playOverlayStyle]} pointerEvents="none">
              <View style={styles.playIconCircle}>
                <Play size={36} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>

        {/* Top Header: Close Button & Sound Toggle */}
        <SafeAreaView edges={["top"]} style={styles.topHeader}>
          <TouchableOpacity
            style={styles.headerBtn}
            activeOpacity={0.8}
            onPress={handleClose}
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerBtn}
            activeOpacity={0.8}
            onPress={handleToggleMute}
          >
            {isMuted ? (
              <VolumeX size={20} color="#FFFFFF" />
            ) : (
              <Volume2 size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </SafeAreaView>

        {/* Right Action Column (Upvote, Comment, Share) */}
        <View style={styles.rightActions}>
          {/* Like / Upvote */}
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPressLike?.();
            }}
          >
            <View style={[styles.iconCircle, isLiked && styles.likedCircle]}>
              <ArrowUp
                size={22}
                color={isLiked ? "#2563EB" : "#FFFFFF"}
                strokeWidth={isLiked ? 3 : 2}
              />
            </View>
            <Text style={[styles.actionCount, isLiked && styles.likedCount]}>{likesCount}</Text>
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => onPressComment?.()}
          >
            <View style={styles.iconCircle}>
              <MessageCircle size={22} color="#FFFFFF" strokeWidth={2} />
            </View>
            <Text style={styles.actionCount}>
              {post.commentsCount || post.comments?.length || 0}
            </Text>
          </TouchableOpacity>

          {/* Save / Bookmark */}
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPressSave?.();
            }}
          >
            <View style={[styles.iconCircle, isSaved && styles.likedCircle]}>
              <Bookmark
                size={22}
                color={isSaved ? "#2563EB" : "#FFFFFF"}
                fill={isSaved ? "#2563EB" : "transparent"}
                strokeWidth={2}
              />
            </View>
            <Text style={[styles.actionCount, isSaved && styles.likedCount]}>
              {isSaved ? "Saved" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Author & Description */}
        <SafeAreaView edges={["bottom"]} style={styles.bottomOverlay}>
          <View style={styles.authorRow}>
            <Image source={{ uri: avatarUri }} style={styles.authorAvatar} contentFit="cover" />
            <View>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.authorHandle}>@{authorHandle}</Text>
            </View>
          </View>

          {post.description ? (
            <ScrollView style={styles.descriptionScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.descriptionText}>{post.description}</Text>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  centeredPlayIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  topHeader: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
    marginTop: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  rightActions: {
    position: "absolute",
    right: 14,
    bottom: 90,
    alignItems: "center",
    gap: 16,
    zIndex: 10,
  },
  actionBtn: {
    alignItems: "center",
    gap: 4,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  likedCircle: {
    backgroundColor: "#FFFFFF",
  },
  actionCount: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  likedCount: {
    color: "#2563EB",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 80,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  authorName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  authorHandle: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 12,
  },
  descriptionScroll: {
    maxHeight: 80,
  },
  descriptionText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
