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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  MessageCircle,
  X,
  Minus,
  ArrowLeft,
  Send,
  Search,
  Users,
} from "lucide-react-native";
import { useChatHeadStore } from "../../store/chathead.store";
import { useAuthStore } from "../../store/auth.store";
import { useSocketStore } from "../../store/socket.store";
import { messageService } from "../../services/message.service";
import { IConversation, IMessage } from "../../interfaces/message.interface";
import { playSendSound, playReceiveSound } from "../../utils/chatSounds";
import { getMediaUrl } from "../../utils/media";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CHAT_HEAD_SIZE = 58;

export const FloatingChatHead: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    isChatHeadEnabled,
    isChatHeadOpen,
    unreadMessagesCount,
    activeConversationId,
    activeConversationTitle,
    activeConversationAvatar,
    setChatHeadOpen,
    openChatHead,
    closeChatHead,
    resetUnreadCount,
    setChatHeadEnabled,
  } = useChatHeadStore();

  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const socket = useSocketStore((s) => s.socket);

  // Position coordinates of the floating bubble
  const posX = useSharedValue(SCREEN_WIDTH - CHAT_HEAD_SIZE - 12);
  const posY = useSharedValue(SCREEN_HEIGHT * 0.35);
  const isDragging = useSharedValue(false);
  const [showDismissTarget, setShowDismissTarget] = useState(false);

  // Chat window state
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Fetch conversations when chat window opens
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
      if (activeConversationId && msg.conversationId === activeConversationId) {
        setMessages((prev) => [...prev, msg]);
        playReceiveSound();
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    socket.on("receive_message", handleNewMessage);
    socket.on("new_message", handleNewMessage);
    socket.on("new_group_message", handleNewMessage);

    return () => {
      socket.off("receive_message", handleNewMessage);
      socket.off("new_message", handleNewMessage);
      socket.off("new_group_message", handleNewMessage);
    };
  }, [socket, activeConversationId]);

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

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeConversationId || sendingMessage) return;

    const text = inputText.trim();
    setInputText("");
    playSendSound();

    try {
      setSendingMessage(true);
      const sent = await messageService.sendMessage(activeConversationId, {
        message: text,
        messageType: "text",
      });

      if (sent) {
        setMessages((prev) => [...prev, sent]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch {
      // quiet fail
    } finally {
      setSendingMessage(false);
    }
  };

  // Drag Gesture for Floating Bubble
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
          useChatHeadStore.getState().dismissChatHead();
          return;
        }

        // Tap detected (minimal movement)
        if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) {
          Haptics.selectionAsync();
          resetUnreadCount();
          setChatHeadOpen(!isChatHeadOpen);
          return;
        }

        // Snap to nearest screen edge (left or right)
        const snapLeft = 12;
        const snapRight = SCREEN_WIDTH - CHAT_HEAD_SIZE - 12;
        const targetX = gesture.moveX < SCREEN_WIDTH / 2 ? snapLeft : snapRight;

        // Keep inside vertical safe area
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

  // IMPORTANT: Only show chat head if an active conversation or message partner is selected
  if (!activeConversationId && !isChatHeadOpen) return null;

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const name = c.name || c.participants?.find((p) => p.userId !== currentUserId)?.userName || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      {/* Floating Chat Head Bubble */}
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
              <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "700" }}>
                {(activeConversationTitle || "Chat").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Unread Count Red Badge */}
          {unreadMessagesCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Bottom Dismiss Target ("✕") while dragging */}
      {showDismissTarget && (
        <View style={styles.dismissTargetContainer}>
          <View style={styles.dismissTargetCircle}>
            <X size={24} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.dismissTargetText}>Drag here to close</Text>
        </View>
      )}

      {/* Floating Messenger Window Overlay */}
      {isChatHeadOpen && (
        <View style={styles.windowOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardContainer}
          >
            <View
              style={[
                styles.messengerWindow,
                {
                  paddingTop: insets.top,
                  paddingBottom: Math.max(insets.bottom, 10),
                },
              ]}
            >
              {/* Window Header */}
              <View style={styles.windowHeader}>
                {activeConversationId ? (
                  <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => openChatHead(undefined)}
                    activeOpacity={0.7}
                  >
                    <ArrowLeft size={22} color="#0F172A" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.headerLogoBox}>
                    <MessageCircle size={22} color="#2563EB" />
                  </View>
                )}

                <View style={styles.headerInfo}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {activeConversationTitle || "Messenger"}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {activeConversationId ? "Active now" : "All chats"}
                  </Text>
                </View>

                {/* Minimize Button */}
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={closeChatHead}
                  activeOpacity={0.7}
                >
                  <Minus size={22} color="#475569" strokeWidth={2.5} />
                </TouchableOpacity>

                {/* Close Button - Completely dismisses chat head */}
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => {
                    useChatHeadStore.getState().dismissChatHead();
                  }}
                  activeOpacity={0.7}
                >
                  <X size={22} color="#475569" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {/* View 1: Active Chat Message Thread */}
              {activeConversationId ? (
                <View style={styles.chatThreadContainer}>
                  {loadingMessages ? (
                    <View style={styles.centerContainer}>
                      <ActivityIndicator size="small" color="#3B82F6" />
                    </View>
                  ) : (
                    <FlatList
                      ref={flatListRef}
                      data={messages}
                      keyExtractor={(item, index) => item.id || String(index)}
                      contentContainerStyle={styles.messagesListContent}
                      renderItem={({ item }) => {
                        const isMe = item.senderId === currentUserId;
                        return (
                          <View
                            style={[
                              styles.messageBubbleWrapper,
                              isMe ? styles.myBubbleWrapper : styles.theirBubbleWrapper,
                            ]}
                          >
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
                                {item.message}
                              </Text>
                            </View>
                          </View>
                        );
                      }}
                    />
                  )}

                  {/* Message Input Bar */}
                  <View style={styles.inputBar}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Aa"
                      placeholderTextColor="#94A3B8"
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={handleSendMessage}
                      returnKeyType="send"
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendBtn,
                        inputText.trim().length > 0 && styles.sendBtnActive,
                      ]}
                      onPress={handleSendMessage}
                      disabled={!inputText.trim().length || sendingMessage}
                      activeOpacity={0.7}
                    >
                      {sendingMessage ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Send size={18} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* View 2: Conversation List */
                <View style={styles.conversationListContainer}>
                  {/* Search Bar */}
                  <View style={styles.searchBar}>
                    <Search size={16} color="#94A3B8" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search chats..."
                      placeholderTextColor="#94A3B8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>

                  {loadingConversations ? (
                    <View style={styles.centerContainer}>
                      <ActivityIndicator size="small" color="#3B82F6" />
                    </View>
                  ) : (
                    <FlatList
                      data={filteredConversations}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={styles.convListContent}
                      renderItem={({ item }) => {
                        const isGroup = item.isGroup;
                        const otherParticipant = item.participants?.find(
                          (p) => p.userId !== currentUserId
                        );
                        const title = isGroup
                          ? item.name || "Group Chat"
                          : otherParticipant?.userName || "Chat";
                        const avatar =
                          item.avatar ||
                          otherParticipant?.userProfilePicture ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

                        return (
                          <TouchableOpacity
                            style={styles.convItem}
                            activeOpacity={0.7}
                            onPress={() => {
                              Haptics.selectionAsync();
                              openChatHead(item.id, title, avatar);
                            }}
                          >
                            <Image
                              source={{ uri: getMediaUrl(avatar) }}
                              style={styles.convAvatar}
                              contentFit="cover"
                            />
                            <View style={styles.convInfo}>
                              <Text style={styles.convTitle} numberOfLines={1}>
                                {title}
                              </Text>
                              <Text style={styles.convPreview} numberOfLines={1}>
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
          </KeyboardAvoidingView>
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
    backgroundColor: "#2563EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
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
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
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
    backgroundColor: "rgba(239, 68, 68, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  dismissTargetText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  windowOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  keyboardContainer: {
    width: "92%",
    height: "78%",
    maxHeight: 620,
  },
  messengerWindow: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    overflow: "hidden",
  },
  windowHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogoBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  chatThreadContainer: {
    flex: 1,
  },
  messagesListContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubbleWrapper: {
    marginVertical: 4,
    maxWidth: "80%",
  },
  myBubbleWrapper: {
    alignSelf: "flex-end",
  },
  theirBubbleWrapper: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  theirMessageText: {
    color: "#0F172A",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: "#0F172A",
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendBtnActive: {
    backgroundColor: "#2563EB",
  },
  conversationListContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    marginLeft: 8,
  },
  convListContent: {
    paddingHorizontal: 16,
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
  },
  convInfo: {
    flex: 1,
    marginLeft: 12,
  },
  convTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  convPreview: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
