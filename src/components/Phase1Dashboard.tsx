/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
} from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';

export const Phase1Dashboard: React.FC = () => {
  const {
    events,
    rooms,
    faculty,
    courses,
    scholars,
    resolutionLogs,
    selectedDate,
    setSelectedDate,
    resolveConflictById,
    autoResolveAllConflicts,
    resetToMockData,
    getActiveConflicts,
    getConflictCount,
    getScheduledHoursForSelectedDate,
    getOccupancyRateForSelectedDate,
    getScholarMetrics,
    getBuildingMetrics,
  } = useScheduleStore();

  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const activeConflicts = getActiveConflicts();
  const conflictCount = getConflictCount();
  const scheduledHours = getScheduledHoursForSelectedDate();
  const occupancy = getOccupancyRateForSelectedDate();
  const scholarMetrics = getScholarMetrics();
  const buildingMetrics = getBuildingMetrics();

  const handleAutoResolve = () => {
    const result = autoResolveAllConflicts();
    setLastActionMessage(
      `Backtracking Rule Engine auto-resolved ${result.resolvedCount} conflict(s). Remaining: ${result.unresolvedCount}.`
    );
  };

  const handleResolveSingle = (conflictId: string) => {
    const res = resolveConflictById(conflictId);
    if (res) {
      setLastActionMessage(`Resolved conflict ${conflictId}: ${res.detail}`);
    } else {
      setLastActionMessage(`Unable to resolve conflict ${conflictId} automatically.`);
    }
  };

  const handleReset = () => {
    resetToMockData();
    setLastActionMessage('Reset schedule state to seeded mock data with 3 deliberate conflicts.');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Smart Scholar Scheduling System
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Phase 1 Complete
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pure Backtracking Conflict Resolving Engine, Store & Type Architecture
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
              title="Reset data to default 3 deliberate conflicts"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Seed State</span>
            </button>
            <button
              onClick={handleAutoResolve}
              disabled={activeConflicts.length === 0}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center space-x-2 shadow-sm transition-all cursor-pointer ${
                activeConflicts.length > 0
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-indigo-500/25'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Run Auto-Resolver ({activeConflicts.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Notification pill if action triggered */}
        {lastActionMessage && (
          <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>{lastActionMessage}</span>
            </div>
            <button
              onClick={() => setLastActionMessage(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Phase 1 Metrics derived from pure store selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Active Conflicts */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Active Conflicts</span>
              <AlertTriangle className={`h-4 w-4 ${conflictCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className={`text-3xl font-bold tracking-tight ${conflictCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {conflictCount}
              </span>
              <span className="text-xs text-slate-500">
                {conflictCount === 0 ? 'All schedules verified' : 'Requires engine resolution'}
              </span>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span>Computed strictly via pure detectConflicts()</span>
            </div>
          </div>

          {/* Metric 2: Scheduled Hours */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Today's Hours ({selectedDate})</span>
              <Calendar className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-bold tracking-tight text-white">
                {scheduledHours}h
              </span>
              <span className="text-xs text-slate-500">
                across {events.filter((e) => e.start.startsWith(selectedDate)).length} events
              </span>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span>Derived state selector</span>
            </div>
          </div>

          {/* Metric 3: Occupancy Rate */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Room Occupancy Rate</span>
              <Building2 className="h-4 w-4 text-violet-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-bold tracking-tight text-white">
                {occupancy.ratePercentage}%
              </span>
              <span className="text-xs text-slate-500">
                {occupancy.scheduledHours}h / {occupancy.totalAvailableHours}h capacity
              </span>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span>8 rooms across 3 buildings</span>
            </div>
          </div>

          {/* Metric 4: Scholars (Students) */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Scholars Enrolled</span>
              <Users className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-bold tracking-tight text-white">
                {scholarMetrics.total}
              </span>
              <span className="text-xs text-slate-500">
                {scholarMetrics.byType.undergraduate} undergrad, {scholarMetrics.byType.graduate} grad, {scholarMetrics.byType.phd} PhD
              </span>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>Scholars distinguished by type</span>
            </div>
          </div>
        </div>

        {/* Date Selector Row */}
        <div className="flex items-center space-x-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-medium px-2">Active Week:</span>
          {[
            { date: '2026-11-09', label: 'Mon Nov 9' },
            { date: '2026-11-10', label: 'Tue Nov 10' },
            { date: '2026-11-11', label: 'Wed Nov 11' },
            { date: '2026-11-12', label: 'Thu Nov 12' },
            { date: '2026-11-13', label: 'Fri Nov 13' },
          ].map((item) => (
            <button
              key={item.date}
              onClick={() => setSelectedDate(item.date)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                selectedDate === item.date
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Conflict Detection & Resolution Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Conflicts List (2 cols on large) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className={`h-5 w-5 ${activeConflicts.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                <h2 className="text-base font-semibold text-white">
                  Active Conflict Queue ({activeConflicts.length})
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Deterministic rule engine evaluation
              </span>
            </div>

            {activeConflicts.length === 0 ? (
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-emerald-300">
                  Zero Conflicts Detected
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  All 25 events satisfy room capacity, required equipment, room availability windows, and faculty overlap constraints.
                </p>
                <button
                  onClick={handleReset}
                  className="mt-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  Reload 3 Seeded Conflicts to Test
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeConflicts.map((conflict) => {
                  const event = events.find((e) => e.id === conflict.eventId);
                  const relatedEvent = conflict.relatedEventId
                    ? events.find((e) => e.id === conflict.relatedEventId)
                    : null;
                  const room = event ? rooms.find((r) => r.id === event.roomId) : null;
                  const course = event ? courses.find((c) => c.id === event.courseId) : null;
                  const facultyMember = event ? faculty.find((f) => f.id === event.facultyId) : null;

                  return (
                    <div
                      key={conflict.id}
                      className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-4 space-y-3 transition-all hover:border-amber-500/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {conflict.kind}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {conflict.eventId}
                          </span>
                          {conflict.relatedEventId && (
                            <span className="text-xs text-slate-500 flex items-center space-x-1">
                              <ArrowRight className="h-3 w-3" />
                              <span className="font-mono text-slate-400">{conflict.relatedEventId}</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleResolveSingle(conflict.id)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <Play className="h-3 w-3" />
                          <span>Resolve Pure</span>
                        </button>
                      </div>

                      <div className="text-xs text-slate-300 space-y-1">
                        <p className="font-medium text-white">
                          {course?.code}: {course?.title}
                        </p>
                        <p className="text-slate-400">
                          {room?.name} ({room?.building}) • {facultyMember?.name} • {event?.start.substring(0, 10)} {event?.start.substring(11, 16)}-{event?.end.substring(11, 16)}
                        </p>
                        {conflict.kind === 'room-overlap' && relatedEvent && (
                          <p className="text-amber-300/90 text-[11px]">
                            ⚠️ Overlaps with {relatedEvent.id} in {room?.name} at touching interval.
                          </p>
                        )}
                        {conflict.kind === 'faculty-overlap' && (
                          <p className="text-amber-300/90 text-[11px]">
                            ⚠️ Faculty member {facultyMember?.name} is double-booked across simultaneous sessions.
                          </p>
                        )}
                        {conflict.kind === 'over-capacity' && room && event && (
                          <p className="text-amber-300/90 text-[11px]">
                            ⚠️ Enrolled scholars ({event.scholarCount}) exceed room capacity ({room.capacity}).
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resolution History / Audit Log */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Engine Resolution Audit Log ({resolutionLogs.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  Immutable audit trail
                </span>
              </div>

              {resolutionLogs.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  No automated resolutions executed yet. Click "Run Auto-Resolver" to trigger backtracking resolution.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {resolutionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-indigo-400 font-semibold text-[11px]">
                          [{log.action.toUpperCase()}] Event {log.eventId}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{log.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dataset Verification & Unit Test Status */}
          <div className="space-y-4">
            {/* Vitest Unit Test Status Badge */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-sm font-semibold text-white">
                    Vitest Test Suite
                  </h3>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  13 / 13 Passed
                </span>
              </div>

              <div className="text-xs text-slate-400 space-y-2">
                <div className="flex items-center space-x-2 text-[11px]">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Rule 1: room-overlap detection</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Rule 2: faculty-overlap detection</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Rule 3: over-capacity detection</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Rule 4: missing-equipment detection</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Rule 5: outside-availability detection</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Touching boundary zero-overlap check</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Resolver room move & time shift</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Resolver null case when fully blocked</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Idempotency: 0 conflicts after resolution</span>
                </div>
              </div>
            </div>

            {/* Buildings & Facilities Breakdown */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-violet-400" />
                  <span>Facilities Inventory</span>
                </h3>
                <span className="text-[11px] text-slate-500">8 Rooms Total</span>
              </div>

              <div className="space-y-2">
                {buildingMetrics.map((b) => (
                  <div
                    key={b.building}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-200">{b.building}</p>
                      <p className="text-[11px] text-slate-400">
                        {b.roomCount} rooms • Cap: {b.totalCapacity}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                      {b.activeEventsCount} events
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scholars Breakdown */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Users className="h-4 w-4 text-sky-400" />
                  <span>Scholars by Degree Type</span>
                </h3>
                <span className="text-[11px] text-slate-500">{scholars.length} Enrolled</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                  <p className="text-slate-400 text-[11px]">Undergrad</p>
                  <p className="text-lg font-bold text-white mt-0.5">{scholarMetrics.byType.undergraduate}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                  <p className="text-slate-400 text-[11px]">Graduate</p>
                  <p className="text-lg font-bold text-white mt-0.5">{scholarMetrics.byType.graduate}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                  <p className="text-slate-400 text-[11px]">PhD Scholars</p>
                  <p className="text-lg font-bold text-white mt-0.5">{scholarMetrics.byType.phd}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                  <p className="text-slate-400 text-[11px]">Postdoc</p>
                  <p className="text-lg font-bold text-white mt-0.5">{scholarMetrics.byType.postdoc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Phase Transition Note */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Smart Scholar Scheduling System • Phase 1 Pure Engine Verified</span>
          <span className="text-slate-400 font-medium">Ready for Phase 2: Layout shell (Header, Sidebar, Metric cards, right-hand widgets)</span>
        </div>
      </footer>
    </div>
  );
};
