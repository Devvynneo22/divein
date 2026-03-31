import { useEffect, useRef } from 'react';
import { useNotificationStore } from '@/shared/stores/notificationStore';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { useTodayStatus } from '@/modules/habits/hooks/useHabits';
import { useEvents } from '@/modules/calendar/hooks/useEvents';
import { format, parseISO, differenceInMinutes, addDays, startOfDay } from 'date-fns';

// ─── Helper ───────────────────────────────────────────────────────────────────

function fireNotification(title: string, body: string, icon = '🔔') {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `${title}-${Date.now()}`,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Browser may block programmatic notifications in some contexts
  }
}

// ─── NotificationManager (renders nothing) ────────────────────────────────────

export function NotificationManager() {
  const { preferences, requestPermission, refreshPermissionStatus } = useNotificationStore();

  // Track what we've already notified (keyed by "entityId-date")
  const firedRef = useRef<Set<string>>(new Set());
  const habitFiredDateRef = useRef<string>('');

  // Data hooks
  const { data: tasks = [] } = useTasks();
  const { data: habits = [] } = useTodayStatus();
  const now = new Date();
  const windowStart = startOfDay(now).toISOString();
  const windowEnd = addDays(now, 1).toISOString();
  const { data: events = [] } = useEvents(windowStart, windowEnd);

  // Request permission on mount if enabled
  useEffect(() => {
    refreshPermissionStatus();
    if (preferences.enabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void requestPermission();
    }
  }, [preferences.enabled, requestPermission, refreshPermissionStatus]);

  // Interval-based notification checks
  useEffect(() => {
    if (!preferences.enabled) return;

    function check() {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');

      // ── Task reminders ──────────────────────────────────────────────────────
      if (preferences.taskReminders) {
        for (const task of tasks) {
          if (!task.dueDate || task.status === 'done' || task.status === 'cancelled') continue;

          let dueDate: Date;
          try {
            dueDate = parseISO(task.dueDate);
          } catch {
            continue;
          }

          const minsUntilDue = differenceInMinutes(dueDate, now);
          const key = `task-${task.id}-${todayStr}`;

          if (minsUntilDue > 0 && minsUntilDue <= preferences.taskReminderMinutes && !firedRef.current.has(key)) {
            firedRef.current.add(key);
            fireNotification(
              `Task due soon`,
              `"${task.title}" is due in ${minsUntilDue} minute${minsUntilDue !== 1 ? 's' : ''}`,
            );
          }
        }
      }

      // ── Event reminders ─────────────────────────────────────────────────────
      if (preferences.eventReminders) {
        for (const event of events) {
          if (event.allDay) continue;

          let startTime: Date;
          try {
            startTime = parseISO(event.startTime);
          } catch {
            continue;
          }

          const minsUntilStart = differenceInMinutes(startTime, now);
          const key = `event-${event.id}-${todayStr}`;

          if (minsUntilStart > 0 && minsUntilStart <= preferences.eventReminderMinutes && !firedRef.current.has(key)) {
            firedRef.current.add(key);
            fireNotification(
              `Event starting soon`,
              `"${event.title}" starts in ${minsUntilStart} minute${minsUntilStart !== 1 ? 's' : ''}`,
            );
          }
        }
      }

      // ── Habit reminders ─────────────────────────────────────────────────────
      if (preferences.habitReminders && now.getHours() === preferences.habitReminderHour) {
        const key = `habits-${todayStr}`;
        if (habitFiredDateRef.current !== key) {
          const incomplete = habits.filter((h) => !h.isCompletedToday);
          if (incomplete.length > 0) {
            habitFiredDateRef.current = key;
            const names = incomplete
              .slice(0, 3)
              .map((h) => h.name)
              .join(', ');
            const extra = incomplete.length > 3 ? ` and ${incomplete.length - 3} more` : '';
            fireNotification(
              `Don't forget your habits!`,
              `${incomplete.length} habit${incomplete.length > 1 ? 's' : ''} remaining: ${names}${extra}`,
            );
          }
        }
      }
    }

    // Run immediately, then every 60 seconds
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [preferences, tasks, habits, events]);

  return null;
}
