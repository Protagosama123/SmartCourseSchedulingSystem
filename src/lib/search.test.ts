/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { scoreMatch, highlightMatch, searchAcademicEntities } from './search';
import { mockCourses, mockRooms, mockFaculty, mockScholars, mockEvents } from '../data';

describe('Search Scoring and Entity Search', () => {
  describe('scoreMatch hierarchy', () => {
    it('awards 100 for exact match regardless of case', () => {
      expect(scoreMatch('cs 101', 'CS 101')).toBe(100);
      expect(scoreMatch('algorithms', 'Algorithms')).toBe(100);
    });

    it('awards 80 for prefix match', () => {
      expect(scoreMatch('algo', 'Algorithms and Data Structures')).toBe(80);
      expect(scoreMatch('cs', 'CS 305')).toBe(80);
    });

    it('awards 60 for word-start match', () => {
      expect(scoreMatch('micro', 'Cellular Genetics & Microscopy')).toBe(60);
      expect(scoreMatch('vect', 'Linear Algebra & Vector Calculus')).toBe(60);
    });

    it('awards 40 for arbitrary substring match', () => {
      expect(scoreMatch('gebra', 'Linear Algebra & Vector Calculus')).toBe(40);
      expect(scoreMatch('comp', 'Decomposition Theorems')).toBe(40);
    });

    it('awards 0 for non-matching strings', () => {
      expect(scoreMatch('quantum', 'Classical Mechanics')).toBe(0);
      expect(scoreMatch('', 'Any text')).toBe(0);
    });
  });

  describe('highlightMatch', () => {
    it('breaks string into matching and non-matching segments', () => {
      const parts = highlightMatch('Linear Algebra', 'alg');
      expect(parts).toEqual([
        { text: 'Linear ', match: false },
        { text: 'Alg', match: true },
        { text: 'ebra', match: false },
      ]);
    });

    it('handles no match gracefully', () => {
      const parts = highlightMatch('Physics 101', 'xyz');
      expect(parts).toEqual([{ text: 'Physics 101', match: false }]);
    });
  });

  describe('searchAcademicEntities', () => {
    it('returns ranked results with prefix matches beating substrings', () => {
      const results = searchAcademicEntities({
        query: 'cs',
        courses: mockCourses,
        rooms: mockRooms,
        faculty: mockFaculty,
        scholars: mockScholars,
        events: mockEvents,
      });

      expect(results.length).toBeGreaterThan(0);
      // Top course matches should be CS courses
      const topResult = results[0];
      expect(topResult.category).toBe('courses');
      expect(topResult.title.toLowerCase().startsWith('cs')).toBe(true);
    });
  });
});
