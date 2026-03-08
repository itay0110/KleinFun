"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { supabase } from "./supabase";
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
  registerUser: (input: { name: string; phone: string; email?: string }) => Promise<void>;
  logout: () => void;
  createGroup: (name: string) => Promise<Group>;
  deleteGroup: (groupId: GroupId) => void;
  joinGroupById: (groupId: GroupId) => Group | null;
  joinGroupByInviteLink: (groupId: GroupId) => Promise<Group | null>;
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
  // Initial render must be identical on server and client to avoid hydration errors,
  // so we do NOT read from localStorage here. Local data is loaded in an effect.
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
    async (input: { name: string; phone: string; email?: string }) => {
      try {
        // #region agent log
        if (process.env.NODE_ENV === 'development') {
          fetch('http://127.0.0.1:7544/ingest/f4fa5eb8-6867-4703-900a-c451c59a00be', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': 'daf237'
            },
            body: JSON.stringify({
              sessionId: 'daf237',
              runId: 'run1',
              hypothesisId: 'H1',
              location: 'lib/state.tsx:119',
              message: 'registerUser called',
              data: {
                hasName: !!input.name,
                hasPhone: !!input.phone
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
        }
        // #endregion agent log

        const { data, error } = await supabase
          .from("users")
          .insert({ name: input.name, phone: input.phone })
          .select()
          .single();

        if (error || !data) {
          // eslint-disable-next-line no-console
          console.error("Failed to persist user to Supabase", error);
          throw error ?? new Error("No user returned from Supabase");
        }

        const user: User = {
          id: data.id,
          name: data.name,
          phone: data.phone,
          email: input.email?.trim() || undefined
        };

        // #region agent log
        if (process.env.NODE_ENV === 'development') {
          fetch('http://127.0.0.1:7544/ingest/f4fa5eb8-6867-4703-900a-c451c59a00be', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': 'daf237'
            },
            body: JSON.stringify({
              sessionId: 'daf237',
              runId: 'run1',
              hypothesisId: 'H2',
              location: 'lib/state.tsx:139',
              message: 'registerUser Supabase insert success',
              data: {
                userId: user.id
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
        }
        // #endregion agent log

        setAndPersist(prev => ({
          ...prev,
          currentUser: user,
          users: { ...prev.users, [user.id]: user }
        }));
      } catch (err) {
        // #region agent log
        if (process.env.NODE_ENV === 'development') {
          fetch('http://127.0.0.1:7544/ingest/f4fa5eb8-6867-4703-900a-c451c59a00be', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': 'daf237'
            },
            body: JSON.stringify({
              sessionId: 'daf237',
              runId: 'run1',
              hypothesisId: 'H3',
              location: 'lib/state.tsx:151',
              message: 'registerUser Supabase error',
              data: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                code: (err as any)?.code,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                supabaseMessage: (err as any)?.message
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
        }
        // #endregion agent log

        // eslint-disable-next-line no-console
        console.error("Unexpected error while persisting user to Supabase", err);
        throw err;
      }
    },
    [setAndPersist]
  );

  const logout = useCallback(() => {
    supabase.auth.signOut().catch(() => {});
    setAndPersist(() => loadInitialState());
  }, [setAndPersist]);

  // Hydrate from localStorage, then sync Supabase Auth (auth wins so Google login is applied after refresh).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncAuthUser = async (
      authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
    ) => {
      const name =
        (authUser.user_metadata?.full_name as string) ||
        (authUser.user_metadata?.name as string) ||
        authUser.email ||
        "User";
      const avatarUrl =
        (authUser.user_metadata?.avatar_url as string) ||
        (authUser.user_metadata?.picture as string) ||
        undefined;

      const { data: existing } = await supabase
        .from("users")
        .select()
        .eq("id", authUser.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("users").insert({
          id: authUser.id,
          name,
          phone: ""
        });
      } else {
        await supabase.from("users").update({ name }).eq("id", authUser.id);
      }

      const user: User = {
        id: authUser.id,
        name,
        phone: existing?.phone ?? "",
        email: authUser.email ?? undefined,
        avatarUrl
      };

      setAndPersist(prev => ({
        ...prev,
        currentUser: user,
        users: { ...prev.users, [user.id]: user }
      }));
    };

    try {
      const legacyKey = "kleinfun_state_v1";
      const rawNew = window.localStorage.getItem(STORAGE_KEY);
      const rawLegacy = window.localStorage.getItem(legacyKey);
      const raw = rawNew ?? rawLegacy;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<KleinFunState>;
        setState(prev => ({
          ...prev,
          ...parsed,
          currentUser: parsed.currentUser ?? prev.currentUser,
          users: parsed.users ?? prev.users,
          groups: parsed.groups ?? prev.groups,
          busySlots: parsed.busySlots ?? prev.busySlots,
          activities: parsed.activities ?? prev.activities,
          notifications: parsed.notifications ?? prev.notifications,
          activityTypesByGroup:
            parsed.activityTypesByGroup ?? prev.activityTypesByGroup
        }));
        if (!rawNew && rawLegacy) {
          try {
            window.localStorage.removeItem(legacyKey);
            window.localStorage.setItem(STORAGE_KEY, rawLegacy);
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to hydrate KleinFun state from localStorage", err);
    }

    (async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (session?.user) await syncAuthUser(session.user);
    })();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await syncAuthUser(session.user);
      } else {
        setAndPersist(prev => ({ ...prev, currentUser: null }));
      }
    });

    return () => subscription.unsubscribe();
  }, [setAndPersist]);

  const createGroup = useCallback(
    async (name: string): Promise<Group> => {
      if (!state.currentUser) {
        throw new Error("No current user");
      }

      try {
        const { data: groupRow, error: groupError } = await supabase
          .from("groups")
          .insert({
            name,
            created_by: state.currentUser.id
          })
          .select()
          .single();

        if (groupError || !groupRow) {
          // eslint-disable-next-line no-console
          console.error("Failed to create group in Supabase", groupError);
          throw groupError ?? new Error("No group returned from Supabase");
        }

        const { error: memberError } = await supabase
          .from("group_members")
          .insert({
            group_id: groupRow.id,
            user_id: state.currentUser.id
          });

        if (memberError) {
          // eslint-disable-next-line no-console
          console.error("Failed to add creator to group_members", memberError);
          throw memberError;
        }

        const group: Group = {
          id: groupRow.id,
          name: groupRow.name,
          memberIds: [state.currentUser.id],
          createdBy: state.currentUser.id
        };

        setAndPersist(prev => ({
          ...prev,
          groups: { ...prev.groups, [group.id]: group }
        }));

        return group;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Unexpected error while creating group in Supabase", err);
        throw err;
      }
    },
    [setAndPersist, state.currentUser]
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

      let result: Group | null = null;

      setAndPersist(prev => {
        const group = prev.groups[groupId];
        if (!group) return prev;
        if (group.memberIds.includes(state.currentUser!.id)) {
          result = group;
          return prev;
        }
        const updated: Group = {
          ...group,
          memberIds: [...group.memberIds, state.currentUser!.id]
        };
        result = updated;
        return {
          ...prev,
          groups: { ...prev.groups, [groupId]: updated }
        };
      });

      return result;
    },
    [setAndPersist, state.currentUser]
  );

  const joinGroupByInviteLink = useCallback(
    async (groupId: GroupId): Promise<Group | null> => {
      if (!state.currentUser) return null;

      const existing = state.groups[groupId];
      if (existing) {
        if (existing.memberIds.includes(state.currentUser.id)) {
          return existing;
        }
        const { error: memberError } = await supabase
          .from("group_members")
          .insert({
            group_id: groupId,
            user_id: state.currentUser.id
          });
        if (memberError) {
          // eslint-disable-next-line no-console
          console.error("Failed to add member via invite link", memberError);
          return null;
        }
        const updated: Group = {
          ...existing,
          memberIds: [...existing.memberIds, state.currentUser.id]
        };
        setAndPersist(prev => ({
          ...prev,
          groups: { ...prev.groups, [groupId]: updated }
        }));
        return updated;
      }

      const { data: groupRow, error: groupError } = await supabase
        .from("groups")
        .select()
        .eq("id", groupId)
        .single();

      if (groupError || !groupRow) {
        // eslint-disable-next-line no-console
        console.error("Group not found for invite link", groupError);
        return null;
      }

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: state.currentUser.id
        });

      if (memberError) {
        // eslint-disable-next-line no-console
        console.error("Failed to add member via invite link", memberError);
        return null;
      }

      const { data: memberRows } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

      const memberIds = (memberRows ?? [])
        .map((r: { user_id: string }) => r.user_id)
        .filter(Boolean);

      const userIds = [...new Set(memberIds)];
      if (userIds.length === 0) return null;

      const { data: userRows } = await supabase
        .from("users")
        .select()
        .in("id", userIds);

      const usersMap: Record<UserId, User> = { ...state.users };
      (userRows ?? []).forEach((row: { id: string; name: string; phone: string }) => {
        usersMap[row.id] = { id: row.id, name: row.name, phone: row.phone };
      });

      const group: Group = {
        id: groupRow.id,
        name: groupRow.name,
        memberIds,
        createdBy: groupRow.created_by
      };

      setAndPersist(prev => ({
        ...prev,
        users: usersMap,
        groups: { ...prev.groups, [groupId]: group }
      }));

      return group;
    },
    [setAndPersist, state.currentUser, state.groups, state.users]
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
      // #region agent log
      if (process.env.NODE_ENV === 'development') {
        fetch('http://127.0.0.1:7544/ingest/f4fa5eb8-6867-4703-900a-c451c59a00be', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '303c7c'
          },
          body: JSON.stringify({
            sessionId: '303c7c',
            runId: 'run1',
            hypothesisId: 'H3',
            location: 'lib/state.tsx:291',
            message: 'createActivity called',
            data: {
              groupId,
              title,
              hasCurrentUser: !!state.currentUser
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
      }
      // #endregion agent log
      if (!state.currentUser) {
        throw new Error("No current user");
      }

      const id = generateId("act");
      const now = new Date();
      const start = addMinutes(now, 30);

      const baseActivity: Activity = {
        id,
        groupId,
        title,
        creatorId: state.currentUser.id,
        createdAt: now.toISOString(),
        startTime: start.toISOString(),
        location: "",
        notes: "",
        responses: {},
        comments: []
      };

      setAndPersist(prev => {
        const responses: Record<UserId, ActivityResponse> = {};
        const group = prev.groups[groupId];
        if (group) {
          group.memberIds.forEach(uid => {
            responses[uid] = uid === state.currentUser!.id ? "joined" : "pending";
          });
        }

        const activity: Activity = {
          ...baseActivity,
          responses
        };

        const notifications = buildActivityNotifications(activity, prev);

        return {
          ...prev,
          activities: { ...prev.activities, [id]: activity },
          notifications: [...prev.notifications, ...notifications]
        };
      });

      // The returned object is consistent with what we just stored,
      // and callers only need the id/group/title immediately.
      return baseActivity;
    },
    [setAndPersist, state.currentUser]
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
      logout,
      createGroup,
      deleteGroup,
      joinGroupById,
      joinGroupByInviteLink,
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
      logout,
      createGroup,
      deleteGroup,
      joinGroupById,
      joinGroupByInviteLink,
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

