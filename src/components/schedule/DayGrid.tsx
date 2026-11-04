/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { format, parseISO, addMinutes, formatISO } from 'date-fns';
import {
  Monitor,
  Projector,
  Tv,
  FlaskConical,
  Plus,
  CalendarX,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Room, ScheduleEvent, RoomEquipment, Conflict } from '../../types';
import {
  DAY_START,
  DAY_END,
  SLOT_MINUTES,
  timeStringToMinutes,
  eventToGridPosition,
  layoutOverlaps,
} from '../../lib/gridMath';
import { detectConflicts } from '../../lib/conflicts';
import { describeConflict } from '../../lib/describeConflict';
import { EventCard } from './EventCard';
import { useScheduleStore } from '../../store/useScheduleStore';
import { selectFilteredRooms, selectFilteredDayEvents } from '../../store/selectors';

interface DayGridProps {
  onAddSchedule?: (prefill?: Partial<ScheduleEvent>) => void;
  onSelectEvent?: (eventId: string) => void;
}

interface DragValidationState {
  targetId: string;
  isValid: boolean;
  hint: string;
}

interface DroppableSlotSubCellProps {
  id: string;
  room: Room;
  timeHHmm: string;
  unavailable: boolean;
  validation: DragValidationState | null;
  onCellClick?: () => void;
}

const DroppableSlotSubCell: React.FC<DroppableSlotSubCellProps> = ({
  id,
  room,
  timeHHmm,
  unavailable,
  validation,
  onCellClick,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      roomId: room.id,
      time: timeHHmm,
    },
  });

  const isCurrentTarget = isOver || (validation && validation.targetId === id);

  return (
    <div
      ref={setNodeRef}
      data-droppable-id={id}
      onClick={onCellClick}
      className={`relative h-6 transition-all duration-100 cursor-pointer ${
        unavailable
          ? 'bg-[repeating-linear-gradient(45deg,rgba(148,163,184,0.06),rgba(148,163,184,0.06)_8px,transparent_8px,transparent_16px)] dark:bg-[repeating-linear-gradient(45deg,rgba(30,41,59,0.3),rgba(30,41,59,0.3)_8px,transparent_8px,transparent_16px)]'
          : 'hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20'
      } ${
        isCurrentTarget && validation
          ? validation.isValid
            ? 'bg-emerald-500/25 dark:bg-emerald-500/30 ring-2 ring-emerald-500 z-20'
            : 'bg-rose-500/25 dark:bg-rose-500/30 ring-2 ring-rose-500 z-20'
          : ''
      }`}
    >
      {/* Live Drag Validation Hint Badge */}
      {isCurrentTarget && validation && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 -top-6 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-lg pointer-events-none z-30 flex items-center space-x-1 ${
            validation.isValid
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {validation.isValid ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          <span>{validation.hint}</span>
        </div>
      )}
    </div>
  );
};

export const DayGrid: React.FC<DayGridProps> = ({
  onAddSchedule,
  onSelectEvent,
}) => {
  const {
    events,
    rooms,
    faculty,
    courses,
    selectedDate,
    buildingFilter,
    typeFilter,
    getActiveConflicts,
    moveEvent,
    openAddEventModal,
    openEditEventModal,
  } = useScheduleStore();

  const activeConflicts = getActiveConflicts();

  // Filtered rooms and events for selected date
  const visibleRooms = useMemo(
    () => selectFilteredRooms(rooms, buildingFilter),
    [rooms, buildingFilter]
  );

  const dayEvents = useMemo(
    () => selectFilteredDayEvents(events, rooms, selectedDate, buildingFilter, typeFilter),
    [events, rooms, selectedDate, buildingFilter, typeFilter]
  );

  // Time slots generation (08:00 to 18:00 in 30-min steps)
  const timeSlots = useMemo(() => {
    const startMin = timeStringToMinutes(DAY_START);
    const endMin = timeStringToMinutes(DAY_END);
    const slots: string[] = [];

    for (let m = startMin; m < endMin; m += SLOT_MINUTES) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
    return slots;
  }, []);

  // Current time red line tracker
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');

      if (todayStr === selectedDate) {
        const minutes = now.getHours() * 60 + now.getMinutes();
        const startMin = timeStringToMinutes(DAY_START);
        const endMin = timeStringToMinutes(DAY_END);

        if (minutes >= startMin && minutes <= endMin) {
          setCurrentTimeMinutes(minutes);
        } else {
          setCurrentTimeMinutes(null);
        }
      } else {
        setCurrentTimeMinutes(null);
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, [selectedDate]);

  // DnD State
  const [activeDragEventId, setActiveDragEventId] = useState<string | null>(null);
  const [dragValidation, setDragValidation] = useState<DragValidationState | null>(null);

  const activeDragEvent = useMemo(
    () => (activeDragEventId ? events.find((e) => e.id === activeDragEventId) : null),
    [activeDragEventId, events]
  );

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5, // 5px movement required before drag begins
    },
  });
  const sensors = useSensors(pointerSensor);

  // Live validation on hover (pure hypothetical state, no store mutation)
  const computeLiveValidation = useCallback(
    (draggedEvent: ScheduleEvent, targetRoomId: string, targetTimeHHmm: string) => {
      const targetStartIso = `${selectedDate}T${targetTimeHHmm}:00`;
      const originalStart = parseISO(draggedEvent.start);
      const originalEnd = parseISO(draggedEvent.end);
      const durationMinutes = Math.max(15, Math.round((originalEnd.getTime() - originalStart.getTime()) / 60000));
      const targetEndIso = formatISO(addMinutes(parseISO(targetStartIso), durationMinutes)).substring(0, 19);

      // Build hypothetical events list
      const hypotheticalEvents: ScheduleEvent[] = events.map((e) =>
        e.id === draggedEvent.id
          ? {
              ...e,
              roomId: targetRoomId,
              start: targetStartIso,
              end: targetEndIso,
            }
          : e
      );

      const detectedConflicts = detectConflicts(
        hypotheticalEvents,
        rooms,
        faculty,
        courses
      );

      const related = detectedConflicts.filter(
        (c) => c.eventId === draggedEvent.id || c.relatedEventId === draggedEvent.id
      );

      if (related.length > 0) {
        const desc = describeConflict(related[0], {
          rooms,
          faculty,
          courses,
          events: hypotheticalEvents,
        });
        return {
          isValid: false,
          hint: desc || 'Conflict detected',
        };
      }

      return {
        isValid: true,
        hint: 'Valid drop location',
      };
    },
    [events, rooms, faculty, courses, selectedDate]
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragEventId(e.active.id as string);
    setDragValidation(null);
  };

  const handleDragOver = (e: DragOverEvent) => {
    if (!activeDragEvent || !e.over) {
      setDragValidation(null);
      return;
    }

    const overId = String(e.over.id);
    const [targetRoomId, targetTimeHHmm] = overId.split('::');

    if (!targetRoomId || !targetTimeHHmm) {
      setDragValidation(null);
      return;
    }

    const validation = computeLiveValidation(activeDragEvent, targetRoomId, targetTimeHHmm);
    setDragValidation({
      targetId: overId,
      isValid: validation.isValid,
      hint: validation.hint,
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveDragEventId(null);
    setDragValidation(null);

    if (!over) return;

    const overId = String(over.id);
    const [targetRoomId, targetTimeHHmm] = overId.split('::');
    if (!targetRoomId || !targetTimeHHmm) return;

    const draggedEvent = events.find((ev) => ev.id === active.id);
    if (!draggedEvent || draggedEvent.locked) return;

    const targetStartIso = `${selectedDate}T${targetTimeHHmm}:00`;
    const originalStart = parseISO(draggedEvent.start);
    const originalEnd = parseISO(draggedEvent.end);
    const durationMinutes = Math.max(15, Math.round((originalEnd.getTime() - originalStart.getTime()) / 60000));
    const targetEndIso = formatISO(addMinutes(parseISO(targetStartIso), durationMinutes)).substring(0, 19);

    moveEvent(draggedEvent.id, targetRoomId, targetStartIso, targetEndIso);
  };

  // Equipment icon helper
  const renderEquipmentIcon = (eq: RoomEquipment) => {
    switch (eq) {
      case 'computers':
        return (
          <span key={eq} title="Computer Workstations">
            <Monitor className="h-3 w-3 text-slate-400" />
          </span>
        );
      case 'projector':
        return (
          <span key={eq} title="Digital Projector">
            <Projector className="h-3 w-3 text-slate-400" />
          </span>
        );
      case 'av':
        return (
          <span key={eq} title="Audio/Visual System">
            <Tv className="h-3 w-3 text-slate-400" />
          </span>
        );
      case 'lab':
        return (
          <span key={eq} title="Laboratory Equipment">
            <FlaskConical className="h-3 w-3 text-slate-400" />
          </span>
        );
    }
  };

  // Helper to check if a 30-min slot is outside a room's availability window
  const isSlotUnavailable = (room: Room, slotHHmm: string) => {
    const dayOfWeek = parseISO(`${selectedDate}T00:00:00`).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const matchingSlots = room.availability.filter((s) => s.day === dayOfWeek);

    if (matchingSlots.length === 0) return true;

    return !matchingSlots.some(
      (window) => window.start <= slotHHmm && slotHHmm < window.end
    );
  };

  // Conflict lookup for an event
  const getConflictForEvent = (eventId: string): Conflict | undefined => {
    return activeConflicts.find(
      (c) => c.eventId === eventId || c.relatedEventId === eventId
    );
  };

  const handleCardSelect = (eventId: string) => {
    if (onSelectEvent) {
      onSelectEvent(eventId);
    } else {
      openEditEventModal(eventId);
    }
  };

  const handleEmptySlotClick = (roomId: string, timeHHmm: string) => {
    const startIso = `${selectedDate}T${timeHHmm}:00`;
    const endIso = `${selectedDate}T${timeHHmm.slice(0, 2)}:50:00`;
    if (onAddSchedule) {
      onAddSchedule({ roomId, start: startIso, end: endIso });
    } else {
      openAddEventModal({ roomId, start: startIso, end: endIso });
    }
  };

  if (visibleRooms.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No rooms match the selected building filter.
        </p>
      </div>
    );
  }

  const slotHeightPx = 48; // 30-min slot is 48px high (each 15-min sub-slot is 24px)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{ ['--slot-height' as string]: `${slotHeightPx}px` }}
        className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col"
      >
        {/* Scrollable Grid Container */}
        <div
          tabIndex={0}
          aria-label="Daily Timetable Schedule Grid"
          className="overflow-auto max-h-[calc(100vh-280px)] min-h-[480px] focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <div
            className="grid min-w-[768px]"
            style={{
              gridTemplateColumns: `64px repeat(${visibleRooms.length}, minmax(140px, 1fr))`,
            }}
          >
            {/* Top-Left Blank Sticky Corner */}
            <div className="sticky top-0 left-0 z-30 h-14 bg-slate-100 dark:bg-slate-850 border-b border-r border-slate-200 dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Time
            </div>

            {/* Sticky Room Column Headers */}
            {visibleRooms.map((room) => (
              <div
                key={room.id}
                className="sticky top-0 z-20 h-14 bg-slate-100 dark:bg-slate-850 border-b border-r border-slate-200 dark:border-slate-800 px-3 py-1.5 flex flex-col justify-center text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {room.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 ml-1">
                    Cap: {room.capacity}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                  <span className="truncate">{room.building}</span>
                  <div className="flex items-center space-x-1 shrink-0 ml-1">
                    {room.equipment.map(renderEquipmentIcon)}
                  </div>
                </div>
              </div>
            ))}

            {/* Time Slot Labels Column (Sticky Left) */}
            <div
              className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800"
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(${timeSlots.length}, var(--slot-height))`,
              }}
            >
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  className="border-b border-slate-100 dark:border-slate-800/80 pr-2 pt-1 text-right text-[10px] font-mono text-slate-400 select-none"
                >
                  {slot}
                </div>
              ))}
            </div>

            {/* Room Columns Grid Canvas */}
            {visibleRooms.map((room) => {
              const roomEvents = dayEvents.filter((e) => e.roomId === room.id);
              const positionedEvents = layoutOverlaps(roomEvents);

              return (
                <div
                  key={room.id}
                  className="relative border-r border-slate-200 dark:border-slate-800"
                  style={{
                    display: 'grid',
                    gridTemplateRows: `repeat(${timeSlots.length}, var(--slot-height))`,
                  }}
                >
                  {/* 30-min Background Slot Cells (each divided into two 15-min drop targets) */}
                  {timeSlots.map((slot, idx) => {
                    const unavailable = isSlotUnavailable(room, slot);
                    const [hStr, mStr] = slot.split(':');
                    const h = Number(hStr);
                    const m = Number(mStr);
                    const timeTop = `${hStr}:${mStr}`;
                    const timeBottom = `${hStr}:${(m + 15).toString().padStart(2, '0')}`;
                    const idTop = `${room.id}::${timeTop}`;
                    const idBottom = `${room.id}::${timeBottom}`;

                    return (
                      <div
                        key={slot}
                        style={{ gridRow: `${idx + 1} / ${idx + 2}` }}
                        className="border-b border-slate-100 dark:border-slate-800/80 flex flex-col h-full"
                      >
                        {/* 15-min Top Sub-cell */}
                        <DroppableSlotSubCell
                          id={idTop}
                          room={room}
                          timeHHmm={timeTop}
                          unavailable={unavailable}
                          validation={dragValidation}
                          onCellClick={() => handleEmptySlotClick(room.id, timeTop)}
                        />

                        {/* 15-min Bottom Sub-cell */}
                        <DroppableSlotSubCell
                          id={idBottom}
                          room={room}
                          timeHHmm={timeBottom}
                          unavailable={unavailable}
                          validation={dragValidation}
                          onCellClick={() => handleEmptySlotClick(room.id, timeBottom)}
                        />
                      </div>
                    );
                  })}

                  {/* Event Cards in this Room */}
                  {positionedEvents.map((layout) => {
                    const evt = layout.event;
                    const pos = eventToGridPosition(evt);
                    const conflict = getConflictForEvent(evt.id);

                    return (
                      <div
                        key={evt.id}
                        style={{
                          gridRow: `${pos.startRow} / ${pos.endRow}`,
                          position: 'relative',
                          left: `${layout.leftPct}%`,
                          width: `${layout.widthPct}%`,
                          padding: '2px',
                          zIndex: 10 + layout.column,
                        }}
                        className="h-full"
                      >
                        {/* Continues Before Indicator */}
                        {pos.continuesBefore && (
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 text-[9px] bg-slate-800 text-white px-1 rounded-full shadow-xs flex items-center">
                            <ChevronUp className="h-2 w-2" />
                            <span>starts &lt; 08:00</span>
                          </div>
                        )}

                        <EventCard
                          event={evt}
                          conflict={conflict}
                          isCompact={pos.isCompact}
                          onSelect={handleCardSelect}
                        />

                        {/* Continues After Indicator */}
                        {pos.continuesAfter && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 text-[9px] bg-slate-800 text-white px-1 rounded-full shadow-xs flex items-center">
                            <ChevronDown className="h-2 w-2" />
                            <span>ends &gt; 18:00</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Red Current Time Line Indicator */}
        {currentTimeMinutes !== null && (
          <div
            data-testid="current-time-indicator"
            style={{
              top: `${
                56 +
                ((currentTimeMinutes - timeStringToMinutes(DAY_START)) / SLOT_MINUTES) *
                  slotHeightPx
              }px`,
            }}
            className="absolute left-16 right-0 z-30 pointer-events-none flex items-center"
          >
            <div className="h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 -ml-1" />
            <div className="h-[2px] w-full bg-rose-500 shadow-xs" />
          </div>
        )}

        {/* Empty State Banner if no events scheduled today across visible rooms */}
        {dayEvents.length === 0 && (
          <div className="p-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center flex flex-col items-center justify-center space-y-3">
            <CalendarX className="h-8 w-8 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No academic sessions scheduled for {selectedDate}.
            </p>
            <button
              type="button"
              onClick={() => {
                if (onAddSchedule) {
                  onAddSchedule();
                } else {
                  openAddEventModal();
                }
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center space-x-1.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Schedule</span>
            </button>
          </div>
        )}
      </div>

      {/* Drag Overlay Ghost Card */}
      <DragOverlay>
        {activeDragEvent ? (
          <div className="w-48 opacity-90 rotate-1 shadow-2xl">
            <EventCard
              event={activeDragEvent}
              conflict={getConflictForEvent(activeDragEvent.id)}
              isGhost
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
