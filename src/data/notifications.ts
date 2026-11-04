/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemNotification } from '../types';

export const mockNotifications: SystemNotification[] = [
  {
    id: 'NOTIF-001',
    title: 'Room Overlap Detected',
    message: 'EVT-002 overlaps with EVT-001 in Physics Lab 101 on Mon 10:00.',
    createdAt: '2026-11-09T08:05:00',
    read: false,
    type: 'conflict',
  },
  {
    id: 'NOTIF-002',
    title: 'Faculty Overlap Alert',
    message: 'Dr. Alan Turing is double-booked across 2 simultaneous sessions on Tuesday 14:00.',
    createdAt: '2026-11-09T08:10:00',
    read: false,
    type: 'conflict',
  },
  {
    id: 'NOTIF-003',
    title: 'Room Over-Capacity Warning',
    message: 'MATH 102 (45 scholars) exceeds Literature Seminar 202 capacity (30 seats).',
    createdAt: '2026-11-09T08:15:00',
    read: false,
    type: 'warning',
  },
  {
    id: 'NOTIF-004',
    title: 'Timetable Archive Saved',
    message: 'Weekly academic timetable snapshot successfully backed up to cloud archive.',
    createdAt: '2026-11-09T07:30:00',
    read: true,
    type: 'info',
  },
  {
    id: 'NOTIF-005',
    title: 'HVAC Routine Inspection',
    message: 'Main Auditorium scheduled for climate system diagnostics on Saturday morning.',
    createdAt: '2026-11-08T16:00:00',
    read: true,
    type: 'info',
  },
];
