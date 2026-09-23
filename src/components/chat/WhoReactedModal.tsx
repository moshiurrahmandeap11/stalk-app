import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { IMessageReaction } from "../../interfaces/message.interface";
import { getMediaUrl } from "../../utils/media";

interface WhoReactedModalProps {
  visible: boolean;
  reactions: IMessageReaction[];
  onClose: () => void;
  onSelectUser?: (userId: string) => void;
}

export const WhoReactedModal: React.FC<WhoReactedModalProps> = ({
  visible,
  reactions,
  onClose,
  onSelectUser,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  if (!visible) return null;

  // Group unique emojis and their counts
  const emojiCounts: { [emoji: string]: number } = {};
  reactions.forEach((r) => {
    emojiCounts[r.reaction] = (emojiCounts[r.reaction] || 0) + 1;
  });

  const filterTabs = [
    { key: "all", label: `All ${reactions.length}` },
    ...Object.entries(emojiCounts).map(([emoji, count]) => ({
      key: emoji,
      label: `${emoji} ${count}`,
    })),
  ];

  const filteredReactions =
    selectedFilter === "all"
      ? reactions
      : reactions.filter((r) => r.reaction === selectedFilter);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Grabber Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Reactions</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <View style={styles.tabsRow}>
            {filterTabs.map((tab) => {
              const isActive = selectedFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => setSelectedFilter(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Users List */}
          <FlatList
            data={filteredReactions}
            keyExtractor={(item) => item.id || `${item.userId}_${item.reaction}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const avatarUri =
                getMediaUrl(item.userAvatar) ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";

              return (
                <TouchableOpacity
                  style={styles.userRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (onSelectUser && item.userId) {
                      onSelectUser(item.userId);
                    }
                  }}
                >
                  <Image source={{ uri: avatarUri }} style={styles.userAvatar} contentFit="cover" />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {item.userName || "User"}
                    </Text>
                  </View>
                  <View style={styles.reactionBadge}>
                    <Text style={styles.reactionEmoji}>{item.reaction}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "65%",
    minHeight: 300,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  tabBtnActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  reactionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  reactionEmoji: {
    fontSize: 18,
  },
});

