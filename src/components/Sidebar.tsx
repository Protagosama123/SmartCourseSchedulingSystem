/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Users,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  X,
} from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';
import { NavId } from '../types';

interface SidebarNavEntry {
  id: NavId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: 'conflicts';
}

const navEntries: SidebarNavEntry[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'timetable',
    label: 'Timetable & Grid',
    icon: CalendarDays,
  },
  {
    id: 'facilities',
    label: 'Room Allocation',
    icon: Building2,
  },
  {
    id: 'roster',
    label: 'Faculty & Scholars',
    icon: Users,
  },
  {
    id: 'conflicts',
    label: 'AI Conflict Logs',
    icon: ScrollText,
    badgeKey: 'conflicts',
  },
  {
    id: 'settings',
    label: 'System Settings',
    icon: Settings,
  },
];

export const Sidebar: React.FC = () => {
  const {
    activeNav,
    setActiveNav,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    getConflictCount,
    theme,
    setTheme,
  } = useScheduleStore();

  const conflictCount = getConflictCount();

  const handleNavClick = (id: NavId) => {
    setActiveNav(id);
    setMobileSidebarOpen(false);
  };

  const navContent = (
    <div className="h-full flex flex-col justify-between p-3 select-none">
      {/* Top: Nav Header & Link Items */}
      <div className="space-y-4">
        {/* Mobile Header Close */}
        <div className="flex md:hidden items-center justify-between px-2 pt-2 pb-1 border-b border-slate-200 dark:border-slate-800">
          <span className="font-bold text-sm text-slate-900 dark:text-white">Menu</span>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close menu"
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav aria-label="Primary" className="space-y-1">
          {navEntries.map((entry) => {
            const Icon = entry.icon;
            const isActive = activeNav === entry.id;
            const badgeValue = entry.badgeKey === 'conflicts' ? conflictCount : 0;

            return (
              <div key={entry.id} className="relative group">
                <button
                  type="button"
                  onClick={() => handleNavClick(entry.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center rounded-xl transition-all font-medium text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                    sidebarCollapsed ? 'justify-center p-2.5' : 'px-3.5 py-2.5 space-x-3'
                  } ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                  title={sidebarCollapsed ? entry.label : undefined}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                    }`}
                  />

                  {!sidebarCollapsed && (
                    <span className="truncate flex-1 text-left font-semibold">
                      {entry.label}
                    </span>
                  )}

                  {/* Conflict Badge */}
                  {badgeValue > 0 && (
                    <span
                      className={`inline-flex items-center justify-center font-bold rounded-full transition-transform ${
                        sidebarCollapsed
                          ? 'absolute -top-1 -right-1 h-4 w-4 text-[9px] bg-amber-500 text-white shadow-xs'
                          : 'px-1.5 py-0.5 text-[10px] bg-amber-500 text-white'
                      }`}
                    >
                      {badgeValue}
                    </span>
                  )}
                </button>

                {/* Collapsed Tooltip */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center px-2.5 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold shadow-xl z-50 whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95">
                    {entry.label}
                    {badgeValue > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                        {badgeValue}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Sidebar Collapse Toggle & Theme Switcher */}
      <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        {/* Dark/Light/System Mode Toggle */}
        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={() => {
              const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
              setTheme(nextTheme);
            }}
            aria-label={`Current theme: ${theme}. Click to switch theme.`}
            className="w-full flex items-center justify-center rounded-xl p-2.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            {theme === 'dark' ? (
              <Moon className="h-4 w-4 text-indigo-400" />
            ) : theme === 'light' ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Monitor className="h-4 w-4 text-slate-400" />
            )}
          </button>
        ) : (
          <div className="flex flex-col space-y-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1">
              <span>Theme</span>
              <span className="capitalize text-slate-700 dark:text-slate-200 font-bold">{theme}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
                className={`flex items-center justify-center space-x-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Sun className="h-3 w-3" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
                className={`flex items-center justify-center space-x-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Moon className="h-3 w-3" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                aria-pressed={theme === 'system'}
                className={`flex items-center justify-center space-x-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  theme === 'system'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Monitor className="h-3 w-3" />
                <span>Auto</span>
              </button>
            </div>
          </div>
        )}

        {/* Sidebar Collapse Toggle (Desktop & Tablet) */}
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`hidden md:flex w-full items-center rounded-xl p-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer ${
            sidebarCollapsed ? 'justify-center' : 'space-x-2 px-3'
          }`}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop & Off-canvas Drawer */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs md:hidden animate-in fade-in"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div
            className="w-72 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop / Tablet Persistent Sidebar */}
      <aside
        aria-label="Primary"
        className={`hidden md:block border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 backdrop-blur-md transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {navContent}
      </aside>
    </>
  );
};
