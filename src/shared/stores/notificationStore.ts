import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationPreferences {
  enabled: boolean;
  taskReminders: boolean;
  taskReminderMinutes: number;
  pomodoroAlerts: boolean;
  habitReminders: boolean;
  habitReminderHour: number;
  eventReminders: boolean;
  eventReminderMinutes: number;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  taskReminders: true,
  taskReminderMinutes: 30,
  pomodoroAlerts: true,
  habitReminders: true,
  habitReminderHour: 20,
  eventReminders: true,
  eventReminderMinutes: 15,
};

interface NotificationState {
  preferences: NotificationPreferences;
  permissionStatus: NotificationPermission | 'unsupported';
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  requestPermission: () => Promise<NotificationPermission | 'unsupported'>;
  refreshPermissionStatus: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,
      permissionStatus: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',

      updatePreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),

      requestPermission: async () => {
        if (typeof Notification === 'undefined') {
          set({ permissionStatus: 'unsupported' });
          return 'unsupported';
        }
        try {
          const result = await Notification.requestPermission();
          set({ permissionStatus: result });
          return result;
        } catch {
          set({ permissionStatus: 'denied' });
          return 'denied';
        }
      },

      refreshPermissionStatus: () => {
        if (typeof Notification !== 'undefined') {
          set({ permissionStatus: Notification.permission });
        }
      },
    }),
    {
      name: 'divein-notification-preferences',
      partialize: (state) => ({ preferences: state.preferences }),
    },
  ),
);
