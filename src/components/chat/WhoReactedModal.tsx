import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { IMessageReaction } from "../../interfaces/message.interface";
import { getMediaUrl, DEFAULT_AVATAR } from "../../utils/media";
import { AppBottomSheetModal } from "../ui/AppBottomSheetModal";

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
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Reactions"
      showCloseButton={true}
      showHandle={true}
      transparentBackdrop={true}
      maxHeight="75%"
    >

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
                DEFAULT_AVATAR;

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
    </AppBottomSheetModal>
  );
};

const styles = StyleSheet.create({
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

