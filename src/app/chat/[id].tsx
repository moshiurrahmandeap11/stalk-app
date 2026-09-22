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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Send,
  Phone,
  Video,
  Users,
} from "lucide-react-native";
import { messageService } from "../../services/message.service";
import { userService } from "../../services/user.service";
import { useAuthStore } from "../../store/auth.store";
import { useSocketStore } from "../../store/socket.store";
import { useCallStore } from "../../store/call.store";
import { IMessage, IMessageReaction } from "../../interfaces/message.interface";
import { ReactionPicker } from "../../components/chat/ReactionPicker";

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>(); // target user id or conv id
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { socket, onlineUsers } = useSocketStore();
  const { startCall } = useCallStore();

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

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

  // Mark messages as read
  useEffect(() => {
    if (id) {
      messageService.markAsRead(id);
      if (socket?.connected) {
        socket.emit("mark_as_read", { senderId: id });
      }
    }
  }, [id, socket]);

  // Real-time socket message and reaction listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (newMsg: IMessage) => {
      if (newMsg.senderId === id || newMsg.conversationId === id) {
        setMessages((prev) => [...prev, newMsg]);
        flatListRef.current?.scrollToEnd({ animated: true });
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

    socket.on("receive_message", handleReceive);
    socket.on("message_sent", handleMessageSent);
    socket.on("message_reaction", handleReaction);

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("message_sent", handleMessageSent);
      socket.off("message_reaction", handleReaction);
    };
  }, [socket, id]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: IMessage = {
      id: tempId,
      tempId,
      senderId: currentUserId || "me",
      senderName: "Me",
      message: inputText.trim(),
      messageType: "text",
      isRead: false,
      isDelivered: false,
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    const textToSend = inputText.trim();
    setInputText("");

    try {
      if (socket?.connected) {
        socket.emit("send_message", {
          receiverId: id,
          message: textToSend,
          messageType: "text",
          tempId,
        });
      } else {
        const saved = await messageService.sendMessage(id!, {
          message: textToSend,
          tempId,
        });
        setMessages((prev) => prev.map((m) => (m.tempId === tempId ? saved : m)));
      }
    } catch {
      // Optimistic message remains
    }
  };

  const handleSelectReaction = async (emoji: string) => {
    if (!selectedMsgId) return;
    const msgId = selectedMsgId;
    setSelectedMsgId(null);

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

  const handleStartCall = (type: "audio" | "video") => {
    if (isGroup) {
      Alert.alert("Group Call", "Group calling will be available in an upcoming update!");
      return;
    }
    const partnerId = targetUser?.id || id!;
    const partnerName = targetUser?.fullName || "Friend";
    const partnerAvatar =
      targetUser?.avatar || targetUser?.profilePicUrl || undefined;

    startCall({ id: partnerId, name: partnerName, avatar: partnerAvatar }, type);
    router.push("/call" as any);
  };

  const isOnline = onlineUsers.includes(id || "");
  const chatTitle = isGroup
    ? currentConv?.name || "Group Chat"
    : targetUser?.fullName || "Chat";
  const avatarUri = isGroup
    ? currentConv?.avatar || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150"
    : targetUser?.avatar ||
      targetUser?.profilePicUrl ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
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
            <Image source={{ uri: avatarUri }} style={styles.headerAvatar} contentFit="cover" />
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
            <Text style={[styles.headerStatus, !isGroup && isOnline && styles.onlineText]}>
              {isGroup
                ? `${currentConv?.participants?.length || 0} members`
                : isOnline
                ? "Online"
                : "Offline"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Audio & Video Call Buttons */}
        <View style={styles.callActions}>
          <TouchableOpacity
            style={styles.callBtn}
            activeOpacity={0.7}
            onPress={() => handleStartCall("audio")}
          >
            <Phone size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.callBtn}
            activeOpacity={0.7}
            onPress={() => handleStartCall("video")}
          >
            <Video size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id || item.tempId || String(Math.random())}
            renderItem={({ item }) => {
              const isMine = item.senderId === currentUserId;
              const reactions = item.reactions || [];

              // Group reactions by emoji: { '❤️': 2, '🔥': 1 }
              const reactionCounts: { [emoji: string]: number } = {};
              reactions.forEach((r: IMessageReaction) => {
                reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
              });
              const reactionEntries = Object.entries(reactionCounts);

              return (
                <View style={[styles.bubbleWrapper, isMine ? styles.myWrapper : styles.theirWrapper]}>
                  {/* In group chats, show other member's avatar */}
                  {isGroup && !isMine ? (
                    <Image
                      source={{
                        uri:
                          item.senderProfilePicture ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
                      }}
                      style={styles.senderAvatar}
                      contentFit="cover"
                    />
                  ) : null}

                  <View style={{ maxWidth: "80%" }}>
                    {/* In group chats, show sender's name */}
                    {isGroup && !isMine ? (
                      <Text style={styles.senderName}>{item.senderName || "Member"}</Text>
                    ) : null}

                    {/* Message Bubble with Long-Press for Telegram Reactions */}
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setSelectedMsgId(item.id || item.tempId || null);
                      }}
                      style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          isMine ? styles.myBubbleText : styles.theirBubbleText,
                        ]}
                      >
                        {item.message}
                      </Text>
                    </TouchableOpacity>

                    {/* Telegram-style Emoji Reaction Pills */}
                    {reactionEntries.length > 0 ? (
                      <View
                        style={[
                          styles.reactionPillsContainer,
                          isMine ? styles.reactionPillsRight : styles.reactionPillsLeft,
                        ]}
                      >
                        {reactionEntries.map(([emoji, count]) => (
                          <TouchableOpacity
                            key={emoji}
                            style={styles.reactionPill}
                            activeOpacity={0.7}
                            onPress={() => {
                              setSelectedMsgId(item.id || item.tempId || null);
                              handleSelectReaction(emoji);
                            }}
                          >
                            <Text style={styles.reactionEmoji}>{emoji}</Text>
                            {count > 1 ? (
                              <Text style={styles.reactionCount}>{count}</Text>
                            ) : null}
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            style={styles.inputField}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Telegram Emoji Reaction Picker */}
      <ReactionPicker
        visible={Boolean(selectedMsgId)}
        onDismiss={() => setSelectedMsgId(null)}
        onSelectReaction={handleSelectReaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    height: 60,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  avatarWrapper: {
    position: "relative",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  groupBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
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
    color: "#0F172A",
  },
  headerStatus: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 1,
  },
  onlineText: {
    color: "#10B981",
    fontWeight: "600",
  },
  callActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  bubbleWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 3,
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
  senderName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3B82F6",
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: "#3B82F6",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  myBubbleText: {
    color: "#FFFFFF",
  },
  theirBubbleText: {
    color: "#0F172A",
  },
  reactionPillsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 3,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 8,
  },
  inputField: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
    color: "#0F172A",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.5,
  },
});
