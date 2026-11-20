export interface MarkallreadResponse {
  success: boolean;
  message: string;
  data: Data;
}

export interface Data {
  modifiedCount: number;
}
