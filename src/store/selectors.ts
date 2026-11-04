/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { differenceInMinutes, parseISO } from 'date-fns';
import { detectConflicts } from '../lib/conflicts';
import {
  Conflict,
  Deadline,
  Room,
  ScheduleEvent,
  ScheduleState,
  Scholar,
  ScholarType,
  SystemNotification,
} from '../types';

/**
 * Derives active (unresolved) conflicts directly using the deterministic pure conflict engine.
 * Ensures the conflict log, metric cards, and badge counts never drift out of sync.
 */
export function selectActiveConflicts(
  state: Pick<ScheduleState, 'events' | 'rooms' | 'faculty' | 'courses'>
): Conflict[] {
  return detectConflicts(state.events, state.rooms, state.faculty, state.courses);
}

/**
 * Selects total count of active unresolved conflicts.
 */
export function selectConflictCount(
  state: Pick<ScheduleState, 'events' | 'rooms' | 'faculty' | 'courses'>
): number {
  return selectActiveConflicts(state).length;
}

/**
 * Calculates total scheduled event hours for a given calendar date (YYYY-MM-DD).
 */
export function selectScheduledHoursForDate(
  events: ScheduleEvent[],
  targetDateStr: string // e.g. "2026-11-09"
): number {
  const dayEvents = events.filter((e) => e.start.startsWith(targetDateStr));

  const totalMinutes = dayEvents.reduce((acc, evt) => {
    const s = parseISO(evt.start);
    const e = parseISO(evt.end);
    return acc + Math.max(0, differenceInMinutes(e, s));
  }, 0);

  return Math.round((totalMinutes / 60) * 10) / 10;
}

/**
 * Computes scheduled hours metric with directional trend compared to previous reference.
 */
export function selectScheduledHoursTodayWithTrend(
  events: ScheduleEvent[],
  todayDateStr: string
): {
  hours: number;
  trend: { direction: 'up' | 'down' | 'flat'; text: string };
} {
  const todayHours = selectScheduledHoursForDate(events, todayDateStr);
  // Baseline previous day scheduled hours (e.g. 5.5h)
  const referencePreviousHours = 5.5;
  const diff = Math.round((todayHours - referencePreviousHours) * 10) / 10;

  if (diff > 0) {
    return {
      hours: todayHours,
      trend: { direction: 'up', text: `+${diff}h vs yesterday` },
    };
  } else if (diff < 0) {
    return {
      hours: todayHours,
      trend: { direction: 'down', text: `${diff}h vs yesterday` },
    };
  }
  return {
    hours: todayHours,
    trend: { direction: 'flat', text: 'Identical to yesterday' },
  };
}

/**
 * Computes room occupancy rate for a given date based on total available room operating hours
 * and total scheduled event hours.
 */
export function selectRoomOccupancyRate(
  events: ScheduleEvent[],
  rooms: Room[],
  targetDateStr: string // e.g. "2026-11-09"
): {
  totalAvailableHours: number;
  scheduledHours: number;
  ratePercentage: number;
  isHighLoad: boolean;
} {
  const targetDate = parseISO(`${targetDateStr}T00:00:00`);
  const dayOfWeek = targetDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  let totalAvailableMinutes = 0;
  for (const room of rooms) {
    const matchingSlots = room.availability.filter((slot) => slot.day === dayOfWeek);
    for (const slot of matchingSlots) {
      const [sh, sm] = slot.start.split(':').map(Number);
      const [eh, em] = slot.end.split(':').map(Number);
      const slotDuration = (eh * 60 + em) - (sh * 60 + sm);
      if (slotDuration > 0) {
        totalAvailableMinutes += slotDuration;
      }
    }
  }

  const dayEvents = events.filter((e) => e.start.startsWith(targetDateStr));
  const scheduledMinutes = dayEvents.reduce((acc, evt) => {
    const s = parseISO(evt.start);
    const e = parseISO(evt.end);
    return acc + Math.max(0, differenceInMinutes(e, s));
  }, 0);

  const totalAvailableHours = Math.round((totalAvailableMinutes / 60) * 10) / 10;
  const scheduledHours = Math.round((scheduledMinutes / 60) * 10) / 10;
  const ratePercentage = totalAvailableMinutes > 0
    ? Math.min(100, Math.round((scheduledMinutes / totalAvailableMinutes) * 100))
    : 0;

  return {
    totalAvailableHours,
    scheduledHours,
    ratePercentage,
    isHighLoad: ratePercentage >= 80,
  };
}

/**
 * Metric card 3: System Conflicts status descriptor
 */
export function selectSystemConflictMetric(
  state: Pick<ScheduleState, 'events' | 'rooms' | 'faculty' | 'courses'>
): {
  count: number;
  status: 'ok' | 'alert';
  text: string;
} {
  const count = selectConflictCount(state);
  return {
    count,
    status: count === 0 ? 'ok' : 'alert',
    text: count === 0 ? 'No conflicts detected' : `${count} detected`,
  };
}

/**
 * Metric card 4: Active Scholars On-Campus today, deduped across events happening today.
 */
export function selectDistinctScholarsToday(
  events: ScheduleEvent[],
  scholars: Scholar[],
  todayDateStr: string
): {
  distinctCount: number;
  totalRegistered: number;
} {
  const dayEvents = events.filter((e) => e.start.startsWith(todayDateStr));
  const distinctScholarIdSet = new Set<string>();

  for (const event of dayEvents) {
    if (event.scholarIds && event.scholarIds.length > 0) {
      for (const id of event.scholarIds) {
        distinctScholarIdSet.add(id);
      }
    } else {
      // Fallback: collect scholars enrolled in this course
      for (const scholar of scholars) {
        if (scholar.enrolledCourseIds.includes(event.courseId)) {
          distinctScholarIdSet.add(scholar.id);
        }
      }
    }
  }

  return {
    distinctCount: distinctScholarIdSet.size,
    totalRegistered: scholars.length,
  };
}

/**
 * Breakdown of scholars roster by scholar type.
 */
export function selectScholarMetrics(scholars: Scholar[]): {
  total: number;
  byType: Record<ScholarType, number>;
} {
  const counts: Record<ScholarType, number> = {
    undergraduate: 0,
    graduate: 0,
    phd: 0,
    postdoc: 0,
  };

  for (const s of scholars) {
    if (counts[s.type] !== undefined) {
      counts[s.type]++;
    }
  }

  return {
    total: scholars.length,
    byType: counts,
  };
}

/**
 * Computes building and individual room occupancy rates for the OccupancyHeatmapWidget.
 */
export interface RoomOccupancyInfo {
  roomId: string;
  roomName: string;
  capacity: number;
  bookedMinutes: number;
  availableMinutes: number;
  percentage: number;
  color: 'emerald' | 'amber' | 'red';
}

export interface BuildingOccupancyInfo {
  building: string;
  bookedMinutes: number;
  availableMinutes: number;
  percentage: number;
  color: 'emerald' | 'amber' | 'red';
  rooms: RoomOccupancyInfo[];
}

export function selectBuildingOccupancyHierarchy(
  events: ScheduleEvent[],
  rooms: Room[],
  targetDateStr: string
): BuildingOccupancyInfo[] {
  const targetDate = parseISO(`${targetDateStr}T00:00:00`);
  const dayOfWeek = targetDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const dayEvents = events.filter((e) => e.start.startsWith(targetDateStr));

  // Group rooms by building
  const buildingGroups = new Map<string, Room[]>();
  for (const room of rooms) {
    const list = buildingGroups.get(room.building) || [];
    list.push(room);
    buildingGroups.set(room.building, list);
  }

  const results: BuildingOccupancyInfo[] = [];

  for (const [building, buildingRooms] of buildingGroups.entries()) {
    let buildingBooked = 0;
    let buildingAvailable = 0;
    const roomInfos: RoomOccupancyInfo[] = [];

    for (const room of buildingRooms) {
      // Available minutes for this room today
      const slots = room.availability.filter((slot) => slot.day === dayOfWeek);
      let roomAvailable = 0;
      for (const slot of slots) {
        const [sh, sm] = slot.start.split(':').map(Number);
        const [eh, em] = slot.end.split(':').map(Number);
        roomAvailable += Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
      }

      // Booked minutes for this room today
      const roomEvents = dayEvents.filter((e) => e.roomId === room.id);
      const roomBooked = roomEvents.reduce((acc, evt) => {
        const s = parseISO(evt.start);
        const e = parseISO(evt.end);
        return acc + Math.max(0, differenceInMinutes(e, s));
      }, 0);

      const roomPct = roomAvailable > 0
        ? Math.min(100, Math.round((roomBooked / roomAvailable) * 100))
        : 0;

      const roomColor: 'emerald' | 'amber' | 'red' =
        roomPct < 50 ? 'emerald' : roomPct < 80 ? 'amber' : 'red';

      roomInfos.push({
        roomId: room.id,
        roomName: room.name,
        capacity: room.capacity,
        bookedMinutes: roomBooked,
        availableMinutes: roomAvailable,
        percentage: roomPct,
        color: roomColor,
      });

      buildingBooked += roomBooked;
      buildingAvailable += roomAvailable;
    }

    const buildingPct = buildingAvailable > 0
      ? Math.min(100, Math.round((buildingBooked / buildingAvailable) * 100))
      : 0;

    const buildingColor: 'emerald' | 'amber' | 'red' =
      buildingPct < 50 ? 'emerald' : buildingPct < 80 ? 'amber' : 'red';

    results.push({
      building,
      bookedMinutes: buildingBooked,
      availableMinutes: buildingAvailable,
      percentage: buildingPct,
      color: buildingColor,
      rooms: roomInfos.sort((a, b) => b.percentage - a.percentage),
    });
  }

  return results.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Filter deadlines by priority level.
 */
export function selectFilteredDeadlines(
  deadlines: Deadline[],
  priorityFilter: 'all' | 'high' | 'medium' | 'low'
): Deadline[] {
  if (priorityFilter === 'all') {
    return [...deadlines].sort(
      (a, b) => parseISO(a.dueAt).getTime() - parseISO(b.dueAt).getTime()
    );
  }
  return deadlines
    .filter((d) => d.priority === priorityFilter)
    .sort((a, b) => parseISO(a.dueAt).getTime() - parseISO(b.dueAt).getTime());
}

/**
 * Count unread notifications.
 */
export function selectUnreadNotificationCount(
  notifications: SystemNotification[]
): number {
  return notifications.filter((n) => !n.read).length;
}

/**
 * Breakdown of rooms and events grouped by building.
 */
export function selectBuildingMetrics(
  rooms: Room[],
  events: ScheduleEvent[]
): Array<{
  building: string;
  roomCount: number;
  totalCapacity: number;
  activeEventsCount: number;
}> {
  const buildingMap = new Map<
    string,
    { roomCount: number; totalCapacity: number; roomIds: Set<string> }
  >();

  for (const r of rooms) {
    const current = buildingMap.get(r.building) || {
      roomCount: 0,
      totalCapacity: 0,
      roomIds: new Set<string>(),
    };
    current.roomCount++;
    current.totalCapacity += r.capacity;
    current.roomIds.add(r.id);
    buildingMap.set(r.building, current);
  }

  const results = [];
  for (const [building, data] of buildingMap.entries()) {
    const activeEventsCount = events.filter((e) => data.roomIds.has(e.roomId)).length;
    results.push({
      building,
      roomCount: data.roomCount,
      totalCapacity: data.totalCapacity,
      activeEventsCount,
    });
  }

  return results.sort((a, b) => b.roomCount - a.roomCount);
}

/**
 * Filters rooms based on building selection.
 */
export function selectFilteredRooms(
  rooms: Room[],
  buildingFilter: string | null
): Room[] {
  if (!buildingFilter || buildingFilter === 'ALL') {
    return rooms;
  }
  return rooms.filter((r) => r.building === buildingFilter);
}

/**
 * Selects and filters events for a specific calendar date by building and event types.
 */
export function selectFilteredDayEvents(
  events: ScheduleEvent[],
  rooms: Room[],
  dateStr: string,
  buildingFilter: string | null,
  typeFilter: import('../types').EventType[]
): ScheduleEvent[] {
  const visibleRoomIds = new Set(selectFilteredRooms(rooms, buildingFilter).map((r) => r.id));
  const activeTypes = new Set(typeFilter);

  return events.filter((e) => {
    if (!e.start.startsWith(dateStr)) return false;
    if (!visibleRoomIds.has(e.roomId)) return false;
    if (activeTypes.size > 0 && !activeTypes.has(e.type)) return false;
    return true;
  });
}

