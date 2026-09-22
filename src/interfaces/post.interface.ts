import { IUser } from "./user.interface";

export interface IPostComment {
  id: string;
  _id?: string;
  postId: string;
  userId: string;
  userName: string;
  userProfilePicture?: string | null;
  text: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt?: string;
  replies?: IPostComment[];
}

export interface IPostMedia {
  url: string;
  publicId?: string | null;
  resourceType?: "image" | "video" | string | null;
  mimeType?: string | null;
  size?: number | null;
  uploadedAt?: string;
}

export interface IPost {
  id: string;
  _id?: string;
  userId: string;
  userName: string;
  userProfilePicture?: string | null;
  username?: string | null;
  user?: IUser;
  description?: string | null;
  media?: IPostMedia | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | string | null;
  likes: string[];
  likesCount: number;
  comments: IPostComment[];
  commentsCount: number;
  reposts: string[];
  repostsCount: number;
  isShare?: boolean;
  isRepost?: boolean;
  originalPost?: IPost | null;
  createdAt: string;
  updatedAt?: string;
}
