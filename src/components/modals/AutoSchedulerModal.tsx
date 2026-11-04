/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { describeConflict } from '../../lib/describeConflict';

export const AutoSchedulerModal: React.FC = () => {
  const {
    isAutoSchedulerModalOpen,
    setAutoSchedulerModalOpen,
    autoSchedulerLogs,
    autoSchedulerSummary,
    isAutoSchedulerRunning,
    undo,
    openEditEventModal,
    rooms,
    faculty,
    courses,
    events,
  } = useScheduleStore();

  if (!isAutoSchedulerModalOpen) return null;

  const unresolvedSteps = autoSchedulerLogs.filter((s) => s.status === 'unresolved');
  const resolvedSteps = autoSchedulerLogs.filter((s) => s.status === 'resolved');

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheduler-modal-title"
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <div>
              <h2 id="scheduler-modal-title" className="text-base font-bold">
                AI Conflict Resolver Engine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deterministic backtracking heuristic room allocation and time-shifting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAutoSchedulerModalOpen(false)}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status Banner */}
          {isAutoSchedulerRunning ? (
            <div className="flex items-center space-x-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300">
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              <div>
                <p className="font-bold text-xs">Simulating resolution permutations...</p>
                <p className="text-[11px] opacity-80">
                  Processing high-severity collisions first and verifying non-interference
                </p>
              </div>
            </div>
          ) : autoSchedulerSummary ? (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                autoSchedulerSummary.unresolvedCount === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {autoSchedulerSummary.unresolvedCount === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <div>
                  <h3 className="font-bold text-xs">
                    {autoSchedulerSummary.resolvedCount} conflict
                    {autoSchedulerSummary.resolvedCount !== 1 ? 's' : ''} resolved,{' '}
                    {autoSchedulerSummary.unresolvedCount} need manual review
                  </h3>
                  <p className="text-[11px] opacity-80">
                    {autoSchedulerSummary.unresolvedCount === 0
                      ? 'All academic timetable constraints satisfied without conflicts.'
                      : 'Remaining conflicts require curriculum adjustments or manual override.'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Step-by-Step Resolution Stream */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Execution Log ({autoSchedulerLogs.length} step{autoSchedulerLogs.length !== 1 ? 's' : ''})
            </h4>

            {autoSchedulerLogs.length === 0 && !isAutoSchedulerRunning ? (
              <p className="text-xs text-slate-400 italic">No operations recorded.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {autoSchedulerLogs.map((step, idx) => {
                  const conflictDesc = describeConflict(step.conflict, {
                    rooms,
                    faculty,
                    courses,
                    events,
                  });

                  return (
                    <div
                      key={step.conflict.id || idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1.5 animate-in fade-in slide-in-from-top-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-slate-400">
                          Step {idx + 1} • {step.conflict.kind}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            step.status === 'resolved'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {step.status}
                        </span>
                      </div>

                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        {conflictDesc}
                      </p>

                      {step.resolution && (
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center space-x-1 font-semibold pt-0.5">
                          <span>Action:</span>
                          <span>{step.resolution.detail}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unresolved Conflicts Section with "Open event" link */}
          {unresolvedSteps.length > 0 && !isAutoSchedulerRunning && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Needs Manual Intervention ({unresolvedSteps.length})
              </h4>
              <div className="space-y-2">
                {unresolvedSteps.map((step) => {
                  const evt = events.find((e) => e.id === step.conflict.eventId);
                  const course = courses.find((c) => c.id === evt?.courseId);

                  return (
                    <div
                      key={step.conflict.id}
                      className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {course?.code} ({step.conflict.kind})
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {describeConflict(step.conflict, {
                            rooms,
                            faculty,
                            courses,
                            events,
                          })}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAutoSchedulerModalOpen(false);
                          openEditEventModal(step.conflict.eventId);
                        }}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-1 shrink-0 cursor-pointer shadow-xs"
                      >
                        <span>Open event</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div>
            {resolvedSteps.length > 0 && !isAutoSchedulerRunning && (
              <button
                type="button"
                onClick={() => {
                  undo();
                  setAutoSchedulerModalOpen(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Undo Auto-Resolve Run</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isAutoSchedulerRunning}
              onClick={() => setAutoSchedulerModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
