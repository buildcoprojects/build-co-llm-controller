import { EventLog, EventFlags } from '../types';

// In-memory storage for demo purposes
// In a real application, this would use a database or external storage
const eventsStore: (EventLog & { flags: EventFlags })[] = [];

export function saveEvent(event: EventLog, flags: EventFlags): string {
  try {
    // Create a new record with the event and flags
    const eventRecord = {
      ...event,
      flags,
    };

    // Add to in-memory store
    eventsStore.push(eventRecord);

    // If localStorage is available (client-side), store there as well
    if (typeof window !== 'undefined' && window.localStorage) {
      const existingEvents = JSON.parse(localStorage.getItem('buildCoEvents') || '[]');
      existingEvents.push(eventRecord);
      localStorage.setItem('buildCoEvents', JSON.stringify(existingEvents));
    }

    return event.id;
  } catch (error) {
    console.error('Error saving event:', error);
    throw error;
  }
}

export function getEvents(): (EventLog & { flags: EventFlags })[] {
  try {
    // If we have events in memory, return those
    if (eventsStore.length > 0) {
      return [...eventsStore];
    }

    // If localStorage is available (client-side), try to get events from there
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedEvents = localStorage.getItem('buildCoEvents');
      if (storedEvents) {
        const parsedEvents = JSON.parse(storedEvents);
        // Update our in-memory store
        eventsStore.push(...parsedEvents);
        return parsedEvents;
      }
    }

    // Return empty array if no events found
    return [];
  } catch (error) {
    console.error('Error getting events:', error);
    return [];
  }
}

export function getEventById(id: string): (EventLog & { flags: EventFlags }) | undefined {
  try {
    // First check in-memory store
    const memoryEvent = eventsStore.find(event => event.id === id);
    if (memoryEvent) {
      return memoryEvent;
    }

    // If localStorage is available (client-side), try to find there
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedEvents = localStorage.getItem('buildCoEvents');
      if (storedEvents) {
        const parsedEvents = JSON.parse(storedEvents);
        return parsedEvents.find((event: EventLog) => event.id === id);
      }
    }

    // Return undefined if event not found
    return undefined;
  } catch (error) {
    console.error('Error getting event by ID:', error);
    return undefined;
  }
}

export function updateEventFlags(id: string, flags: Partial<EventFlags>): boolean {
  try {
    // Find the event in the in-memory store
    const eventIndex = eventsStore.findIndex(event => event.id === id);
    if (eventIndex >= 0) {
      // Update the flags
      eventsStore[eventIndex].flags = {
        ...eventsStore[eventIndex].flags,
        ...flags,
      };

      // If localStorage is available (client-side), update there as well
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedEvents = JSON.parse(localStorage.getItem('buildCoEvents') || '[]');
        const storedEventIndex = storedEvents.findIndex((event: EventLog) => event.id === id);
        if (storedEventIndex >= 0) {
          storedEvents[storedEventIndex].flags = {
            ...storedEvents[storedEventIndex].flags,
            ...flags,
          };
          localStorage.setItem('buildCoEvents', JSON.stringify(storedEvents));
        }
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating event flags:', error);
    return false;
  }
}

// Filter events by tag/flag
export function filterEventsByFlag(
  flag: keyof EventFlags,
  value: boolean = true
): (EventLog & { flags: EventFlags })[] {
  try {
    const events = getEvents();
    return events.filter(event => event.flags[flag] === value);
  } catch (error) {
    console.error('Error filtering events by flag:', error);
    return [];
  }
}
