/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  detectConflicts,
  resolveConflict,
  applyResolution,
  autoResolveAll,
  intervalsOverlap,
} from './conflicts';
import {
  mockEvents,
  mockRooms,
  mockFaculty,
  mockCourses,
  mockScholars,
} from '../data';
import {
  Course,
  Faculty,
  Room,
  ScheduleEvent,
  ScheduleState,
} from '../types';

describe('Conflict Detection Engine', () => {
  it('detects exactly the 3 seeded conflicts in the mock dataset', () => {
    const conflicts = detectConflicts(
      mockEvents,
      mockRooms,
      mockFaculty,
      mockCourses
    );

    expect(conflicts).toHaveLength(3);

    const kinds = conflicts.map((c) => c.kind).sort();
    expect(kinds).toEqual(['faculty-overlap', 'over-capacity', 'room-overlap']);

    const roomConflict = conflicts.find((c) => c.kind === 'room-overlap');
    expect(roomConflict?.eventId).toBe('EVT-002');
    expect(roomConflict?.relatedEventId).toBe('EVT-001');

    const facultyConflict = conflicts.find((c) => c.kind === 'faculty-overlap');
    expect(facultyConflict?.eventId).toBe('EVT-008');
    expect(facultyConflict?.relatedEventId).toBe('EVT-007');

    const capConflict = conflicts.find((c) => c.kind === 'over-capacity');
    expect(capConflict?.eventId).toBe('EVT-012');
  });

  it('rule 1 (room-overlap): flags two events sharing the same room at overlapping times', () => {
    const testEvents: ScheduleEvent[] = [
      {
        id: 'TEST-1',
        courseId: 'CRS-101',
        roomId: 'SCI-101',
        facultyId: 'FAC-101',
        type: 'lecture',
        start: '2026-11-09T09:00:00',
        end: '2026-11-09T10:30:00',
        scholarCount: 20,
        status: 'confirmed',
      },
      {
        id: 'TEST-2',
        courseId: 'CRS-103',
        roomId: 'SCI-101',
        facultyId: 'FAC-103',
        type: 'lecture',
        start: '2026-11-09T10:00:00',
        end: '2026-11-09T11:00:00',
        scholarCount: 20,
        status: 'confirmed',
      },
    ];

    const conflicts = detectConflicts(testEvents, mockRooms, mockFaculty, mockCourses);
    expect(conflicts.some((c) => c.kind === 'room-overlap' && c.eventId === 'TEST-2')).toBe(true);
  });

  it('rule 2 (faculty-overlap): flags the same faculty member booked in two events simultaneously', () => {
    const testEvents: ScheduleEvent[] = [
      {
        id: 'TEST-FAC-1',
        courseId: 'CRS-101',
        roomId: 'SCI-101',
        facultyId: 'FAC-101',
        type: 'lecture',
        start: '2026-11-09T13:00:00',
        end: '2026-11-09T14:30:00',
        scholarCount: 20,
        status: 'confirmed',
      },
      {
        id: 'TEST-FAC-2',
        courseId: 'CRS-112',
        roomId: 'ART-201',
        facultyId: 'FAC-101',
        type: 'lecture',
        start: '2026-11-09T14:00:00',
        end: '2026-11-09T15:30:00',
        scholarCount: 20,
        status: 'confirmed',
      },
    ];

    const conflicts = detectConflicts(testEvents, mockRooms, mockFaculty, mockCourses);
    expect(conflicts.some((c) => c.kind === 'faculty-overlap' && c.eventId === 'TEST-FAC-2')).toBe(true);
  });

  it('rule 3 (over-capacity): flags an event where scholarCount > room.capacity', () => {
    const testEvents: ScheduleEvent[] = [
      {
        id: 'TEST-CAP',
        courseId: 'CRS-104',
        roomId: 'ART-202', // capacity 30
        facultyId: 'FAC-104',
        type: 'lecture',
        start: '2026-11-09T14:00:00',
        end: '2026-11-09T15:00:00',
        scholarCount: 35, // 35 > 30
        status: 'confirmed',
      },
    ];

    const conflicts = detectConflicts(testEvents, mockRooms, mockFaculty, mockCourses);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe('over-capacity');
    expect(conflicts[0].eventId).toBe('TEST-CAP');
  });

  it('rule 4 (missing-equipment): flags an event in a room lacking course required equipment', () => {
    const testEvents: ScheduleEvent[] = [
      {
        id: 'TEST-EQUIP',
        courseId: 'CRS-102', // requires 'lab' and 'projector'
        roomId: 'ART-201', // only has 'projector' and 'av', missing 'lab'
        facultyId: 'FAC-102',
        type: 'lab',
        start: '2026-11-09T14:00:00',
        end: '2026-11-09T15:30:00',
        scholarCount: 20,
        status: 'confirmed',
      },
    ];

    const conflicts = detectConflicts(testEvents, mockRooms, mockFaculty, mockCourses);
    expect(conflicts.some((c) => c.kind === 'missing-equipment' && c.eventId === 'TEST-EQUIP')).toBe(true);
  });

  it('rule 5 (outside-availability): flags events outside room hours or during faculty unavailable hours', () => {
    // Room SCI-101 availability is 08:00 to 18:00
    // Faculty FAC-101 unavailable on Friday 16:00 to 18:00
    const testEvents: ScheduleEvent[] = [
      {
        id: 'TEST-OUT-ROOM',
        courseId: 'CRS-101',
        roomId: 'SCI-101',
        facultyId: 'FAC-103',
        type: 'lecture',
        start: '2026-11-09T18:30:00', // After 18:00
        end: '2026-11-09T20:00:00',
        scholarCount: 20,
        status: 'confirmed',
      },
      {
        id: 'TEST-OUT-FAC',
        courseId: 'CRS-101',
        roomId: 'SCI-201',
        facultyId: 'FAC-101', // Unavailable 2026-11-13 16:00 to 18:00
        type: 'lecture',
        start: '2026-11-13T16:30:00',
        end: '2026-11-13T17:30:00',
        scholarCount: 20,
        status: 'confirmed',
      },
    ];

    const conflicts = detectConflicts(testEvents, mockRooms, mockFaculty, mockCourses);
    expect(conflicts.filter((c) => c.kind === 'outside-availability')).toHaveLength(2);
  });

  it('boundary-touching events are NOT flagged as overlapping', () => {
    // Event 1 ends at 10:00:00, Event 2 starts at 10:00:00 exactly
    const touchingEvents: ScheduleEvent[] = [
      {
        id: 'TOUCH-1',
        courseId: 'CRS-101',
        roomId: 'SCI-101',
        facultyId: 'FAC-101',
        type: 'lecture',
        start: '2026-11-09T08:30:00',
        end: '2026-11-09T10:00:00',
        scholarCount: 20,
        status: 'confirmed',
      },
      {
        id: 'TOUCH-2',
        courseId: 'CRS-107',
        roomId: 'SCI-101', // Same room!
        facultyId: 'FAC-101', // Same faculty!
        type: 'lecture',
        start: '2026-11-09T10:00:00', // Touches exactly at 10:00
        end: '2026-11-09T11:30:00',
        scholarCount: 20,
        status: 'confirmed',
      },
    ];

    expect(intervalsOverlap('2026-11-09T08:30:00', '2026-11-09T10:00:00', '2026-11-09T10:00:00', '2026-11-09T11:30:00')).toBe(false);

    const conflicts = detectConflicts(touchingEvents, mockRooms, mockFaculty, mockCourses);
    expect(conflicts).toHaveLength(0);
  });
});

describe('Conflict Resolution Engine', () => {
  it('resolver success case 1: resolves room-overlap by moving to free room (same building preferred)', () => {
    const conflicts = detectConflicts(
      mockEvents,
      mockRooms,
      mockFaculty,
      mockCourses
    );
    const roomConflict = conflicts.find((c) => c.kind === 'room-overlap')!;
    expect(roomConflict).toBeDefined();

    const resolution = resolveConflict(roomConflict, {
      events: mockEvents,
      rooms: mockRooms,
      faculty: mockFaculty,
      courses: mockCourses,
    });

    expect(resolution).not.toBeNull();
    expect(resolution?.action).toBe('moved-room');
    expect(resolution?.previousRoomId).toBe('SCI-101');
    // Candidate in Science Block with computers & projector free at Mon 10:00-11:30 is SCI-201
    expect(resolution?.newRoomId).toBe('SCI-201');
  });

  it('resolver success case 2: resolves over-capacity by reallocating to larger room in same building', () => {
    const conflicts = detectConflicts(
      mockEvents,
      mockRooms,
      mockFaculty,
      mockCourses
    );
    const capConflict = conflicts.find((c) => c.kind === 'over-capacity')!;
    expect(capConflict).toBeDefined();

    const resolution = resolveConflict(capConflict, {
      events: mockEvents,
      rooms: mockRooms,
      faculty: mockFaculty,
      courses: mockCourses,
    });

    expect(resolution).not.toBeNull();
    expect(resolution?.action).toBe('moved-room');
    expect(resolution?.previousRoomId).toBe('ART-202'); // cap 30
    // ART-201 in same building has cap 60 and is free Wed 09:00-10:30
    expect(resolution?.newRoomId).toBe('ART-201');
  });

  it('resolver success case 3: resolves faculty-overlap by shifting time +60 minutes', () => {
    const conflicts = detectConflicts(
      mockEvents,
      mockRooms,
      mockFaculty,
      mockCourses
    );
    const facConflict = conflicts.find((c) => c.kind === 'faculty-overlap')!;
    expect(facConflict).toBeDefined();

    const resolution = resolveConflict(facConflict, {
      events: mockEvents,
      rooms: mockRooms,
      faculty: mockFaculty,
      courses: mockCourses,
    });

    expect(resolution).not.toBeNull();
    expect(resolution?.action).toBe('shifted-time');
    expect(resolution?.previousStart).toBe('2026-11-10T14:00:00');
    expect(resolution?.newStart).toBe('2026-11-10T15:00:00');
    expect(resolution?.newEnd).toBe('2026-11-10T16:30:00');
  });

  it('resolver null case: returns null when no free room exists and shifting time is fully blocked', () => {
    // Single room with no alternatives, completely packed from 08:00 to 18:00
    const isolatedRoom: Room = {
      id: 'ISO-1',
      name: 'Isolated Single Room',
      building: 'Isolated',
      capacity: 20,
      equipment: ['projector'],
      availability: [{ day: 1, start: '08:00', end: '18:00' }],
    };

    const blockedFaculty: Faculty = {
      id: 'ISO-FAC',
      name: 'Busy Prof',
      department: 'Math',
      unavailable: [],
    };

    const singleCourse: Course = {
      id: 'ISO-CRS',
      code: 'ISO 101',
      title: 'Isolated Course',
      facultyId: 'ISO-FAC',
      requiredEquipment: ['projector'],
      enrolledCount: 20,
    };

    // Pack the day from 09:00 to 13:00 continuously
    const packedEvents: ScheduleEvent[] = [
      {
        id: 'PACK-1',
        courseId: 'ISO-CRS',
        roomId: 'ISO-1',
        facultyId: 'ISO-FAC',
        type: 'lecture',
        start: '2026-11-09T09:00:00',
        end: '2026-11-09T10:30:00',
        scholarCount: 20,
        status: 'confirmed',
      },
      {
        id: 'PACK-2', // Conflicting event overlapping PACK-1
        courseId: 'ISO-CRS',
        roomId: 'ISO-1',
        facultyId: 'ISO-FAC',
        type: 'lecture',
        start: '2026-11-09T09:30:00',
        end: '2026-11-09T11:00:00',
        scholarCount: 20,
        status: 'conflict',
      },
      {
        id: 'PACK-BLOCKER-1', // Blocks +15, +30, +45, +60 min shifts!
        courseId: 'ISO-CRS',
        roomId: 'ISO-1',
        facultyId: 'ISO-FAC',
        type: 'lecture',
        start: '2026-11-09T10:30:00',
        end: '2026-11-09T13:00:00',
        scholarCount: 20,
        status: 'confirmed',
      },
    ];

    const conflict = detectConflicts(packedEvents, [isolatedRoom], [blockedFaculty], [singleCourse]).find(
      (c) => c.kind === 'room-overlap'
    )!;

    const resolution = resolveConflict(conflict, {
      events: packedEvents,
      rooms: [isolatedRoom],
      faculty: [blockedFaculty],
      courses: [singleCourse],
    });

    expect(resolution).toBeNull();
  });

  it('idempotency: running detection after resolving seeded conflicts yields zero unresolved conflicts', () => {
    const initialState: ScheduleState = {
      events: mockEvents,
      rooms: mockRooms,
      faculty: mockFaculty,
      courses: mockCourses,
      scholars: mockScholars,
      conflicts: detectConflicts(mockEvents, mockRooms, mockFaculty, mockCourses),
      resolutionLogs: [],
      notifications: [],
      deadlines: [],
      activeNav: 'dashboard',
      sidebarCollapsed: false,
      view: 'day',
      typeFilter: ['lecture', 'lab', 'seminar', 'exam', 'maintenance'],
      buildingFilter: null,
    };

    expect(initialState.conflicts).toHaveLength(3);

    // Auto-resolve all conflicts
    const result = autoResolveAll(initialState);

    expect(result.resolvedCount).toBe(3);
    expect(result.unresolvedCount).toBe(0);

    // Re-run detection on the resolved state to confirm 0 conflicts
    const remainingConflicts = detectConflicts(
      result.nextState.events,
      result.nextState.rooms,
      result.nextState.faculty,
      result.nextState.courses
    );

    expect(remainingConflicts).toHaveLength(0);
    expect(result.nextState.resolutionLogs).toHaveLength(3);
  });

  it('immutability: state arrays and objects are never mutated during resolution', () => {
    const originalEventsSnapshot = JSON.stringify(mockEvents);
    const originalRoomsSnapshot = JSON.stringify(mockRooms);

    const conflicts = detectConflicts(mockEvents, mockRooms, mockFaculty, mockCourses);
    const resolution = resolveConflict(conflicts[0], {
      events: mockEvents,
      rooms: mockRooms,
      faculty: mockFaculty,
      courses: mockCourses,
    });

    expect(resolution).not.toBeNull();
    // Verify inputs were not modified
    expect(JSON.stringify(mockEvents)).toBe(originalEventsSnapshot);
    expect(JSON.stringify(mockRooms)).toBe(originalRoomsSnapshot);
  });
});
