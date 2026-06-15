import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | Date) {
  if (!dateStr) return '';
  
  // If it's a string from the backend, it might have 'Z' but be intended as local time
  // Or it might be a date object already.
  const date = typeof dateStr === 'string' 
    ? new Date(dateStr.replace('Z', '')) 
    : new Date(dateStr);

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatTime(dateStr: string | Date) {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' 
    ? new Date(dateStr.replace('Z', '')) 
    : new Date(dateStr);

  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
