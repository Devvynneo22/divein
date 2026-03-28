export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string; // ISO 8601
  endTime: string | null;
  allDay: boolean;
  location: string | null;
  color: string | null;
  category: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  title: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  color?: string;
  category?: string;
  projectId?: string;
}

export interface UpdateEventInput {
  title?: string;
  startTime?: string;
  endTime?: string | null;
  allDay?: boolean;
  description?: string | null;
  location?: string | null;
  color?: string | null;
  category?: string | null;
  projectId?: string | null;
}
