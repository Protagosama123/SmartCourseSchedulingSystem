/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, CheckCircle, ArrowRight, ShieldCheck, Play } from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';
import { describeConflict } from '../lib/describeConflict';
import { Conflict } from '../types';

interface ConflictLogWidgetProps {
  onResolve?: (conflictId: string) => void;
  onViewAll?: () => void;
}

export const ConflictLogWidget: React.FC<ConflictLogWidgetProps> = ({
  onResolve,
  onViewAll,
}) => {
  const {
    conflicts,
    rooms,
    faculty,
    courses,
    events,
    resolveConflictById,
    setActiveNav,
  } = useScheduleStore();

  const handleResolveClick = (conflict: Conflict) => {
    if (onResolve) {
      onResolve(conflict.id);
    } else {
      resolveConflictById(conflict.id);
    }
  };

  const handleViewAllClick = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      setActiveNav('conflicts');
    }
  };

  // Up to 6 newest conflicts (or active conflicts)
  const displayConflicts = [...conflicts].slice(0, 6);
  const unresolvedCount = conflicts.filter((c) => !c.resolution).length;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs dark:shadow-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className={`h-4 w-4 ${unresolvedCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Conflict Feed
          </h3>
          {unresolvedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {unresolvedCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleViewAllClick}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
        >
          <span>View all</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* List / Empty State */}
      {displayConflicts.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            No conflicts. Schedule is clean.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayConflicts.map((conflict) => {
            const isResolved = !!conflict.resolution;
            const description = describeConflict(conflict, {
              rooms,
              faculty,
              courses,
              events,
            });

            const severityDot =
              conflict.severity === 'high'
                ? 'bg-rose-500'
                : conflict.severity === 'medium'
                ? 'bg-amber-500'
                : 'bg-blue-500';

            return (
              <div
                key={conflict.id}
                className={`p-3 rounded-lg border text-xs space-y-2 transition-all ${
                  isResolved
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                        isResolved ? 'bg-emerald-500' : severityDot
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                        {description}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {conflict.kind} • {conflict.detectedAt ? conflict.detectedAt.substring(11, 16) : ''}
                      </span>
                    </div>
                  </div>

                  {/* Action / Status */}
                  <div className="shrink-0">
                    {isResolved ? (
                      <span
                        className="inline-flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-medium"
                        title="Conflict resolved"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResolveClick(conflict)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center space-x-1 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer"
                        aria-label={`Resolve conflict ${conflict.id}`}
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        <span>Resolve</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Resolution line if resolved */}
                {isResolved && conflict.resolution && (
                  <div className="pt-1.5 border-t border-emerald-100 dark:border-emerald-900/50 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                    ✓ {conflict.resolution.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
