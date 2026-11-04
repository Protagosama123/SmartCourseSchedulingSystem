import React from 'react';
import { CalendarRange } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';

export const WeekView: React.FC = () => {
  const { setView } = useScheduleStore();
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center flex flex-col items-center justify-center space-y-3 min-h-[360px]">
      <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
        <CalendarRange className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Week View: Multi-Room Grid</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">Weekly schedule heatmaps and multi-room timelines across Monday to Friday.</p>
      <button type="button" onClick={() => setView('day')} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500">
        Switch to Day view
      </button>
    </div>
  );
};
