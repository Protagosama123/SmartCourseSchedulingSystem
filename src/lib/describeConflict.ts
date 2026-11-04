/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Conflict, Course, Faculty, Room, ScheduleEvent } from '../types';

export interface ConflictLookups {
  rooms: Room[];
  faculty: Faculty[];
  courses: Course[];
  events: ScheduleEvent[];
}

/**
 * Builds human-readable conflict descriptions for notifications, widgets, and audit logs.
 * Example outputs:
 * - "Physics Lab 101 double-booked at 10:00 (CS 101 vs PHYS 402)"
 * - "Dr. Alan Turing double-booked across 2 sessions at 14:00"
 * - "MATH 102 (45 scholars) exceeds capacity (30) of Literature Seminar 202"
 * - "CS 101 in Arts Hall lacks required computers"
 * - "BIO 201 scheduled outside Physics Lab 101 operating hours"
 */
export function describeConflict(
  conflict: Conflict,
  lookups: ConflictLookups
): string {
  const event = lookups.events.find((e) => e.id === conflict.eventId);
  const relatedEvent = conflict.relatedEventId
    ? lookups.events.find((e) => e.id === conflict.relatedEventId)
    : undefined;

  const room = event ? lookups.rooms.find((r) => r.id === event.roomId) : undefined;
  const course = event ? lookups.courses.find((c) => c.id === event.courseId) : undefined;
  const faculty = event ? lookups.faculty.find((f) => f.id === event.facultyId) : undefined;
  const relatedCourse = relatedEvent
    ? lookups.courses.find((c) => c.id === relatedEvent.courseId)
    : undefined;

  const startTimeStr = event?.start ? event.start.substring(11, 16) : '00:00';
  const roomName = room?.name || 'Room';
  const courseCode = course?.code || 'Course';
  const facultyName = faculty?.name || 'Faculty Member';

  switch (conflict.kind) {
    case 'room-overlap':
      if (relatedCourse) {
        return `${roomName} double-booked at ${startTimeStr} (${courseCode} & ${relatedCourse.code})`;
      }
      return `${roomName} double-booked at ${startTimeStr}`;

    case 'faculty-overlap':
      return `${facultyName} double-booked across simultaneous sessions at ${startTimeStr}`;

    case 'over-capacity':
      if (room && event) {
        return `${courseCode} (${event.scholarCount} scholars) exceeds capacity (${room.capacity}) of ${roomName}`;
      }
      return `${courseCode} exceeds room capacity at ${startTimeStr}`;

    case 'missing-equipment':
      if (room && course) {
        const missing = course.requiredEquipment.filter(
          (eq) => !room.equipment.includes(eq)
        );
        return `${courseCode} in ${roomName} lacks required equipment: ${missing.join(', ')}`;
      }
      return `${courseCode} in ${roomName} lacks required equipment`;

    case 'outside-availability':
      return `${courseCode} in ${roomName} scheduled outside operating availability`;

    default:
      return `Conflict detected for event ${conflict.eventId} at ${startTimeStr}`;
  }
}
