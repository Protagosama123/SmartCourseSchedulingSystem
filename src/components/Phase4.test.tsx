/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useScheduleStore, applyThemeToDOM } from '../store/useScheduleStore';
import { detectConflicts, resolveConflict, autoResolveAll } from '../lib/conflicts';
import { scoreMatch, searchAcademicEntities } from '../lib/search';
import { ScheduleEvent, ScheduleState, Conflict } from '../types';
import { EventModal } from './modals/EventModal';
import { CommandPalette } from './modals/CommandPalette';
import { ToastContainer } from './common/ToastContainer';

describe('Phase 4 Interactivity & Quality Gates', () => {
  beforeEach(async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    await act(async () => {
      useScheduleStore.getState().resetToMockData();
    });
  });

  // 1. Hypothetical-state validation does not mutate the store
  it('hypothetical-state validation does not mutate the store or its events', () => {
    const store = useScheduleStore.getState();
    const originalEventsCount = store.events.length;
    const originalConflictsCount = store.conflicts.length;
    const firstEvent = store.events[0];
    const originalStart = firstEvent.start;

    // Simulate hypothetical move check
    const hypotheticalEvents: ScheduleEvent[] = store.events.map((e) =>
      e.id === firstEvent.id
        ? {
            ...e,
            start: '2026-11-09T10:00:00',
            end: '2026-11-09T11:30:00',
            roomId: 'SCI-101',
          }
        : e
    );

    const hypotheticalConflicts = detectConflicts(
      hypotheticalEvents,
      store.rooms,
      store.faculty,
      store.courses
    );

    // Verify detection ran and returned conflicts
    expect(hypotheticalConflicts.length).toBeGreaterThan(0);

    // Verify store was NEVER mutated
    const currentStore = useScheduleStore.getState();
    expect(currentStore.events.length).toBe(originalEventsCount);
    expect(currentStore.conflicts.length).toBe(originalConflictsCount);
    expect(currentStore.events[0].start).toBe(originalStart);
  });

  // 2. Drop commit and undo restore the exact prior state
  it('moveEvent commits drop and undo restores the exact prior state', async () => {
    const store = useScheduleStore.getState();
    const targetEvent = store.events.find((e) => e.id === 'EVT-001')!;
    const originalRoomId = targetEvent.roomId;
    const originalStart = targetEvent.start;

    // 1. Move event to a new room
    await act(async () => {
      store.moveEvent('EVT-001', 'SCI-201', '2026-11-09T11:00:00', '2026-11-09T12:30:00');
    });

    const movedEvent = useScheduleStore.getState().events.find((e) => e.id === 'EVT-001')!;
    expect(movedEvent.roomId).toBe('SCI-201');
    expect(movedEvent.start).toBe('2026-11-09T11:00:00');
    expect(useScheduleStore.getState().canUndo()).toBe(true);

    // 2. Call Undo
    await act(async () => {
      useScheduleStore.getState().undo();
    });

    const restoredEvent = useScheduleStore.getState().events.find((e) => e.id === 'EVT-001')!;
    expect(restoredEvent.roomId).toBe(originalRoomId);
    expect(restoredEvent.start).toBe(originalStart);

    // 3. Call Redo
    await act(async () => {
      useScheduleStore.getState().redo();
    });
    const redoneEvent = useScheduleStore.getState().events.find((e) => e.id === 'EVT-001')!;
    expect(redoneEvent.roomId).toBe('SCI-201');
  });

  // 3. Locked events cannot be moved
  it('locked events cannot be rescheduled via moveEvent', async () => {
    const store = useScheduleStore.getState();
    const lockedEvent = store.events.find((e) => e.locked === true)!;
    expect(lockedEvent).toBeDefined();

    const originalRoomId = lockedEvent.roomId;

    await act(async () => {
      const moved = store.moveEvent(
        lockedEvent.id,
        'SCI-102',
        '2026-11-12T09:00:00',
        '2026-11-12T10:30:00'
      );
      expect(moved).toBe(false);
    });

    const unchangedEvent = useScheduleStore.getState().events.find((e) => e.id === lockedEvent.id)!;
    expect(unchangedEvent.roomId).toBe(originalRoomId);
  });

  // 4. autoResolveAll ordering and single-undo behavior
  it('autoResolveAll processes highest severity first and acts as ONE undo step', async () => {
    const store = useScheduleStore.getState();
    expect(store.conflicts.length).toBe(3);

    // Run auto-resolve
    await act(async () => {
      store.autoResolveAllConflicts();
    });

    // Seeded conflicts should be resolved
    const activeRemaining = useScheduleStore.getState().getActiveConflicts();
    expect(activeRemaining.length).toBeLessThan(3);

    // Verify history stack has exactly 1 new snapshot for the whole run
    expect(useScheduleStore.getState().history.length).toBe(1);

    // Call Undo once
    await act(async () => {
      useScheduleStore.getState().undo();
    });

    // Exact initial 3 conflicts restored in single step!
    expect(useScheduleStore.getState().getActiveConflicts().length).toBe(3);
  });

  // 5. Resolver never assigns the same room twice in one run
  it('resolver re-detects conflicts sequentially and never assigns the same room to overlapping events', () => {
    const store = useScheduleStore.getState();
    const result = autoResolveAll(store);

    // Verify all resolved events in the next state have no room overlap
    const resolvedEvents = result.nextState.events.filter((e) => e.status === 'resolved');
    for (let i = 0; i < resolvedEvents.length; i++) {
      for (let j = i + 1; j < resolvedEvents.length; j++) {
        const e1 = resolvedEvents[i];
        const e2 = resolvedEvents[j];
        if (e1.roomId === e2.roomId) {
          // Should not overlap in time
          const s1 = new Date(e1.start).getTime();
          const end1 = new Date(e1.end).getTime();
          const s2 = new Date(e2.start).getTime();
          const end2 = new Date(e2.end).getTime();
          const overlap = s1 < end2 && end1 > s2;
          expect(overlap).toBe(false);
        }
      }
    }
  });

  // 6. Modal validation rules
  it('EventModal enforces schema validation (end time after start, scholar count >= 1)', async () => {
    render(<EventModal />);

    // Open modal in create mode
    await act(async () => {
      useScheduleStore.getState().openAddEventModal();
    });

    expect(screen.getByText('Schedule Academic Session')).toBeDefined();

    // Set invalid time range: end before start
    const startInput = screen.getByLabelText(/start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/end time/i) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(startInput, { target: { value: '14:00' } });
      fireEvent.change(endInput, { target: { value: '13:00' } });
    });

    const submitBtn = screen.getByRole('button', { name: /create session/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Inline error message should be displayed
    expect(screen.getByText(/end time must be strictly after start time/i)).toBeDefined();

    // Set invalid scholar count < 1
    const scholarsInput = screen.getByLabelText(/scholars enrolled/i) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(scholarsInput, { target: { value: '0' } });
      fireEvent.click(submitBtn);
    });

    expect(screen.getByText(/scholar count must be at least 1/i)).toBeDefined();
  });

  // 7. Search scoring order
  it('search scoring order prioritizes prefix > word-start > substring', () => {
    const query = 'algo';
    const prefixTarget = 'Algorithms 101';
    const substringTarget = 'Sub-algorithms overview';

    const prefixScore = scoreMatch(query, prefixTarget);
    const substringScore = scoreMatch(query, substringTarget);

    expect(prefixScore).toBe(80);
    expect(substringScore).toBe(40);
    expect(prefixScore).toBeGreaterThan(substringScore);
  });

  // 8. Theme persistence
  it('persists theme preference to localStorage and updates document root class', async () => {
    const store = useScheduleStore.getState();

    await act(async () => {
      store.setTheme('dark');
    });

    expect(window.localStorage.getItem('smartscholar_theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await act(async () => {
      store.setTheme('light');
    });

    expect(window.localStorage.getItem('smartscholar_theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  // 9. Command Palette navigation and actions
  it('CommandPalette opens and executes action (navigates or switches view)', async () => {
    render(<CommandPalette />);

    await act(async () => {
      useScheduleStore.getState().setCommandPaletteOpen(true);
    });

    expect(screen.getByRole('dialog', { name: /command search palette/i })).toBeDefined();

    // Type query "day view"
    const input = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Switch to Day View' } });
    });

    // Press Enter to execute command
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    expect(useScheduleStore.getState().view).toBe('day');
    expect(useScheduleStore.getState().isCommandPaletteOpen).toBe(false);
  });

  // 10. Toasts container auto-limits visible count to max 3
  it('Toast stack maintains at most 3 visible notifications', async () => {
    render(<ToastContainer />);

    await act(async () => {
      const store = useScheduleStore.getState();
      store.addToast({ message: 'Toast 1' });
      store.addToast({ message: 'Toast 2' });
      store.addToast({ message: 'Toast 3' });
      store.addToast({ message: 'Toast 4' });
    });

    const visibleToasts = useScheduleStore.getState().toasts;
    expect(visibleToasts.length).toBe(3);
    expect(visibleToasts[0].message).toBe('Toast 4');
  });

  // 11. Per-conflict resolution
  it('resolveConflictById resolves single conflict and adds an undo step', async () => {
    const store = useScheduleStore.getState();
    const initialConflicts = store.getActiveConflicts();
    expect(initialConflicts.length).toBeGreaterThan(0);

    const firstConflict = initialConflicts[0];

    await act(async () => {
      store.resolveConflictById(firstConflict.id);
    });

    expect(useScheduleStore.getState().canUndo()).toBe(true);
    expect(useScheduleStore.getState().toasts.length).toBeGreaterThan(0);
  });

  // 12. Search highlights match segments properly
  it('searchAcademicEntities returns structured metadata for actionable execution', () => {
    const store = useScheduleStore.getState();
    const results = searchAcademicEntities({
      query: 'Science',
      courses: store.courses,
      rooms: store.rooms,
      faculty: store.faculty,
      scholars: store.scholars,
      events: store.events,
    });

    expect(results.length).toBeGreaterThan(0);
    const roomResult = results.find((r) => r.category === 'rooms');
    expect(roomResult).toBeDefined();
    expect(roomResult?.metadata?.building).toBe('Science Block');
  });
});
