<<<<<<< HEAD
import { type ClassValue, clsx } from "clsx";
=======
import { clsx, type ClassValue } from "clsx";
>>>>>>> 09fbac6 (Phase 1: Rebuild /api, Blob, Admin ChatPanel, artefact bridge logic (no artefact or legacy blob overwrite))
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
<<<<<<< HEAD

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}
=======
>>>>>>> 09fbac6 (Phase 1: Rebuild /api, Blob, Admin ChatPanel, artefact bridge logic (no artefact or legacy blob overwrite))
