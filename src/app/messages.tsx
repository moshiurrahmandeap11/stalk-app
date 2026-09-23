import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { ArrowLeft, MessageSquare, Users, Plus, MoreVertical, Volume2, MessageCircle } from "lucide-react-native";
import { messageService } from "../services/message.service";
import { IConversation } from "../interfaces/message.interface";
import { useAuthStore } from "../store/auth.store";
import { useSocketStore } from "../store/socket.store";
import { useChatHeadStore } from "../store/chathead.store";
import { FacebookActionSheet } from "../components/ui/FacebookActionSheet";
import { playReceiveSound, setChatSoundsEnabled, isChatSoundsEnabled } from "../utils/chatSounds";
import { CreateGroupModal } from "../components/chat/CreateGroupModal";

export default function MessagesScreen({ isTab = false }: { isTab?: boolean } = {}) {
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { socket } = useSocketStore();
  const { isChatHeadEnabled, toggleChatHeadEnabled } = useChatHeadStore();
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isSoundsActive, setIsSoundsActive] = useState(isChatSoundsEnabled());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [convList, setConvList] = useState<IConversation[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: boolean }>({});
  const typingTimersRef = useRef<{ [userId: string]: ReturnType<typeof setTimeout> }>({});

  const { data: conversations, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messageService.getConversations(),
  });

  useEffect(() => {
    if (conversations) {
      setConvList(conversations);
    }
  }, [conversations]);

  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [data.userId]: data.isTyping,
      }));

      if (data.isTyping) {
        if (typingTimersRef.current[data.userId]) {
          clearTimeout(typingTimersRef.current[data.userId]);
        }
        typingTimersRef.current[data.userId] = setTimeout(() => {
          setTypingUsers((prev) => ({
            ...prev,
            [data.userId]: false,
          }));
        }, 3500);
      }
    };

    const handleReceiveMessage = (newMsg: any) => {
      playReceiveSound();
      setConvList((prev) => {
        const foundIdx = prev.findIndex(
          (c) =>
            c.id === newMsg.conversationId ||
            c.participants?.some((p) => p.userId === newMsg.senderId)
        );

        if (foundIdx >= 0) {
          const updated = [...prev];
          const conv = { ...updated[foundIdx] };
          conv.lastMessage =
            newMsg.messageType === "image"
              ? "📷 Photo"
              : newMsg.messageType === "video"
              ? "🎥 Video"
              : newMsg.messageType === "file"
              ? `📎 ${newMsg.fileName || "File"}`
              : newMsg.message || "New message";
          conv.unreadCount = (conv.unreadCount || 0) + 1;
          updated.splice(foundIdx, 1);
          return [conv, ...updated];
        } else {
          refetch();
          return prev;
        }
      });
    };

    socket.on("user_typing", handleUserTyping);
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("user_typing", handleUserTyping);
      socket.off("receive_message", handleReceiveMessage);
      Object.values(typingTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, [socket, refetch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        {!isTab ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 12 }} />
        )}
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.newGroupBtn}
            activeOpacity={0.7}
            onPress={() => setShowCreateGroup(true)}
          >
            <Users size={17} color="#3B82F6" />
            <Text style={styles.newGroupBtnText}>New Group</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreOptionsBtn}
            activeOpacity={0.7}
            onPress={() => setShowOptionsMenu(true)}
          >
            <MoreVertical size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversations List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={convList}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => {
            const isGroup = item.isGroup;
            const otherParticipant = item.participants?.find((p) => p.userId !== currentUserId);
            const title = isGroup
              ? item.name || "Group Chat"
              : otherParticipant?.userName || "Chat";
            const avatar =
              item.avatar ||
              otherParticipant?.userProfilePicture ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

            const unread = otherParticipant?.unreadCount || item.unreadCount || 0;
            const targetId = isGroup ? item.id : otherParticipant?.userId || item.id;
            const otherUserId = otherParticipant?.userId || "";
            const isUserTyping = Boolean(typingUsers[otherUserId]);

            return (
              <TouchableOpacity
                style={styles.convItem}
                activeOpacity={0.7}
                onPress={() => router.push(`/chat/${targetId}` as any)}
              >
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: avatar }} style={styles.convAvatar} contentFit="cover" />
                  {isGroup ? (
                    <View style={styles.groupBadge}>
                      <Users size={10} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.convTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    {isGroup ? (
                      <View style={styles.groupPill}>
                        <Text style={styles.groupPillText}>
                          {item.participants?.length || 0} members
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {isUserTyping ? (
                    <Text style={styles.typingLastMsg} numberOfLines={1}>
                      Typing...
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.convLastMsg,
                        unread > 0 && styles.convLastMsgUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage || "No messages yet"}
                    </Text>
                  )}
                </View>
                {unread > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{unread}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>Start chatting with your friends or create a group!</Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setShowCreateGroup(true)}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Create a Group</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        visible={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={(newGroup: IConversation) => {
          refetch();
          router.push(`/chat/${newGroup.id}` as any);
        }}
      />

      {/* Facebook-style Messenger Options Sheet */}
      <FacebookActionSheet
        visible={showOptionsMenu}
        title="Messenger Options"
        actions={[
          {
            id: "chat-head-toggle",
            label: isChatHeadEnabled ? "Turn OFF Chat Heads" : "Turn ON Chat Heads",
            subLabel: isChatHeadEnabled
              ? "Floating chat bubble is enabled"
              : "Enable floating bubble over apps",
            icon: MessageCircle,
            onPress: () => {
              toggleChatHeadEnabled();
            },
          },
          {
            id: "sound-toggle",
            label: isSoundsActive ? "Mute Message Sounds" : "Enable Message Sounds",
            subLabel: isSoundsActive
              ? "Sound chimes are active"
              : "Play sound when receiving messages",
            icon: Volume2,
            onPress: () => {
              const next = !isSoundsActive;
              setChatSoundsEnabled(next);
              setIsSoundsActive(next);
            },
          },
        ]}
        onClose={() => setShowOptionsMenu(false)}
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
    height: 56,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moreOptionsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  newGroupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  newGroupBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  avatarWrapper: {
    position: "relative",
  },
  convAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E2E8F0",
  },
  groupBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  convInfo: {
    flex: 1,
    marginLeft: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  convTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  groupPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  groupPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  convLastMsg: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  convLastMsgUnread: {
    fontWeight: "700",
    color: "#0F172A",
  },
  typingLastMsg: {
    fontSize: 14,
    color: "#0A7CFF",
    fontWeight: "700",
    fontStyle: "italic",
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  emptyActionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
