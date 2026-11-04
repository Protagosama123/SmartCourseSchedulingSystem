/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Faculty } from '../types';

export const mockFaculty: Faculty[] = [
  {
    id: 'FAC-101',
    name: 'Dr. Alan Turing',
    department: 'Computer Science',
    unavailable: [
      { start: '2026-11-13T16:00:00', end: '2026-11-13T18:00:00', reason: 'Department Research Colloquium' },
    ],
  },
  {
    id: 'FAC-102',
    name: 'Dr. Rosalind Franklin',
    department: 'Molecular Biology',
    unavailable: [
      { start: '2026-11-11T12:00:00', end: '2026-11-11T13:30:00', reason: 'Genomics Board Meeting' },
    ],
  },
  {
    id: 'FAC-103',
    name: 'Dr. Richard Feynman',
    department: 'Physics',
    unavailable: [],
  },
  {
    id: 'FAC-104',
    name: 'Dr. Ada Lovelace',
    department: 'Mathematics',
    unavailable: [
      { start: '2026-11-09T08:00:00', end: '2026-11-09T09:00:00', reason: 'Faculty Senate' },
    ],
  },
  {
    id: 'FAC-105',
    name: 'Dr. Maya Angelou',
    department: 'Literature',
    unavailable: [],
  },
  {
    id: 'FAC-106',
    name: 'Dr. Niels Bohr',
    department: 'Physics',
    unavailable: [],
  },
  {
    id: 'FAC-107',
    name: 'Dr. Grace Hopper',
    department: 'Software Engineering',
    unavailable: [
      { start: '2026-11-12T11:00:00', end: '2026-11-12T12:00:00', reason: 'Curriculum Committee' },
    ],
  },
  {
    id: 'FAC-108',
    name: 'Dr. Jane Goodall',
    department: 'Ecology',
    unavailable: [],
  },
  {
    id: 'FAC-109',
    name: 'Dr. Claude Shannon',
    department: 'Computer Science',
    unavailable: [],
  },
  {
    id: 'FAC-110',
    name: 'Dr. Marie Curie',
    department: 'Chemistry',
    unavailable: [],
  },
];
