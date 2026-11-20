export interface PostUser {
  _id: string;
  name: string;
  username: string;
  photo: string;
  followersCount?: number;
  followingCount?: number;
  bookmarksCount?: number;
  id?: string;
}

export interface PostItem {
  _id: string;
  body: string;
  image?: string;
  privacy: string;
  user: PostUser;
  sharedPost?: PostItem | null;
  likes: string[];
  createdAt: string;
  commentsCount?: number;
  sharesCount?: number;
  likesCount: number;
  isShare: boolean;
  bookmarked?: boolean;
  id: string;
}

export interface PostsResponse {
  success: boolean;
  message: string;
  data: {
    posts: PostItem[];
  };
  meta: {
    pagination: {
      currentPage: number;
      numberOfPages: number;
      limit: number;
      nextPage: number;
      total: number;
    };
  };
}

export interface SinglepostResponse {
  success: boolean;
  message: string;
  data: {
    post: PostItem;
  };
}

export interface IslikeResponse {
  success: boolean;
  message: string;
  data: {
    liked: boolean;
    likesCount: number;
    post: PostItem;
  };
}

export interface IsbookmarkResponse {
  success: boolean;
  message: string;
  data: {
    bookmarked: boolean;
    bookmarksCount: number;
  };
}

export interface PostRequest {
  body?: string;
  image?: File;
}

export interface PostlikesResponse {
  success: boolean;
  message: string;
  data: {
    likes: PostLikeUser[];
  };
  meta: {
    pagination: {
      currentPage: number;
      limit: number;
      total: number;
      numberOfPages: number;
    };
  };
}

export interface PostLikeUser {
  _id: string;
  name: string;
  username: string;
  photo: string;
  followersCount?: number;
  followingCount?: number;
  bookmarksCount?: number;
  id?: string;
}

export interface SharepostRequest {
  body?: string;
}

export interface SharepostResponse {
  success: boolean;
  message: string;
  data: {
    post: PostItem;
  };
}
