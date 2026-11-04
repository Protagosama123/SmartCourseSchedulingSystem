/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, RoomAvailability } from '../types';

const defaultWeekAvailability: RoomAvailability[] = [
  { day: 1, start: '08:00', end: '18:00' }, // Monday
  { day: 2, start: '08:00', end: '18:00' }, // Tuesday
  { day: 3, start: '08:00', end: '18:00' }, // Wednesday
  { day: 4, start: '08:00', end: '18:00' }, // Thursday
  { day: 5, start: '08:00', end: '18:00' }, // Friday
];

const extendedWeekAvailability: RoomAvailability[] = [
  { day: 1, start: '08:00', end: '20:00' },
  { day: 2, start: '08:00', end: '20:00' },
  { day: 3, start: '08:00', end: '20:00' },
  { day: 4, start: '08:00', end: '20:00' },
  { day: 5, start: '08:00', end: '20:00' },
];

export const mockRooms: Room[] = [
  // Science Block (3 rooms)
  {
    id: 'SCI-101',
    name: 'Physics Lab 101',
    building: 'Science Block',
    capacity: 40,
    equipment: ['lab', 'projector', 'computers'],
    availability: defaultWeekAvailability,
  },
  {
    id: 'SCI-102',
    name: 'Biology Seminar 102',
    building: 'Science Block',
    capacity: 25,
    equipment: ['projector', 'av'],
    availability: defaultWeekAvailability,
  },
  {
    id: 'SCI-201',
    name: 'Advanced Chemistry Lab 201',
    building: 'Science Block',
    capacity: 35,
    equipment: ['lab', 'computers', 'projector', 'av'],
    availability: extendedWeekAvailability,
  },

  // Arts Hall (3 rooms)
  {
    id: 'ART-201',
    name: 'Humanities Lecture Hall 201',
    building: 'Arts Hall',
    capacity: 60,
    equipment: ['projector', 'av'],
    availability: defaultWeekAvailability,
  },
  {
    id: 'ART-202',
    name: 'Literature Seminar 202',
    building: 'Arts Hall',
    capacity: 30,
    equipment: ['projector'],
    availability: defaultWeekAvailability,
  },
  {
    id: 'ART-305',
    name: 'Digital Arts Media Suite 305',
    building: 'Arts Hall',
    capacity: 25,
    equipment: ['computers', 'av', 'projector'],
    availability: extendedWeekAvailability,
  },

  // Main Auditorium (2 rooms)
  {
    id: 'AUD-MAIN',
    name: 'Grand Memorial Auditorium',
    building: 'Main Auditorium',
    capacity: 200,
    equipment: ['projector', 'av', 'computers'],
    availability: extendedWeekAvailability,
  },
  {
    id: 'AUD-ANNEX',
    name: 'Symposium Annex Room',
    building: 'Main Auditorium',
    capacity: 45,
    equipment: ['av', 'projector'],
    availability: defaultWeekAvailability,
  },
];
