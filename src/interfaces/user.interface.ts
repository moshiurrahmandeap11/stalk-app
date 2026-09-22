export interface IUser {
  id: string;
  _id?: string;
  username: string;
  fullName: string;
  name?: string;
  email: string;
  role: "user" | "admin";
  gender?: "male" | "female" | "other" | null;
  dob?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  avatar?: string | null;
  profilePicUrl?: string | null;
  profilePicPublicId?: string | null;
  profilePicOptimizedUrl?: string | null;
  coverImage?: string | null;
  coverPhotoUrl?: string | null;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  followersCount?: number;
  followingCount?: number;
  friendsCount?: number;
}
