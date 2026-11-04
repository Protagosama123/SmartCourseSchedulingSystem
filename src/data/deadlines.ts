/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Deadline } from '../types';

/**
 * 8 academic deadlines chronologically sorted around the reference week (Nov 9, 2026).
 * Includes overdue, today, and future milestones with high/medium/low priorities.
 */
export const mockDeadlines: Deadline[] = [
  {
    id: 'DDL-001',
    title: 'Syllabus & Course Catalog Final Sign-off',
    dueAt: '2026-11-08T17:00:00', // Yesterday (Overdue)
    priority: 'high',
    kind: 'submission',
    courseCode: 'ALL',
  },
  {
    id: 'DDL-002',
    title: 'Science Block Room Allocation Freeze',
    dueAt: '2026-11-09T18:00:00', // Today 18:00
    priority: 'high',
    kind: 'audit',
    courseCode: 'SCI',
  },
  {
    id: 'DDL-003',
    title: 'Quantum Mechanics Lab Equipment Requisition',
    dueAt: '2026-11-10T12:00:00', // Tomorrow noon
    priority: 'medium',
    kind: 'maintenance',
    courseCode: 'PHYS 402',
  },
  {
    id: 'DDL-004',
    title: 'Midterm Examination Venue Booking Request',
    dueAt: '2026-11-11T16:00:00', // In 2 days
    priority: 'high',
    kind: 'exam',
    courseCode: 'MATH 102',
  },
  {
    id: 'DDL-005',
    title: 'Ecology Field Sample Freezer Maintenance',
    dueAt: '2026-11-12T14:00:00', // In 3 days
    priority: 'low',
    kind: 'maintenance',
    courseCode: 'ECO 105',
  },
  {
    id: 'DDL-006',
    title: 'Guest Colloquium AV Streaming Tech Rehearsal',
    dueAt: '2026-11-13T15:30:00', // In 4 days
    priority: 'medium',
    kind: 'colloquium',
    courseCode: 'CS 410',
  },
  {
    id: 'DDL-007',
    title: 'Main Auditorium HVAC System Inspection',
    dueAt: '2026-11-14T11:00:00', // In 5 days
    priority: 'low',
    kind: 'maintenance',
  },
  {
    id: 'DDL-008',
    title: 'Departmental Faculty Workload Accreditation Report',
    dueAt: '2026-11-16T09:00:00', // Next Monday
    priority: 'high',
    kind: 'audit',
    courseCode: 'FAC-ALL',
  },
];
