import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { IUser } from "../../interfaces/user.interface";
import { followService } from "../../services/follow.service";
import { useAuthStore } from "../../store/auth.store";

interface UserSearchCardProps {
  user: IUser;
}

export const UserSearchCard: React.FC<UserSearchCardProps> = ({ user }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const targetUserId = (user.id || user._id || "") as string;
  const isSelf = Boolean(currentUserId && targetUserId && currentUserId === targetUserId);

  const { data: isFollowing = false } = useQuery({
    queryKey: ["follow-status", targetUserId],
    queryFn: () => followService.getFollowStatus(targetUserId!),
    enabled: Boolean(isAuthenticated && targetUserId && !isSelf),
    staleTime: 60 * 1000,
  });

  const followMutation = useMutation({
    mutationFn: async (nextStatus: boolean) => {
      if (!targetUserId) return null;
      if (nextStatus) {
        return followService.followUser(targetUserId);
      } else {
        return followService.unfollowUser(targetUserId);
      }
    },
    onMutate: async (nextStatus: boolean) => {
      await queryClient.cancelQueries({ queryKey: ["follow-status", targetUserId] });
      const prev = queryClient.getQueryData(["follow-status", targetUserId]);
      queryClient.setQueryData(["follow-status", targetUserId], nextStatus);
      return { prev };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(["follow-status", targetUserId], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", targetUserId] });
    },
  });

  const handleToggleFollow = (e: any) => {
    e.stopPropagation?.();
    if (!isAuthenticated) {
      router.push("/login" as any);
      return;
    }
    if (isSelf || !targetUserId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    followMutation.mutate(!isFollowing);
  };

  const avatarUri =
    user.profilePicUrl ||
    user.avatar ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/s/${user.username}` as any)}
    >
      <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {user.fullName || user.name || "User"}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{user.username || "user"}
        </Text>
        {user.bio ? (
          <Text style={styles.bio} numberOfLines={1}>
            {user.bio}
          </Text>
        ) : null}
      </View>

      {!isSelf && targetUserId ? (
        <TouchableOpacity
          style={[
            styles.followBtn,
            isFollowing ? styles.followingBtn : styles.notFollowingBtn,
          ]}
          activeOpacity={0.8}
          onPress={handleToggleFollow}
        >
          <Text
            style={[
              styles.followBtnText,
              isFollowing ? styles.followingBtnText : styles.notFollowingBtnText,
            ]}
          >
            {isFollowing ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
  },
  info: {
    marginLeft: 12,
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  username: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 1,
  },
  bio: {
    fontSize: 12,
    color: "#475569",
    marginTop: 3,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  notFollowingBtn: {
    backgroundColor: "#2563EB",
  },
  followingBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  followBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  notFollowingBtnText: {
    color: "#FFFFFF",
  },
  followingBtnText: {
    color: "#475569",
  },
});
