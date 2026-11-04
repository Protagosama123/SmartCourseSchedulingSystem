/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MetricsBanner } from './MetricsBanner';
import { ConflictLogWidget } from './ConflictLogWidget';
import { OccupancyHeatmapWidget } from './OccupancyHeatmapWidget';
import { DeadlinesWidget } from './DeadlinesWidget';
import { TimetableBoard } from './schedule/TimetableBoard';
import { CommandPalette } from './modals/CommandPalette';
import { EventModal } from './modals/EventModal';
import { AutoSchedulerModal } from './modals/AutoSchedulerModal';
import { ToastContainer } from './common/ToastContainer';
import { useScheduleStore } from '../store/useScheduleStore';

export const DashboardLayout: React.FC = () => {
  const {
    activeNav,
    selectedDate,
    setSelectedDate,
    setCommandPaletteOpen,
    openAddEventModal,
    openEditEventModal,
    runInteractiveAutoScheduler,
    undo,
    redo,
  } = useScheduleStore();

  // Global Undo / Redo keyboard shortcuts (Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z or Ctrl+Y)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;

      // Do not intercept if typing in a text field
      if (isInput) return;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isModifier = isMac ? e.metaKey : e.ctrlKey;

      if (isModifier && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (isModifier && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [undo, redo]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors">
      {/* Top Header */}
      <Header
        onOpenSearch={() => setCommandPaletteOpen(true)}
        onAddSchedule={() => openAddEventModal()}
        onAutoResolve={() => runInteractiveAutoScheduler()}
      />

      {/* Main Body Shell */}
      <div className="flex-1 flex w-full">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Content Area + Right Widgets */}
        <div className="flex-1 min-w-0 flex flex-col xl:flex-row">
          {/* Center Main Content Area */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 space-y-6">
            {/* View Title & Date Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">
                  {activeNav === 'dashboard'
                    ? 'Academic Timetable & Allocation'
                    : activeNav === 'timetable'
                    ? 'Schedule Grid Overview'
                    : activeNav === 'facilities'
                    ? 'Facility & Room Allocation'
                    : activeNav === 'roster'
                    ? 'Faculty & Scholars Roster'
                    : activeNav === 'conflicts'
                    ? 'Conflict Resolution Console'
                    : 'System Settings'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fall 2026 Semester • Week of November 9–13, 2026
                </p>
              </div>

              {/* Day Selector Pills */}
              <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                {[
                  { date: '2026-11-09', label: 'Mon 9' },
                  { date: '2026-11-10', label: 'Tue 10' },
                  { date: '2026-11-11', label: 'Wed 11' },
                  { date: '2026-11-12', label: 'Thu 12' },
                  { date: '2026-11-13', label: 'Fri 13' },
                ].map((item) => (
                  <button
                    key={item.date}
                    type="button"
                    onClick={() => setSelectedDate(item.date)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                      selectedDate === item.date
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Metric Cards Banner */}
            <MetricsBanner />

            {/* Academic Timetable Board */}
            <TimetableBoard
              onAddSchedule={(prefill) => openAddEventModal(prefill)}
              onSelectEvent={(eventId) => openEditEventModal(eventId)}
            />
          </main>

          {/* Right Column / Aside (320px on ≥1280px Desktop; moves below on Tablet/Mobile) */}
          <aside
            aria-label="Insights"
            className="w-full xl:w-80 shrink-0 p-4 sm:p-6 border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 space-y-5"
          >
            {/* Widget A: Conflict Feed */}
            <ConflictLogWidget />

            {/* Widget B: Occupancy Heatmap */}
            <OccupancyHeatmapWidget />

            {/* Widget C: Deadlines & Milestones */}
            <DeadlinesWidget />
          </aside>
        </div>
      </div>

      {/* Phase 4 Interactive Modals & Toasts */}
      <CommandPalette />
      <EventModal />
      <AutoSchedulerModal />
      <ToastContainer />
    </div>
  );
};
