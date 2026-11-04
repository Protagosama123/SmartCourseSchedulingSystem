/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, Building2, AlertTriangle, Users } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { useScheduleStore } from '../store/useScheduleStore';

interface MetricsBannerProps {
  loading?: boolean;
}

export const MetricsBanner: React.FC<MetricsBannerProps> = ({ loading = false }) => {
  const {
    getScheduledHoursTodayWithTrend,
    getOccupancyRateForSelectedDate,
    getSystemConflictMetric,
    getDistinctScholarsToday,
  } = useScheduleStore();

  const hoursData = getScheduledHoursTodayWithTrend();
  const occupancyData = getOccupancyRateForSelectedDate();
  const conflictData = getSystemConflictMetric();
  const scholarsData = getDistinctScholarsToday();

  return (
    <section aria-label="Key Scheduling Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Today's Scheduled Hours */}
      <MetricCard
        label="Today's Scheduled Hours"
        value={hoursData.hours}
        unit="hrs"
        trend={hoursData.trend}
        icon={<Clock className="h-4 w-4" />}
        loading={loading}
      />

      {/* 2. Facility Occupancy Rate */}
      <MetricCard
        label="Facility Occupancy Rate"
        value={occupancyData.ratePercentage}
        unit="%"
        badge={
          occupancyData.isHighLoad
            ? { text: 'High Load', variant: 'amber' }
            : undefined
        }
        status={occupancyData.isHighLoad ? 'warn' : 'ok'}
        trend={{
          direction: 'flat',
          text: `${occupancyData.scheduledHours}h of ${occupancyData.totalAvailableHours}h capacity`,
        }}
        icon={<Building2 className="h-4 w-4" />}
        loading={loading}
      />

      {/* 3. System Conflicts */}
      <MetricCard
        label="System Conflicts"
        value={conflictData.count}
        status={conflictData.count === 0 ? 'ok' : 'alert'}
        trend={{
          direction: conflictData.count === 0 ? 'flat' : 'down',
          text: conflictData.text,
        }}
        icon={
          <AlertTriangle
            className={`h-4 w-4 ${
              conflictData.count > 0
                ? 'text-rose-500'
                : 'text-emerald-500'
            }`}
          />
        }
        loading={loading}
      />

      {/* 4. Active Scholars On-Campus */}
      <MetricCard
        label="Active Scholars On-Campus"
        value={scholarsData.distinctCount}
        trend={{
          direction: 'up',
          text: `${scholarsData.totalRegistered} enrolled scholars`,
        }}
        icon={<Users className="h-4 w-4" />}
        loading={loading}
      />
    </section>
  );
};
