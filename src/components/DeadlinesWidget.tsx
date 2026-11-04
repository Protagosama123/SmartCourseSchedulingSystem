/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CalendarClock, AlertCircle, Clock } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useScheduleStore } from '../store/useScheduleStore';
import { selectFilteredDeadlines } from '../store/selectors';

type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

export const DeadlinesWidget: React.FC = () => {
  const { deadlines, selectedDate } = useScheduleStore();
  const [filter, setFilter] = useState<PriorityFilter>('all');

  const filtered = selectFilteredDeadlines(deadlines, filter);

  // Format relative due date based on reference selectedDate (e.g. 2026-11-09)
  const formatRelativeDue = (dueAtIso: string) => {
    const refDate = parseISO(`${selectedDate}T00:00:00`);
    const dueDate = parseISO(dueAtIso);
    const diffDays = differenceInCalendarDays(dueDate, refDate);

    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)}d overdue`,
        isOverdue: true,
      };
    } else if (diffDays === 0) {
      return {
        text: `Today at ${dueAtIso.substring(11, 16)}`,
        isOverdue: false,
      };
    } else if (diffDays === 1) {
      return {
        text: 'Tomorrow',
        isOverdue: false,
      };
    }
    return {
      text: `in ${diffDays} days`,
      isOverdue: false,
    };
  };

  const getPriorityBadgeClass = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50';
      case 'low':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60';
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs dark:shadow-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarClock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Upcoming Deadlines
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          {filtered.length} items
        </span>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Priority filter">
        {(['all', 'high', 'medium', 'low'] as PriorityFilter[]).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={filter === p}
            onClick={() => setFilter(p)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
              filter === p
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Deadlines List */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
        {filtered.map((item) => {
          const { text: relativeText, isOverdue } = formatRelativeDue(item.dueAt);
          const badgeClass = getPriorityBadgeClass(item.priority);

          return (
            <div
              key={item.id}
              className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
                isOverdue
                  ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                  {item.title}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${badgeClass}`}>
                  {item.priority}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center space-x-1">
                  {isOverdue ? (
                    <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                  )}
                  <span className={isOverdue ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>
                    {relativeText}
                  </span>
                </div>

                {item.courseCode && (
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.2 rounded">
                    {item.courseCode}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
