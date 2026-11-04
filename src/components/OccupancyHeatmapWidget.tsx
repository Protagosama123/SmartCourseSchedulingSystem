/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';

export const OccupancyHeatmapWidget: React.FC = () => {
  const { getBuildingOccupancyHierarchy, selectedDate } = useScheduleStore();
  const buildings = getBuildingOccupancyHierarchy();

  // Expanded buildings state for room drill-down
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({
    'Science Block': true, // Open by default
  });

  const toggleBuilding = (building: string) => {
    setExpandedBuildings((prev) => ({
      ...prev,
      [building]: !prev[building],
    }));
  };

  const getBarColor = (color: 'emerald' | 'amber' | 'red') => {
    if (color === 'emerald') return 'bg-emerald-500';
    if (color === 'amber') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getBadgeColor = (color: 'emerald' | 'amber' | 'red') => {
    if (color === 'emerald')
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    if (color === 'amber')
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs dark:shadow-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Facility Occupancy
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          {selectedDate}
        </span>
      </div>

      {/* Building list */}
      <div className="space-y-4">
        {buildings.map((b) => {
          const isExpanded = !!expandedBuildings[b.building];
          const barColorClass = getBarColor(b.color);
          const badgeClass = getBadgeColor(b.color);

          return (
            <div
              key={b.building}
              className="rounded-lg border border-slate-100 dark:border-slate-800/80 p-3 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5 transition-colors"
            >
              {/* Building Bar header (clickable) */}
              <button
                type="button"
                onClick={() => toggleBuilding(b.building)}
                aria-expanded={isExpanded}
                className="w-full flex items-center justify-between text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {b.building}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {b.rooms.length} rooms • {Math.round(b.bookedMinutes / 60)}h booked
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}>
                    {b.percentage}%
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Progress bar */}
              <div
                role="progressbar"
                aria-valuenow={b.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${b.building} occupancy: ${b.percentage}%`}
                className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden"
              >
                <div
                  className={`h-full transition-all duration-300 ${barColorClass}`}
                  style={{ width: `${Math.min(100, b.percentage)}%` }}
                />
              </div>

              {/* Room Breakdown (Collapsible) */}
              {isExpanded && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2 animate-in fade-in slide-in-from-top-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Room Breakdown
                  </span>
                  <div className="space-y-1.5">
                    {b.rooms.map((room) => {
                      const roomBarClass = getBarColor(room.color);
                      return (
                        <div key={room.roomId} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                              {room.roomName}
                            </span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">
                              {room.percentage}%
                            </span>
                          </div>
                          <div
                            role="progressbar"
                            aria-valuenow={room.percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${room.roomName} occupancy: ${room.percentage}%`}
                            className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700/50 overflow-hidden"
                          >
                            <div
                              className={`h-full transition-all duration-300 ${roomBarClass}`}
                              style={{ width: `${Math.min(100, room.percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
