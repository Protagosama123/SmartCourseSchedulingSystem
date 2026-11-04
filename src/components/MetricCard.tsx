/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    text: string;
  };
  status?: 'ok' | 'warn' | 'alert';
  badge?: {
    text: string;
    variant: 'amber' | 'emerald' | 'rose' | 'indigo';
  };
  icon: React.ReactNode;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  trend,
  status,
  badge,
  icon,
  loading = false,
}) => {
  if (loading) {
    return (
      <div
        data-testid="metric-card-skeleton"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs dark:shadow-none animate-pulse space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
        <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>
    );
  }

  const statusDotColor =
    status === 'ok'
      ? 'bg-emerald-500'
      : status === 'warn'
      ? 'bg-amber-500'
      : status === 'alert'
      ? 'bg-rose-500'
      : null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs dark:shadow-none flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {value}
            </span>
            {unit && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {unit}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {badge && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                badge.variant === 'amber'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60'
                  : badge.variant === 'emerald'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60'
                  : badge.variant === 'rose'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/60'
              }`}
            >
              {badge.text}
            </span>
          )}
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
            {icon}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        {trend ? (
          <div className="flex items-center space-x-1 font-medium">
            {trend.direction === 'up' ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : trend.direction === 'down' ? (
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span
              className={
                trend.direction === 'up'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : trend.direction === 'down'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-500 dark:text-slate-400'
              }
            >
              {trend.text}
            </span>
          </div>
        ) : statusDotColor ? (
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
            <span className={`h-2 w-2 rounded-full ${statusDotColor}`} />
            <span>{status === 'ok' ? 'All clean' : 'Action recommended'}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">Updated live</span>
        )}
      </div>
    </div>
  );
};
