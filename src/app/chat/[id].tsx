import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  ArrowLeft,
  Send,
  Phone,
  PhoneOff,
  Video,
  Users,
  Camera,
  Image as ImageIcon,
  Paperclip,
  Check,
  CheckCheck,
  CornerUpLeft,
  MessageCircle,
  Mic,
  Trash2,
} from "lucide-react-native";
import { Audio, isAudioSupported } from "../../utils/safeAudio";
import { optimizeImage } from "../../utils/mediaCompressor";
import { messageService } from "../../services/message.service";
import { userService } from "../../services/user.service";
import { useAuthStore } from "../../store/auth.store";
import { useSocketStore } from "../../store/socket.store";
import { useCallStore } from "../../store/call.store";
import { useChatHeadStore } from "../../store/chathead.store";
import { IMessage, IMessageReaction } from "../../interfaces/message.interface";
import { MessengerReactionPicker } from "../../components/chat/MessengerReactionPicker";
import { ReplyPreviewBar } from "../../components/chat/ReplyPreviewBar";
import { TypingBubble } from "../../components/chat/TypingBubble";
import { MediaMessageView } from "../../components/chat/MediaMessageView";
import { SwipeableMessage } from "../../components/chat/SwipeableMessage";
import { WhoReactedModal } from "../../components/chat/WhoReactedModal";
import { LinearGradient } from "expo-linear-gradient";
import {
  playSendSound,
  playReceiveSound,
  playReactionSound,
  preloadChatSounds,
} from "../../utils/chatSounds";
import { getMediaUrl, DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from "../../utils/media";
import * as Clipboard from "expo-clipboard";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface IParsedReply {
  replyId: string;
  replySender: string;
  replySnippet: string;
  text: string;
}

function formatCallDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function parseMessageContent(rawMsg?: string | null): IParsedReply {
  if (!rawMsg) return { replyId: "", replySender: "", replySnippet: "", text: "" };
  const match = rawMsg.match(/^\[reply:([^:]+):([^:]+):([^\]]*)\]([\s\S]*)$/);
  if (match) {
    return {
      replyId: match[1],
      replySender: match[2],
      replySnippet: match[3],
      text: match[4],
    };
  }
  return { replyId: "", replySender: "", replySnippet: "", text: rawMsg };
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>(); // target user id or conv id
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { socket, onlineUsers } = useSocketStore();
  const { startCall } = useCallStore();

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<IMessage | null>(null);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recording, setRecording] = useState<any>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [whoReactedMessage, setWhoReactedMessage] = useState<IMessage | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    preloadChatSounds();
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onShow = (e: any) => {
      setIsKeyboardVisible(true);
      const h = e?.endCoordinates?.height || 0;
      if (h > 0) {
        setKeyboardHeight(h);
      }
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {}
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 60);
    };
    const onHide = () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {}
    };

    const showSub1 = Keyboard.addListener("keyboardDidShow", onShow);
    const hideSub1 = Keyboard.addListener("keyboardDidHide", onHide);
    const showSub2 = Keyboard.addListener("keyboardWillShow", onShow);
    const hideSub2 = Keyboard.addListener("keyboardWillHide", onHide);

    return () => {
      showSub1.remove();
      hideSub1.remove();
      showSub2.remove();
      hideSub2.remove();
    };
  }, []);

  // Check if conversation exists (e.g. group chat)
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messageService.getConversations(),
  });

  const currentConv = conversations?.find((c) => c.id === id);
  const isGroup = Boolean(currentConv?.isGroup);

  // Fetch receiver info for 1-on-1 chat
  const { data: targetUser } = useQuery({
    queryKey: ["targetUser", id],
    queryFn: () => userService.getUserById(id!),
    enabled: !!id && !isGroup,
  });

  // Fetch message history
  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ["chatMessages", id],
    queryFn: () => messageService.getMessages(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Mark messages as read (both 1-on-1 and group chats)
  useEffect(() => {
    if (id) {
      messageService.markAsRead(id);
      if (socket?.connected) {
        socket.emit("mark_as_read", isGroup ? { conversationId: id } : { senderId: id });
      }
    }
  }, [id, socket, isGroup]);

  // Real-time socket message, typing, and reaction listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (newMsg: IMessage) => {
      if (newMsg.senderId === id || newMsg.conversationId === id) {
        playReceiveSound();
        setMessages((prev) => [...prev, newMsg]);
        setIsPeerTyping(false);
        flatListRef.current?.scrollToEnd({ animated: true });
        if (socket?.connected) {
          socket.emit("mark_as_read", isGroup ? { conversationId: id } : { senderId: id });
        }
      }
    };

    const handleMessageSent = (sentMsg: IMessage) => {
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.tempId !== sentMsg.tempId);
        return [...withoutTemp, sentMsg];
      });
    };

    const handleReaction = (data: { messageId: string; reactions: IMessageReaction[] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    };

    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === id) {
        setIsPeerTyping(data.isTyping);
        if (data.isTyping) {
          flatListRef.current?.scrollToEnd({ animated: true });
          if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
          peerTypingTimerRef.current = setTimeout(() => {
            setIsPeerTyping(false);
          }, 3500);
        } else {
          if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
        }
      }
    };

    const handleMessagesRead = (data: { userId: string }) => {
      if (data.userId === id) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === currentUserId ? { ...m, isRead: true } : m))
        );
      }
    };

    socket.on("receive_message", handleReceive);
    socket.on("message_sent", handleMessageSent);
    socket.on("message_reaction", handleReaction);
    socket.on("user_typing", handleUserTyping);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("message_sent", handleMessageSent);
      socket.off("message_reaction", handleReaction);
      socket.off("user_typing", handleUserTyping);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [socket, id, currentUserId]);

  // Handle typing indicator emission with debounce
  const handleTextChange = (text: string) => {
    setInputText(text);

    if (socket?.connected && id) {
      socket.emit("typing", { receiverId: id, isTyping: true });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { receiverId: id, isTyping: false });
      }, 2000);
    }
  };

  // Send Text / Quoted Reply Message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    playSendSound();
    const tempId = `temp_${Date.now()}`;
    const rawText = inputText.trim();

    // Encode reply quote metadata if replying to a specific message
    let finalMessagePayload = rawText;
    if (replyMessage) {
      const snippet = (replyMessage.message || replyMessage.messageType || "media").slice(0, 50);
      const senderName = replyMessage.senderName || "User";
      finalMessagePayload = `[reply:${replyMessage.id || replyMessage.tempId}:${senderName}:${snippet}]${rawText}`;
    }

    const optimisticMsg: IMessage = {
      id: tempId,
      tempId,
      senderId: currentUserId || "me",
      senderName: "Me",
      message: finalMessagePayload,
      messageType: "text",
      isRead: false,
      isDelivered: false,
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    setReplyMessage(null);

    // Stop typing indicator immediately
    if (socket?.connected && id) {
      socket.emit("typing", { receiverId: id, isTyping: false });
    }

    try {
      if (socket?.connected) {
        socket.emit("send_message", {
          receiverId: id,
          message: finalMessagePayload,
          messageType: "text",
          tempId,
        });
      } else {
        const saved = await messageService.sendMessage(id!, {
          message: finalMessagePayload,
          tempId,
        });
        setMessages((prev) => prev.map((m) => (m.tempId === tempId ? saved : m)));
      }
    } catch {
      // Optimistic message remains
    }
  };

  // Media Attachment Upload & Send (Camera, Gallery, File, Audio)
  const handleSendMedia = async (
    uri: string,
    fileType: "image" | "video" | "file",
    fileName: string
  ) => {
    try {
      setIsUploadingMedia(true);
      setUploadProgress(0);
      playSendSound();

      const tempId = `temp_${Date.now()}`;
      const ext = fileName.split(".").pop() || "jpg";
      const mime =
        fileType === "image"
          ? `image/${ext === "png" ? "png" : "jpeg"}`
          : fileType === "video"
          ? "video/mp4"
          : ext === "m4a"
          ? "audio/m4a"
          : "application/octet-stream";

      const formData = new FormData();
      formData.append("file", {
        uri,
        name: fileName,
        type: mime,
      } as any);

      // Optimistic UI preview
      const optimisticMsg: IMessage = {
        id: tempId,
        tempId,
        senderId: currentUserId || "me",
        senderName: "Me",
        message: "",
        messageType: fileType,
        mediaUrl: uri,
        fileName,
        isRead: false,
        isDelivered: false,
        createdAt: new Date().toISOString(),
        reactions: [],
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      // Upload to server with real-time progress
      const uploadRes = await messageService.uploadMedia(formData, (percent) => {
        setUploadProgress(percent);
      });

      const resolvedMsgType =
        uploadRes.fileType === "document" || (uploadRes.fileType as string) === "file"
          ? "file"
          : uploadRes.fileType || fileType;
      const resolvedMediaUrl = uploadRes.mediaUrl || uri;
      const resolvedFileName = uploadRes.fileName || fileName;
      const resolvedFileSize = uploadRes.fileSize || 0;

      // Update optimistic preview with real server url & metadata
      setMessages((prev) =>
        prev.map((m) =>
          m.tempId === tempId
            ? {
                ...m,
                mediaUrl: resolvedMediaUrl,
                messageType: resolvedMsgType,
                fileName: resolvedFileName,
                fileSize: resolvedFileSize,
              }
            : m
        )
      );

      // Send message via socket or REST
      if (socket?.connected) {
        socket.emit("send_message", {
          receiverId: id,
          message: "",
          messageType: resolvedMsgType,
          mediaUrl: resolvedMediaUrl,
          fileName: resolvedFileName,
          fileSize: resolvedFileSize,
          tempId,
        });
      } else {
        const saved = await messageService.sendMessage(id!, {
          message: "",
          messageType: resolvedMsgType,
          mediaUrl: resolvedMediaUrl,
          fileName: resolvedFileName,
          fileSize: resolvedFileSize,
          tempId,
        });
        setMessages((prev) => prev.map((m) => (m.tempId === tempId ? saved : m)));
      }
    } catch (err: any) {
      Alert.alert("Upload Failed", err?.response?.data?.message || err.message || "Could not send media.");
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handlePickCamera = async () => {
    Haptics.selectionAsync();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Camera access is needed to capture photos and videos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVid = asset.type === "video";
      let uploadUri = asset.uri;
      let uploadName = `camera_${Date.now()}.${isVid ? "mp4" : "jpg"}`;
      if (!isVid) {
        const compressed = await optimizeImage(asset);
        uploadUri = compressed.uri;
        uploadName = compressed.name;
      }
      await handleSendMedia(uploadUri, isVid ? "video" : "image", uploadName);
    }
  };

  const handlePickGallery = async () => {
    Haptics.selectionAsync();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Photos access is needed to send media.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVid = asset.type === "video";
      let uploadUri = asset.uri;
      let uploadName = asset.fileName || `media_${Date.now()}.${isVid ? "mp4" : "jpg"}`;
      if (!isVid) {
        const compressed = await optimizeImage(asset);
        uploadUri = compressed.uri;
        uploadName = asset.fileName || compressed.name;
      }
      await handleSendMedia(uploadUri, isVid ? "video" : "image", uploadName);
    }
  };

  const handlePickDocument = async () => {
    Haptics.selectionAsync();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const doc = result.assets[0];
        await handleSendMedia(doc.uri, "file", doc.name);
      }
    } catch {
      // Non-blocking
    }
  };

  // Voice Note Recording Handlers
  const startAudioRecording = async () => {
    try {
      if (!Audio || !isAudioSupported) {
        Alert.alert(
          "Audio Not Supported",
          "Voice recording is available when running with native audio capabilities."
        );
        return;
      }
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission Required", "Microphone access is needed to record voice notes.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecordingAudio(true);
      setRecordDuration(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      Alert.alert("Recording Error", "Could not start audio recording.");
    }
  };

  const stopAndSendAudioRecording = async () => {
    if (!recording) return;
    try {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecordingAudio(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        const fileName = `voicenote_${Date.now()}.m4a`;
        await handleSendMedia(uri, "file", fileName);
      }
    } catch {
      setRecording(null);
      setIsRecordingAudio(false);
    }
  };

  const cancelAudioRecording = async () => {
    if (!recording) return;
    try {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecordingAudio(false);
      await recording.stopAndUnloadAsync();
      setRecording(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      setRecording(null);
      setIsRecordingAudio(false);
    }
  };

  const handleSelectReaction = async (emoji: string) => {
    if (!selectedMsgId) return;
    const msgId = selectedMsgId;
    setSelectedMsgId(null);
    playReactionSound();

    // Optimistic reaction update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const currentReactions = m.reactions || [];
        const existingIdx = currentReactions.findIndex((r) => r.userId === currentUserId);
        let nextReactions = [...currentReactions];
        if (existingIdx >= 0) {
          if (nextReactions[existingIdx].reaction === emoji) {
            nextReactions.splice(existingIdx, 1);
          } else {
            nextReactions[existingIdx] = { ...nextReactions[existingIdx], reaction: emoji };
          }
        } else {
          nextReactions.push({
            id: `temp_${Date.now()}`,
            messageId: msgId,
            userId: currentUserId || "me",
            userName: "Me",
            reaction: emoji,
            createdAt: new Date().toISOString(),
          });
        }
        return { ...m, reactions: nextReactions };
      })
    );

    try {
      if (socket?.connected) {
        socket.emit("react_message", { messageId: msgId, reaction: emoji });
      }
      await messageService.toggleReaction(msgId, emoji);
    } catch {
      // Non-blocking
    }
  };

  const handleInitiateReply = (msg: IMessage) => {
    setReplyMessage(msg);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  };

  const handleCopyMessage = async (msg: IMessage) => {
    const { text } = parseMessageContent(msg.message);
    const toCopy = text || msg.mediaUrl || "";
    if (toCopy) {
      await Clipboard.setStringAsync(toCopy);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSelectedMsgId(null);
  };

  const handleScrollToMessage = (targetId?: string) => {
    if (!targetId) return;
    const index = messages.findIndex(
      (m) => m.id === targetId || m.tempId === targetId
    );
    if (index !== -1 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
        setHighlightedMsgId(targetId);
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedMsgId(null);
        }, 1500);
      } catch {
        // Fallback handled by onScrollToIndexFailed
      }
    }
  };

  const handleStartCall = (type: "audio" | "video") => {
    if (isGroup) {
      Alert.alert("Group Call", "Group calling will be available in an upcoming update!");
      return;
    }
    const partnerId = targetUser?.id || id!;
    const partnerName = targetUser?.fullName || "Friend";
    const partnerAvatar = targetUser?.avatar || targetUser?.profilePicUrl || undefined;

    startCall({ id: partnerId, name: partnerName, avatar: partnerAvatar }, type);
    router.push("/call" as any);
  };

  const isOnline = onlineUsers.includes(id || "");
  const chatTitle = isGroup ? currentConv?.name || "Group Chat" : targetUser?.fullName || "Chat";
  const avatarUri = isGroup
    ? (currentConv?.avatar ? getMediaUrl(currentConv.avatar) : DEFAULT_GROUP_AVATAR)
    : (getMediaUrl(targetUser?.avatar || targetUser?.profilePicUrl) || DEFAULT_AVATAR);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerUser}
          activeOpacity={0.8}
          onPress={() => {
            if (!isGroup && targetUser?.username) {
              router.push(`/s/${targetUser.username}` as any);
            }
          }}
        >
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: avatarUri || DEFAULT_AVATAR }}
              style={styles.headerAvatar}
              contentFit="cover"
            />
            {isOnline && !isGroup ? <View style={styles.onlineBadge} /> : null}
            {isGroup ? (
              <View style={styles.groupBadge}>
                <Users size={10} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {chatTitle}
            </Text>
            <Text
              style={[
                styles.headerStatus,
                !isGroup && (isPeerTyping || isOnline) && styles.onlineText,
                isPeerTyping && styles.typingHeaderStatus,
              ]}
            >
              {isGroup
                ? `${currentConv?.participants?.length || 0} members`
                : isPeerTyping
                ? "Typing..."
                : isOnline
                ? "Active now"
                : "Offline"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Audio & Video Call Buttons */}
        {/* Audio, Video Call & Pop Chat Head Buttons */}
        <View style={styles.callActions}>
          <TouchableOpacity
            style={styles.callBtn}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync();
              useChatHeadStore.getState().showBubbleForConversation(id!, chatTitle, avatarUri);
              router.back();
            }}
          >
            <MessageCircle size={20} color="#0A7CFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.callBtn}
            activeOpacity={0.7}
            onPress={() => handleStartCall("audio")}
          >
            <Phone size={20} color="#0A7CFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.callBtn}
            activeOpacity={0.7}
            onPress={() => handleStartCall("video")}
          >
            <Video size={20} color="#0A7CFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      <View style={{ flex: 1 }}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A7CFF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id || item.tempId || String(Math.random())}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
            renderItem={({ item, index }) => {
              const isMine = item.senderId === currentUserId;
              const isLastMessage = index === messages.length - 1;
              const reactions = item.reactions || [];

              // Grouping calculations (same sender within 5 mins)
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

              const isSameSenderAsPrev = Boolean(
                prevMsg &&
                  prevMsg.senderId === item.senderId &&
                  Math.abs(new Date(item.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) < 300000
              );

              const isSameSenderAsNext = Boolean(
                nextMsg &&
                  nextMsg.senderId === item.senderId &&
                  Math.abs(new Date(nextMsg.createdAt).getTime() - new Date(item.createdAt).getTime()) < 300000
              );

              const isFirstInGroup = !isSameSenderAsPrev && isSameSenderAsNext;
              const isMiddleInGroup = isSameSenderAsPrev && isSameSenderAsNext;
              const isLastInGroup = isSameSenderAsPrev && !isSameSenderAsNext;
              const isSingleInGroup = !isSameSenderAsPrev && !isSameSenderAsNext;

              // Dynamic corner radii based on group position
              const dynamicBorderRadius = isMine
                ? isSingleInGroup
                  ? { borderRadius: 18, borderBottomRightRadius: 4 }
                  : isFirstInGroup
                  ? { borderRadius: 18, borderBottomRightRadius: 4 }
                  : isMiddleInGroup
                  ? { borderRadius: 18, borderTopRightRadius: 4, borderBottomRightRadius: 4 }
                  : { borderRadius: 18, borderTopRightRadius: 4, borderBottomRightRadius: 18 }
                : isSingleInGroup
                ? { borderRadius: 18, borderBottomLeftRadius: 4 }
                : isFirstInGroup
                ? { borderRadius: 18, borderBottomLeftRadius: 4 }
                : isMiddleInGroup
                ? { borderRadius: 18, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }
                : { borderRadius: 18, borderTopLeftRadius: 4, borderBottomLeftRadius: 18 };

              const dynamicMarginTop = isFirstInGroup || isSingleInGroup ? 8 : 2;

              // Parse quote reply if present
              const { replyId, replySender, replySnippet, text } = parseMessageContent(item.message);

              // Group reactions
              const reactionCounts: { [emoji: string]: number } = {};
              reactions.forEach((r: IMessageReaction) => {
                reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
              });
              const reactionEntries = Object.entries(reactionCounts);

              const isHighlighted =
                (item.id && item.id === highlightedMsgId) ||
                (item.tempId && item.tempId === highlightedMsgId);

              // Bubble Inner Content
              const bubbleContent = (
                <>
                  {/* Quoted Message Header (Reply Box) - Tap to Scroll */}
                  {replySender ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleScrollToMessage(replyId)}
                      style={[styles.quoteBox, isMine ? styles.quoteBoxMine : styles.quoteBoxTheirs]}
                    >
                      <View style={styles.quoteAccentBar} />
                      <View style={styles.quoteTextContainer}>
                        <Text style={styles.quoteSenderName} numberOfLines={1}>
                          {replySender}
                        </Text>
                        <Text style={styles.quoteSnippet} numberOfLines={1}>
                          {replySnippet}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {/* Call Log Record View */}
                  {item.messageType === "audio_call" ||
                  item.messageType === "video_call" ||
                  item.messageType === "missed_call" ? (
                    <View style={styles.callRecordCard}>
                      <View
                        style={[
                          styles.callRecordIconWrapper,
                          item.messageType === "missed_call"
                            ? styles.callRecordMissed
                            : styles.callRecordSuccess,
                        ]}
                      >
                        {item.messageType === "video_call" ? (
                          <Video size={18} color="#FFFFFF" />
                        ) : item.messageType === "missed_call" ? (
                          <PhoneOff size={18} color="#FFFFFF" />
                        ) : (
                          <Phone size={18} color="#FFFFFF" />
                        )}
                      </View>
                      <View style={styles.callRecordInfo}>
                        <Text
                          style={[
                            styles.callRecordTitle,
                            item.messageType === "missed_call"
                              ? styles.callRecordTitleMissed
                              : styles.callRecordTitleNormal,
                          ]}
                        >
                          {item.messageType === "missed_call"
                            ? "Missed Call"
                            : item.messageType === "video_call"
                            ? "Video Call"
                            : "Audio Call"}
                        </Text>
                        <Text style={styles.callRecordSubtitle}>
                          {item.callDuration && item.callDuration > 0
                            ? formatCallDuration(item.callDuration)
                            : isMine
                            ? "No answer"
                            : "Missed"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.callBackBtn}
                        onPress={() =>
                          handleStartCall(item.messageType === "video_call" ? "video" : "audio")
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={styles.callBackText}>Call Back</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (item.messageType && item.messageType !== "text") || Boolean(item.mediaUrl) ? (
                    <MediaMessageView message={item} isMine={isMine} />
                  ) : null}

                  {/* Text Content */}
                  {text &&
                  item.messageType !== "audio_call" &&
                  item.messageType !== "video_call" &&
                  item.messageType !== "missed_call" ? (
                    <Text
                      style={[
                        styles.bubbleText,
                        isMine ? styles.myBubbleText : styles.theirBubbleText,
                        Boolean(item.mediaUrl) && { marginTop: 6 },
                      ]}
                    >
                      {text}
                    </Text>
                  ) : null}
                </>
              );

              return (
                <SwipeableMessage
                  isMine={isMine}
                  onReply={() => handleInitiateReply(item)}
                >
                  <View
                    style={[
                      styles.bubbleWrapper,
                      isMine ? styles.myWrapper : styles.theirWrapper,
                      { marginTop: dynamicMarginTop },
                    ]}
                  >
                    {/* Incoming user avatar (Only on last message of group) */}
                    {!isMine ? (
                      isLastInGroup || isSingleInGroup ? (
                        <Image
                          source={{
                            uri:
                              getMediaUrl(item.senderProfilePicture) ||
                              avatarUri ||
                              DEFAULT_AVATAR,
                          }}
                          style={styles.senderAvatar}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.senderAvatarSpacer} />
                      )
                    ) : null}

                    <View style={{ maxWidth: "76%" }}>
                      {/* In group chats, show sender's name on first message of group */}
                      {isGroup && !isMine && (isFirstInGroup || isSingleInGroup) ? (
                        <Text style={styles.senderName}>{item.senderName || "Member"}</Text>
                      ) : null}

                      {/* Message Bubble */}
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onLongPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setSelectedMsgId(item.id || item.tempId || null);
                        }}
                      >
                        {isMine ? (
                          <LinearGradient
                            colors={["#0084FF", "#00A3FF"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                              styles.bubble,
                              styles.myBubble,
                              (item.messageType === "image" || item.messageType === "video") && !text && styles.mediaBubble,
                              dynamicBorderRadius,
                              isHighlighted && styles.highlightedBubble,
                            ]}
                          >
                            {bubbleContent}
                          </LinearGradient>
                        ) : (
                          <View
                            style={[
                              styles.bubble,
                              styles.theirBubble,
                              (item.messageType === "image" || item.messageType === "video") && !text && styles.mediaBubble,
                              dynamicBorderRadius,
                              isHighlighted && styles.highlightedBubble,
                            ]}
                          >
                            {bubbleContent}
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Messenger Emoji Reaction Badge (Tapping opens WhoReactedModal) */}
                      {reactionEntries.length > 0 ? (
                        <TouchableOpacity
                          style={[
                            styles.reactionPillsContainer,
                            isMine ? styles.reactionPillsRight : styles.reactionPillsLeft,
                          ]}
                          activeOpacity={0.8}
                          onPress={() => setWhoReactedMessage(item)}
                        >
                          {reactionEntries.map(([emoji, count]) => (
                            <View key={emoji} style={styles.reactionPill}>
                              <Text style={styles.reactionEmoji}>{emoji}</Text>
                              {count > 1 ? (
                                <Text style={styles.reactionCount}>{count}</Text>
                              ) : null}
                            </View>
                          ))}
                        </TouchableOpacity>
                      ) : null}

                      {/* Delivery & Seen Indicator (Only on last sent message) */}
                      {isMine && isLastMessage ? (
                        <View style={styles.statusIndicatorRow}>
                          {item.isRead ? (
                            <Image
                              source={{
                                uri:
                                  avatarUri ||
                                  DEFAULT_AVATAR,
                              }}
                              style={styles.seenMiniAvatar}
                              contentFit="cover"
                            />
                          ) : item.isDelivered ? (
                            <CheckCheck size={13} color="#0A7CFF" />
                          ) : (
                            <Check size={13} color="#94A3B8" />
                          )}
                        </View>
                      ) : null}
                    </View>
                  </View>
                </SwipeableMessage>
              );
            }}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input & Typing Container with Dynamic Keyboard Pinning */}
        <View
          style={{
            paddingBottom:
              keyboardHeight > 0 || isKeyboardVisible
                ? (keyboardHeight > 0 ? keyboardHeight : 280) + insets.bottom
                : Math.max(insets.bottom, 8),
          }}
        >
          {/* Real-time Messenger Typing Indicator */}
          {isPeerTyping ? (
            <TypingBubble avatarUri={avatarUri} />
          ) : null}

          {/* Media Uploading Indicator Bar */}
          {isUploadingMedia ? (
            <View style={styles.uploadingBar}>
              <ActivityIndicator size="small" color="#0A7CFF" />
              <Text style={styles.uploadingText}>
                Sending attachment... {uploadProgress > 0 ? `${uploadProgress}%` : ""}
              </Text>
            </View>
          ) : null}

          {/* Replying Preview Bar */}
          <ReplyPreviewBar
            replyMessage={replyMessage}
            onCancelReply={() => setReplyMessage(null)}
          />

          {/* Messenger Action & Input / Voice Recording Bar */}
          {isRecordingAudio ? (
            <View style={styles.recordingBar}>
              <TouchableOpacity
                style={styles.cancelRecordBtn}
                onPress={cancelAudioRecording}
                activeOpacity={0.7}
              >
                <Trash2 size={20} color="#EF4444" />
              </TouchableOpacity>

              <View style={styles.recordingInfo}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTime}>
                  {Math.floor(recordDuration / 60)}:
                  {(recordDuration % 60).toString().padStart(2, "0")}
                </Text>
                <Text style={styles.recordingLabel}>Recording voice note...</Text>
              </View>

              <TouchableOpacity
                style={styles.sendRecordBtn}
                onPress={stopAndSendAudioRecording}
                activeOpacity={0.8}
              >
                <Send size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputBar}>
              {/* Media Attachment Actions */}
              <View style={styles.attachmentActions}>
                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={handlePickCamera}
                  activeOpacity={0.7}
                >
                  <Camera size={20} color="#0A7CFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={handlePickGallery}
                  activeOpacity={0.7}
                >
                  <ImageIcon size={20} color="#0A7CFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={handlePickDocument}
                  activeOpacity={0.7}
                >
                  <Paperclip size={20} color="#0A7CFF" />
                </TouchableOpacity>
              </View>

              {/* Text Input */}
              <TextInput
                ref={inputRef}
                placeholder="Type a message..."
                placeholderTextColor="#8E8E93"
                style={styles.inputField}
                value={inputText}
                onChangeText={handleTextChange}
                multiline
              />

              {/* Send or Mic Button */}
              {inputText.trim() ? (
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={handleSendMessage}
                  activeOpacity={0.8}
                >
                  <Send size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.micBtn}
                  onPress={startAudioRecording}
                  activeOpacity={0.8}
                >
                  <Mic size={20} color="#0A7CFF" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Messenger 6-Emoji Reaction Picker Modal & Action Sheet */}
      {(() => {
        const selectedMsg = messages.find(
          (m) =>
            (m.id && m.id === selectedMsgId) ||
            (m.tempId && m.tempId === selectedMsgId)
        );
        const userReaction = selectedMsg?.reactions?.find(
          (r) => r.userId === currentUserId
        )?.reaction;

        return (
          <MessengerReactionPicker
            visible={Boolean(selectedMsgId)}
            onDismiss={() => setSelectedMsgId(null)}
            onSelectReaction={handleSelectReaction}
            currentReaction={userReaction}
            onReply={() => {
              if (selectedMsg) {
                handleInitiateReply(selectedMsg);
              }
              setSelectedMsgId(null);
            }}
            onCopy={() => {
              if (selectedMsg) {
                handleCopyMessage(selectedMsg);
              }
            }}
            canCopy={Boolean(selectedMsg?.message || selectedMsg?.mediaUrl)}
          />
        );
      })()}

      {/* Who Reacted BottomSheet Modal */}
      <WhoReactedModal
        visible={Boolean(whoReactedMessage)}
        reactions={whoReactedMessage?.reactions || []}
        onClose={() => setWhoReactedMessage(null)}
        onSelectUser={(userId) => {
          setWhoReactedMessage(null);
          router.push(`/s/${userId}` as any);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 60,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 2,
  },
  avatarWrapper: {
    position: "relative",
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E4E6EB",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#31A24C",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  groupBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#0A7CFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#050505",
  },
  headerStatus: {
    fontSize: 12,
    color: "#65676B",
    marginTop: 1,
  },
  onlineText: {
    color: "#31A24C",
    fontWeight: "600",
  },
  typingHeaderStatus: {
    color: "#0A7CFF",
    fontWeight: "700",
    fontStyle: "italic",
  },
  callActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  bubbleWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 2,
  },
  myWrapper: {
    justifyContent: "flex-end",
  },
  theirWrapper: {
    justifyContent: "flex-start",
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 4,
  },
  senderAvatarSpacer: {
    width: 28,
    marginRight: 8,
  },
  senderName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0A7CFF",
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    maxWidth: "100%",
  },
  myBubble: {
    backgroundColor: "#0A7CFF",
    borderBottomRightRadius: 4,
    overflow: "hidden",
  },
  theirBubble: {
    backgroundColor: "#E4E6EB",
    borderBottomLeftRadius: 4,
  },
  mediaBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
  },
  highlightedBubble: {
    borderWidth: 2,
    borderColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myBubbleText: {
    color: "#FFFFFF",
  },
  theirBubbleText: {
    color: "#050505",
  },
  quoteBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
    gap: 6,
  },
  quoteBoxMine: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  quoteBoxTheirs: {
    backgroundColor: "rgba(0, 0, 0, 0.06)",
  },
  quoteAccentBar: {
    width: 3,
    height: "100%",
    borderRadius: 1.5,
    backgroundColor: "#0A7CFF",
  },
  quoteTextContainer: {
    flex: 1,
  },
  quoteSenderName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0A7CFF",
  },
  quoteSnippet: {
    fontSize: 12,
    color: "rgba(0, 0, 0, 0.75)",
  },
  reactionPillsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: -8,
  },
  reactionPillsRight: {
    alignSelf: "flex-end",
  },
  reactionPillsLeft: {
    alignSelf: "flex-start",
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E6EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    fontSize: 10,
    fontWeight: "700",
    color: "#65676B",
  },
  statusIndicatorRow: {
    alignSelf: "flex-end",
    marginTop: 2,
    paddingRight: 2,
  },
  seenMiniAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  uploadingBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: "#65676B",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#E4E6EB",
    gap: 6,
  },
  attachmentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  attachBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  inputField: {
    flex: 1,
    backgroundColor: "#F0F2F5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    maxHeight: 100,
    fontSize: 15,
    color: "#050505",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0A7CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#E4E6EB",
    opacity: 0.6,
  },
  callRecordCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 10,
    minWidth: 220,
  },
  callRecordIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  callRecordSuccess: {
    backgroundColor: "#10B981",
  },
  callRecordMissed: {
    backgroundColor: "#EF4444",
  },
  callRecordInfo: {
    flex: 1,
  },
  callRecordTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  callRecordTitleNormal: {
    color: "#111827",
  },
  callRecordTitleMissed: {
    color: "#EF4444",
  },
  callRecordSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },
  callBackBtn: {
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  callBackText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0A7CFF",
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E4E6EB",
    gap: 12,
  },
  cancelRecordBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  recordingTime: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
  },
  recordingLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  sendRecordBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0A7CFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
