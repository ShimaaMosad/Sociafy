export interface UploadphotoResponse {
  success: boolean;
  message: string;
  data: Data;
}

export interface Data {
  photo: string;
  postId: string;
}
