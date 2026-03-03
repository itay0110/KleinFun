export type UserId = string;
export type GroupId = string;
export type ActivityId = string;

export interface User {
  id: UserId;
  name: string;
  phone: string;
}

export interface BusySlot {
  id: string;
  userId: UserId;
  groupId: GroupId;
  start: string; // ISO
  end: string; // ISO
  onGround?: boolean;
}

export type AvailabilityStatus = "available" | "busy";

export interface GroupMemberStatus {
  user: User;
  status: AvailabilityStatus;
  label: string;
  sortKey: number;
  onGround: boolean;
}

export type ActivityResponse = "pending" | "joined" | "declined";

export interface ActivityComment {
  id: string;
  userId: UserId;
  text: string;
  createdAt: string;
}

export interface Activity {
  id: ActivityId;
  groupId: GroupId;
  title: string;
  creatorId: UserId;
  createdAt: string;
  startTime: string;
  responses: Record<UserId, ActivityResponse>;
  comments: ActivityComment[];
}

export interface NotificationPayload {
  id: string;
  userId: UserId;
  activityId: ActivityId;
  groupId: GroupId;
  message: string;
  createdAt: string;
  read: boolean;
}

