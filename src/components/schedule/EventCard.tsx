/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, KeyboardEvent } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { addMinutes, formatISO, parseISO } from 'date-fns';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Cpu,
  Lock,
} from 'lucide-react';
import { ScheduleEvent, Conflict } from '../../types';
import { eventTypeStyles } from '../../lib/eventStyles';
import { describeConflict } from '../../lib/describeConflict';
import { AccessibleTooltip } from './AccessibleTooltip';
import { useScheduleStore } from '../../store/useScheduleStore';
import { selectFilteredRooms } from '../../store/selectors';

interface EventCardProps {
  event: ScheduleEvent;
  conflict?: Conflict;
  isCompact?: boolean;
  style?: React.CSSProperties;
  isGhost?: boolean;
  onSelect?: (eventId: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  conflict,
  isCompact = false,
  style,
  isGhost = false,
  onSelect,
}) => {
  const {
    rooms,
    faculty,
    courses,
    events,
    moveEvent,
    buildingFilter,
  } = useScheduleStore();

  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('');

  const course = courses.find((c) => c.id === event.courseId);
  const room = rooms.find((r) => r.id === event.roomId);
  const professor = faculty.find((f) => f.id === event.facultyId);

  const colorStyle = eventTypeStyles[event.type] || eventTypeStyles.lecture;
  const isConflict = event.status === 'conflict' || !!conflict;
  const isResolved = event.status === 'resolved';
  const isTentative = event.status === 'tentative';
  const isLocked = Boolean(event.locked);

  // DnD hook
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    disabled: isLocked || isGhost,
    data: {
      event,
    },
  });

  const tooltipId = `event-tooltip-${event.id}`;
  const timeRangeStr = `${event.start.substring(11, 16)} – ${event.end.substring(11, 16)}`;

  // Capacity fill calculation
  const roomCapacity = room?.capacity || 1;
  const fillPercentage = Math.min(150, Math.round((event.scholarCount / roomCapacity) * 100));

  // Conflict description
  const conflictDescription = conflict
    ? describeConflict(conflict, { rooms, faculty, courses, events })
    : null;

  const handleMouseEnter = () => {
    if (isDragging || isGhost) return;
    if (cardRef.current) {
      setTriggerRect(cardRef.current.getBoundingClientRect());
      setIsTooltipOpen(true);
    }
  };

  const handleMouseLeave = () => {
    setIsTooltipOpen(false);
  };

  const handleFocus = () => {
    if (isDragging || isGhost) return;
    if (cardRef.current) {
      setTriggerRect(cardRef.current.getBoundingClientRect());
      setIsTooltipOpen(true);
    }
  };

  const handleBlur = () => {
    setIsTooltipOpen(false);
  };

  const visibleRooms = selectFilteredRooms(rooms, buildingFilter);

  // Keyboard navigation & Alt+Arrow rescheduling
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(event.id);
      return;
    }

    // Alt+Arrow keyboard rescheduling (15 min vertical, 1 room horizontal)
    if (e.altKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();

      if (isLocked) {
        setAriaAnnouncement(`${course?.code || 'Event'} is locked and cannot be rescheduled.`);
        return;
      }

      const currentStart = parseISO(event.start);
      const currentEnd = parseISO(event.end);

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const deltaMinutes = e.key === 'ArrowUp' ? -15 : 15;
        const newStart = addMinutes(currentStart, deltaMinutes);
        const newEnd = addMinutes(currentEnd, deltaMinutes);

        // Visible boundary limit 08:00 - 18:00
        const startH = newStart.getHours();
        if (startH < 8 || startH >= 18) {
          setAriaAnnouncement('Cannot move outside standard operating hours (08:00 to 18:00).');
          return;
        }

        const newStartIso = formatISO(newStart).substring(0, 19);
        const newEndIso = formatISO(newEnd).substring(0, 19);

        moveEvent(event.id, event.roomId, newStartIso, newEndIso);
        setAriaAnnouncement(
          `Moved ${course?.code || 'Event'} to ${newStartIso.substring(11, 16)} in ${room?.name || 'room'}.`
        );
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const currentIdx = visibleRooms.findIndex((r) => r.id === event.roomId);
        if (currentIdx === -1) return;

        const nextIdx =
          e.key === 'ArrowLeft'
            ? Math.max(0, currentIdx - 1)
            : Math.min(visibleRooms.length - 1, currentIdx + 1);

        if (nextIdx === currentIdx) {
          setAriaAnnouncement(`Already in the ${e.key === 'ArrowLeft' ? 'first' : 'last'} room column.`);
          return;
        }

        const targetRoom = visibleRooms[nextIdx];
        moveEvent(event.id, targetRoom.id, event.start, event.end);
        setAriaAnnouncement(`Moved ${course?.code || 'Event'} to ${targetRoom.name}.`);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // If not dragging, trigger modal
    if (!isDragging) {
      onSelect?.(event.id);
    }
  };

  // Combine ref for DnD and local DOM ref
  const setCombinedRef = (node: HTMLDivElement | null) => {
    cardRef.current = node;
    setNodeRef(node);
  };

  return (
    <>
      {/* Screen reader live region for keyboard rescheduling announcements */}
      <div aria-live="polite" className="sr-only">
        {ariaAnnouncement}
      </div>

      <div
        ref={setCombinedRef}
        data-event-id={event.id}
        {...attributes}
        {...listeners}
        aria-label={`${course?.code || 'Event'} ${timeRangeStr}${isLocked ? ' (Locked)' : ''}`}
        aria-describedby={isTooltipOpen && !isGhost ? tooltipId : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        style={style}
        className={`group relative rounded-lg p-2 transition-all duration-150 select-none overflow-hidden flex flex-col justify-between text-left focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
          colorStyle.bg
        } ${colorStyle.text} border ${
          isConflict
            ? 'border-rose-500 outline-2 outline-rose-500 ring-2 ring-rose-500/20 dark:ring-rose-500/30'
            : isTentative
            ? 'border-dashed border-amber-400 dark:border-amber-500'
            : colorStyle.border
        } ${
          isDragging
            ? 'opacity-30 scale-95 shadow-none'
            : isGhost
            ? 'shadow-2xl ring-2 ring-indigo-500 ring-offset-2 scale-102 cursor-grabbing z-50'
            : isLocked
            ? 'cursor-default'
            : 'cursor-grab active:cursor-grabbing hover:shadow-md hover:brightness-95 dark:hover:brightness-110 shadow-xs'
        }`}
      >
        {/* Top Line: Course Code + Lock / Conflict / Resolved Badges */}
        <div className="flex items-start justify-between gap-1 w-full">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${colorStyle.dot}`}
              aria-hidden="true"
            />
            <span className="font-bold text-xs tracking-tight truncate">
              {course?.code || event.courseId}
            </span>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {isLocked && (
              <span title="Locked event (cannot reschedule)" className="text-slate-400 dark:text-slate-500">
                <Lock className="h-3 w-3" />
              </span>
            )}
            {isConflict && (
              <span
                data-testid={`conflict-indicator-${event.id}`}
                className="text-rose-600 dark:text-rose-400 animate-pulse motion-reduce:animate-none"
                title="Conflict detected"
              >
                <AlertTriangle className="h-3.5 w-3.5 fill-rose-500/20" />
              </span>
            )}
            {isResolved && (
              <span className="text-emerald-600 dark:text-emerald-400" title="Resolved">
                <CheckCircle className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>

        {/* Middle Line: Title (Tall card only) */}
        {!isCompact && course && (
          <p className="text-[11px] font-medium leading-tight line-clamp-1 opacity-90 my-0.5">
            {course.title}
          </p>
        )}

        {/* Bottom Line: Time, Professor & Scholars Count */}
        <div className="flex items-center justify-between text-[10px] opacity-80 pt-0.5">
          <span className="font-mono font-medium">{timeRangeStr}</span>

          {!isCompact && (
            <div className="flex items-center space-x-2">
              {professor && (
                <span className="truncate max-w-[80px] hidden sm:inline">
                  {professor.name.split(' ').slice(-1)[0]}
                </span>
              )}
              <div className="flex items-center space-x-0.5 font-medium">
                <Users className="h-2.5 w-2.5" />
                <span>{event.scholarCount}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accessible Detail Tooltip */}
      {!isGhost && !isDragging && (
        <AccessibleTooltip
          id={tooltipId}
          triggerRect={triggerRect}
          isOpen={isTooltipOpen}
        >
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-700/80 pb-2">
              <div>
                <span className="font-mono text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  {course?.code} • {event.type}
                </span>
                <h4 className="font-bold text-sm text-white leading-snug">
                  {course?.title || 'Scheduled Academic Session'}
                </h4>
              </div>
              <div className="flex items-center space-x-1.5">
                {isLocked && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1">
                    <Lock className="h-2.5 w-2.5" />
                    <span>Locked</span>
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isConflict
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : isResolved
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {isConflict ? 'Conflict' : isResolved ? 'Resolved' : event.status}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-400 text-[10px] block">Time & Date</span>
                <p className="font-semibold text-white">{timeRangeStr}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Location</span>
                <p className="font-semibold text-white truncate">
                  {room?.name} ({room?.building})
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Faculty</span>
                <p className="font-semibold text-white truncate">
                  {professor?.name || 'TBA'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Scholars / Capacity</span>
                <p
                  className={`font-semibold ${
                    event.scholarCount > roomCapacity
                      ? 'text-rose-400 font-bold'
                      : 'text-white'
                  }`}
                >
                  {event.scholarCount} / {roomCapacity} ({fillPercentage}% fill)
                </p>
              </div>
            </div>

            {/* Required Equipment */}
            {course && course.requiredEquipment.length > 0 && (
              <div className="pt-1.5 border-t border-slate-800 flex items-center space-x-1.5 text-[11px] text-slate-400">
                <Cpu className="h-3 w-3 text-slate-400 shrink-0" />
                <span>Required: {course.requiredEquipment.join(', ')}</span>
              </div>
            )}

            {/* Keyboard shortcut hint */}
            <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400">
              Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200">Alt</kbd> + <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200">Arrows</kbd> to reschedule.
            </div>

            {/* Attached Conflict Alert */}
            {conflictDescription && (
              <div className="pt-2 border-t border-rose-900/60 text-[11px] text-rose-300 flex items-start space-x-1.5 bg-rose-950/40 p-2 rounded-lg border border-rose-500/30">
                <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-rose-200">Rule Violation:</span>
                  <span>{conflictDescription}</span>
                </div>
              </div>
            )}
          </div>
        </AccessibleTooltip>
      )}
    </>
  );
};
