export interface TogglefollowResponse {
  success: boolean;
  message: string;
  data: Data;
}

export interface Data {
  following: boolean;
  followersCount: number;
}
