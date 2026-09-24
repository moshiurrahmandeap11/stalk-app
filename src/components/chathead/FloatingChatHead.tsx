import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  Keyboard,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import {
  Phone,
  Video,
  PlusCircle,
  Camera,
  Image as ImageIcon,
  Mic,
  Smile,
  ThumbsUp,
  Send,
  X,
  Search,
  Tag,
  PhoneIncoming,
  CornerDownRight,
} from "lucide-react-native";
import { useChatHeadStore } from "../../store/chathead.store";
import { useAuthStore } from "../../store/auth.store";
import { useSocketStore } from "../../store/socket.store";
import { useCallStore } from "../../store/call.store";
import { messageService } from "../../services/message.service";
import { IConversation, IMessage } from "../../interfaces/message.interface";
import { playSendSound, playReceiveSound } from "../../utils/chatSounds";
import { getMediaUrl } from "../../utils/media";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CHAT_HEAD_SIZE = 56;

function parseReply(rawMsg: string) {
  const match = rawMsg.match(/^\[reply:([^:]+):([^:]+):([^\]]+)\](.*)$/s);
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

export const FloatingChatHead: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    isChatHeadEnabled,
    isChatHeadOpen,
    unreadMessagesCount,
    activeConversationId,
    activeConversationTitle,
    activeConversationAvatar,
    activePartnerId,
    activeBubbles,
    setChatHeadOpen,
    openChatHead,
    closeChatHead,
    selectBubble,
    resetUnreadCount,
    dismissChatHead,
  } = useChatHeadStore();

  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const socket = useSocketStore((s) => s.socket);
  const { startCall } = useCallStore();

  // Floating bubble coordinates (minimized state)
  const posX = useSharedValue(SCREEN_WIDTH - CHAT_HEAD_SIZE - 12);
  const posY = useSharedValue(SCREEN_HEIGHT * 0.35);
  const isDragging = useSharedValue(false);
  const [showDismissTarget, setShowDismissTarget] = useState(false);

  // Keyboard height tracker
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Chat window state
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyMessage, setReplyMessage] = useState<IMessage | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Keyboard listeners for perfect pinning
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Fetch conversations when chat window opens without active conversation
  useEffect(() => {
    if (isChatHeadOpen && !activeConversationId) {
      loadConversations();
    }
  }, [isChatHeadOpen, activeConversationId]);

  // Fetch messages when an active conversation is selected
  useEffect(() => {
    if (isChatHeadOpen && activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [isChatHeadOpen, activeConversationId]);

  // Real-time socket message listener
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      const matchConv =
        activeConversationId &&
        (msg.conversationId === activeConversationId ||
          msg.senderId === activeConversationId ||
          msg.receiverId === activeConversationId);

      if (matchConv) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id || (m.tempId && m.tempId === msg.tempId))) {
            return prev.map((m) => (m.tempId && m.tempId === msg.tempId ? msg : m));
          }
          return [...prev, msg];
        });
        if (msg.senderId !== currentUserId) {
          playReceiveSound();
        }
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    socket.on("receive_message", handleNewMessage);
    socket.on("new_message", handleNewMessage);
    socket.on("message_sent", handleNewMessage);

    return () => {
      socket.off("receive_message", handleNewMessage);
      socket.off("new_message", handleNewMessage);
      socket.off("message_sent", handleNewMessage);
    };
  }, [socket, activeConversationId, currentUserId]);

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const data = await messageService.getConversations();
      setConversations(data || []);
    } catch {
      // quiet fail
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      setLoadingMessages(true);
      const data = await messageService.getMessages(convId);
      setMessages(data || []);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 150);
    } catch {
      // quiet fail
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const rawText = (customText !== undefined ? customText : inputText).trim();
    if (!rawText || !activeConversationId || sendingMessage) return;

    playSendSound();
    const tempId = `temp_${Date.now()}`;

    // Quoted reply formatting
    let payload = rawText;
    if (replyMessage) {
      const snippet = (replyMessage.message || replyMessage.messageType || "media").slice(0, 40);
      const sender = replyMessage.senderName || "User";
      payload = `[reply:${replyMessage.id || replyMessage.tempId}:${sender}:${snippet}]${rawText}`;
    }

    const optimistic: IMessage = {
      id: tempId,
      tempId,
      senderId: currentUserId || "me",
      senderName: "Me",
      message: payload,
      messageType: "text",
      isRead: false,
      isDelivered: true,
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputText("");
    setReplyMessage(null);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      setSendingMessage(true);
      if (socket?.connected) {
        socket.emit("send_message", {
          receiverId: activeConversationId,
          message: payload,
          messageType: "text",
          tempId,
        });
      }

      const sent = await messageService.sendMessage(activeConversationId, {
        message: payload,
        messageType: "text",
        tempId,
      });

      if (sent) {
        setMessages((prev) => prev.map((m) => (m.tempId === tempId ? sent : m)));
      }
    } catch {
      // quiet fail
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendThumbsUp = () => {
    handleSendMessage("👍");
  };

  // Launch camera
  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri && activeConversationId) {
        await uploadAndSendMedia(result.assets[0].uri, "image");
      }
    } catch (err) {
      console.warn("Camera error:", err);
    }
  };

  // Launch photo library
  const handleLaunchGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri && activeConversationId) {
        await uploadAndSendMedia(result.assets[0].uri, "image");
      }
    } catch (err) {
      console.warn("Gallery error:", err);
    }
  };

  const uploadAndSendMedia = async (uri: string, type: "image" | "video") => {
    if (!activeConversationId) return;
    try {
      setSendingMessage(true);
      const filename = uri.split("/").pop() || "upload.jpg";
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: filename,
        type: type === "image" ? "image/jpeg" : "video/mp4",
      } as any);

      const uploaded = await messageService.uploadMedia(formData);
      if (uploaded?.mediaUrl) {
        const sent = await messageService.sendMessage(activeConversationId, {
          message: type === "image" ? "📷 Photo" : "🎥 Video",
          messageType: type,
          mediaUrl: uploaded.mediaUrl,
          fileName: uploaded.fileName,
          fileSize: uploaded.fileSize,
        });
        if (sent) {
          setMessages((prev) => [...prev, sent]);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    } catch (err) {
      console.warn("Upload error:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Initiate call with active partner
  const handleStartCall = (type: "audio" | "video") => {
    const partnerId = activePartnerId || activeConversationId;
    if (!partnerId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startCall(
      {
        id: partnerId,
        name: activeConversationTitle || "Partner",
        avatar: activeConversationAvatar,
      },
      type
    );
  };

  // Drag Gesture for Floating Bubble (minimized mode)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4;
      },
      onPanResponderGrant: () => {
        isDragging.value = true;
        setShowDismissTarget(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gesture) => {
        posX.value = gesture.moveX - CHAT_HEAD_SIZE / 2;
        posY.value = gesture.moveY - CHAT_HEAD_SIZE / 2;
      },
      onPanResponderRelease: (_, gesture) => {
        isDragging.value = false;
        setShowDismissTarget(false);

        // Check if dropped onto bottom dismiss target
        const dismissThresholdY = SCREEN_HEIGHT - 120;
        const dismissThresholdX = Math.abs(gesture.moveX - SCREEN_WIDTH / 2);
        if (gesture.moveY > dismissThresholdY && dismissThresholdX < 70) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          dismissChatHead();
          return;
        }

        // Tap detected (minimal movement)
        if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) {
          Haptics.selectionAsync();
          resetUnreadCount(activeConversationId || undefined);
          setChatHeadOpen(!isChatHeadOpen);
          return;
        }

        // Snap to nearest screen edge
        const snapLeft = 12;
        const snapRight = SCREEN_WIDTH - CHAT_HEAD_SIZE - 12;
        const targetX = gesture.moveX < SCREEN_WIDTH / 2 ? snapLeft : snapRight;

        const minY = insets.top + 10;
        const maxY = SCREEN_HEIGHT - insets.bottom - CHAT_HEAD_SIZE - 20;
        const targetY = Math.min(Math.max(posY.value, minY), maxY);

        posX.value = withSpring(targetX, { damping: 20, stiffness: 260 });
        posY.value = withSpring(targetY, { damping: 20, stiffness: 260 });
      },
    })
  ).current;

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: posX.value },
      { translateY: posY.value },
      { scale: isDragging.value ? 1.08 : 1 },
    ],
  }));

  if (!isAuthenticated || !isChatHeadEnabled) return null;
  if (!activeConversationId && !isChatHeadOpen && activeBubbles.length === 0) return null;

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const name = c.name || c.participants?.find((p) => p.userId !== currentUserId)?.userName || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      {/* 1. Minimized Floating Bubble */}
      {!isChatHeadOpen && (
        <Animated.View
          style={[styles.floatingBubble, bubbleAnimatedStyle]}
          {...panResponder.panHandlers}
        >
          {activeConversationAvatar ? (
            <Image
              source={{ uri: getMediaUrl(activeConversationAvatar) }}
              style={styles.avatarImg}
              contentFit="cover"
            />
          ) : (
            <View style={styles.defaultIconBox}>
              <Text style={styles.defaultIconText}>
                {(activeConversationTitle || "Chat").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Green Online Status Dot */}
          <View style={styles.bubbleOnlineDot} />

          {/* Unread Count Badge */}
          {unreadMessagesCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Dismiss Drag Target (✕) */}
      {showDismissTarget && (
        <View style={styles.dismissTargetContainer}>
          <View style={styles.dismissTargetCircle}>
            <X size={24} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.dismissTargetText}>Drag here to close</Text>
        </View>
      )}

      {/* 2. Messenger-Identical Dropdown Card Overlay */}
      {isChatHeadOpen && (
        <View style={styles.fullScreenBackdrop}>
          {/* Top Row: Horizontal Chat Heads */}
          <View style={[styles.topChatHeadsBar, { paddingTop: Math.max(insets.top, 12) }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topChatHeadsContent}
            >
              {activeBubbles.map((bubble) => {
                const isActive = bubble.conversationId === activeConversationId;
                return (
                  <TouchableOpacity
                    key={bubble.conversationId}
                    style={[
                      styles.topBubbleItem,
                      isActive && styles.topBubbleItemActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (isActive) {
                        // Minimize when tapping active bubble
                        closeChatHead();
                      } else {
                        // Switch active conversation
                        selectBubble(bubble.conversationId);
                      }
                    }}
                  >
                    {bubble.avatar ? (
                      <Image
                        source={{ uri: getMediaUrl(bubble.avatar) }}
                        style={styles.topBubbleAvatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.topBubblePlaceholder}>
                        <Text style={styles.topBubbleInitial}>
                          {bubble.title.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    {/* Unread Badge */}
                    {bubble.unreadCount > 0 && (
                      <View style={styles.topBubbleBadge}>
                        <Text style={styles.topBubbleBadgeText}>
                          {bubble.unreadCount > 9 ? "9+" : bubble.unreadCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Close All Chat Heads Button */}
              <TouchableOpacity
                style={styles.topCloseAllBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  dismissChatHead();
                }}
                activeOpacity={0.7}
              >
                <X size={18} color="#94A3B8" strokeWidth={2.5} />
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Main Dark Dropdown Card */}
          <View
            style={[
              styles.dropdownCard,
              {
                paddingBottom:
                  keyboardHeight > 0
                    ? keyboardHeight
                    : Math.max(insets.bottom, 10),
              },
            ]}
          >
            {/* Card Header (Identical to Screenshot 1) */}
            <View style={styles.cardHeader}>
              {/* Partner Avatar + Online Dot */}
              <TouchableOpacity
                style={styles.headerPartnerRow}
                onPress={() => openChatHead(undefined)}
                activeOpacity={0.8}
              >
                <View style={styles.headerAvatarContainer}>
                  {activeConversationAvatar ? (
                    <Image
                      source={{ uri: getMediaUrl(activeConversationAvatar) }}
                      style={styles.headerAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.headerAvatarDefault}>
                      <Text style={styles.headerAvatarText}>
                        {(activeConversationTitle || "U").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {/* Green status indicator */}
                  <View style={styles.headerOnlineDot} />
                </View>

                {/* Name */}
                <View style={styles.headerNameBox}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {activeConversationTitle || "Messenger"}
                  </Text>
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {activeConversationId ? "Active now" : "All conversations"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Right Action Icons: Tag, Phone, Video */}
              <View style={styles.headerActions}>
                {activeConversationId && (
                  <>
                    <TouchableOpacity
                      style={styles.headerIconBtn}
                      activeOpacity={0.7}
                      onPress={() => Haptics.selectionAsync()}
                    >
                      <Tag size={22} color="#8B5CF6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.headerIconBtn}
                      activeOpacity={0.7}
                      onPress={() => handleStartCall("audio")}
                    >
                      <Phone size={22} color="#8B5CF6" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.headerIconBtn}
                      activeOpacity={0.7}
                      onPress={() => handleStartCall("video")}
                    >
                      <Video size={24} color="#8B5CF6" />
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.headerIconBtn}
                  activeOpacity={0.7}
                  onPress={closeChatHead}
                >
                  <X size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quoted Reply Banner */}
            {replyMessage && (
              <View style={styles.replyBanner}>
                <View style={styles.replyIndicatorBar} />
                <View style={styles.replyInfo}>
                  <Text style={styles.replyTargetName}>
                    Replying to {replyMessage.senderName || "User"}
                  </Text>
                  <Text style={styles.replyTargetText} numberOfLines={1}>
                    {replyMessage.message}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReplyMessage(null)}
                  style={styles.replyCloseBtn}
                >
                  <X size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            )}

            {/* Chat Body: Thread or Conversations List */}
            {activeConversationId ? (
              <View style={styles.threadContainer}>
                {loadingMessages ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator size="small" color="#0084FF" />
                  </View>
                ) : (
                  <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, index) => item.id || item.tempId || String(index)}
                    contentContainerStyle={styles.messagesListContent}
                    renderItem={({ item, index }) => {
                      const isMe = item.senderId === currentUserId;
                      const isCallRecord =
                        item.messageType === "call" ||
                        item.message?.toLowerCase().includes("audio call") ||
                        item.message?.toLowerCase().includes("video call") ||
                        item.message?.toLowerCase().includes("missed call");

                      // Render Call Card (Messenger Style in Screenshot 1)
                      if (isCallRecord) {
                        return (
                          <View style={styles.callCardWrapper}>
                            <View style={styles.callCard}>
                              <View style={styles.callCardHeader}>
                                <View style={styles.callIconBox}>
                                  <PhoneIncoming size={18} color="#FFFFFF" />
                                </View>
                                <View style={styles.callCardInfo}>
                                  <Text style={styles.callCardTitle}>
                                    {item.message?.includes("Video") ? "Video call" : "Audio call"}
                                  </Text>
                                  <Text style={styles.callCardDuration}>
                                    {item.message?.includes("secs")
                                      ? item.message
                                      : "Ended"}
                                  </Text>
                                </View>
                              </View>
                              <TouchableOpacity
                                style={styles.callBackBtn}
                                activeOpacity={0.8}
                                onPress={() => handleStartCall("audio")}
                              >
                                <Text style={styles.callBackBtnText}>Call back</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      }

                      const { replySender, replySnippet, text } = parseReply(item.message || "");
                      const isLast = index === messages.length - 1;

                      return (
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onLongPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setReplyMessage(item);
                          }}
                          style={[
                            styles.bubbleRow,
                            isMe ? styles.myBubbleRow : styles.theirBubbleRow,
                          ]}
                        >
                          {!isMe && (
                            <Image
                              source={{
                                uri: getMediaUrl(
                                  item.senderAvatar || activeConversationAvatar || ""
                                ),
                              }}
                              style={styles.messageSenderAvatar}
                              contentFit="cover"
                            />
                          )}

                          <View style={{ maxWidth: "78%" }}>
                            {/* Quoted reply box */}
                            {replySnippet ? (
                              <View
                                style={[
                                  styles.quotedBox,
                                  isMe ? styles.myQuotedBox : styles.theirQuotedBox,
                                ]}
                              >
                                <View style={styles.quotedHeader}>
                                  <CornerDownRight size={12} color="#94A3B8" />
                                  <Text style={styles.quotedSender} numberOfLines={1}>
                                    {replySender}
                                  </Text>
                                </View>
                                <Text style={styles.quotedSnippet} numberOfLines={1}>
                                  {replySnippet}
                                </Text>
                              </View>
                            ) : null}

                            {/* Bubble Content */}
                            <View
                              style={[
                                styles.messageBubble,
                                isMe ? styles.myBubble : styles.theirBubble,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.messageText,
                                  isMe ? styles.myMessageText : styles.theirMessageText,
                                ]}
                              >
                                {text}
                              </Text>
                            </View>

                            {/* Delivery timestamp under last message */}
                            {isLast && isMe && (
                              <Text style={styles.deliveryStatusText}>Delivered</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}

                {/* Bottom Bar: (+) Camera Gallery Mic [Pill Input] (ThumbsUp/Send) */}
                <View style={styles.bottomBar}>
                  <TouchableOpacity
                    style={styles.bottomActionBtn}
                    activeOpacity={0.7}
                    onPress={handleLaunchGallery}
                  >
                    <PlusCircle size={24} color="#0084FF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bottomActionBtn}
                    activeOpacity={0.7}
                    onPress={handleLaunchCamera}
                  >
                    <Camera size={24} color="#0084FF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bottomActionBtn}
                    activeOpacity={0.7}
                    onPress={handleLaunchGallery}
                  >
                    <ImageIcon size={24} color="#0084FF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.bottomActionBtn}
                    activeOpacity={0.7}
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  >
                    <Mic size={24} color="#0084FF" />
                  </TouchableOpacity>

                  {/* Pill-shaped Text Input */}
                  <View style={styles.pillInputContainer}>
                    <TextInput
                      style={styles.pillTextInput}
                      placeholder="Message"
                      placeholderTextColor="#8E8E93"
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={() => handleSendMessage()}
                      returnKeyType="send"
                      multiline={false}
                    />
                    <TouchableOpacity
                      style={styles.pillEmojiBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        setInputText((prev) => prev + "😊");
                      }}
                    >
                      <Smile size={20} color="#0084FF" />
                    </TouchableOpacity>
                  </View>

                  {/* Thumbs up (empty input) OR Send (with text) */}
                  {inputText.trim().length > 0 ? (
                    <TouchableOpacity
                      style={styles.sendIconBtn}
                      activeOpacity={0.7}
                      onPress={() => handleSendMessage()}
                      disabled={sendingMessage}
                    >
                      {sendingMessage ? (
                        <ActivityIndicator size="small" color="#0084FF" />
                      ) : (
                        <Send size={22} color="#0084FF" />
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.thumbsUpBtn}
                      activeOpacity={0.7}
                      onPress={handleSendThumbsUp}
                    >
                      <ThumbsUp size={24} color="#0084FF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              /* View 2: All Conversations List */
              <View style={styles.convContainer}>
                <View style={styles.searchBar}>
                  <Search size={16} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search chats..."
                    placeholderTextColor="#8E8E93"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {loadingConversations ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator size="small" color="#0084FF" />
                  </View>
                ) : (
                  <FlatList
                    data={filteredConversations}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                      const isGroup = item.isGroup;
                      const other = item.participants?.find((p) => p.userId !== currentUserId);
                      const title = isGroup
                        ? item.name || "Group Chat"
                        : other?.userName || "Chat";
                      const avatar =
                        item.avatar ||
                        other?.userProfilePicture ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

                      return (
                        <TouchableOpacity
                          style={styles.convRow}
                          activeOpacity={0.7}
                          onPress={() => {
                            Haptics.selectionAsync();
                            openChatHead(item.id, title, avatar, other?.userId);
                          }}
                        >
                          <Image
                            source={{ uri: getMediaUrl(avatar) }}
                            style={styles.convAvatar}
                            contentFit="cover"
                          />
                          <View style={styles.convTextCol}>
                            <Text style={styles.convName} numberOfLines={1}>
                              {title}
                            </Text>
                            <Text style={styles.convLast} numberOfLines={1}>
                              {typeof item.lastMessage === "string"
                                ? item.lastMessage
                                : (item.lastMessage as any)?.message || "Tap to chat"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  floatingBubble: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CHAT_HEAD_SIZE,
    height: CHAT_HEAD_SIZE,
    borderRadius: CHAT_HEAD_SIZE / 2,
    backgroundColor: "#0F172A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: CHAT_HEAD_SIZE / 2,
  },
  defaultIconBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  defaultIconText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  bubbleOnlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#000000",
  },
  unreadBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  dismissTargetContainer: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    alignItems: "center",
    zIndex: 9998,
  },
  dismissTargetCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(239, 68, 68, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  dismissTargetText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  fullScreenBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 99999,
  },
  topChatHeadsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  topChatHeadsContent: {
    alignItems: "center",
    paddingRight: 16,
  },
  topBubbleItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  topBubbleItemActive: {
    borderColor: "#3B82F6",
    transform: [{ scale: 1.05 }],
  },
  topBubbleAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  topBubblePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  topBubbleInitial: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  topBubbleBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#000000",
  },
  topBubbleBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  topCloseAllBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  dropdownCard: {
    flex: 1,
    backgroundColor: "#000000",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1E2024",
    backgroundColor: "#000000",
  },
  headerPartnerRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerAvatarContainer: {
    position: "relative",
    width: 40,
    height: 40,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarDefault: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#242526",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#000000",
  },
  headerNameBox: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBtn: {
    padding: 6,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18191A",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#0084FF",
  },
  replyIndicatorBar: {
    width: 0,
  },
  replyInfo: {
    flex: 1,
    marginRight: 8,
  },
  replyTargetName: {
    color: "#0084FF",
    fontSize: 12,
    fontWeight: "600",
  },
  replyTargetText: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 2,
  },
  replyCloseBtn: {
    padding: 4,
  },
  threadContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  messagesListContent: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  callCardWrapper: {
    alignItems: "center",
    marginVertical: 10,
    width: "100%",
  },
  callCard: {
    backgroundColor: "#242526",
    borderRadius: 16,
    padding: 14,
    width: "82%",
    maxWidth: 320,
  },
  callCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  callIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#3A3B3C",
    alignItems: "center",
    justifyContent: "center",
  },
  callCardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  callCardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  callCardDuration: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 2,
  },
  callBackBtn: {
    backgroundColor: "#3A3B3C",
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  callBackBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 3,
  },
  myBubbleRow: {
    justifyContent: "flex-end",
  },
  theirBubbleRow: {
    justifyContent: "flex-start",
  },
  messageSenderAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
    marginBottom: 2,
  },
  quotedBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 3,
  },
  myQuotedBox: {
    backgroundColor: "#0055AA",
    alignSelf: "flex-end",
  },
  theirQuotedBox: {
    backgroundColor: "#18191A",
    alignSelf: "flex-start",
  },
  quotedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quotedSender: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
  },
  quotedSnippet: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 1,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: "#0084FF",
    borderBottomRightRadius: 4,
    alignSelf: "flex-end",
  },
  theirBubble: {
    backgroundColor: "#242526",
    borderBottomLeftRadius: 4,
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  theirMessageText: {
    color: "#FFFFFF",
  },
  deliveryStatusText: {
    color: "#8E8E93",
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 2,
    marginRight: 4,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1E2024",
    backgroundColor: "#000000",
    gap: 8,
  },
  bottomActionBtn: {
    padding: 4,
  },
  pillInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#242526",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
  },
  pillTextInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 2,
  },
  pillEmojiBtn: {
    paddingLeft: 6,
  },
  thumbsUpBtn: {
    padding: 6,
  },
  sendIconBtn: {
    padding: 6,
  },
  convContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18191A",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    marginLeft: 8,
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#18191A",
  },
  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#242526",
  },
  convTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  convName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  convLast: {
    color: "#8E8E93",
    fontSize: 13,
    marginTop: 2,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
