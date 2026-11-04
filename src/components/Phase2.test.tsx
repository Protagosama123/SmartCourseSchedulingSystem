/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { MetricCard } from './MetricCard';
import { Sidebar } from './Sidebar';
import { useScheduleStore } from '../store/useScheduleStore';
import { selectBuildingOccupancyHierarchy } from '../store/selectors';
import { Room, ScheduleEvent } from '../types';

describe('Phase 2 Layout Shell Components & Logic', () => {
  beforeEach(() => {
    // Reset schedule store state before each test
    useScheduleStore.getState().resetToMockData();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('status badge reflects conflict count correctly (amber when conflicts, green when operational)', async () => {
    // 1. Initial seeded state has 3 conflicts
    const { rerender } = render(<Header />);
    expect(screen.getByText(/3 Conflicts Need Attention/i)).toBeDefined();

    // 2. Resolve all conflicts
    await React.act(async () => {
      useScheduleStore.getState().autoResolveAllConflicts();
    });
    rerender(<Header />);

    // Now it should show "All Systems Operational"
    expect(screen.getByText(/All Systems Operational/i)).toBeDefined();
  });

  it('MetricCard renders skeleton loading state when loading is true', () => {
    render(
      <MetricCard
        label="Scheduled Hours"
        value={7.5}
        loading={true}
        icon={<span />}
      />
    );

    expect(screen.getByTestId('metric-card-skeleton')).toBeDefined();
    expect(screen.queryByText('7.5')).toBeNull();
  });

  it('MetricCard renders value, unit, badge, and trend text', () => {
    render(
      <MetricCard
        label="Facility Occupancy Rate"
        value={85}
        unit="%"
        badge={{ text: 'High Load', variant: 'amber' }}
        trend={{ direction: 'up', text: '+5% vs average' }}
        icon={<span data-testid="test-icon" />}
      />
    );

    expect(screen.getByText('Facility Occupancy Rate')).toBeDefined();
    expect(screen.getByText('85')).toBeDefined();
    expect(screen.getByText('%')).toBeDefined();
    expect(screen.getByText('High Load')).toBeDefined();
    expect(screen.getByText('+5% vs average')).toBeDefined();
    expect(screen.getByTestId('test-icon')).toBeDefined();
  });

  it('sidebar collapse persists in localStorage and updates store state', async () => {
    render(<Sidebar />);

    // Initial state is expanded
    expect(useScheduleStore.getState().sidebarCollapsed).toBe(false);

    // Toggle collapse
    await React.act(async () => {
      useScheduleStore.getState().toggleSidebarCollapsed();
    });
    expect(useScheduleStore.getState().sidebarCollapsed).toBe(true);

    if (typeof window !== 'undefined' && window.localStorage) {
      expect(window.localStorage.getItem('smartscholar_sidebar_collapsed')).toBe('true');
    }

    // Toggle back
    await React.act(async () => {
      useScheduleStore.getState().toggleSidebarCollapsed();
    });
    expect(useScheduleStore.getState().sidebarCollapsed).toBe(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      expect(window.localStorage.getItem('smartscholar_sidebar_collapsed')).toBe('false');
    }
  });

  it('unread notification count decrements on mark-as-read and mark-all-read', () => {
    const store = useScheduleStore.getState();
    const initialUnread = store.getUnreadNotificationCount();
    expect(initialUnread).toBe(3); // 3 of 5 notifications initial unread

    // Mark one notification as read
    store.markNotificationAsRead('NOTIF-001');
    expect(useScheduleStore.getState().getUnreadNotificationCount()).toBe(2);

    // Mark all read
    useScheduleStore.getState().markAllNotificationsAsRead();
    expect(useScheduleStore.getState().getUnreadNotificationCount()).toBe(0);
  });

  it('occupancy heatmap thresholds map correctly to emerald (<50%), amber (50-79%), and red (>=80%)', () => {
    // Monday availability: 08:00 to 18:00 = 600 minutes
    const testRooms: Room[] = [
      {
        id: 'R-LOW',
        name: 'Low Occupancy Room',
        building: 'Low Building',
        capacity: 30,
        equipment: ['projector'],
        availability: [{ day: 1, start: '08:00', end: '18:00' }], // 600 min
      },
      {
        id: 'R-MID',
        name: 'Medium Occupancy Room',
        building: 'Mid Building',
        capacity: 30,
        equipment: ['projector'],
        availability: [{ day: 1, start: '08:00', end: '18:00' }], // 600 min
      },
      {
        id: 'R-HIGH',
        name: 'High Occupancy Room',
        building: 'High Building',
        capacity: 30,
        equipment: ['projector'],
        availability: [{ day: 1, start: '08:00', end: '18:00' }], // 600 min
      },
    ];

    const testEvents: ScheduleEvent[] = [
      // 120 min / 600 min = 20% (<50% -> emerald)
      {
        id: 'E-LOW',
        courseId: 'CRS-101',
        roomId: 'R-LOW',
        facultyId: 'FAC-101',
        type: 'lecture',
        start: '2026-11-09T09:00:00',
        end: '2026-11-09T11:00:00',
        scholarCount: 20,
        status: 'confirmed',
      },
      // 360 min / 600 min = 60% (50-79% -> amber)
      {
        id: 'E-MID',
        courseId: 'CRS-101',
        roomId: 'R-MID',
        facultyId: 'FAC-101',
        type: 'lecture',
        start: '2026-11-09T09:00:00',
        end: '2026-11-09T15:00:00',
        scholarCount: 20,
        status: 'confirmed',
      },
      // 540 min / 600 min = 90% (>=80% -> red)
      {
        id: 'E-HIGH',
        courseId: 'CRS-101',
        roomId: 'R-HIGH',
        facultyId: 'FAC-101',
        type: 'lecture',
        start: '2026-11-09T08:00:00',
        end: '2026-11-09T17:00:00',
        scholarCount: 20,
        status: 'confirmed',
      },
    ];

    const hierarchy = selectBuildingOccupancyHierarchy(testEvents, testRooms, '2026-11-09');

    const lowB = hierarchy.find((b) => b.building === 'Low Building');
    const midB = hierarchy.find((b) => b.building === 'Mid Building');
    const highB = hierarchy.find((b) => b.building === 'High Building');

    expect(lowB?.color).toBe('emerald');
    expect(lowB?.percentage).toBe(20);

    expect(midB?.color).toBe('amber');
    expect(midB?.percentage).toBe(60);

    expect(highB?.color).toBe('red');
    expect(highB?.percentage).toBe(90);
  });
});
