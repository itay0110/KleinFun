"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";
import {
  Activity,
  ActivityId,
  ActivityResponse,
  BusySlot,
  GroupId,
  GroupMemberStatus,
  NotificationPayload,
  User,
  UserId
} from "./types";
import { addHours, addMinutes, formatTimeShort } from "./utils";

interface Group {
  id: GroupId;
  name: string;
  memberIds: UserId[];
  createdBy: UserId;
}

interface KleinFunState {
  currentUser: User | null;
  users: Record<UserId, User>;
  groups: Record<GroupId, Group>;
  busySlots: BusySlot[];
  activities: Record<ActivityId, Activity>;
  notifications: NotificationPayload[];
  activityTypesByGroup: Record<GroupId, { id: string; label: string }[]>;
}

interface KleinFunContextValue extends KleinFunState {
  registerUser: (input: { name: string; phone: string }) => void;
  createGroup: (name: string) => Group;
  deleteGroup: (groupId: GroupId) => void;
  joinGroupById: (groupId: GroupId) => Group | null;
  getGroupMembers: (groupId: GroupId) => User[];
  addBusySlot: (groupId: GroupId, start: Date, end: Date, onGround: boolean) => void;
  updateBusySlot: (slotId: string, start: Date, end: Date, onGround: boolean) => void;
  deleteBusySlot: (slotId: string) => void;
  clearBusySlots: (groupId: GroupId) => void;
  createActivity: (groupId: GroupId, title: string) => Activity;
  deleteActivity: (activityId: ActivityId) => void;
  respondToActivity: (
    activityId: ActivityId,
    userId: UserId,
    response: ActivityResponse
  ) => void;
  addCommentToActivity: (activityId: ActivityId, text: string) => void;
  updateActivityTime: (activityId: ActivityId, startTime: Date) => void;
  updateActivityDetails: (
    activityId: ActivityId,
    details: { location?: string; notes?: string }
  ) => void;
  getActivityTypesForGroup: (groupId: GroupId) => { id: string; label: string }[];
  addActivityTypeToGroup: (groupId: GroupId, label: string) => void;
  deleteActivityTypeFromGroup: (groupId: GroupId, typeId: string) => void;
  getGroupMemberStatuses: (groupId: GroupId) => GroupMemberStatus[];
  getGroupActivities: (groupId: GroupId) => Activity[];
  getActivityById: (id: ActivityId) => Activity | undefined;
  getNotificationsForCurrentUser: () => NotificationPayload[];
  markNotificationRead: (id: string) => void;
}

const KleinFunContext = createContext<KleinFunContextValue | null>(null);

const STORAGE_KEY = "kleinfun-state-v1";

function loadInitialState(): KleinFunState {
  if (typeof window === "undefined") {
    return {
      currentUser: null,
      users: {},
      groups: {},
      busySlots: [],
      activities: {},
      notifications: [],
      activityTypesByGroup: {}
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        currentUser: null,
        users: {},
        groups: {},
        busySlots: [],
        activities: {},
        notifications: [],
        activityTypesByGroup: {}
      };
    }
    const parsed = JSON.parse(raw) as KleinFunState;
    return parsed;
  } catch {
    return {
      currentUser: null,
      users: {},
      groups: {},
      busySlots: [],
      activities: {},
      notifications: [],
      activityTypesByGroup: {}
    };
  }
}

function persistState(state: KleinFunState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function KleinFunProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<KleinFunState>(() => loadInitialState());

  const setAndPersist = useCallback((updater: (prev: KleinFunState) => KleinFunState) => {
    setState(prev => {
      const next = updater(prev);
      persistState(next);
      return next;
    });
  }, []);

  const registerUser = useCallback(
    (input: { name: string; phone: string }) => {
      const id = generateId("user");
      const user: User = { id, ...input };
      setAndPersist(prev => ({
        ...prev,
        currentUser: user,
        users: { ...prev.users, [id]: user }
      }));
    },
    [setAndPersist]
  );

  const createGroup = useCallback(
    (name: string): Group => {
      if (!state.currentUser) {
        throw new Error("No current user");
      }
      const id = generateId("group");
      const group: Group = {
        id,
        name,
        memberIds: [state.currentUser.id],
        createdBy: state.currentUser.id
      };
      const next: KleinFunState = {
        ...state,
        groups: { ...state.groups, [id]: group }
      };
      persistState(next);
      setState(next);
      return group;
    },
    [state]
  );

  const deleteGroup = useCallback(
    (groupId: GroupId) => {
      if (!state.currentUser) return;
      const group = state.groups[groupId];
      if (!group || group.createdBy !== state.currentUser.id) return;

      setAndPersist(prev => {
        const { [groupId]: _removed, ...restGroups } = prev.groups;
        const {
          [groupId]: _removedTypes,
          ...restActivityTypes
        } = prev.activityTypesByGroup ?? {};
        return {
          ...prev,
          groups: restGroups,
          busySlots: prev.busySlots.filter(s => s.groupId !== groupId),
          activities: Object.fromEntries(
            Object.entries(prev.activities).filter(
              ([, act]) => act.groupId !== groupId
            )
          ),
          notifications: prev.notifications.filter(n => n.groupId !== groupId),
          activityTypesByGroup: restActivityTypes
        };
      });
    },
    [setAndPersist, state.currentUser, state.groups]
  );

  const joinGroupById = useCallback(
    (groupId: GroupId): Group | null => {
      if (!state.currentUser) return null;
      const group = state.groups[groupId];
      if (!group) return null;
      if (group.memberIds.includes(state.currentUser.id)) {
        return group;
      }
      const updated: Group = {
        ...group,
        memberIds: [...group.memberIds, state.currentUser.id]
      };
      const next: KleinFunState = {
        ...state,
        groups: { ...state.groups, [groupId]: updated }
      };
      persistState(next);
      setState(next);
      return updated;
    },
    [state]
  );

  const getGroupMembers = useCallback(
    (groupId: GroupId): User[] => {
      const g = state.groups[groupId];
      if (!g) return [];
      return g.memberIds
        .map(id => state.users[id])
        .filter(Boolean);
    },
    [state.groups, state.users]
  );

  const getActivityTypesForGroup = useCallback(
    (groupId: GroupId): { id: string; label: string }[] => {
      const map = state.activityTypesByGroup ?? {};
      return map[groupId] ?? [];
    },
    [state.activityTypesByGroup]
  );

  const addActivityTypeToGroup = useCallback(
    (groupId: GroupId, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      setAndPersist(prev => {
        const map = prev.activityTypesByGroup ?? {};
        const current = map[groupId] ?? [];
        if (current.some(t => t.label.toLowerCase() === trimmed.toLowerCase())) {
          return prev;
        }
        const nextForGroup = [...current, { id: generateId("atype"), label: trimmed }];
        return {
          ...prev,
          activityTypesByGroup: {
            ...map,
            [groupId]: nextForGroup
          }
        };
      });
    },
    [setAndPersist]
  );

  const deleteActivityTypeFromGroup = useCallback(
    (groupId: GroupId, typeId: string) => {
      setAndPersist(prev => {
        const map = prev.activityTypesByGroup ?? {};
        const current = map[groupId];
        if (!current) return prev;
        const nextForGroup = current.filter(t => t.id !== typeId);
        const nextMap = { ...map };
        if (nextForGroup.length > 0) {
          nextMap[groupId] = nextForGroup;
        } else {
          delete nextMap[groupId];
        }
        return {
          ...prev,
          activityTypesByGroup: nextMap
        };
      });
    },
    [setAndPersist]
  );

  const addBusySlot = useCallback(
    (groupId: GroupId, start: Date, end: Date, onGround: boolean) => {
      if (!state.currentUser) return;
      const slot: BusySlot = {
        id: generateId("busy"),
        userId: state.currentUser.id,
        groupId,
        start: start.toISOString(),
        end: end.toISOString(),
        onGround
      };
      setAndPersist(prev => ({
        ...prev,
        busySlots: [...prev.busySlots, slot]
      }));
    },
    [setAndPersist, state.currentUser]
  );

  const updateBusySlot = useCallback(
    (slotId: string, start: Date, end: Date, onGround: boolean) => {
      setAndPersist(prev => ({
        ...prev,
        busySlots: prev.busySlots.map(slot =>
          slot.id === slotId
            ? {
                ...slot,
                start: start.toISOString(),
                end: end.toISOString(),
                onGround
              }
            : slot
        )
      }));
    },
    [setAndPersist]
  );

  const deleteBusySlot = useCallback(
    (slotId: string) => {
      setAndPersist(prev => ({
        ...prev,
        busySlots: prev.busySlots.filter(slot => slot.id !== slotId)
      }));
    },
    [setAndPersist]
  );

  const clearBusySlots = useCallback(
    (groupId: GroupId) => {
      if (!state.currentUser) return;
      setAndPersist(prev => ({
        ...prev,
        busySlots: prev.busySlots.filter(
          s => !(s.groupId === groupId && s.userId === state.currentUser!.id)
        )
      }));
    },
    [setAndPersist, state.currentUser]
  );

  const createActivity = useCallback(
    (groupId: GroupId, title: string): Activity => {
      if (!state.currentUser) {
        throw new Error("No current user");
      }
      const id = generateId("act");
      const now = new Date();
      const start = addMinutes(now, 30);

      const responses: Record<UserId, ActivityResponse> = {};
      const group = state.groups[groupId];
      if (group) {
        group.memberIds.forEach(uid => {
          responses[uid] = uid === state.currentUser!.id ? "joined" : "pending";
        });
      }

      const activity: Activity = {
        id,
        groupId,
        title,
        creatorId: state.currentUser.id,
        createdAt: now.toISOString(),
        startTime: start.toISOString(),
        location: "",
        notes: "",
        responses,
        comments: []
      };

      const notifications = buildActivityNotifications(activity, state);

      const next: KleinFunState = {
        ...state,
        activities: { ...state.activities, [id]: activity },
        notifications: [...state.notifications, ...notifications]
      };

      persistState(next);
      setState(next);
      return activity;
    },
    [state]
  );

  const deleteActivity = useCallback(
    (activityId: ActivityId) => {
      if (!state.currentUser) return;
      setAndPersist(prev => {
        const activity = prev.activities[activityId];
        if (!activity || activity.creatorId !== state.currentUser!.id) {
          return prev;
        }
        const { [activityId]: _removed, ...restActivities } = prev.activities;
        return {
          ...prev,
          activities: restActivities,
          notifications: prev.notifications.filter(
            n => n.activityId !== activityId
          )
        };
      });
    },
    [setAndPersist, state.currentUser]
  );

  const respondToActivity = useCallback(
    (activityId: ActivityId, userId: UserId, response: ActivityResponse) => {
      setAndPersist(prev => {
        const activity = prev.activities[activityId];
        if (!activity) return prev;
        const updated: Activity = {
          ...activity,
          responses: { ...activity.responses, [userId]: response }
        };
        return {
          ...prev,
          activities: { ...prev.activities, [activityId]: updated }
        };
      });
    },
    [setAndPersist]
  );

  const addCommentToActivity = useCallback(
    (activityId: ActivityId, text: string) => {
      if (!state.currentUser) return;
      const now = new Date();
      const commentId = generateId("c");
      setAndPersist(prev => {
        const activity = prev.activities[activityId];
        if (!activity) return prev;
        const comment = {
          id: commentId,
          userId: state.currentUser!.id,
          text,
          createdAt: now.toISOString()
        };
        const updated: Activity = {
          ...activity,
          comments: [...activity.comments, comment]
        };
        return {
          ...prev,
          activities: { ...prev.activities, [activityId]: updated }
        };
      });
    },
    [setAndPersist, state.currentUser]
  );

  const updateActivityTime = useCallback(
    (activityId: ActivityId, startTime: Date) => {
      if (!state.currentUser) return;
      setAndPersist(prev => {
        const activity = prev.activities[activityId];
        if (!activity) return prev;
        if (activity.creatorId !== state.currentUser!.id) return prev;
        const updated: Activity = {
          ...activity,
          startTime: startTime.toISOString()
        };
        return {
          ...prev,
          activities: { ...prev.activities, [activityId]: updated }
        };
      });
    },
    [setAndPersist, state.currentUser]
  );

  const updateActivityDetails = useCallback(
    (
      activityId: ActivityId,
      details: { location?: string; notes?: string }
    ) => {
      if (!state.currentUser) return;
      setAndPersist(prev => {
        const activity = prev.activities[activityId];
        if (!activity || activity.creatorId !== state.currentUser!.id) return prev;
        const updated: Activity = {
          ...activity,
          ...(details.location !== undefined && { location: details.location }),
          ...(details.notes !== undefined && { notes: details.notes })
        };
        return {
          ...prev,
          activities: { ...prev.activities, [activityId]: updated }
        };
      });
    },
    [setAndPersist, state.currentUser]
  );

  const getGroupMemberStatuses = useCallback(
    (groupId: GroupId) => {
      const group = state.groups[groupId];
      if (!group) return [];
      const now = new Date();
      const upperBound = addHours(now, 48);

      return group.memberIds
        .map(uid => state.users[uid])
        .filter(Boolean)
        .map(user => {
          const slots = state.busySlots.filter(s => {
            return (
              s.userId === user.id &&
              new Date(s.end) > now &&
              new Date(s.start) < upperBound
            );
          });

          let status: "available" | "busy" = "available";
          let label = "Available";
          let sortKey = 0;
          let onGround = false;

          const sorted = slots.sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
          );

          const current = sorted.find(
            s => new Date(s.start) <= now && new Date(s.end) >= now
          );

          if (current) {
            if (current.onGround) {
              status = "available";
              label = `On the ground until ${formatTimeShort(
                new Date(current.end)
              )}`;
              sortKey = 1;
              onGround = true;
            } else {
              status = "busy";
              label = `Available ${formatLabelTime(new Date(current.end), now)}`;
              sortKey = 2;
            }
          } else {
            const next = sorted.find(s => new Date(s.start) > now);
            if (next) {
              status = "available";
              label = `Busy at ${formatTimeShort(new Date(next.start))}`;
            } else {
              label = "Free for 48h";
            }
            sortKey = 0;
          }

          return { user, status, label, sortKey, onGround };
        })
        .sort((a, b) => a.sortKey - b.sortKey || a.user.name.localeCompare(b.user.name));
    },
    [state.busySlots, state.groups, state.users]
  );

  const getGroupActivities = useCallback(
    (groupId: GroupId): Activity[] => {
      const now = new Date();
      return Object.values(state.activities)
        .filter(a => a.groupId === groupId)
        .filter(a => {
          const start = new Date(a.startTime);
          const expiry = addHours(start, 3);
          return expiry > now;
        })
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
    },
    [state.activities]
  );

  const getActivityById = useCallback(
    (id: ActivityId) => state.activities[id],
    [state.activities]
  );

  const getNotificationsForCurrentUser = useCallback(() => {
    if (!state.currentUser) return [];
    return state.notifications
      .filter(n => n.userId === state.currentUser!.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [state.currentUser, state.notifications]);

  const markNotificationRead = useCallback(
    (id: string) => {
      setAndPersist(prev => ({
        ...prev,
        notifications: prev.notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        )
      }));
    },
    [setAndPersist]
  );

  const value: KleinFunContextValue = useMemo(
    () => ({
      ...state,
      registerUser,
      createGroup,
      deleteGroup,
      joinGroupById,
      getGroupMembers,
      addBusySlot,
      updateBusySlot,
      deleteBusySlot,
      clearBusySlots,
      createActivity,
      deleteActivity,
      respondToActivity,
      addCommentToActivity,
      updateActivityTime,
      updateActivityDetails,
      getActivityTypesForGroup,
      addActivityTypeToGroup,
      deleteActivityTypeFromGroup,
      getGroupMemberStatuses,
      getGroupActivities,
      getActivityById,
      getNotificationsForCurrentUser,
      markNotificationRead
    }),
    [
      state,
      registerUser,
      createGroup,
      deleteGroup,
      joinGroupById,
      getGroupMembers,
      addBusySlot,
      updateBusySlot,
      deleteBusySlot,
      clearBusySlots,
      createActivity,
      deleteActivity,
      respondToActivity,
      addCommentToActivity,
      updateActivityTime,
      updateActivityDetails,
      getActivityTypesForGroup,
      addActivityTypeToGroup,
      deleteActivityTypeFromGroup,
      getGroupMemberStatuses,
      getGroupActivities,
      getActivityById,
      getNotificationsForCurrentUser,
      markNotificationRead
    ]
  );

  return (
    <KleinFunContext.Provider value={value}>
      {children}
    </KleinFunContext.Provider>
  );
}

export function useKleinFun() {
  const ctx = useContext(KleinFunContext);
  if (!ctx) throw new Error("KleinFunProvider missing");
  return ctx;
}

function buildActivityNotifications(
  activity: Activity,
  state: KleinFunState
): NotificationPayload[] {
  const group = state.groups[activity.groupId];
  if (!group) return [];
  const now = new Date();
  const start = new Date(activity.startTime);
  const activityEndWindow = addHours(start, 3);
  if (activityEndWindow <= now) return [];

  const notifications: NotificationPayload[] = [];

  group.memberIds.forEach(uid => {
    if (uid === activity.creatorId) return;

    const isAvailable = computeUserAvailabilityForActivity(uid, start, state.busySlots);
    if (!isAvailable) return;

    const user = state.users[uid];
    if (!user) return;

    const message = `'${state.users[activity.creatorId]?.name ?? "Someone"}' wants you to join '${activity.title}' at ${start.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    )}`;

    notifications.push({
      id: generateId("notif"),
      userId: uid,
      activityId: activity.id,
      groupId: activity.groupId,
      message,
      createdAt: now.toISOString(),
      read: false
    });
  });

  return notifications;
}

function computeUserAvailabilityForActivity(
  userId: UserId,
  start: Date,
  busySlots: BusySlot[]
) {
  const end = addHours(start, 3);
  return !busySlots.some(slot => {
    if (slot.userId !== userId) return false;
    if (slot.onGround) return false;
    const s = new Date(slot.start);
    const e = new Date(slot.end);
    return s < end && e > start;
  });
}

function formatLabelTime(target: Date, from: Date) {
  const diffMinutes = Math.round(
    (target.getTime() - from.getTime()) / (60 * 1000)
  );
  if (diffMinutes <= 0) return "soon";
  if (diffMinutes < 60) return `in ${diffMinutes}m`;
  const hours = Math.round(diffMinutes / 60);
  return `in ${hours}h`;
}

