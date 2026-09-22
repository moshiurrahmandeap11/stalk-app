import { IUser } from "./user.interface";

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface ISignupPayload {
  fullName: string;
  email: string;
  password: string;
  username?: string;
  gender?: "male" | "female" | "other";
  dob?: string;
}

export interface IAuthResponse {
  success: boolean;
  message: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: IUser;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    token?: string;
    user?: IUser;
  };
}

