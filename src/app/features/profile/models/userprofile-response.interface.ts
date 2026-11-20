export interface UserprofileResponse {
  success: boolean;
  message: string;
  data: UserProfileData;
}

export interface UserProfileData {
  isFollowing: boolean;
  user: UserProfileDetails;
  posts?: any[];
}

export interface FollowUserItem {
  _id: string;
  id?: string;
  name: string;
  username?: string;
  email?: string;
  photo?: string;
  avatar?: string;
  followersCount?: number;
  followingCount?: number;
  bookmarksCount?: number;
}

export interface UserProfileDetails {
  _id: string;
  name: string;
  username: string;
  email: string;
  dateOfBirth?: string;
  gender?: string;
  photo?: string;
  cover?: string;
  followers?: (string | FollowUserItem)[];
  following?: (string | FollowUserItem)[];
  createdAt: string;
  passwordChangedAt?: string;
  followersCount: number;
  followingCount: number;
  bookmarksCount: number;
  id?: string;
}
