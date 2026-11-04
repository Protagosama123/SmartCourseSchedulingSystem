/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { format } from 'date-fns';
import {
  eventToGridPosition,
  layoutOverlaps,
  timeStringToMinutes,
  DAY_START,
  DAY_END,
  SLOT_MINUTES,
} from '../../lib/gridMath';
import {
  selectFilteredRooms,
  selectFilteredDayEvents,
} from '../../store/selectors';
import { useScheduleStore } from '../../store/useScheduleStore';
import { TimetableBoard } from './TimetableBoard';
import { ControlBar } from './ControlBar';
import { DayGrid } from './DayGrid';
import { WeekView } from './WeekView';
import { ScheduleEvent } from '../../types';

describe('Phase 3 Schedule Grid Engine & Components', () => {
  beforeEach(async () => {
    await act(async () => {
      useScheduleStore.getState().resetToMockData();
      useScheduleStore.getState().setSelectedDate('2026-11-09');
      useScheduleStore.getState().setView('day');
      useScheduleStore.getState().setBuildingFilter(null);
      useScheduleStore.getState().setTypeFilter([
        'lecture',
        'lab',
        'seminar',
        'exam',
        'maintenance',
      ]);
    });
  });

  describe('gridMath helper: eventToGridPosition', () => {
    it('computes grid rows correctly for standard 90-min session (09:00 - 10:30)', () => {
      const pos = eventToGridPosition({
        start: '2026-11-09T09:00:00Z',
        end: '2026-11-09T10:30:00Z',
      });

      // 08:00 is row 1. 09:00 is 60 min -> 60/30 = 2 -> row 3.
      // 10:30 is 150 min -> 150/30 = 5 -> row 6.
      expect(pos.startRow).toBe(3);
      expect(pos.endRow).toBe(6);
      expect(pos.span).toBe(3);
      expect(pos.isCompact).toBe(false);
      expect(pos.continuesBefore).toBe(false);
      expect(pos.continuesAfter).toBe(false);
      expect(pos.durationMinutes).toBe(90);
    });

    it('handles boundary session touching 08:00 (08:00 - 09:00)', () => {
      const pos = eventToGridPosition({
        start: '2026-11-09T08:00:00Z',
        end: '2026-11-09T09:00:00Z',
      });

      expect(pos.startRow).toBe(1);
      expect(pos.endRow).toBe(3);
      expect(pos.span).toBe(2);
      expect(pos.continuesBefore).toBe(false);
    });

    it('enforces minimum 1-slot height for sub-slot 15-min sessions', () => {
      const pos = eventToGridPosition({
        start: '2026-11-09T10:00:00Z',
        end: '2026-11-09T10:15:00Z',
      });

      expect(pos.durationMinutes).toBe(15);
      expect(pos.span).toBeGreaterThanOrEqual(1);
      expect(pos.endRow).toBe(pos.startRow + 1);
      expect(pos.isCompact).toBe(true);
    });

    it('clamps events starting before 08:00 and flags continuesBefore', () => {
      const pos = eventToGridPosition({
        start: '2026-11-09T07:15:00Z',
        end: '2026-11-09T09:00:00Z',
      });

      expect(pos.continuesBefore).toBe(true);
      expect(pos.startRow).toBe(1);
      expect(pos.endRow).toBe(3);
    });

    it('clamps events ending after 18:00 and flags continuesAfter', () => {
      const pos = eventToGridPosition({
        start: '2026-11-09T17:00:00Z',
        end: '2026-11-09T19:30:00Z',
      });

      expect(pos.continuesAfter).toBe(true);
      // 17:00 is 9 hours from 08:00 = 540 min -> 540/30 = 18 -> row 19
      // 18:00 is 10 hours = 600 min -> 600/30 = 20 -> row 21
      expect(pos.startRow).toBe(19);
      expect(pos.endRow).toBe(21);
    });
  });

  describe('gridMath helper: layoutOverlaps', () => {
    it('returns empty array when no events are provided', () => {
      expect(layoutOverlaps([])).toEqual([]);
    });

    it('splits 2 overlapping events 50/50 side-by-side', () => {
      const evt1: ScheduleEvent = {
        id: 'E1',
        courseId: 'C1',
        roomId: 'R1',
        facultyId: 'F1',
        type: 'lecture',
        start: '2026-11-09T09:00:00Z',
        end: '2026-11-09T10:30:00Z',
        scholarCount: 30,
        status: 'confirmed',
      };
      const evt2: ScheduleEvent = {
        id: 'E2',
        courseId: 'C2',
        roomId: 'R1',
        facultyId: 'F2',
        type: 'lab',
        start: '2026-11-09T09:30:00Z',
        end: '2026-11-09T11:00:00Z',
        scholarCount: 25,
        status: 'conflict',
      };

      const layout = layoutOverlaps([evt1, evt2]);
      expect(layout).toHaveLength(2);

      const l1 = layout.find((l) => l.event.id === 'E1')!;
      const l2 = layout.find((l) => l.event.id === 'E2')!;

      expect(l1.totalColumns).toBe(2);
      expect(l2.totalColumns).toBe(2);
      expect(l1.widthPct).toBe(50);
      expect(l2.widthPct).toBe(50);
      expect(Math.abs(l1.leftPct - l2.leftPct)).toBe(50);
    });

    it('does NOT overlap touching boundary events (e.g. 09:00-10:00 and 10:00-11:00)', () => {
      const evt1: ScheduleEvent = {
        id: 'E1',
        courseId: 'C1',
        roomId: 'R1',
        facultyId: 'F1',
        type: 'lecture',
        start: '2026-11-09T09:00:00Z',
        end: '2026-11-09T10:00:00Z',
        scholarCount: 30,
        status: 'confirmed',
      };
      const evt2: ScheduleEvent = {
        id: 'E2',
        courseId: 'C2',
        roomId: 'R1',
        facultyId: 'F2',
        type: 'lecture',
        start: '2026-11-09T10:00:00Z',
        end: '2026-11-09T11:00:00Z',
        scholarCount: 30,
        status: 'confirmed',
      };

      const layout = layoutOverlaps([evt1, evt2]);
      expect(layout).toHaveLength(2);
      expect(layout[0].widthPct).toBe(100);
      expect(layout[0].leftPct).toBe(0);
      expect(layout[1].widthPct).toBe(100);
      expect(layout[1].leftPct).toBe(0);
    });
  });

  describe('Date Stepping and Navigation Store Actions', () => {
    it('steps selectedDate by +1 day, -1 day, and jumps to today', async () => {
      const store = useScheduleStore.getState();
      expect(store.selectedDate).toBe('2026-11-09');

      await act(async () => {
        store.stepSelectedDate(1);
      });
      expect(useScheduleStore.getState().selectedDate).toBe('2026-11-10');

      await act(async () => {
        store.stepSelectedDate(-1);
      });
      expect(useScheduleStore.getState().selectedDate).toBe('2026-11-09');

      await act(async () => {
        store.goToToday();
      });
      const todayExpected = format(new Date(), 'yyyy-MM-dd');
      expect(useScheduleStore.getState().selectedDate).toBe(todayExpected);
    });
  });

  describe('Filter Selectors Logic', () => {
    it('filters rooms by building correctly', () => {
      const state = useScheduleStore.getState();
      const allRooms = selectFilteredRooms(state.rooms, null);
      expect(allRooms).toHaveLength(8);

      const scienceRooms = selectFilteredRooms(state.rooms, 'Science Block');
      expect(scienceRooms.length).toBeGreaterThan(0);
      expect(scienceRooms.every((r) => r.building === 'Science Block')).toBe(true);

      const artsRooms = selectFilteredRooms(state.rooms, 'Arts Hall');
      expect(artsRooms.length).toBeGreaterThan(0);
      expect(artsRooms.every((r) => r.building === 'Arts Hall')).toBe(true);
    });

    it('filters day events by date, building, and session types', () => {
      const state = useScheduleStore.getState();
      const mondayEvents = selectFilteredDayEvents(
        state.events,
        state.rooms,
        '2026-11-09',
        null,
        ['lecture', 'lab', 'seminar', 'exam', 'maintenance']
      );

      expect(mondayEvents.length).toBeGreaterThan(0);
      expect(mondayEvents.every((e) => e.start.startsWith('2026-11-09'))).toBe(true);

      // Filter out labs
      const onlyLectures = selectFilteredDayEvents(
        state.events,
        state.rooms,
        '2026-11-09',
        null,
        ['lecture']
      );
      expect(onlyLectures.every((e) => e.type === 'lecture')).toBe(true);
    });
  });

  describe('Timetable Board & View Stubs UI Integration', () => {
    it('renders ViewSwitcher tabs and switches to Week view stub', async () => {
      render(<TimetableBoard />);

      // Verify tablist role
      const tablist = screen.getByRole('tablist', { name: /schedule views/i });
      expect(tablist).toBeDefined();

      // Find and click Week view tab
      const weekTab = screen.getByRole('tab', { name: /week/i });
      await act(async () => {
        fireEvent.click(weekTab);
      });

      // Verify WeekView stub renders
      expect(screen.getByText(/Week View: Multi-Room Grid/i)).toBeDefined();
      const switchBackBtn = screen.getByRole('button', { name: /switch to day view/i });
      expect(switchBackBtn).toBeDefined();

      // Click "Switch to Day view"
      await act(async () => {
        fireEvent.click(switchBackBtn);
      });

      // Day view is active again
      expect(useScheduleStore.getState().view).toBe('day');
    });

    it('renders DayGrid with seeded conflicts styled with conflict indicators', () => {
      // Seeded mock conflict EVT-002 occurs on Monday 2026-11-09 in SCI-101
      render(<DayGrid />);

      // Verify EVT-002 card exists with data-event-id
      const evtCard = document.querySelector('[data-event-id="EVT-002"]');
      expect(evtCard).toBeDefined();
      expect(evtCard?.classList.contains('border-rose-500')).toBe(true);

      // Verify conflict indicator icon is rendered inside EVT-002
      const conflictIndicator = screen.getByTestId('conflict-indicator-EVT-002');
      expect(conflictIndicator).toBeDefined();
    });

    it('renders room columns with capacity and equipment details', () => {
      render(<DayGrid />);

      // Science Block Physics Lab 101 should be rendered
      expect(screen.getByText('Physics Lab 101')).toBeDefined();
      expect(screen.getByText('Cap: 40')).toBeDefined();
    });
  });
});
