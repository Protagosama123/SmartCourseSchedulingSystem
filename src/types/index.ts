/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EventType = 'lecture' | 'lab' | 'seminar' | 'exam' | 'maintenance';
export type EventStatus = 'confirmed' | 'tentative' | 'conflict' | 'resolved';

export type RoomEquipment = 'lab' | 'projector' | 'av' | 'computers';

export type TimetableViewMode = 'day' | 'week' | 'month' | 'matrix';

export interface RoomAvailability {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  start: string; // "HH:mm" e.g. "08:00"
  end: string;   // "HH:mm" e.g. "18:00"
}

export interface TimeRange {
  start: string; // ISO 8601 or "HH:mm"
  end: string;   // ISO 8601 or "HH:mm"
  day?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  reason?: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  equipment: RoomEquipment[];
  availability: RoomAvailability[];
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  unavailable: TimeRange[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  facultyId: string;
  requiredEquipment: Room['equipment'];
  enrolledCount: number;
}

export interface ScheduleEvent {
  id: string;
  courseId: string;
  roomId: string;
  facultyId: string;
  type: EventType;
  start: string; // ISO 8601
  end: string;   // ISO 8601
  scholarCount: number;
  scholarIds?: string[]; // Distinct scholar IDs enrolled/attending
  status: EventStatus;
  locked?: boolean;
}

export type ConflictKind =
  | 'room-overlap'
  | 'faculty-overlap'
  | 'over-capacity'
  | 'missing-equipment'
  | 'outside-availability';

export type ConflictSeverity = 'high' | 'medium' | 'low';

export interface ConflictResolution {
  action: 'moved-room' | 'shifted-time';
  detail: string;
  at: string; // ISO 8601
}

export interface Conflict {
  id: string;
  eventId: string;
  relatedEventId?: string;
  kind: ConflictKind;
  severity: ConflictSeverity;
  detectedAt: string; // ISO 8601
  resolution?: ConflictResolution;
}

export interface Resolution {
  conflictId: string;
  eventId: string;
  action: 'moved-room' | 'shifted-time';
  detail: string;
  at: string;
  previousRoomId?: string;
  newRoomId?: string;
  previousStart?: string;
  newStart?: string;
  previousEnd?: string;
  newEnd?: string;
}

export interface ResolutionLog {
  id: string;
  conflictId: string;
  eventId: string;
  action: 'moved-room' | 'shifted-time';
  detail: string;
  timestamp: string;
}

export type ScholarType = 'undergraduate' | 'graduate' | 'phd' | 'postdoc';

export interface Scholar {
  id: string;
  name: string;
  email: string;
  type: ScholarType;
  department: string;
  enrolledCourseIds: string[];
}

export type NavId =
  | 'dashboard'
  | 'timetable'
  | 'facilities'
  | 'roster'
  | 'conflicts'
  | 'settings';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: 'conflict' | 'info' | 'warning' | 'success';
}

export interface Deadline {
  id: string;
  title: string;
  dueAt: string; // ISO 8601
  priority: 'high' | 'medium' | 'low';
  kind: 'exam' | 'submission' | 'maintenance' | 'audit' | 'colloquium';
  courseCode?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  action?: ToastAction;
  durationMs?: number;
}

export interface ScheduleSnapshot {
  events: ScheduleEvent[];
  conflicts: Conflict[];
  resolutionLogs: ResolutionLog[];
}

export type Resolver = (conflict: Conflict, state: ScheduleState) => Resolution | null;

export interface ScheduleState {
  events: ScheduleEvent[];
  rooms: Room[];
  faculty: Faculty[];
  courses: Course[];
  scholars: Scholar[];
  conflicts: Conflict[];
  resolutionLogs: ResolutionLog[];
  notifications: SystemNotification[];
  deadlines: Deadline[];
  activeNav: NavId;
  sidebarCollapsed: boolean;
  view: TimetableViewMode;
  typeFilter: EventType[];
  buildingFilter: string | null;
}
