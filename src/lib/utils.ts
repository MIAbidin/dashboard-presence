import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Fungsi wajib untuk shadcn/ui — merge Tailwind classes dengan aman
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}