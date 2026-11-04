/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Course, Room, Faculty, Scholar, ScheduleEvent } from '../types';

export type SearchCategory =
  | 'commands'
  | 'courses'
  | 'rooms'
  | 'faculty'
  | 'scholars'
  | 'events';

export interface SearchResultItem {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle?: string;
  badge?: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * Computes a relevance score for a target string given a search query.
 * Scoring hierarchy: Exact (100) > Prefix (80) > Word-start (60) > Substring (40) > No match (0).
 * Case-insensitive.
 */
export function scoreMatch(query: string, target: string): number {
  if (!query || !target) return 0;

  const q = query.trim().toLowerCase();
  const t = target.trim().toLowerCase();

  if (q.length === 0 || t.length === 0) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;

  // Word-start check: does any token in target start with query?
  const words = t.split(/[\s\-–—/()_.]+/).filter(Boolean);
  for (const w of words) {
    if (w.startsWith(q)) return 60;
  }

  // Substring match
  if (t.includes(q)) return 40;

  return 0;
}

/**
 * Splits text into segments indicating whether each segment matches query for UI highlighting.
 */
export function highlightMatch(
  text: string,
  query: string
): Array<{ text: string; match: boolean }> {
  if (!query.trim() || !text) return [{ text, match: false }];

  const q = query.trim().toLowerCase();
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);

  if (idx === -1) {
    return [{ text, match: false }];
  }

  const parts: Array<{ text: string; match: boolean }> = [];
  let currentIndex = 0;
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const matchIndex = lower.indexOf(q, searchFrom);
    if (matchIndex === -1) {
      parts.push({ text: text.slice(currentIndex), match: false });
      break;
    }

    if (matchIndex > currentIndex) {
      parts.push({ text: text.slice(currentIndex, matchIndex), match: false });
    }

    parts.push({ text: text.slice(matchIndex, matchIndex + q.length), match: true });
    currentIndex = matchIndex + q.length;
    searchFrom = currentIndex;
  }

  return parts;
}

export interface SearchEntitiesParams {
  query: string;
  courses: Course[];
  rooms: Room[];
  faculty: Faculty[];
  scholars: Scholar[];
  events: ScheduleEvent[];
}

/**
 * Pure search function: scores, groups, and sorts entities across academic categories.
 */
export function searchAcademicEntities({
  query,
  courses,
  rooms,
  faculty,
  scholars,
  events,
}: SearchEntitiesParams): SearchResultItem[] {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const results: SearchResultItem[] = [];

  // 1. Search Courses
  for (const course of courses) {
    const scoreCode = scoreMatch(cleanQuery, course.code);
    const scoreTitle = scoreMatch(cleanQuery, course.title);
    const bestScore = Math.max(scoreCode, scoreTitle);

    if (bestScore > 0) {
      results.push({
        id: `course-${course.id}`,
        category: 'courses',
        title: `${course.code}: ${course.title}`,
        subtitle: `Enrolled: ${course.enrolledCount} scholars`,
        badge: course.code,
        score: bestScore + (scoreCode === 100 ? 10 : 0),
        metadata: { courseId: course.id, code: course.code },
      });
    }
  }

  // 2. Search Rooms
  for (const room of rooms) {
    const scoreName = scoreMatch(cleanQuery, room.name);
    const scoreBuilding = scoreMatch(cleanQuery, room.building);
    const bestScore = Math.max(scoreName, scoreBuilding);

    if (bestScore > 0) {
      results.push({
        id: `room-${room.id}`,
        category: 'rooms',
        title: room.name,
        subtitle: `${room.building} • Capacity: ${room.capacity}`,
        badge: `Cap: ${room.capacity}`,
        score: bestScore,
        metadata: { roomId: room.id, building: room.building },
      });
    }
  }

  // 3. Search Faculty
  for (const prof of faculty) {
    const scoreName = scoreMatch(cleanQuery, prof.name);
    const scoreDept = scoreMatch(cleanQuery, prof.department);
    const bestScore = Math.max(scoreName, scoreDept);

    if (bestScore > 0) {
      results.push({
        id: `faculty-${prof.id}`,
        category: 'faculty',
        title: prof.name,
        subtitle: `${prof.department}`,
        badge: 'Faculty',
        score: bestScore,
        metadata: { facultyId: prof.id },
      });
    }
  }

  // 4. Search Scholars
  for (const scholar of scholars) {
    const scoreName = scoreMatch(cleanQuery, scholar.name);
    const scoreEmail = scoreMatch(cleanQuery, scholar.email);
    const bestScore = Math.max(scoreName, scoreEmail);

    if (bestScore > 0) {
      results.push({
        id: `scholar-${scholar.id}`,
        category: 'scholars',
        title: scholar.name,
        subtitle: `${scholar.email} • ${scholar.type}`,
        badge: scholar.type,
        score: bestScore,
        metadata: { scholarId: scholar.id },
      });
    }
  }

  // 5. Search Events
  for (const evt of events) {
    const course = courses.find((c) => c.id === evt.courseId);
    const room = rooms.find((r) => r.id === evt.roomId);
    const dateStr = evt.start.substring(0, 10);
    const timeStr = `${evt.start.substring(11, 16)}–${evt.end.substring(11, 16)}`;

    const scoreCode = course ? scoreMatch(cleanQuery, course.code) : 0;
    const scoreTitle = course ? scoreMatch(cleanQuery, course.title) : 0;
    const scoreRoom = room ? scoreMatch(cleanQuery, room.name) : 0;
    const scoreType = scoreMatch(cleanQuery, evt.type);

    const bestScore = Math.max(scoreCode, scoreTitle, scoreRoom, scoreType);

    if (bestScore > 0) {
      results.push({
        id: `event-${evt.id}`,
        category: 'events',
        title: `${course?.code || 'Session'} (${evt.type})`,
        subtitle: `${dateStr} ${timeStr} • ${room?.name || 'TBA'}`,
        badge: evt.status,
        score: bestScore - 5, // slightly lower than direct course match
        metadata: { eventId: evt.id, date: dateStr },
      });
    }
  }

  // Sort descending by score, then category, then title
  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });
}
