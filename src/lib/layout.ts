import { cn } from '@/lib/utils';

/** Staff/admin page shell — tablet-safe (768–1024px), no horizontal overflow */
export const pageShell =
  'space-y-5 md:space-y-6 max-w-[1600px] mx-auto pb-8 md:pb-10 px-4 sm:px-5 md:px-6 w-full min-w-0 overflow-x-hidden';

export const pageHeader =
  'flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200/60 dark:border-zinc-800/40 p-4 md:p-5 lg:p-6 shadow-sm min-w-0';

/** 1 col mobile → 2 col tablet → 3 col desktop */
export const cardGrid = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 min-w-0';

/** Stat / KPI row: 2×2 on phone, 4 across on tablet+ */
export const statGrid = 'grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 min-w-0';

/** Kitchen & order queues: optimized for tablet portrait & landscape */
export const kitchenOrderGrid =
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5 min-w-0';

/** Status filter tabs: scroll on phone, 5-col grid on tablet+ */
export const statusTabGrid =
  'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 min-w-0';

/** Horizontally scrollable fallback for dense tab bars */
export const scrollRow = 'flex gap-2 md:gap-3 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar snap-x snap-mandatory min-w-0';

export const touchBtn = 'min-h-11 min-w-11 cursor-pointer';

export const tableWrap =
  'w-full min-w-0 overflow-x-auto rounded-xl border border-zinc-200/60 dark:border-zinc-800/40';

export const customerShell = (isTablet: boolean, isDesktop: boolean) =>
  cnCustomerShell(isTablet, isDesktop);

function cnCustomerShell(isTablet: boolean, isDesktop: boolean) {
  if (isDesktop) return 'w-full max-w-3xl min-h-dvh h-dvh';
  if (isTablet) return 'w-full max-w-2xl min-h-dvh h-dvh';
  return 'w-full max-w-full min-h-dvh h-dvh';
}

export const menuItemGrid = 'grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0';
