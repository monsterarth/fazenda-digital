import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parse } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// NOVA FUNÇÃO
export const isOrderingWindowActive = (startTimeStr?: string, endTimeStr?: string): boolean => {
    if (!startTimeStr || !endTimeStr) return false;
    try {
        const now = new Date();
        const start = parse(startTimeStr, 'HH:mm', new Date());
        const end = parse(endTimeStr, 'HH:mm', new Date());
        return now >= start && now <= end;
    } catch (e) {
        console.error("Error parsing time strings:", e);
        return false;
    }
};