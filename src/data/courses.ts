/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Course } from '../types';

export const mockCourses: Course[] = [
  {
    id: 'CRS-101',
    code: 'CS 101',
    title: 'Introduction to Algorithms',
    facultyId: 'FAC-101',
    requiredEquipment: ['computers', 'projector'],
    enrolledCount: 38,
  },
  {
    id: 'CRS-102',
    code: 'BIO 201',
    title: 'Cellular Genetics & Microscopy',
    facultyId: 'FAC-102',
    requiredEquipment: ['lab', 'projector'],
    enrolledCount: 24,
  },
  {
    id: 'CRS-103',
    code: 'PHYS 301',
    title: 'Classical Mechanics & Dynamics',
    facultyId: 'FAC-103',
    requiredEquipment: ['projector'],
    enrolledCount: 35,
  },
  {
    id: 'CRS-104',
    code: 'MATH 102',
    title: 'Linear Algebra & Vector Calculus',
    facultyId: 'FAC-104',
    requiredEquipment: ['projector'],
    enrolledCount: 50,
  },
  {
    id: 'CRS-105',
    code: 'LIT 210',
    title: 'Post-Colonial Literature & Discourse',
    facultyId: 'FAC-105',
    requiredEquipment: ['projector'],
    enrolledCount: 28,
  },
  {
    id: 'CRS-106',
    code: 'PHYS 402',
    title: 'Quantum Field Theory & Spin',
    facultyId: 'FAC-106',
    requiredEquipment: ['projector', 'computers'],
    enrolledCount: 30,
  },
  {
    id: 'CRS-107',
    code: 'CS 305',
    title: 'Compiler Construction & Automata',
    facultyId: 'FAC-107',
    requiredEquipment: ['computers', 'projector'],
    enrolledCount: 35,
  },
  {
    id: 'CRS-108',
    code: 'ECO 105',
    title: 'Environmental Ecology & Biomes',
    facultyId: 'FAC-108',
    requiredEquipment: ['projector', 'av'],
    enrolledCount: 40,
  },
  {
    id: 'CRS-109',
    code: 'CS 410',
    title: 'Information Theory & Cryptography',
    facultyId: 'FAC-109',
    requiredEquipment: ['projector'],
    enrolledCount: 25,
  },
  {
    id: 'CRS-110',
    code: 'CHEM 202',
    title: 'Physical Chemistry & Thermodynamics',
    facultyId: 'FAC-110',
    requiredEquipment: ['lab', 'computers'],
    enrolledCount: 32,
  },
  {
    id: 'CRS-111',
    code: 'ENG 101',
    title: 'Rhetoric & Scientific Communication',
    facultyId: 'FAC-105',
    requiredEquipment: ['projector'],
    enrolledCount: 28,
  },
  {
    id: 'CRS-112',
    code: 'CS 204',
    title: 'Operating Systems & Concurrency',
    facultyId: 'FAC-101',
    requiredEquipment: ['computers'],
    enrolledCount: 25,
  },
];
