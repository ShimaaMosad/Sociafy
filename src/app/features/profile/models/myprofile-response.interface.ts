export interface MyprofileResponse {
  success: boolean;
  message: string;
  data: Data;
}

export interface Data {
  user: User;
}

export interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  dateOfBirth?: string;
  gender?: string;
  photo?: string;
  cover?: string;
  bookmarks?: string[];
  followers?: any[];
  following?: any[];
  createdAt: string;
  passwordChangedAt?: string;
  followersCount: number;
  followingCount: number;
  bookmarksCount: number;
  id?: string;
}
