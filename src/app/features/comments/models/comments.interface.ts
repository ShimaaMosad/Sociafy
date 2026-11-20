export interface CommentRequest {
  content?: string;
  image?: File;
}

export interface CommentCreator {
  _id: string;
  name: string;
  username: string;
  photo: string;
  followersCount?: number;
  followingCount?: number;
  bookmarksCount?: number;
  id?: string;
}

export interface CommentItem {
  _id: string;
  content: string;
  image?: string;
  commentCreator: CommentCreator;
  post: string;
  parentComment?: any;
  likes: string[];
  createdAt: string;
  likesCount: number;
  isReply: boolean;
  repliesCount?: number;
  id: string;
}

export interface PostcommentsResponse {
  success: boolean;
  message: string;
  data: {
    comments: CommentItem[];
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

export interface CreatecommentResponse {
  success: boolean;
  message: string;
  data: {
    comment: CommentItem;
  };
}

export interface CommentreplayResponse {
  success: boolean;
  message: string;
  data: {
    replies: CommentItem[];
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

export interface CreatereplayResponse {
  success: boolean;
  message: string;
  data: {
    reply: CommentItem;
  };
}

export interface TogglelikeResponse {
  success: boolean;
  message: string;
  data: {
    liked: boolean;
    likesCount: number;
    comment: CommentItem;
  };
}

export interface DeletecommentResponse {
  success: boolean;
  message: string;
  data: Record<string, any>;
}
