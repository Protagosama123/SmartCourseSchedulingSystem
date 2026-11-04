/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { addDays, format, parseISO } from 'date-fns';
import {
  mockCourses,
  mockDeadlines,
  mockEvents,
  mockFaculty,
  mockNotifications,
  mockRooms,
  mockScholars,
} from '../data';
import {
  applyResolution,
  autoResolveAll,
  AutoResolveStep,
  detectConflicts,
  resolveConflict,
} from '../lib/conflicts';
import {
  selectActiveConflicts,
  selectBuildingMetrics,
  selectBuildingOccupancyHierarchy,
  selectConflictCount,
  selectDistinctScholarsToday,
  selectRoomOccupancyRate,
  selectScheduledHoursForDate,
  selectScheduledHoursTodayWithTrend,
  selectScholarMetrics,
  selectSystemConflictMetric,
  selectUnreadNotificationCount,
} from './selectors';
import {
  Conflict,
  Course,
  Deadline,
  EventType,
  Faculty,
  NavId,
  Resolution,
  ResolutionLog,
  Room,
  ScheduleEvent,
  ScheduleSnapshot,
  ScheduleState,
  Scholar,
  SystemNotification,
  ThemeMode,
  TimetableViewMode,
  Toast,
} from '../types';

export interface ScheduleStoreState extends ScheduleState {
  selectedDate: string; // YYYY-MM-DD
  activeBuildingFilter: string | null;
  isResolving: boolean;
  mobileSidebarOpen: boolean;

  // History / Undo-Redo
  history: ScheduleSnapshot[];
  future: ScheduleSnapshot[];
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Dark Mode Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;

  // Modals & Interactive State
  isEventModalOpen: boolean;
  editingEventId: string | null;
  prefillEventData: Partial<ScheduleEvent> | null;
  openAddEventModal: (prefill?: Partial<ScheduleEvent>) => void;
  openEditEventModal: (eventId: string) => void;
  closeEventModal: () => void;

  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  isAutoSchedulerModalOpen: boolean;
  setAutoSchedulerModalOpen: (open: boolean) => void;
  autoSchedulerLogs: AutoResolveStep[];
  autoSchedulerSummary: { resolvedCount: number; unresolvedCount: number } | null;
  isAutoSchedulerRunning: boolean;
  runInteractiveAutoScheduler: () => Promise<{ resolvedCount: number; unresolvedCount: number }>;

  // Actions
  refreshConflicts: () => void;
  resolveConflictById: (conflictId: string) => Resolution | null;
  autoResolveAllConflicts: () => { resolvedCount: number; unresolvedCount: number };
  moveEvent: (
    eventId: string,
    targetRoomId: string,
    targetStartIso: string,
    targetEndIso: string
  ) => boolean;
  updateEvent: (updated: ScheduleEvent) => void;
  addEvent: (event: ScheduleEvent) => void;
  deleteEvent: (eventId: string) => void;
  setSelectedDate: (date: string) => void;
  setBuildingFilter: (building: string | null) => void;
  resetToMockData: () => void;

  // Navigation & Sidebar
  setActiveNav: (nav: NavId) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setMobileSidebarOpen: (open: boolean) => void;

  // Notifications
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  // Timetable Grid View & Filters
  setView: (view: TimetableViewMode) => void;
  setTypeFilter: (types: EventType[]) => void;
  toggleTypeFilter: (type: EventType) => void;
  stepSelectedDate: (direction: -1 | 1) => void;
  goToToday: () => void;

  // Derived Getters
  getActiveConflicts: () => Conflict[];
  getConflictCount: () => number;
  getScheduledHoursForSelectedDate: () => number;
  getScheduledHoursTodayWithTrend: () => ReturnType<typeof selectScheduledHoursTodayWithTrend>;
  getOccupancyRateForSelectedDate: () => ReturnType<typeof selectRoomOccupancyRate>;
  getSystemConflictMetric: () => ReturnType<typeof selectSystemConflictMetric>;
  getDistinctScholarsToday: () => ReturnType<typeof selectDistinctScholarsToday>;
  getBuildingOccupancyHierarchy: () => ReturnType<typeof selectBuildingOccupancyHierarchy>;
  getScholarMetrics: () => ReturnType<typeof selectScholarMetrics>;
  getBuildingMetrics: () => ReturnType<typeof selectBuildingMetrics>;
  getUnreadNotificationCount: () => number;
}

const initialConflicts = detectConflicts(
  mockEvents,
  mockRooms,
  mockFaculty,
  mockCourses
);

const getInitialSidebarCollapsed = (): boolean => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem('smartscholar_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  }
  return false;
};

export const applyThemeToDOM = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('smartscholar_theme') as ThemeMode;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        applyThemeToDOM(stored);
        return stored;
      }
    } catch {
      // ignore
    }
  }
  applyThemeToDOM('system');
  return 'system';
};

export const useScheduleStore = create<ScheduleStoreState>((set, get) => ({
  events: mockEvents,
  rooms: mockRooms,
  faculty: mockFaculty,
  courses: mockCourses,
  scholars: mockScholars,
  conflicts: initialConflicts,
  resolutionLogs: [],
  notifications: mockNotifications,
  deadlines: mockDeadlines,
  activeNav: 'dashboard',
  sidebarCollapsed: getInitialSidebarCollapsed(),
  mobileSidebarOpen: false,
  selectedDate: '2026-11-09',
  activeBuildingFilter: null,
  buildingFilter: null,
  view: 'day',
  typeFilter: ['lecture', 'lab', 'seminar', 'exam', 'maintenance'],
  isResolving: false,

  // History stacks
  history: [],
  future: [],

  // Theme
  theme: getInitialTheme(),
  setTheme: (theme: ThemeMode) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('smartscholar_theme', theme);
      } catch {
        // ignore
      }
    }
    applyThemeToDOM(theme);
    set({ theme });
  },

  // Toasts
  toasts: [],
  addToast: (toastData) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: Toast = {
      ...toastData,
      id,
      durationMs: toastData.durationMs ?? 5000,
    };
    set((state) => ({
      toasts: [newToast, ...state.toasts].slice(0, 3),
    }));
    return id;
  },
  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // Modals
  isEventModalOpen: false,
  editingEventId: null,
  prefillEventData: null,
  openAddEventModal: (prefill) => {
    set({
      isEventModalOpen: true,
      editingEventId: null,
      prefillEventData: prefill || null,
    });
  },
  openEditEventModal: (eventId) => {
    set({
      isEventModalOpen: true,
      editingEventId: eventId,
      prefillEventData: null,
    });
  },
  closeEventModal: () => {
    set({
      isEventModalOpen: false,
      editingEventId: null,
      prefillEventData: null,
    });
  },

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  isAutoSchedulerModalOpen: false,
  setAutoSchedulerModalOpen: (open) => set({ isAutoSchedulerModalOpen: open }),
  autoSchedulerLogs: [],
  autoSchedulerSummary: null,
  isAutoSchedulerRunning: false,

  // Undo / Redo
  canUndo: () => get().history.length > 0,
  canRedo: () => get().future.length > 0,

  undo: () => {
    const { history, future, events, conflicts, resolutionLogs, rooms, faculty, courses } = get();
    if (history.length === 0) return false;

    const previous = history[0];
    const newHistory = history.slice(1);

    const currentSnapshot: ScheduleSnapshot = {
      events: [...events],
      conflicts: [...conflicts],
      resolutionLogs: [...resolutionLogs],
    };
    const newFuture = [currentSnapshot, ...future].slice(0, 20);

    const recomputedConflicts = detectConflicts(previous.events, rooms, faculty, courses);

    set({
      events: previous.events,
      conflicts: recomputedConflicts,
      resolutionLogs: previous.resolutionLogs,
      history: newHistory,
      future: newFuture,
    });

    get().addToast({
      message: 'Action undone.',
      type: 'info',
    });

    return true;
  },

  redo: () => {
    const { history, future, events, conflicts, resolutionLogs, rooms, faculty, courses } = get();
    if (future.length === 0) return false;

    const next = future[0];
    const newFuture = future.slice(1);

    const currentSnapshot: ScheduleSnapshot = {
      events: [...events],
      conflicts: [...conflicts],
      resolutionLogs: [...resolutionLogs],
    };
    const newHistory = [currentSnapshot, ...history].slice(0, 20);

    const recomputedConflicts = detectConflicts(next.events, rooms, faculty, courses);

    set({
      events: next.events,
      conflicts: recomputedConflicts,
      resolutionLogs: next.resolutionLogs,
      history: newHistory,
      future: newFuture,
    });

    get().addToast({
      message: 'Action redone.',
      type: 'info',
    });

    return true;
  },

  refreshConflicts: () => {
    const { events, rooms, faculty, courses } = get();
    const updated = detectConflicts(events, rooms, faculty, courses);
    set({ conflicts: updated });
  },

  moveEvent: (eventId, targetRoomId, targetStartIso, targetEndIso) => {
    const { events, rooms, faculty, courses, history } = get();
    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent || targetEvent.locked) return false;

    // Snapshot for undo
    const snapshot: ScheduleSnapshot = {
      events: [...events],
      conflicts: [...get().conflicts],
      resolutionLogs: [...get().resolutionLogs],
    };

    const updatedEvent: ScheduleEvent = {
      ...targetEvent,
      roomId: targetRoomId,
      start: targetStartIso,
      end: targetEndIso,
    };

    const nextEvents = events.map((e) => (e.id === eventId ? updatedEvent : e));
    const newConflicts = detectConflicts(nextEvents, rooms, faculty, courses);

    const eventConflicts = newConflicts.filter(
      (c) => c.eventId === eventId || c.relatedEventId === eventId
    );
    const hasConflict = eventConflicts.length > 0;
    updatedEvent.status = hasConflict ? 'conflict' : 'confirmed';

    const nextHistory = [snapshot, ...history].slice(0, 20);

    set({
      events: nextEvents.map((e) => (e.id === eventId ? updatedEvent : e)),
      conflicts: newConflicts,
      history: nextHistory,
      future: [],
    });

    if (hasConflict) {
      get().addToast({
        message: `Moved with ${eventConflicts.length} conflict${
          eventConflicts.length > 1 ? 's' : ''
        }.`,
        type: 'warning',
        action: {
          label: 'Undo',
          onClick: () => get().undo(),
        },
      });
    } else {
      get().addToast({
        message: 'Event moved.',
        type: 'success',
        action: {
          label: 'Undo',
          onClick: () => get().undo(),
        },
      });
    }

    return true;
  },

  resolveConflictById: (conflictId: string) => {
    const { events, rooms, faculty, courses, resolutionLogs, conflicts, history } = get();
    const targetConflict = conflicts.find((c) => c.id === conflictId);
    if (!targetConflict) return null;

    const resolution = resolveConflict(targetConflict, {
      events,
      rooms,
      faculty,
      courses,
    });

    if (!resolution) {
      get().addToast({
        message: 'No automatic resolution available for this conflict.',
        type: 'warning',
      });
      return null;
    }

    // Save snapshot
    const snapshot: ScheduleSnapshot = {
      events: [...events],
      conflicts: [...conflicts],
      resolutionLogs: [...resolutionLogs],
    };

    const currentState: ScheduleState = {
      events,
      rooms,
      faculty,
      courses,
      scholars: get().scholars,
      conflicts,
      resolutionLogs,
      notifications: get().notifications,
      deadlines: get().deadlines,
      activeNav: get().activeNav,
      sidebarCollapsed: get().sidebarCollapsed,
      view: get().view,
      typeFilter: get().typeFilter,
      buildingFilter: get().buildingFilter,
    };

    const nextState = applyResolution(currentState, targetConflict, resolution);
    const recomputedConflicts = detectConflicts(
      nextState.events,
      nextState.rooms,
      nextState.faculty,
      nextState.courses
    );

    set({
      events: nextState.events,
      conflicts: recomputedConflicts,
      resolutionLogs: nextState.resolutionLogs,
      history: [snapshot, ...history].slice(0, 20),
      future: [],
    });

    get().addToast({
      message: `Conflict resolved: ${resolution.detail}`,
      type: 'success',
      action: {
        label: 'Undo',
        onClick: () => get().undo(),
      },
    });

    return resolution;
  },

  autoResolveAllConflicts: () => {
    const {
      events,
      rooms,
      faculty,
      courses,
      scholars,
      resolutionLogs,
      notifications,
      deadlines,
      activeNav,
      sidebarCollapsed,
      view,
      typeFilter,
      buildingFilter,
      history,
    } = get();

    const activeInitial = detectConflicts(events, rooms, faculty, courses);
    if (activeInitial.length === 0) {
      get().addToast({
        message: 'All systems operational — nothing to resolve.',
        type: 'info',
      });
      return { resolvedCount: 0, unresolvedCount: 0 };
    }

    // Snapshot before entire run (one undo step)
    const snapshot: ScheduleSnapshot = {
      events: [...events],
      conflicts: [...get().conflicts],
      resolutionLogs: [...resolutionLogs],
    };

    const currentState: ScheduleState = {
      events,
      rooms,
      faculty,
      courses,
      scholars,
      conflicts: activeInitial,
      resolutionLogs,
      notifications,
      deadlines,
      activeNav,
      sidebarCollapsed,
      view,
      typeFilter,
      buildingFilter,
    };

    const { nextState, resolvedCount, unresolvedCount, steps } = autoResolveAll(currentState);

    set({
      events: nextState.events,
      conflicts: detectConflicts(
        nextState.events,
        nextState.rooms,
        nextState.faculty,
        nextState.courses
      ),
      resolutionLogs: nextState.resolutionLogs,
      autoSchedulerLogs: steps,
      autoSchedulerSummary: { resolvedCount, unresolvedCount },
      history: [snapshot, ...history].slice(0, 20),
      future: [],
    });

    get().addToast({
      message: `${resolvedCount} conflict${resolvedCount !== 1 ? 's' : ''} auto-resolved.`,
      type: resolvedCount > 0 ? 'success' : 'warning',
      action: {
        label: 'Undo',
        onClick: () => get().undo(),
      },
    });

    return { resolvedCount, unresolvedCount };
  },

  runInteractiveAutoScheduler: async () => {
    const {
      events,
      rooms,
      faculty,
      courses,
      scholars,
      resolutionLogs,
      notifications,
      deadlines,
      activeNav,
      sidebarCollapsed,
      view,
      typeFilter,
      buildingFilter,
      history,
    } = get();

    const activeInitial = detectConflicts(events, rooms, faculty, courses);
    if (activeInitial.length === 0) {
      get().addToast({
        message: 'All systems operational — nothing to resolve.',
        type: 'info',
      });
      return { resolvedCount: 0, unresolvedCount: 0 };
    }

    set({
      isAutoSchedulerRunning: true,
      isAutoSchedulerModalOpen: true,
      autoSchedulerLogs: [],
      autoSchedulerSummary: null,
    });

    // Save ONE undo step for the entire run
    const snapshot: ScheduleSnapshot = {
      events: [...events],
      conflicts: [...get().conflicts],
      resolutionLogs: [...resolutionLogs],
    };

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const stepDelayMs = prefersReducedMotion ? 0 : 250;

    let currentState: ScheduleState = {
      events,
      rooms,
      faculty,
      courses,
      scholars,
      conflicts: activeInitial,
      resolutionLogs,
      notifications,
      deadlines,
      activeNav,
      sidebarCollapsed,
      view,
      typeFilter,
      buildingFilter,
    };

    const { nextState, resolvedCount, unresolvedCount, steps } = autoResolveAll(currentState);

    // Stream the steps with short delay for visual clarity
    for (let i = 0; i < steps.length; i++) {
      if (stepDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, stepDelayMs));
      }
      set((state) => ({
        autoSchedulerLogs: [...state.autoSchedulerLogs, steps[i]],
      }));
    }

    set({
      events: nextState.events,
      conflicts: detectConflicts(
        nextState.events,
        nextState.rooms,
        nextState.faculty,
        nextState.courses
      ),
      resolutionLogs: nextState.resolutionLogs,
      autoSchedulerSummary: { resolvedCount, unresolvedCount },
      isAutoSchedulerRunning: false,
      history: [snapshot, ...history].slice(0, 20),
      future: [],
    });

    get().addToast({
      message: `AI Scheduler: ${resolvedCount} resolved, ${unresolvedCount} need review.`,
      type: resolvedCount > 0 ? 'success' : 'warning',
      action: {
        label: 'Undo',
        onClick: () => get().undo(),
      },
    });

    return { resolvedCount, unresolvedCount };
  },

  updateEvent: (updated: ScheduleEvent) => {
    set((state) => {
      const snapshot: ScheduleSnapshot = {
        events: [...state.events],
        conflicts: [...state.conflicts],
        resolutionLogs: [...state.resolutionLogs],
      };
      const newEvents = state.events.map((e) => (e.id === updated.id ? updated : e));
      const newConflicts = detectConflicts(newEvents, state.rooms, state.faculty, state.courses);
      return {
        events: newEvents,
        conflicts: newConflicts,
        history: [snapshot, ...state.history].slice(0, 20),
        future: [],
      };
    });
    get().addToast({
      message: 'Event updated.',
      type: 'success',
      action: {
        label: 'Undo',
        onClick: () => get().undo(),
      },
    });
  },

  addEvent: (event: ScheduleEvent) => {
    set((state) => {
      const snapshot: ScheduleSnapshot = {
        events: [...state.events],
        conflicts: [...state.conflicts],
        resolutionLogs: [...state.resolutionLogs],
      };
      const newEvents = [...state.events, event];
      const newConflicts = detectConflicts(newEvents, state.rooms, state.faculty, state.courses);
      return {
        events: newEvents,
        conflicts: newConflicts,
        history: [snapshot, ...state.history].slice(0, 20),
        future: [],
      };
    });
    get().addToast({
      message: 'New academic session added.',
      type: 'success',
      action: {
        label: 'Undo',
        onClick: () => get().undo(),
      },
    });
  },

  deleteEvent: (eventId: string) => {
    set((state) => {
      const snapshot: ScheduleSnapshot = {
        events: [...state.events],
        conflicts: [...state.conflicts],
        resolutionLogs: [...state.resolutionLogs],
      };
      const newEvents = state.events.filter((e) => e.id !== eventId);
      const newConflicts = detectConflicts(newEvents, state.rooms, state.faculty, state.courses);
      return {
        events: newEvents,
        conflicts: newConflicts,
        history: [snapshot, ...state.history].slice(0, 20),
        future: [],
      };
    });
    get().addToast({
      message: 'Event deleted.',
      type: 'info',
      action: {
        label: 'Undo',
        onClick: () => get().undo(),
      },
    });
  },

  setSelectedDate: (date: string) => set({ selectedDate: date }),

  setBuildingFilter: (building: string | null) =>
    set({ buildingFilter: building, activeBuildingFilter: building }),

  setActiveNav: (nav: NavId) => set({ activeNav: nav }),

  setSidebarCollapsed: (collapsed: boolean) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('smartscholar_sidebar_collapsed', String(collapsed));
      } catch {
        // ignore
      }
    }
    set({ sidebarCollapsed: collapsed });
  },

  toggleSidebarCollapsed: () => {
    const next = !get().sidebarCollapsed;
    get().setSidebarCollapsed(next);
  },

  setMobileSidebarOpen: (open: boolean) => set({ mobileSidebarOpen: open }),

  markNotificationAsRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  },

  markAllNotificationsAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  setView: (view: TimetableViewMode) => set({ view }),

  setTypeFilter: (types: EventType[]) => set({ typeFilter: types }),

  toggleTypeFilter: (type: EventType) => {
    set((state) => {
      const exists = state.typeFilter.includes(type);
      if (exists) {
        return { typeFilter: state.typeFilter.filter((t) => t !== type) };
      } else {
        return { typeFilter: [...state.typeFilter, type] };
      }
    });
  },

  stepSelectedDate: (direction: -1 | 1) => {
    const current = parseISO(`${get().selectedDate}T00:00:00`);
    const next = addDays(current, direction);
    set({ selectedDate: format(next, 'yyyy-MM-dd') });
  },

  goToToday: () => {
    set({ selectedDate: format(new Date(), 'yyyy-MM-dd') });
  },

  resetToMockData: () => {
    const freshConflicts = detectConflicts(mockEvents, mockRooms, mockFaculty, mockCourses);
    set({
      events: mockEvents,
      rooms: mockRooms,
      faculty: mockFaculty,
      courses: mockCourses,
      scholars: mockScholars,
      conflicts: freshConflicts,
      resolutionLogs: [],
      notifications: mockNotifications,
      deadlines: mockDeadlines,
      activeNav: 'dashboard',
      selectedDate: '2026-11-09',
      activeBuildingFilter: null,
      buildingFilter: null,
      view: 'day',
      typeFilter: ['lecture', 'lab', 'seminar', 'exam', 'maintenance'],
      isResolving: false,
      history: [],
      future: [],
      toasts: [],
      isEventModalOpen: false,
      editingEventId: null,
      prefillEventData: null,
      isCommandPaletteOpen: false,
      isAutoSchedulerModalOpen: false,
      autoSchedulerLogs: [],
      autoSchedulerSummary: null,
      isAutoSchedulerRunning: false,
    });
  },

  // Derived selectors
  getActiveConflicts: () => {
    const { events, rooms, faculty, courses } = get();
    return selectActiveConflicts({ events, rooms, faculty, courses });
  },

  getConflictCount: () => {
    const { events, rooms, faculty, courses } = get();
    return selectConflictCount({ events, rooms, faculty, courses });
  },

  getScheduledHoursForSelectedDate: () => {
    const { events, selectedDate } = get();
    return selectScheduledHoursForDate(events, selectedDate);
  },

  getScheduledHoursTodayWithTrend: () => {
    const { events, selectedDate } = get();
    return selectScheduledHoursTodayWithTrend(events, selectedDate);
  },

  getOccupancyRateForSelectedDate: () => {
    const { events, rooms, selectedDate } = get();
    return selectRoomOccupancyRate(events, rooms, selectedDate);
  },

  getSystemConflictMetric: () => {
    const { events, rooms, faculty, courses } = get();
    return selectSystemConflictMetric({ events, rooms, faculty, courses });
  },

  getDistinctScholarsToday: () => {
    const { events, scholars, selectedDate } = get();
    return selectDistinctScholarsToday(events, scholars, selectedDate);
  },

  getBuildingOccupancyHierarchy: () => {
    const { events, rooms, selectedDate } = get();
    return selectBuildingOccupancyHierarchy(events, rooms, selectedDate);
  },

  getScholarMetrics: () => {
    const { scholars } = get();
    return selectScholarMetrics(scholars);
  },

  getBuildingMetrics: () => {
    const { rooms, events } = get();
    return selectBuildingMetrics(rooms, events);
  },

  getUnreadNotificationCount: () => {
    return selectUnreadNotificationCount(get().notifications);
  },
}));
