/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  Bell,
  Search,
  Plus,
  Sparkles,
  User,
  Settings,
  LogOut,
  Check,
  CheckCheck,
  Menu,
  ChevronDown,
  AlertCircle,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';

interface HeaderProps {
  onOpenSearch?: () => void;
  onAddSchedule?: () => void;
  onAutoResolve?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onAddSchedule,
  onAutoResolve,
}) => {
  const {
    getConflictCount,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationCount,
    setMobileSidebarOpen,
    autoResolveAllConflicts,
  } = useScheduleStore();

  const conflictCount = getConflictCount();
  const unreadCount = getUnreadNotificationCount();

  // Dropdown states
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Refs for outside click & keyboard management
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Platform detection for ⌘K vs Ctrl K
  const [shortcutKey, setShortcutKey] = useState('⌘K');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || '');
      setShortcutKey(isMac ? '⌘K' : 'Ctrl K');
    }
  }, []);

  // Global outside-click and Esc handler
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (quickActionsRef.current && !quickActionsRef.current.contains(target)) {
        setQuickActionsOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickActionsOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch?.();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenSearch]);

  const handleAutoResolveClick = () => {
    if (onAutoResolve) {
      onAutoResolve();
    } else {
      autoResolveAllConflicts();
    }
    setQuickActionsOpen(false);
  };

  const handleAddScheduleClick = () => {
    onAddSchedule?.();
    setQuickActionsOpen(false);
  };

  // Keyboard navigation inside menu list
  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const menu = e.currentTarget;
      const buttons = Array.from(menu.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
      const activeElement = document.activeElement as HTMLButtonElement;
      const currentIndex = buttons.indexOf(activeElement);

      if (e.key === 'ArrowDown') {
        const nextIndex = (currentIndex + 1) % buttons.length;
        buttons[nextIndex]?.focus();
      } else {
        const prevIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        buttons[prevIndex]?.focus();
      }
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Hamburger (mobile) + Wordmark + SystemStatusBadge */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          aria-label="Open navigation sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Wordmark & Logo Mark */}
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white shrink-0">
            {/* Academic Cap / Calendar glyph */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Smart<span className="text-indigo-600 dark:text-indigo-400">Scholar</span>
            </span>
          </div>
        </div>

        {/* SystemStatusBadge */}
        <div className="hidden lg:flex items-center">
          {conflictCount === 0 ? (
            <div
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
              role="status"
              aria-label="System status: All Systems Operational"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>All Systems Operational</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
              role="status"
              aria-label={`System status: ${conflictCount} Conflicts Need Attention`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>{conflictCount} Conflict{conflictCount > 1 ? 's' : ''} Need Attention</span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Search input trigger button */}
      <div className="flex-1 max-w-xs sm:max-w-md mx-3">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 dark:text-slate-400 bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl transition-all shadow-inner focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer"
          aria-label="Search timetable, courses, rooms, or faculty (Cmd+K)"
        >
          <div className="flex items-center space-x-2 truncate">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Search schedule, rooms, faculty...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
            {shortcutKey}
          </kbd>
        </button>
      </div>

      {/* Right Actions: Quick Actions + Notification Bell + User Menu */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* QuickActions Dropdown */}
        <div className="relative" ref={quickActionsRef}>
          <button
            type="button"
            onClick={() => {
              setQuickActionsOpen(!quickActionsOpen);
              setNotificationsOpen(false);
              setUserMenuOpen(false);
            }}
            aria-expanded={quickActionsOpen}
            aria-haspopup="menu"
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer"
          >
            <span>Actions</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${quickActionsOpen ? 'rotate-180' : ''}`} />
          </button>

          {quickActionsOpen && (
            <div
              role="menu"
              aria-label="Quick Actions"
              onKeyDown={handleMenuKeyDown}
              className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleAddScheduleClick}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors focus-visible:bg-slate-100 dark:focus-visible:bg-slate-700/70 focus-visible:outline-none cursor-pointer text-left"
              >
                <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>+ Add Schedule</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleAutoResolveClick}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors focus-visible:bg-slate-100 dark:focus-visible:bg-slate-700/70 focus-visible:outline-none cursor-pointer text-left"
              >
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <span>Auto-Resolve Conflicts</span>
              </button>
            </div>
          )}
        </div>

        {/* NotificationBell with Unread Badge & Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setQuickActionsOpen(false);
              setUserMenuOpen(false);
            }}
            aria-expanded={notificationsOpen}
            aria-haspopup="true"
            aria-label={`Notifications, ${unreadCount} unread`}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95"
            >
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsAsRead()}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
                  >
                    <CheckCheck className="h-3 w-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 text-xs transition-colors flex items-start space-x-3 ${
                      notif.read
                        ? 'bg-transparent text-slate-500 dark:text-slate-400'
                        : 'bg-indigo-50/40 dark:bg-indigo-950/20 text-slate-800 dark:text-slate-200 font-medium'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {notif.type === 'conflict' ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      ) : notif.type === 'warning' ? (
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                      ) : (
                        <Info className="h-4 w-4 text-indigo-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {notif.createdAt.substring(11, 16)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                    {!notif.read && (
                      <button
                        type="button"
                        onClick={() => markNotificationAsRead(notif.id)}
                        title="Mark as read"
                        aria-label="Mark as read"
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* UserMenu Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setQuickActionsOpen(false);
              setNotificationsOpen(false);
            }}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            aria-label="User profile menu: Dean Richardson"
            className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              DR
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Dean Richardson
              </p>
              <p className="text-[10px] text-slate-400">Academic Registrar</p>
            </div>
            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              aria-label="User settings"
              onKeyDown={handleMenuKeyDown}
              className="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95"
            >
              <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-700 text-xs">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Dean Richardson
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  registrar@scholars.edu
                </p>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors focus-visible:bg-slate-100 dark:focus-visible:bg-slate-700/70 focus-visible:outline-none cursor-pointer text-left"
              >
                <User className="h-4 w-4 text-slate-400" />
                <span>Profile</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors focus-visible:bg-slate-100 dark:focus-visible:bg-slate-700/70 focus-visible:outline-none cursor-pointer text-left"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                <span>Preferences</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-700/80 my-1" />

              <button
                type="button"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors focus-visible:bg-rose-50 dark:focus-visible:bg-rose-950/30 focus-visible:outline-none cursor-pointer text-left"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
