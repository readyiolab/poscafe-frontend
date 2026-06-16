import { UtensilsCrossed, ChefHat, Gift, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CustomerTab = 'menu' | 'orders' | 'points' | 'bill';

type Props = {
  active: CustomerTab;
  onChange: (tab: CustomerTab) => void;
  orderCount?: number;
  billReady?: boolean;
  hidden?: boolean;
};

const TABS: { id: CustomerTab; label: string; icon: typeof UtensilsCrossed }[] = [
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { id: 'orders', label: 'Orders', icon: ChefHat },
  { id: 'points', label: 'Points', icon: Gift },
  { id: 'bill', label: 'Bill', icon: Receipt },
];

export function CustomerBottomNav({ active, onChange, orderCount = 0, billReady, hidden }: Props) {
  if (hidden) return null;

  return (
    <nav className="shrink-0 border-t border-stone-200/80 bg-white/95 backdrop-blur-md px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40">
      <div className="flex items-stretch gap-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          const badge =
            id === 'orders' && orderCount > 0 ? orderCount :
            id === 'bill' && billReady ? '!' : null;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 min-h-11 transition-colors cursor-pointer',
                isActive ? 'text-amber-800 bg-amber-50' : 'text-stone-500 hover:text-stone-700'
              )}
            >
              <Icon className={cn('size-5', isActive && 'text-amber-600')} strokeWidth={isActive ? 2.25 : 2} />
              <span className={cn('text-[9px] font-bold uppercase tracking-wide', isActive && 'text-amber-900')}>
                {label}
              </span>
              {badge != null && (
                <span className="absolute top-1 right-[calc(50%-1.25rem)] flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[8px] font-bold text-white">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
