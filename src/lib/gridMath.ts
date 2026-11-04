/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseISO } from 'date-fns';
import { ScheduleEvent } from '../types';
import { intervalsOverlap } from './conflicts';

export const SLOT_MINUTES = 30;
export const DAY_START = '08:00';
export const DAY_END = '18:00';

/**
 * Extracts minutes from midnight from either a time string "HH:mm" or an ISO string.
 */
export function timeStringToMinutes(timeOrIso: string): number {
  if (timeOrIso.includes('T')) {
    const d = parseISO(timeOrIso);
    return d.getHours() * 60 + d.getMinutes();
  }
  const [h, m] = timeOrIso.split(':').map(Number);
  return h * 60 + m;
}

export interface GridPosition {
  startRow: number;
  endRow: number;
  span: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
  isCompact: boolean;
  durationMinutes: number;
}

/**
 * Computes 1-indexed CSS Grid row start, end, span, and clamping indicators
 * for an event relative to the visible day window (default 08:00 to 18:00).
 */
export function eventToGridPosition(
  event: Pick<ScheduleEvent, 'start' | 'end'>,
  dayStart = DAY_START,
  slotMinutes = SLOT_MINUTES,
  dayEnd = DAY_END
): GridPosition {
  const dayStartMinutes = timeStringToMinutes(dayStart);
  const dayEndMinutes = timeStringToMinutes(dayEnd);

  const rawStartMinutes = timeStringToMinutes(event.start);
  const rawEndMinutes = timeStringToMinutes(event.end);
  const durationMinutes = Math.max(1, rawEndMinutes - rawStartMinutes);

  const continuesBefore = rawStartMinutes < dayStartMinutes;
  const continuesAfter = rawEndMinutes > dayEndMinutes;

  const clampedStart = Math.max(dayStartMinutes, Math.min(dayEndMinutes, rawStartMinutes));
  const clampedEnd = Math.min(dayEndMinutes, Math.max(dayStartMinutes, rawEndMinutes));

  // Compute 1-indexed grid row lines
  const startRow = Math.floor((clampedStart - dayStartMinutes) / slotMinutes) + 1;
  const endRowCandidate = Math.ceil((clampedEnd - dayStartMinutes) / slotMinutes) + 1;
  // Guarantee minimum height of 1 slot even for sub-slot events
  const endRow = Math.max(startRow + 1, endRowCandidate);
  const span = Math.max(1, endRow - startRow);

  return {
    startRow,
    endRow,
    span,
    continuesBefore,
    continuesAfter,
    isCompact: span <= 1,
    durationMinutes,
  };
}

export interface OverlapLayout {
  event: ScheduleEvent;
  column: number;
  totalColumns: number;
  leftPct: number;
  widthPct: number;
}

/**
 * Pure function: Assigns horizontal sub-columns to overlapping events in the same room.
 * Conflicting / overlapping events are laid side-by-side with evenly split width.
 * Touching boundary events (e.g. 10:00-11:00 and 11:00-12:00) do NOT overlap.
 */
export function layoutOverlaps(events: ScheduleEvent[]): OverlapLayout[] {
  if (events.length === 0) return [];

  // Sort events chronologically by start time, then duration descending, then id
  const sorted = [...events].sort((a, b) => {
    const sDiff = parseISO(a.start).getTime() - parseISO(b.start).getTime();
    if (sDiff !== 0) return sDiff;
    const durA = parseISO(a.end).getTime() - parseISO(a.start).getTime();
    const durB = parseISO(b.end).getTime() - parseISO(b.start).getTime();
    if (durA !== durB) return durB - durA;
    return a.id.localeCompare(b.id);
  });

  // Group events into connected overlap clusters
  const clusters: ScheduleEvent[][] = [];
  let currentCluster: ScheduleEvent[] = [];
  let clusterEnd = -1;

  for (const evt of sorted) {
    const s = parseISO(evt.start).getTime();
    const e = parseISO(evt.end).getTime();

    if (currentCluster.length === 0) {
      currentCluster.push(evt);
      clusterEnd = e;
    } else {
      // If event starts strictly before clusterEnd, it overlaps with the cluster
      if (s < clusterEnd) {
        currentCluster.push(evt);
        if (e > clusterEnd) {
          clusterEnd = e;
        }
      } else {
        clusters.push(currentCluster);
        currentCluster = [evt];
        clusterEnd = e;
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const results: OverlapLayout[] = [];

  // For each cluster, greedily assign columns
  for (const cluster of clusters) {
    // Array of column end times
    const columnEnds: number[] = [];
    const eventAssignments: { event: ScheduleEvent; column: number }[] = [];

    for (const evt of cluster) {
      const s = parseISO(evt.start).getTime();
      const e = parseISO(evt.end).getTime();

      let assignedCol = -1;
      for (let col = 0; col < columnEnds.length; col++) {
        // Touching boundary is allowed (columnEnds[col] <= s)
        if (columnEnds[col] <= s) {
          assignedCol = col;
          columnEnds[col] = e;
          break;
        }
      }

      if (assignedCol === -1) {
        assignedCol = columnEnds.length;
        columnEnds.push(e);
      }

      eventAssignments.push({ event: evt, column: assignedCol });
    }

    const totalColumns = columnEnds.length;
    const widthPct = 100 / totalColumns;

    for (const assignment of eventAssignments) {
      results.push({
        event: assignment.event,
        column: assignment.column,
        totalColumns,
        leftPct: assignment.column * widthPct,
        widthPct,
      });
    }
  }

  return results;
}
