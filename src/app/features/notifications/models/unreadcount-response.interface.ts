export interface UnreadcountResponse {
  success: boolean;
  message: string;
  data: Data;
}

export interface Data {
  unreadCount: number;
}
