/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, KeyboardEvent } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building,
  Zap,
  Loader2,
} from 'lucide-react';
import { TimetableViewMode, EventType } from '../../types';
import { eventTypeStyles } from '../../lib/eventStyles';
import { useScheduleStore } from '../../store/useScheduleStore';

interface ControlBarProps {
  onRunAutoScheduler?: () => void;
}

const views: { id: TimetableViewMode; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'matrix', label: 'Room Matrix' },
];

const eventTypes: EventType[] = [
  'lecture',
  'lab',
  'seminar',
  'exam',
  'maintenance',
];

export const ControlBar: React.FC<ControlBarProps> = ({
  onRunAutoScheduler,
}) => {
  const {
    view,
    setView,
    selectedDate,
    setSelectedDate,
    stepSelectedDate,
    goToToday,
    buildingFilter,
    setBuildingFilter,
    typeFilter,
    toggleTypeFilter,
    rooms,
    runInteractiveAutoScheduler,
    isAutoSchedulerRunning,
  } = useScheduleStore();

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Format date display: "Wed, 4 Nov 2026"
  const formattedDate = format(parseISO(`${selectedDate}T00:00:00`), 'EEE, d MMM yyyy');

  // List of unique buildings from rooms
  const buildings = Array.from(new Set(rooms.map((r) => r.building)));

  // Arrow key navigation between views
  const handleTablistKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const currentIndex = views.findIndex((v) => v.id === view);
      const nextIndex =
        e.key === 'ArrowRight'
          ? (currentIndex + 1) % views.length
          : (currentIndex - 1 + views.length) % views.length;
      setView(views[nextIndex].id);
    }
  };

  const handleDateLabelClick = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Primary Bar: ViewSwitcher, DateNavigator, Filters, and AI Auto-Scheduler */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs">
        {/* Left Section: ViewSwitcher & DateNavigator */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* ViewSwitcher Segmented Control */}
          <div
            role="tablist"
            aria-label="Schedule views"
            onKeyDown={handleTablistKeyDown}
            className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl"
          >
            {views.map((v) => {
              const isSelected = view === v.id;
              return (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setView(v.id)}
                  tabIndex={isSelected ? 0 : -1}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* DateNavigator: Prev, Today, Next, Date Picker */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => stepSelectedDate(-1)}
              aria-label="Previous day"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => stepSelectedDate(1)}
              aria-label="Next day"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Native Date Picker Popover Trigger */}
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onClick={handleDateLabelClick}
                aria-label={`Change schedule date, currently ${formattedDate}`}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
              >
                <Calendar className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{formattedDate}</span>
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* Right Section: Building Select & Run AI Auto-Scheduler */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Building Filter Select */}
          <div className="flex items-center space-x-1.5">
            <label htmlFor="building-select" className="sr-only">
              Filter by Building
            </label>
            <div className="relative">
              <select
                id="building-select"
                value={buildingFilter || 'ALL'}
                onChange={(e) =>
                  setBuildingFilter(e.target.value === 'ALL' ? null : e.target.value)
                }
                className="pl-8 pr-7 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer"
              >
                <option value="ALL">All Facilities (8 rooms)</option>
                {buildings.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <Building className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Primary Action Button: ⚡ Run AI Auto-Scheduler */}
          <div>
            <button
              type="button"
              disabled={isAutoSchedulerRunning}
              onClick={() => {
                if (onRunAutoScheduler) {
                  onRunAutoScheduler();
                } else {
                  runInteractiveAutoScheduler();
                }
              }}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white border border-indigo-500 shadow-xs flex items-center space-x-1.5 cursor-pointer transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              {isAutoSchedulerRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5 fill-current" />
              )}
              <span>⚡ Run AI Auto-Scheduler</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Row: Event-Type Multi-Toggle Chips & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {/* Multi-toggle chips */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by session type">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Types:</span>
          {eventTypes.map((type) => {
            const isSelected = typeFilter.includes(type);
            const style = eventTypeStyles[type];

            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleTypeFilter(type)}
                aria-pressed={isSelected}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                  isSelected
                    ? `${style.badge} shadow-xs font-bold`
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? style.dot : 'bg-slate-400'}`} />
                <span className="capitalize">{type}</span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center space-x-3 text-[11px] text-slate-500 dark:text-slate-400 select-none">
          <span className="font-semibold text-slate-400">Legend:</span>
          {eventTypes.map((type) => {
            const style = eventTypeStyles[type];
            return (
              <div key={type} className="flex items-center space-x-1">
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <span className="capitalize text-[10px]">{type}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
