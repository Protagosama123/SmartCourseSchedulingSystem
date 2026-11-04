/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { addMinutes, parseISO, formatISO, isBefore, isAfter, isEqual } from 'date-fns';
import {
  Conflict,
  ConflictSeverity,
  Course,
  Faculty,
  Resolution,
  ResolutionLog,
  Resolver,
  Room,
  ScheduleEvent,
  ScheduleState,
} from '../types';

/**
 * Checks if two intervals [start1, end1) and [start2, end2) overlap.
 * Touching boundaries (e.g. end1 == start2) do NOT overlap.
 */
export function intervalsOverlap(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
): boolean {
  const s1 = typeof start1 === 'string' ? parseISO(start1).getTime() : start1.getTime();
  const e1 = typeof end1 === 'string' ? parseISO(end1).getTime() : end1.getTime();
  const s2 = typeof start2 === 'string' ? parseISO(start2).getTime() : start2.getTime();
  const e2 = typeof end2 === 'string' ? parseISO(end2).getTime() : end2.getTime();

  return s1 < e2 && e1 > s2;
}

/**
 * Helper to check if time HH:mm is between start and end inclusive.
 */
export function isTimeWithinWindow(
  timeStr: string,
  startStr: string,
  endStr: string
): boolean {
  return timeStr >= startStr && timeStr <= endStr;
}

/**
 * Checks if an event fits entirely inside a room's availability windows for that day of week.
 */
export function isEventWithinRoomAvailability(
  event: ScheduleEvent,
  room: Room
): boolean {
  if (!room.availability || room.availability.length === 0) {
    return true;
  }

  const startDate = parseISO(event.start);
  const day = startDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  const eventStartHHmm = event.start.substring(11, 16);
  const eventEndHHmm = event.end.substring(11, 16);

  // Check if at least one availability window for this day encompasses the event
  return room.availability.some(
    (slot) =>
      slot.day === day &&
      slot.start <= eventStartHHmm &&
      eventEndHHmm <= slot.end
  );
}

/**
 * Checks if an event collides with any of the faculty's declared unavailable periods.
 */
export function isEventInFacultyUnavailableRange(
  event: ScheduleEvent,
  faculty: Faculty
): boolean {
  if (!faculty.unavailable || faculty.unavailable.length === 0) {
    return false;
  }

  const eStart = parseISO(event.start);
  const eEnd = parseISO(event.end);

  return faculty.unavailable.some((range) => {
    // If range is full ISO
    if (range.start.includes('T') && range.end.includes('T')) {
      const uStart = parseISO(range.start);
      const uEnd = parseISO(range.end);
      return intervalsOverlap(eStart, eEnd, uStart, uEnd);
    }

    // If day-specific time range
    if (range.day !== undefined) {
      if (eStart.getDay() !== range.day) return false;
      const eventStartHHmm = event.start.substring(11, 16);
      const eventEndHHmm = event.end.substring(11, 16);
      return eventStartHHmm < range.end && eventEndHHmm > range.start;
    }

    return false;
  });
}

/**
 * Pure function: Detects all scheduling conflicts in the system.
 * Flags:
 * 1. room-overlap: another event uses the same room with overlapping time (boundaries touch = no overlap)
 * 2. faculty-overlap: the same faculty member is in two events at once
 * 3. over-capacity: scholarCount > room.capacity
 * 4. missing-equipment: course required equipment is not in room.equipment
 * 5. outside-availability: outside room availability window or faculty unavailable ranges
 */
export function detectConflicts(
  events: ScheduleEvent[],
  rooms: Room[],
  faculty: Faculty[],
  courses: Course[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  const roomMap = new Map<string, Room>(rooms.map((r) => [r.id, r]));
  const facultyMap = new Map<string, Faculty>(faculty.map((f) => [f.id, f]));
  const courseMap = new Map<string, Course>(courses.map((c) => [c.id, c]));

  // Track conflict pairs to avoid duplicated bidirectional records
  const roomOverlapPairs = new Set<string>();
  const facultyOverlapPairs = new Set<string>();

  // Sort events chronologically, then by id for deterministic conflict flagging
  const sortedEvents = [...events].sort((a, b) => {
    const timeDiff = parseISO(a.start).getTime() - parseISO(b.start).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

  for (let i = 0; i < sortedEvents.length; i++) {
    const e1 = sortedEvents[i];
    const room = roomMap.get(e1.roomId);
    const facultyMember = facultyMap.get(e1.facultyId);
    const course = courseMap.get(e1.courseId);

    // Rule 3: over-capacity
    if (room && e1.scholarCount > room.capacity) {
      conflicts.push({
        id: `conflict-over-capacity-${e1.id}`,
        eventId: e1.id,
        kind: 'over-capacity',
        severity: 'medium',
        detectedAt: e1.start,
      });
    }

    // Rule 4: missing-equipment
    if (room && course) {
      const missing = course.requiredEquipment.filter(
        (eq) => !room.equipment.includes(eq)
      );
      if (missing.length > 0) {
        conflicts.push({
          id: `conflict-missing-equipment-${e1.id}`,
          eventId: e1.id,
          kind: 'missing-equipment',
          severity: 'medium',
          detectedAt: e1.start,
        });
      }
    }

    // Rule 5: outside-availability
    if (room && !isEventWithinRoomAvailability(e1, room)) {
      conflicts.push({
        id: `conflict-outside-availability-room-${e1.id}`,
        eventId: e1.id,
        kind: 'outside-availability',
        severity: 'medium',
        detectedAt: e1.start,
      });
    }

    if (facultyMember && isEventInFacultyUnavailableRange(e1, facultyMember)) {
      conflicts.push({
        id: `conflict-outside-availability-faculty-${e1.id}`,
        eventId: e1.id,
        kind: 'outside-availability',
        severity: 'medium',
        detectedAt: e1.start,
      });
    }

    // Compare with subsequent events for pairwise overlaps
    for (let j = i + 1; j < sortedEvents.length; j++) {
      const e2 = sortedEvents[j];

      // Optimization: if e2 starts after or when e1 ends, and events are sorted by start time,
      // subsequent events might still overlap if e1 spans very long, so check interval directly:
      const overlaps = intervalsOverlap(e1.start, e1.end, e2.start, e2.end);

      if (overlaps) {
        // Rule 1: room-overlap
        if (e1.roomId === e2.roomId) {
          const pairKey = `${e1.id}-${e2.id}`;
          if (!roomOverlapPairs.has(pairKey)) {
            roomOverlapPairs.add(pairKey);
            conflicts.push({
              id: `conflict-room-overlap-${e2.id}-${e1.id}`,
              eventId: e2.id,
              relatedEventId: e1.id,
              kind: 'room-overlap',
              severity: 'high',
              detectedAt: e2.start,
            });
          }
        }

        // Rule 2: faculty-overlap
        if (e1.facultyId === e2.facultyId) {
          const pairKey = `${e1.id}-${e2.id}`;
          if (!facultyOverlapPairs.has(pairKey)) {
            facultyOverlapPairs.add(pairKey);
            conflicts.push({
              id: `conflict-faculty-overlap-${e2.id}-${e1.id}`,
              eventId: e2.id,
              relatedEventId: e1.id,
              kind: 'faculty-overlap',
              severity: 'high',
              detectedAt: e2.start,
            });
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Pure function: Deterministic conflict resolution engine.
 * Strategy in order:
 * 1. Move to the nearest free room (same building preferred) with enough capacity and required equipment
 * 2. If none, shift the start time later in 15-min steps, up to 60 min, keeping the same room
 * 3. If still none, return null (needs manual resolution)
 */
export function resolveConflict(
  conflict: Conflict,
  state: {
    events: ScheduleEvent[];
    rooms: Room[];
    faculty: Faculty[];
    courses: Course[];
  }
): Resolution | null {
  const targetEvent = state.events.find((e) => e.id === conflict.eventId);
  if (!targetEvent) return null;

  const course = state.courses.find((c) => c.id === targetEvent.courseId);
  const currentRoom = state.rooms.find((r) => r.id === targetEvent.roomId);
  const facultyMember = state.faculty.find((f) => f.id === targetEvent.facultyId);
  if (!course || !currentRoom) return null;

  const otherEvents = state.events.filter((e) => e.id !== targetEvent.id);

  // Helper: check if faculty is available at given time range without overlap
  const isFacultyAvailableAt = (startIso: string, endIso: string): boolean => {
    if (!facultyMember) return true;
    if (isEventInFacultyUnavailableRange({ ...targetEvent, start: startIso, end: endIso }, facultyMember)) {
      return false;
    }
    const hasFacultyEventOverlap = otherEvents.some(
      (oe) =>
        oe.facultyId === targetEvent.facultyId &&
        intervalsOverlap(startIso, endIso, oe.start, oe.end)
    );
    return !hasFacultyEventOverlap;
  };

  // Helper: check if room is free and available at given time range
  const isRoomFreeAndAvailableAt = (
    room: Room,
    startIso: string,
    endIso: string
  ): boolean => {
    // Room availability window check
    const tempEvent: ScheduleEvent = {
      ...targetEvent,
      roomId: room.id,
      start: startIso,
      end: endIso,
    };
    if (!isEventWithinRoomAvailability(tempEvent, room)) {
      return false;
    }

    // Overlap check with other events in this room
    const hasRoomEventOverlap = otherEvents.some(
      (oe) =>
        oe.roomId === room.id &&
        intervalsOverlap(startIso, endIso, oe.start, oe.end)
    );

    return !hasRoomEventOverlap;
  };

  // -------------------------------------------------------------
  // STRATEGY 1: Move to nearest free room (same building preferred)
  // -------------------------------------------------------------
  // Note: Moving room only works if faculty is actually free at the current time slot.
  if (isFacultyAvailableAt(targetEvent.start, targetEvent.end)) {
    // Filter candidate rooms
    const candidateRooms = state.rooms.filter((room) => {
      // Must not be the exact same room if the issue is room capacity, room equipment, or room overlap
      if (room.id === targetEvent.roomId) return false;

      // Must satisfy capacity
      if (room.capacity < targetEvent.scholarCount) return false;

      // Must have required equipment
      const hasAllEquipment = course.requiredEquipment.every((eq) =>
        room.equipment.includes(eq)
      );
      if (!hasAllEquipment) return false;

      // Must be free and within room availability
      return isRoomFreeAndAvailableAt(room, targetEvent.start, targetEvent.end);
    });

    if (candidateRooms.length > 0) {
      // Sort: same building first, then closest capacity to avoid wastage, then id
      candidateRooms.sort((a, b) => {
        const aSameBuilding = a.building === currentRoom.building ? 0 : 1;
        const bSameBuilding = b.building === currentRoom.building ? 0 : 1;
        if (aSameBuilding !== bSameBuilding) return aSameBuilding - bSameBuilding;

        const aCapDiff = a.capacity - targetEvent.scholarCount;
        const bCapDiff = b.capacity - targetEvent.scholarCount;
        if (aCapDiff !== bCapDiff) return aCapDiff - bCapDiff;

        return a.name.localeCompare(b.name);
      });

      const selectedRoom = candidateRooms[0];
      return {
        conflictId: conflict.id,
        eventId: targetEvent.id,
        action: 'moved-room',
        previousRoomId: targetEvent.roomId,
        newRoomId: selectedRoom.id,
        previousStart: targetEvent.start,
        newStart: targetEvent.start,
        previousEnd: targetEvent.end,
        newEnd: targetEvent.end,
        detail: `Reallocated from ${currentRoom.name} (${currentRoom.building}) to ${selectedRoom.name} (${selectedRoom.building}, cap: ${selectedRoom.capacity})`,
        at: new Date().toISOString(),
      };
    }
  }

  // --------------------------------------------------------------------------
  // STRATEGY 2: Shift start time later in 15-min steps, up to 60 min (same room)
  // --------------------------------------------------------------------------
  // Shifting time only works if current room actually meets capacity & equipment requirements
  const currentRoomHasCapacity = currentRoom.capacity >= targetEvent.scholarCount;
  const currentRoomHasEquipment = course.requiredEquipment.every((eq) =>
    currentRoom.equipment.includes(eq)
  );

  if (currentRoomHasCapacity && currentRoomHasEquipment) {
    const steps = [15, 30, 45, 60];
    const originalStartDate = parseISO(targetEvent.start);
    const originalEndDate = parseISO(targetEvent.end);

    for (const step of steps) {
      const candidateStartDate = addMinutes(originalStartDate, step);
      const candidateEndDate = addMinutes(originalEndDate, step);

      const candidateStartIso = formatISO(candidateStartDate, {
        representation: 'complete',
      }).substring(0, 19);
      const candidateEndIso = formatISO(candidateEndDate, {
        representation: 'complete',
      }).substring(0, 19);

      // Check room is free and available
      const roomOk = isRoomFreeAndAvailableAt(
        currentRoom,
        candidateStartIso,
        candidateEndIso
      );

      // Check faculty is free and available
      const facultyOk = isFacultyAvailableAt(
        candidateStartIso,
        candidateEndIso
      );

      if (roomOk && facultyOk) {
        return {
          conflictId: conflict.id,
          eventId: targetEvent.id,
          action: 'shifted-time',
          previousRoomId: targetEvent.roomId,
          newRoomId: targetEvent.roomId,
          previousStart: targetEvent.start,
          newStart: candidateStartIso,
          previousEnd: targetEvent.end,
          newEnd: candidateEndIso,
          detail: `Shifted time by +${step} minutes (${candidateStartIso.substring(11, 16)} - ${candidateEndIso.substring(11, 16)}) in ${currentRoom.name}`,
          at: new Date().toISOString(),
        };
      }
    }
  }

  // -------------------------------------------------------------
  // STRATEGY 3: Needs manual resolution
  // -------------------------------------------------------------
  return null;
}

/**
 * Pure function: Immutably applies a resolution to the scheduling state.
 * Returns a new state and a corresponding resolution log entry.
 */
export function applyResolution(
  state: ScheduleState,
  conflict: Conflict,
  resolution: Resolution
): ScheduleState {
  const updatedEvents = state.events.map((evt) => {
    if (evt.id !== resolution.eventId) return evt;

    return {
      ...evt,
      roomId: resolution.newRoomId ?? evt.roomId,
      start: resolution.newStart ?? evt.start,
      end: resolution.newEnd ?? evt.end,
      status: 'resolved' as const,
    };
  });

  const newLog: ResolutionLog = {
    id: `log-${Date.now()}-${resolution.eventId}`,
    conflictId: conflict.id,
    eventId: resolution.eventId,
    action: resolution.action,
    detail: resolution.detail,
    timestamp: resolution.at,
  };

  const updatedConflicts = state.conflicts.map((c) => {
    if (c.id !== conflict.id) return c;
    return {
      ...c,
      resolution: {
        action: resolution.action,
        detail: resolution.detail,
        at: resolution.at,
      },
    };
  });

  return {
    ...state,
    events: updatedEvents,
    conflicts: updatedConflicts,
    resolutionLogs: [newLog, ...state.resolutionLogs],
  };
}

const severityRank: Record<ConflictSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export interface AutoResolveStep {
  conflict: Conflict;
  resolution: Resolution | null;
  status: 'resolved' | 'unresolved';
}

/**
 * Pure function: Automatically resolves all currently detected unresolved conflicts.
 * - Processes unresolved conflicts highest severity first.
 * - Calls resolver for each.
 * - Applies results sequentially, re-running detection after each so later resolutions
 *   see earlier changes (preventing double-assigning the same free room).
 * - Code behind a Resolver interface: (conflict, state) => Resolution | null
 */
export function autoResolveAll(
  state: ScheduleState,
  resolver: Resolver = resolveConflict
): {
  nextState: ScheduleState;
  resolvedCount: number;
  unresolvedCount: number;
  steps: AutoResolveStep[];
} {
  let currentState = { ...state };
  let resolvedCount = 0;
  const steps: AutoResolveStep[] = [];

  // 1. Detect initial active conflicts and sort by severity (high > medium > low)
  let activeConflicts = detectConflicts(
    currentState.events,
    currentState.rooms,
    currentState.faculty,
    currentState.courses
  ).sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  for (const initialConflict of activeConflicts) {
    // 2. Re-detect in current state to see if this conflict is still active
    const freshConflicts = detectConflicts(
      currentState.events,
      currentState.rooms,
      currentState.faculty,
      currentState.courses
    );

    const currentConflict = freshConflicts.find(
      (c) =>
        c.id === initialConflict.id ||
        (c.eventId === initialConflict.eventId && c.kind === initialConflict.kind)
    );

    // If an earlier resolution already resolved this conflict, skip
    if (!currentConflict) {
      continue;
    }

    // 3. Resolve using provided Resolver function
    const resolution = resolver(currentConflict, currentState);

    if (resolution) {
      currentState = applyResolution(currentState, currentConflict, resolution);
      resolvedCount++;
      steps.push({
        conflict: currentConflict,
        resolution,
        status: 'resolved',
      });
    } else {
      steps.push({
        conflict: currentConflict,
        resolution: null,
        status: 'unresolved',
      });
    }
  }

  // 4. Final re-detection
  const remainingConflicts = detectConflicts(
    currentState.events,
    currentState.rooms,
    currentState.faculty,
    currentState.courses
  );

  return {
    nextState: currentState,
    resolvedCount,
    unresolvedCount: remainingConflicts.length,
    steps,
  };
}
