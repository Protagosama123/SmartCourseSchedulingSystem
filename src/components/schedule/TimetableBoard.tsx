/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ControlBar } from './ControlBar';
import { DayGrid } from './DayGrid';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { RoomMatrixView } from './RoomMatrixView';
import { useScheduleStore } from '../../store/useScheduleStore';

import { ScheduleEvent } from '../../types';

interface TimetableBoardProps {
  onAddSchedule?: (prefill?: Partial<ScheduleEvent>) => void;
  onSelectEvent?: (eventId: string) => void;
}

export const TimetableBoard: React.FC<TimetableBoardProps> = ({
  onAddSchedule,
  onSelectEvent,
}) => {
  const { view } = useScheduleStore();

  return (
    <div className="space-y-4">
      {/* Interactive Control & Filter Bar */}
      <ControlBar />

      {/* Primary Schedule Canvas */}
      {view === 'day' && (
        <DayGrid
          onAddSchedule={onAddSchedule}
          onSelectEvent={onSelectEvent}
        />
      )}
      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}
      {view === 'matrix' && <RoomMatrixView />}
    </div>
  );
};
