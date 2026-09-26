import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import {
  X,
  Users,
  Camera,
  Search,
  Check,
  CheckCircle2,
  Circle,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { friendService, IFriendUser } from "../../services/friend.service";
import { messageService } from "../../services/message.service";
import { searchService } from "../../services/search.service";
import { getMediaUrl, DEFAULT_AVATAR } from "../../utils/media";
import { IConversation } from "../../interfaces/message.interface";

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onGroupCreated: (newGroup: IConversation) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  visible,
  onClose,
  onGroupCreated,
}) => {
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<IFriendUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch initial friends
  const { data: friends = [], isLoading: isLoadingFriends } = useQuery({
    queryKey: ["friends-list"],
    queryFn: () => friendService.getFriends(),
    enabled: visible,
  });

  const pickAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setGroupAvatar(res.assets[0].uri);
      }
    } catch {
      // Non-blocking
    }
  };

  const toggleSelectUser = (user: IFriendUser) => {
    Haptics.selectionAsync();
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setErrorMsg("Please enter a group name");
      return;
    }
    if (selectedUsers.length === 0) {
      setErrorMsg("Please select at least 1 member for the group");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const memberIds = selectedUsers.map((u) => u.id);
      const newGroup = await messageService.createGroup({
        name: groupName.trim(),
        avatar: groupAvatar || undefined,
        memberIds,
      });

      // Reset
      setGroupName("");
      setGroupAvatar(null);
      setSelectedUsers([]);
      onGroupCreated(newGroup);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || "Failed to create group");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFriends = friends.filter((f) =>
    f.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={22} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Group</Text>
            <TouchableOpacity
              style={[
                styles.createBtn,
                (!groupName.trim() || selectedUsers.length === 0 || isSubmitting) && styles.createBtnDisabled,
              ]}
              disabled={!groupName.trim() || selectedUsers.length === 0 || isSubmitting}
              onPress={handleCreateGroup}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.createBtnText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Group Details: Avatar & Name */}
          <View style={styles.detailsRow}>
            <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar} activeOpacity={0.8}>
              {groupAvatar ? (
                <Image source={{ uri: groupAvatar }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Camera size={24} color="#64748B" />
                  <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.nameInputContainer}>
              <TextInput
                placeholder="Group name"
                placeholderTextColor="#94A3B8"
                style={styles.nameInput}
                value={groupName}
                onChangeText={(t) => {
                  setGroupName(t);
                  setErrorMsg(null);
                }}
                maxLength={40}
              />
              <Text style={styles.charCount}>{groupName.length}/40</Text>
            </View>
          </View>

          {/* Selected Chips */}
          {selectedUsers.length > 0 ? (
            <View style={styles.selectedSection}>
              <Text style={styles.selectedCountText}>
                {selectedUsers.length} {selectedUsers.length === 1 ? "member" : "members"} selected
              </Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={selectedUsers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.chipsList}
                renderItem={({ item }) => {
                  const avatarUri =
                    getMediaUrl(
                      item.profilePicUrl ||
                      (typeof item.profilePicture === "object" ? item.profilePicture?.url : "")
                    ) || DEFAULT_AVATAR;
                  return (
                    <View style={styles.userChip}>
                      <Image source={{ uri: avatarUri }} style={styles.chipAvatar} contentFit="cover" />
                      <Text style={styles.chipName} numberOfLines={1}>
                        {item.fullName.split(" ")[0]}
                      </Text>
                      <TouchableOpacity
                        style={styles.chipRemove}
                        onPress={() => toggleSelectUser(item)}
                      >
                        <X size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            </View>
          ) : null}

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              placeholder="Search friends to add..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Friends List */}
          {isLoadingFriends ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : (
            <FlatList
              data={filteredFriends}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.friendsList}
              renderItem={({ item }) => {
                const isSelected = selectedUsers.some((u) => u.id === item.id);
                const avatarUri =
                  getMediaUrl(
                    item.profilePicUrl ||
                    (typeof item.profilePicture === "object" ? item.profilePicture?.url : "")
                  ) || DEFAULT_AVATAR;

                return (
                  <TouchableOpacity
                    style={[styles.friendItem, isSelected && styles.friendItemSelected]}
                    activeOpacity={0.7}
                    onPress={() => toggleSelectUser(item)}
                  >
                    <Image source={{ uri: avatarUri }} style={styles.friendAvatar} contentFit="cover" />
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{item.fullName}</Text>
                      {item.email ? <Text style={styles.friendEmail}>{item.email}</Text> : null}
                    </View>
                    <View style={styles.checkCircle}>
                      {isSelected ? (
                        <CheckCircle2 size={24} color="#3B82F6" fill="#EFF6FF" />
                      ) : (
                        <Circle size={24} color="#CBD5E1" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Users size={40} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>
                    {searchQuery ? "No matching friends found" : "No friends found to add"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? "Try searching for a different name"
                      : "Add friends first to include them in group chats"}
                  </Text>
                </View>
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  createBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.6,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "600",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  avatarPicker: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  nameInputContainer: {
    flex: 1,
    position: "relative",
  },
  nameInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    borderBottomWidth: 1.5,
    borderBottomColor: "#3B82F6",
    paddingVertical: 8,
    paddingRight: 40,
  },
  charCount: {
    position: "absolute",
    right: 0,
    bottom: 10,
    fontSize: 11,
    color: "#94A3B8",
  },
  selectedSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  selectedCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
    marginBottom: 8,
  },
  chipsList: {
    gap: 10,
  },
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingRight: 6,
    paddingLeft: 4,
    paddingVertical: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  chipAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  chipName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E40AF",
    maxWidth: 70,
  },
  chipRemove: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 44,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  friendsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  friendItemSelected: {
    backgroundColor: "#F0F9FF",
    borderColor: "#BAE6FD",
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  friendEmail: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  checkCircle: {
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});

