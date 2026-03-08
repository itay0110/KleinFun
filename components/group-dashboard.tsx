"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, Plus, Bell, Link2, Clock, Beer, Dumbbell, Briefcase, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useKleinFun } from "@/lib/state";
import { BusySlot, GroupId } from "@/lib/types";
import { addHours, addMinutes, formatDateTimeLocalInput, formatTimeShort } from "@/lib/utils";

const QUARTER_HOUR_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}`;
});

function getDatePartOr(value: string, fallback: Date) {
  if (value && value.length >= 10) return value.slice(0, 10);
  const base = formatDateTimeLocalInput(fallback);
  return base.slice(0, 10);
}

function getTimePartOr(value: string, fallback: Date) {
  if (value && value.length >= 16) return value.slice(11, 16);
  const base = formatDateTimeLocalInput(fallback);
  return base.slice(11, 16);
}

const DEFAULT_ACTIVITIES = [
  { id: "beer", label: "Beer", icon: Beer },
  { id: "workout", label: "Workout", icon: Dumbbell },
  { id: "meeting", label: "Meeting", icon: Briefcase }
];

export function GroupDashboard() {
  const router = useRouter();
  const search = useSearchParams();
  const groupId = search.get("group") as GroupId | null;

  const {
    currentUser,
    groups,
    busySlots,
    createGroup,
    deleteGroup,
    joinGroupById,
    joinGroupByInviteLink,
    getGroupMembers,
    getGroupMemberStatuses,
    addBusySlot,
    updateBusySlot,
    deleteBusySlot,
    getGroupActivities,
    createActivity,
    deleteActivity,
    respondToActivity,
    addCommentToActivity,
    updateActivityTime,
    updateActivityDetails,
    getActivityTypesForGroup,
    addActivityTypeToGroup,
    deleteActivityTypeFromGroup,
    getActivityById,
    getNotificationsForCurrentUser,
    markNotificationRead,
    logout
  } = useKleinFun();

  const [newGroupName, setNewGroupName] = useState("");
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [busyStart, setBusyStart] = useState("");
  const [busyEnd, setBusyEnd] = useState("");
  const [editingBusyId, setEditingBusyId] = useState<string | null>(null);
  const [busyOnGround, setBusyOnGround] = useState(false);
  const [activityComment, setActivityComment] = useState("");
  const [pendingActivityTime, setPendingActivityTime] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState("");
  const [pendingNotes, setPendingNotes] = useState("");
  const [newActivityTypeLabel, setNewActivityTypeLabel] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [hiddenDefaultActivityIds, setHiddenDefaultActivityIds] = useState<string[]>([]);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);
  const [showAddGroupForm, setShowAddGroupForm] = useState(false);
  const [showAddActivityTypeForm, setShowAddActivityTypeForm] = useState(false);

  // When user opens an invite link (?group=...) while logged in, auto-join the group.
  useEffect(() => {
    if (!groupId || !currentUser) return;
    joinGroupByInviteLink(groupId).catch(() => {});
  }, [groupId, currentUser, joinGroupByInviteLink]);

  const activeGroup = useMemo(() => {
    if (groupId && groups[groupId]) return groups[groupId];
    const groupList = Object.values(groups);
    return groupList[0] ?? null;
  }, [groupId, groups]);

  const userGroups = useMemo(() => {
    if (!currentUser) return [];
    return Object.values(groups).filter(g => g.memberIds.includes(currentUser.id));
  }, [currentUser, groups]);

  const members = activeGroup ? getGroupMembers(activeGroup.id) : [];
  const memberStatuses = activeGroup
    ? getGroupMemberStatuses(activeGroup.id)
    : [];
  const activities = activeGroup ? getGroupActivities(activeGroup.id) : [];
  const activityTypes = activeGroup
    ? getActivityTypesForGroup(activeGroup.id)
    : [];
  const notifications = getNotificationsForCurrentUser();
  const myBusySlots: BusySlot[] = useMemo(() => {
    if (!currentUser) return [];
    const now = new Date();
    const upperBound = addHours(now, 48);
    return busySlots
      .filter(slot => {
        const start = new Date(slot.start);
        const end = new Date(slot.end);
        return (
          slot.userId === currentUser.id &&
          end > now &&
          start < upperBound
        );
      })
      .sort(
        (a, b) =>
          new Date(a.start).getTime() - new Date(b.start).getTime()
      );
  }, [busySlots, currentUser]);

  const inviteUrl = activeGroup
    ? `${typeof window !== "undefined" ? window.location.origin : ""}?group=${activeGroup.id}`
    : "";

  const handleCreateGroup = async () => {
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
          hypothesisId: 'H1',
          location: 'components/group-dashboard.tsx:132',
          message: 'handleCreateGroup invoked',
          data: {
            newGroupName,
            hasActiveGroup: !!activeGroup,
            groupsCount: Object.keys(groups).length
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
    }
    // #endregion agent log
    console.log("handleCreateGroup", { newGroupName })
    if (!newGroupName.trim()) return;
    const group = await createGroup(newGroupName.trim());
    setNewGroupName("");
    router.push(`/?group=${group.id}`);
  };

  const handleJoinFromQuery = () => {
    if (!groupId) return;
    const joined = joinGroupById(groupId);
    if (joined) {
      router.push(`/?group=${joined.id}`);
    }
  };

  const handleUpdateAvailability = () => {
    if (!busyStart || !busyEnd) return;
    const start = new Date(busyStart);
    const end = new Date(busyEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return;
    if (editingBusyId) {
      updateBusySlot(editingBusyId, start, end, busyOnGround);
      setEditingBusyId(null);
    } else {
      if (!activeGroup) return;
      addBusySlot(activeGroup.id, start, end, busyOnGround);
    }
    const nextStart = new Date(end);
    const nextEnd = addHours(nextStart, 6);
    setBusyStart(formatDateTimeLocalInput(nextStart));
    setBusyEnd(formatDateTimeLocalInput(nextEnd));
    setBusyOnGround(false);
  };

  const handleActivityClick = (presetId: string) => {
    if (!activeGroup) return;
    const preset = DEFAULT_ACTIVITIES.find(p => p.id === presetId);
    if (!preset) return;
    const activity = createActivity(activeGroup.id, preset.label);
    setSelectedActivityId(activity.id);
    setActivitySheetOpen(true);
  };

  const selectedActivity = selectedActivityId
    ? getActivityById(selectedActivityId)
    : null;

  useEffect(() => {
    if (selectedActivity) {
      setPendingActivityTime(
        formatDateTimeLocalInput(new Date(selectedActivity.startTime))
      );
      setPendingLocation(selectedActivity.location ?? "");
      setPendingNotes(selectedActivity.notes ?? "");
    } else {
      setPendingActivityTime(null);
      setPendingLocation("");
      setPendingNotes("");
    }
  }, [selectedActivity]);

  const handleActivityTimeSave = () => {
    if (!selectedActivity || !pendingActivityTime) return;
    const asDate = new Date(pendingActivityTime);
    if (isNaN(asDate.getTime())) return;
    const now = new Date();
    if (asDate < now) {
      return;
    }
    updateActivityTime(selectedActivity.id, asDate);
  };

  const handleDeleteActivity = () => {
    if (!selectedActivity || !isCreator) return;
    deleteActivity(selectedActivity.id);
    setSelectedActivityId(null);
    setActivitySheetOpen(false);
  };

  const handleRespond = (response: "joined" | "declined") => {
    if (!selectedActivity || !currentUser) return;
    respondToActivity(selectedActivity.id, currentUser.id, response);
  };

  const handleAddComment = () => {
    if (!activityComment.trim() || !selectedActivity) return;
    addCommentToActivity(selectedActivity.id, activityComment.trim());
    setActivityComment("");
  };

  const isCreator =
    selectedActivity && currentUser
      ? selectedActivity.creatorId === currentUser.id
      : false;

  const isExpired = selectedActivity
    ? addHours(new Date(selectedActivity.startTime), 3) <= new Date()
    : false;

  return (
    <div className="flex flex-1 flex-col gap-4 pb-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-500">
            KleinFun
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            {activeGroup ? activeGroup.name : "Your groups"}
          </h2>
          {currentUser && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : null}
              <span>Signed in as {currentUser.name}</span>
              <button
                type="button"
                className="text-[11px] font-medium text-emerald-600 hover:underline"
                onClick={logout}
              >
                Logout
              </button>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-soft"
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell className="h-5 w-5" />
            {notifications.some(n => !n.read) && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </button>
          <button
            type="button"
            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-semibold ${
              showGroupsPanel ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
            onClick={() => setShowGroupsPanel(prev => !prev)}
          >
            <Users className="h-5 w-5" />
          </button>
        </div>
      </header>

      {!activeGroup && (
        <Card className="space-y-3">
          <p className="text-sm font-medium text-slate-900">
            Create your first group
          </p>
          <div className="space-y-2">
            <Input
              placeholder="Friends, Team, Family..."
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
            />
            <Button className="w-full" onClick={handleCreateGroup}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create group
            </Button>
          </div>
          {/* Join group from invite link button removed per request */}
        </Card>
      )}

      {activeGroup && (
        <>
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-medium text-slate-900">
                  Your availability (48h)
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const now = new Date();
                  const later = addHours(now, 6);
                  setBusyStart(formatDateTimeLocalInput(now));
                  setBusyEnd(formatDateTimeLocalInput(later));
                  setBusyOnGround(false);
                  setAvailabilityOpen(true);
                }}
              >
                Update
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Let your group know when you&apos;re busy in the next 48 hours.
            </p>
            {myBusySlots.length > 0 && (
              <div className="space-y-1 rounded-2xl bg-slate-50 p-2">
                <p className="text-[11px] font-medium text-slate-600">
                  Your busy windows
                </p>
                {myBusySlots.map(slot => {
                  const start = new Date(slot.start);
                  const end = new Date(slot.end);
                  const day = start.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric"
                  });
                  const range = `${formatTimeShort(start)} – ${formatTimeShort(end)}`;
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between gap-2 rounded-2xl bg-white px-2 py-1.5 text-[11px] text-slate-800"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{day}</span>
                        <span className="text-slate-600">{range}</span>
                      </div>
                      {slot.onGround && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                          On ground
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {currentUser && showGroupsPanel && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900">Your groups</p>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-soft hover:bg-slate-50"
                  onClick={() => setShowAddGroupForm(prev => !prev)}
                  aria-label="Add group"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {showAddGroupForm && (
                <div className="flex gap-2">
                  <Input
                    className="h-8 flex-1 text-xs"
                    placeholder="New group name"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={!newGroupName.trim()}
                    onClick={async () => {
                      try {
                        await handleCreateGroup();
                        setShowAddGroupForm(false);
                      } catch {
                        // leave form open on error
                      }
                    }}
                  >
                    <Plus className="mr-1.5 h-3 w-3" />
                    New
                  </Button>
                </div>
              )}
              <div className="flex gap-2 overflow-x-auto">
                {userGroups.map(group => (
                  <div
                    key={group.id}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1 py-0.5"
                  >
                    <button
                      onClick={() => router.push(`/?group=${group.id}`)}
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                        activeGroup && activeGroup.id === group.id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {group.name}
                    </button>
                    {currentUser && group.createdBy === currentUser.id && (
                      <button
                        className="mr-1 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete group '${group.name}' for everyone?`
                            )
                          ) {
                            const deletingActive =
                              activeGroup && activeGroup.id === group.id;
                            deleteGroup(group.id);
                            if (deletingActive) {
                              router.push("/");
                            }
                          }
                        }}
                        aria-label={`Delete group ${group.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-medium text-slate-900">
                  Members
                </p>
              </div>
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"
                onClick={() => {
                  if (!inviteUrl) return;
                  navigator.clipboard?.writeText(inviteUrl);
                  setInviteCopied(true);
                  window.setTimeout(() => {
                    setInviteCopied(false);
                  }, 2000);
                }}
              >
                <Link2 className="h-3 w-3" />
                Copy invite link
              </button>
            </div>
            {inviteCopied && (
              <p className="text-[11px] text-emerald-600">Invite link copied</p>
            )}
            <div className="space-y-2">
              {memberStatuses.length === 0 && (
                <p className="text-xs text-slate-500">
                  You&apos;re the first one here. Share the invite link to add friends.
                </p>
              )}
              {memberStatuses.map(({ user, status, label, onGround }) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-slate-500">{label}</p>
                  </div>
                  <Badge
                    tone={
                      onGround
                        ? "ground"
                        : status === "available"
                        ? "available"
                        : "busy"
                    }
                  >
                    {onGround
                      ? "On the ground"
                      : status === "available"
                      ? "Available"
                      : "Busy"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900">
                Activities
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEFAULT_ACTIVITIES.filter(a => !hiddenDefaultActivityIds.includes(a.id)).map(
                ({ id, label, icon: Icon }) => (
                  <div key={id} className="relative">
                    <button
                      className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl bg-slate-50 px-2 py-3 text-xs font-medium text-slate-800 shadow-soft"
                      onClick={() => handleActivityClick(id)}
                    >
                      <Icon className="h-5 w-5 text-slate-700" />
                      <span>{label}</span>
                    </button>
                    <button
                      type="button"
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={e => {
                        e.stopPropagation();
                        setHiddenDefaultActivityIds(prev => [...prev, id]);
                      }}
                      aria-label={`Hide preset activity ${label}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )
              )}
              {activityTypes.map(type => (
                <div key={type.id} className="relative">
                  <button
                    className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl bg-slate-50 px-2 py-3 text-xs font-medium text-slate-800 shadow-soft"
                    onClick={() => {
                      if (!activeGroup) return;
                      const activity = createActivity(activeGroup.id, type.label);
                      setSelectedActivityId(activity.id);
                      setActivitySheetOpen(true);
                    }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                      {type.label.trim().charAt(0).toUpperCase() || "A"}
                    </span>
                    <span className="truncate">{type.label}</span>
                  </button>
                  <div className="absolute right-1 top-1 flex gap-1">
                    <button
                      type="button"
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={e => {
                        e.stopPropagation();
                        if (!activeGroup) return;
                        const nextLabel = window.prompt("Edit activity label", type.label);
                        if (!nextLabel || !nextLabel.trim()) return;
                        addActivityTypeToGroup(activeGroup.id, nextLabel.trim());
                        deleteActivityTypeFromGroup(activeGroup.id, type.id);
                      }}
                      aria-label={`Edit activity type ${type.label}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={e => {
                        e.stopPropagation();
                        if (!activeGroup) return;
                        deleteActivityTypeFromGroup(activeGroup.id, type.id);
                      }}
                      aria-label={`Delete activity type ${type.label}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {activeGroup && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-soft hover:bg-slate-50"
                  onClick={() => setShowAddActivityTypeForm(prev => !prev)}
                  aria-label="Add activity type"
                >
                  <Plus className="h-4 w-4" />
                </button>
                {showAddActivityTypeForm && (
                  <div className="flex flex-1 gap-2">
                    <Input
                      className="h-8 flex-1 text-xs"
                      placeholder="Add activity type (per group)"
                      value={newActivityTypeLabel}
                      onChange={e => setNewActivityTypeLabel(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={!newActivityTypeLabel.trim()}
                      onClick={() => {
                        if (!activeGroup || !newActivityTypeLabel.trim()) return;
                        addActivityTypeToGroup(activeGroup.id, newActivityTypeLabel);
                        setNewActivityTypeLabel("");
                        setShowAddActivityTypeForm(false);
                      }}
                    >
                      <Plus className="mr-1.5 h-3 w-3" />
                      Add
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              {activities.length === 0 && (
                <p className="text-xs text-slate-500">
                  Tap an activity to propose something in the next few hours.
                </p>
              )}
              {activities.length > 0 && (
                <div className="space-y-2">
                  {activities.map(activity => {
                    const start = new Date(activity.startTime);
                    const myResponse =
                      currentUser && activity.responses[currentUser.id];
                    const label =
                      myResponse === "joined"
                        ? "Joined"
                        : myResponse === "declined"
                        ? "Declined"
                        : "Pending";
                    const tone =
                      myResponse === "joined"
                        ? "available"
                        : myResponse === "declined"
                        ? "busy"
                        : "neutral";
                    const joinedMembers = members.filter(
                      m => activity.responses[m.id] === "joined"
                    );
                    const locationText = activity.location?.trim();
                    return (
                      <button
                        key={activity.id}
                        onClick={() => {
                          setSelectedActivityId(activity.id);
                          setActivitySheetOpen(true);
                        }}
                        className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-left text-sm text-slate-900"
                      >
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {formatTimeShort(start)}
                            {locationText && ` • ${locationText}`}
                          </p>
                          {joinedMembers.length > 0 && (
                            <p className="text-[11px] text-slate-500">
                              {joinedMembers.map(m => m.name).join(", ")}
                            </p>
                          )}
                        </div>
                        <Badge tone={tone as any}>{label}</Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      <Sheet
        open={availabilityOpen}
        onOpenChange={setAvailabilityOpen}
        title="Update availability (48h)"
      >
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Add one or more busy windows for the next 48 hours. You can add
            multiple time frames.
          </p>
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-soft">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Start
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  className="flex-1"
                  value={getDatePartOr(busyStart, new Date())}
                  onChange={e => {
                    const date = e.target.value;
                    const time = getTimePartOr(busyStart, new Date());
                    setBusyStart(`${date}T${time}`);
                  }}
                />
                <Input
                  type="time"
                  step={900}
                  className="w-[40%]"
                  value={getTimePartOr(busyStart, new Date())}
                  onChange={e => {
                    const time = e.target.value;
                    const date = getDatePartOr(busyStart, new Date());
                    setBusyStart(`${date}T${time}`);
                  }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                End
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  className="flex-1"
                  value={getDatePartOr(busyEnd, new Date())}
                  onChange={e => {
                    const date = e.target.value;
                    const time = getTimePartOr(busyEnd, new Date());
                    setBusyEnd(`${date}T${time}`);
                  }}
                />
                <Input
                  type="time"
                  step={900}
                  className="w-[40%]"
                  value={getTimePartOr(busyEnd, new Date())}
                  onChange={e => {
                    const time = e.target.value;
                    const date = getDatePartOr(busyEnd, new Date());
                    setBusyEnd(`${date}T${time}`);
                  }}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-slate-700">
              <input
                type="checkbox"
                checked={busyOnGround}
                onChange={e => setBusyOnGround(e.target.checked)}
                className="h-3 w-3 rounded border-slate-300 text-amber-500 focus-visible:outline-none"
              />
              <span>
                Mark this window as <span className="font-medium">on the ground</span>
                {" "}
                (you&apos;re technically available, but less responsive)
              </span>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const now = new Date();
                  const end = addHours(now, 2);
                  setBusyStart(formatDateTimeLocalInput(now));
                  setBusyEnd(formatDateTimeLocalInput(end));
                  setBusyOnGround(false);
                }}
              >
                Next 2 hours
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const now = new Date();
                  const end = addHours(now, 4);
                  setBusyStart(formatDateTimeLocalInput(now));
                  setBusyEnd(formatDateTimeLocalInput(end));
                  setBusyOnGround(false);
                }}
              >
                Next 4 hours
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const now = new Date();
                  const end = addHours(now, 6);
                  setBusyStart(formatDateTimeLocalInput(now));
                  setBusyEnd(formatDateTimeLocalInput(end));
                  setBusyOnGround(false);
                }}
              >
                Next 6 hours
              </Button>
            </div>
            <Button className="w-full" onClick={handleUpdateAvailability}>
              {editingBusyId ? "Update busy window" : "Add busy window"}
            </Button>
          </div>

          {currentUser && myBusySlots.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">
                Edit or remove a window
              </p>
              <div className="space-y-1 rounded-2xl bg-slate-50 p-2">
                {myBusySlots.map(slot => {
                  const start = new Date(slot.start);
                  const end = new Date(slot.end);
                  const day = start.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric"
                  });
                  const range = `${formatTimeShort(start)} – ${formatTimeShort(end)}`;
                  const isEditing = editingBusyId === slot.id;
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between gap-2 rounded-2xl bg-white px-2 py-1 text-[11px] text-slate-800"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{day}</span>
                        <span className="text-slate-600">{range}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => {
                            setEditingBusyId(slot.id);
                            setBusyStart(formatDateTimeLocalInput(start));
                            setBusyEnd(formatDateTimeLocalInput(end));
                            setBusyOnGround(slot.onGround ?? false);
                          }}
                        >
                          {isEditing ? "Editing" : "Edit"}
                        </Button>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => {
                            deleteBusySlot(slot.id);
                            if (editingBusyId === slot.id) {
                              setEditingBusyId(null);
                            }
                          }}
                          aria-label="Delete busy window"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Sheet>

      <Sheet
        open={activitySheetOpen && !!selectedActivity}
        onOpenChange={open => {
          setActivitySheetOpen(open);
          if (!open) setSelectedActivityId(null);
        }}
        title={
          selectedActivity
            ? `${selectedActivity.title} • ${formatTimeShort(
                new Date(selectedActivity.startTime)
              )}`
            : "Activity"
        }
      >
        {selectedActivity && (
          <div className="space-y-3">
            {isExpired && (
              <p className="rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                This activity expired 3 hours after its start time.
              </p>
            )}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">
                Proposed time
              </p>
              {isCreator ? (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    className="flex-1"
                    disabled={isExpired}
                    value={getDatePartOr(
                      pendingActivityTime ?? "",
                      new Date(selectedActivity.startTime)
                    )}
                    onChange={e => {
                      const date = e.target.value;
                      const time = getTimePartOr(
                        pendingActivityTime ?? "",
                        new Date(selectedActivity.startTime)
                      );
                      setPendingActivityTime(`${date}T${time}`);
                    }}
                  />
                  <Input
                    type="time"
                    step={900}
                    className="w-[40%]"
                    disabled={isExpired}
                    value={getTimePartOr(
                      pendingActivityTime ?? "",
                      new Date(selectedActivity.startTime)
                    )}
                    onChange={e => {
                      const time = e.target.value;
                      const date = getDatePartOr(
                        pendingActivityTime ?? "",
                        new Date(selectedActivity.startTime)
                      );
                      setPendingActivityTime(`${date}T${time}`);
                    }}
                  />
                </div>
              ) : (
                <Input
                  type="text"
                  disabled
                  value={formatDateTimeLocalInput(
                    new Date(selectedActivity.startTime)
                  ).replace("T", " ")}
                />
              )}
              <p className="text-[11px] text-slate-500">
                Only the person who created this activity can adjust the time.
              </p>
            {isCreator && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={isExpired}
                  onClick={handleActivityTimeSave}
                >
                  Save time
                </Button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  disabled={isExpired}
                  onClick={handleDeleteActivity}
                  aria-label="Delete activity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Location</p>
              {isCreator ? (
                <>
                  <Input
                    placeholder="Where?"
                    value={pendingLocation}
                    onChange={e => setPendingLocation(e.target.value)}
                    onBlur={() =>
                      selectedActivity &&
                      updateActivityDetails(selectedActivity.id, {
                        location: pendingLocation.trim() || undefined
                      })
                    }
                    disabled={isExpired}
                    className="text-sm"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["עין יהב", "חצבה", "בית ספר", "בראשית", "תל אביב", "חצור"].map(
                      shortcut => (
                        <Button
                          key={shortcut}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          disabled={isExpired}
                          onClick={() => {
                            setPendingLocation(shortcut);
                            if (selectedActivity) {
                              updateActivityDetails(selectedActivity.id, {
                                location: shortcut
                              });
                            }
                          }}
                        >
                          {shortcut}
                        </Button>
                      )
                    )}
                  </div>
                </>
              ) : (
                <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {selectedActivity.location || "—"}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Notes</p>
              {isCreator ? (
                <Input
                  placeholder="Any notes"
                  value={pendingNotes}
                  onChange={e => setPendingNotes(e.target.value)}
                  onBlur={() =>
                    selectedActivity &&
                    updateActivityDetails(selectedActivity.id, {
                      notes: pendingNotes.trim() || undefined
                    })
                  }
                  disabled={isExpired}
                  className="text-sm"
                />
              ) : (
                <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {selectedActivity.notes || "—"}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">
                Responses
              </p>
              <div className="space-y-1 rounded-2xl bg-slate-50 p-2">
                {members.map(member => {
                  const status = selectedActivity.responses[member.id];
                  const tone =
                    status === "joined"
                      ? "available"
                      : status === "declined"
                      ? "busy"
                      : "neutral";
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-800">{member.name}</span>
                      <Badge tone={tone as any}>
                        {status === "joined"
                          ? "Joined"
                          : status === "declined"
                          ? "Declined"
                          : "Pending"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
            {!isExpired && (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => handleRespond("declined")}
                >
                  Decline
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleRespond("joined")}
                >
                  Join
                </Button>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">
                Comments
              </p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-2xl bg-slate-50 p-2">
                {selectedActivity.comments.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    No comments yet. Start the conversation.
                  </p>
                )}
                {selectedActivity.comments.map(c => {
                  const author = members.find(m => m.id === c.userId);
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl bg-white px-2 py-1 text-[11px] text-slate-800"
                    >
                      <span className="font-medium">
                        {author?.name ?? "Someone"}
                      </span>
                      <span className="mx-1 text-slate-400">•</span>
                      <span>{c.text}</span>
                    </div>
                  );
                })}
              </div>
              {!isExpired && (
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Add a comment"
                    value={activityComment}
                    onChange={e => setActivityComment(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddComment}
                  >
                    Send
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>

      <Sheet
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        title="Notifications"
      >
        <div className="space-y-2">
          {notifications.length === 0 && (
            <p className="text-xs text-slate-500">
              No notifications yet. You&apos;ll see invites to activities here
              when you&apos;re available.
            </p>
          )}
          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => {
                markNotificationRead(n.id);
                setNotificationsOpen(false);
                setSelectedActivityId(n.activityId);
                setActivitySheetOpen(true);
              }}
              className="flex w-full flex-col items-start gap-0.5 rounded-2xl bg-slate-50 px-3 py-2 text-left text-xs"
            >
              <span
                className={
                  n.read ? "text-slate-500" : "font-medium text-slate-900"
                }
              >
                {n.message}
              </span>
              <span className="text-[10px] text-slate-400">
                Tap to open activity
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

