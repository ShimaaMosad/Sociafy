export interface MarknotificationResponse {
  success: boolean;
  message: string;
  data: Data;
}

export interface Data {
  notification: Notification;
}

export interface Notification {
  _id: string;
  recipient: Recipient;
  actor: Actor;
  type: string;
  entityType: string;
  entityId: string;
  isRead: boolean;
  createdAt: string;
  readAt: string;
  entity: Entity;
}

export interface Recipient {
  _id: string;
  name: string;
  photo: string;
}

export interface Actor {
  _id: string;
  name: string;
  photo: string;
}

export interface Entity {
  _id: string;
  body: string;
  user: string;
  commentsCount: number;
  topComment: any;
  sharesCount: number;
  likesCount: number;
  isShare: boolean;
  id: string;
}
