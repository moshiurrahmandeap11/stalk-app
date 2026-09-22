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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { ArrowLeft, Send, Phone, Video } from "lucide-react-native";
import { messageService } from "../../services/message.service";
import { userService } from "../../services/user.service";
import { useAuthStore } from "../../store/auth.store";
import { useSocketStore } from "../../store/socket.store";
import { IMessage } from "../../interfaces/message.interface";

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>(); // target user id or conv id
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { socket, onlineUsers } = useSocketStore();

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<IMessage[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Fetch receiver info
  const { data: targetUser } = useQuery({
    queryKey: ["targetUser", id],
    queryFn: () => userService.getUserById(id!),
    enabled: !!id,
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

  // Real-time socket message listener
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (newMsg: IMessage) => {
      if (newMsg.senderId === id || newMsg.conversationId === id) {
        setMessages((prev) => [...prev, newMsg]);
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    };

    socket.on("receive_message", handleReceive);
    socket.on("message_sent", (sentMsg: IMessage) => {
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.tempId !== sentMsg.tempId);
        return [...withoutTemp, sentMsg];
      });
    });

    return () => {
      socket.off("receive_message", handleReceive);
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
      // Keep optimistic message or mark failed
    }
  };

  const isOnline = onlineUsers.includes(id || "");
  const avatarUri =
    targetUser?.avatar ||
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
            if (targetUser?.username) router.push(`/s/${targetUser.username}` as any);
          }}
        >
          <Image source={{ uri: avatarUri }} style={styles.headerAvatar} contentFit="cover" />
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{targetUser?.fullName || "Chat"}</Text>
            <Text style={[styles.headerStatus, isOnline && styles.onlineText]}>
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.callActions}>
          <TouchableOpacity style={styles.callBtn}>
            <Phone size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.callBtn}>
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
              return (
                <View style={[styles.bubbleWrapper, isMine ? styles.myWrapper : styles.theirWrapper]}>
                  <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                    <Text style={[styles.bubbleText, isMine ? styles.myBubbleText : styles.theirBubbleText]}>
                      {item.message}
                    </Text>
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
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    padding: 8,
    marginRight: 4,
  },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  headerText: {
    marginLeft: 10,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerStatus: {
    fontSize: 12,
    color: "#64748B",
  },
  onlineText: {
    color: "#10B981",
    fontWeight: "600",
  },
  callActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    paddingVertical: 12,
    gap: 8,
  },
  bubbleWrapper: {
    flexDirection: "row",
  },
  myWrapper: {
    justifyContent: "flex-end",
  },
  theirWrapper: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: "#3B82F6",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myBubbleText: {
    color: "#FFFFFF",
  },
  theirBubbleText: {
    color: "#0F172A",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
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
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
});
