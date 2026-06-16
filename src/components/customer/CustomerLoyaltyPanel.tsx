import { useState, useEffect, useMemo } from 'react';
import { Gift, Ticket, History, Loader2, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STEPS = [
  { key: 'Pending', label: 'New', hint: 'Pending', dot: 'bg-amber-500', ring: 'ring-amber-300', text: 'text-amber-900', bg: 'bg-amber-50' },
  { key: 'Preparing', label: 'Cooking', hint: 'Preparing', dot: 'bg-sky-500', ring: 'ring-sky-300', text: 'text-sky-900', bg: 'bg-sky-50' },
  { key: 'Ready', label: 'Ready', hint: 'Ready', dot: 'bg-emerald-500', ring: 'ring-emerald-300', text: 'text-emerald-900', bg: 'bg-emerald-50' },
  { key: 'Completed', label: 'Served', hint: 'Done', dot: 'bg-stone-700', ring: 'ring-stone-300', text: 'text-stone-900', bg: 'bg-stone-100' },
] as const;

type OrderStepKey = typeof STATUS_STEPS[number]['key'];

function formatLiveDuration(from: string | undefined | null) {
  if (!from) return '—';
  const diffMs = Math.max(0, Date.now() - new Date(from).getTime());
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  if (mins < 60) return `${mins}m ${rem}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function getStepStartTime(order: any, stepKey: OrderStepKey) {
  switch (stepKey) {
    case 'Pending':
      return order.created_at;
    case 'Preparing':
      return order.preparing_at || order.created_at;
    case 'Ready':
      return order.ready_at || order.preparing_at || order.created_at;
    case 'Completed':
      return order.completed_at || order.ready_at;
    default:
      return order.created_at;
  }
}

function getCurrentStepIndex(status: string) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

function getStatusHeadline(order: any) {
  const status = order.status as OrderStepKey;
  const step = STATUS_STEPS.find((s) => s.key === status) || STATUS_STEPS[0];
  const since = formatLiveDuration(getStepStartTime(order, step.key));
  return `${step.label} · ${since}`;
}

type OrderTrackingProps = {
  orders: any[];
  statusFlash?: Record<number, number>;
};

export function OrderTrackingCard({ orders, statusFlash = {} }: OrderTrackingProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const active = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === 'Cancelled') return false;
      if (o.status === 'Completed') {
        const t = o.completed_at ? new Date(o.completed_at).getTime() : 0;
        return t > 0 && now - t < 120_000;
      }
      return true;
    });
  }, [orders, now]);

  if (active.length === 0) return null;

  return (
    <section className="px-4 pt-3 space-y-2">
      {active.map((order) => {
        const current = getCurrentStepIndex(order.status);
        const flashAt = statusFlash[order.id];
        const isFlashing = flashAt && now - flashAt < 4000;
        const step = STATUS_STEPS[current] || STATUS_STEPS[0];

        return (
          <div
            key={order.id}
            className={cn(
              'rounded-2xl border p-4 shadow-sm transition-all duration-500',
              isFlashing
                ? 'border-amber-400 bg-amber-50/90 ring-2 ring-amber-300/60 scale-[1.01]'
                : 'border-amber-200/60 bg-white/95'
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', step.bg)}>
                  <ChefHat className={cn('size-3.5', step.text)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 truncate">
                    Order #{order.id}
                  </p>
                  <p className={cn('text-[11px] font-black tabular-nums truncate', step.text)}>
                    {getStatusHeadline(order)}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 text-[8px] font-bold uppercase border-0 animate-pulse',
                  step.bg,
                  step.text
                )}
              >
                Live
              </Badge>
            </div>

            <div className="relative flex items-start justify-between gap-0.5">
              {STATUS_STEPS.map((s, i) => {
                const isPast = i < current;
                const isCurrent = i === current;
                const stepTime = isCurrent ? formatLiveDuration(getStepStartTime(order, s.key)) : null;

                return (
                  <div key={s.key} className="relative flex-1 flex flex-col items-center">
                    {i < STATUS_STEPS.length - 1 && (
                      <div
                        className={cn(
                          'absolute left-[calc(50%+0.5rem)] top-[0.65rem] h-0.5 w-[calc(100%-1rem)] -translate-y-1/2',
                          isPast ? 'bg-amber-500' : 'bg-stone-200'
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        'relative z-10 flex items-center justify-center rounded-full transition-all duration-300',
                        isCurrent ? 'size-5 ring-2 animate-pulse' : 'size-2.5',
                        isPast || isCurrent ? s.dot : 'bg-stone-200',
                        isCurrent && s.ring
                      )}
                    />
                    <div className={cn('mt-1.5 text-center w-full px-0.5', isCurrent && s.bg, isCurrent && 'rounded-lg py-1')}>
                      <p className={cn(
                        'text-[9px] font-black uppercase leading-tight',
                        isPast || isCurrent ? s.text : 'text-stone-400'
                      )}>
                        {s.label}
                      </p>
                      <p className={cn(
                        'text-[7px] font-semibold uppercase tracking-wide leading-tight',
                        isPast || isCurrent ? 'text-stone-500' : 'text-stone-300'
                      )}>
                        {s.hint}
                      </p>
                      {isCurrent && stepTime && (
                        <p className={cn('text-[9px] font-black tabular-nums mt-0.5', s.text)}>
                          {stepTime}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

type ProfileProps = {
  profile: any;
  rewards: any[];
  redeeming: number | null;
  onRedeem: (rewardId: number) => void;
  view: 'rewards' | 'history';
  onViewChange: (v: 'rewards' | 'history') => void;
  pageMode?: boolean;
};

export function CustomerLoyaltyPanel({ profile, rewards, redeeming, onRedeem, view, onViewChange, pageMode }: ProfileProps) {
  const customer = profile?.customer;

  if (!customer) {
    if (pageMode) {
      return (
        <div className="px-4 py-12 text-center">
          <Gift className="size-12 mx-auto text-stone-300 mb-3" />
          <p className="text-sm font-bold text-stone-600">Sign in with your phone to earn points</p>
        </div>
      );
    }
    return null;
  }

  return (
    <section className={cn(pageMode ? 'px-4 py-4 pb-6' : 'px-4 pt-3')}>
      <div className="rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Your points</p>
            <p className="text-3xl font-black text-stone-900">{customer.points_balance} pts</p>
            <p className="text-xs text-stone-500 mt-1">
              {customer.visit_count} visits · ₹{Number(customer.lifetime_spend || 0).toFixed(0)} spent
            </p>
          </div>
          <Gift className="size-12 text-amber-500 opacity-80 shrink-0" />
        </div>
        <div className="flex gap-2 mt-4">
          {(['rewards', 'history'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onViewChange(tab)}
              className={cn(
                'flex-1 h-11 rounded-xl text-[10px] font-bold uppercase tracking-wider border cursor-pointer',
                view === tab
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-stone-600 border-stone-200'
              )}
            >
              {tab === 'rewards' ? 'Rewards' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {view === 'rewards' && (
        <div className="mt-3 space-y-2">
          {profile.active_coupons?.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase text-emerald-800">Active coupons</p>
              {profile.active_coupons.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center text-sm">
                  <span className="font-bold">{c.reward_name}</span>
                  <Badge className="font-mono bg-white">{c.code}</Badge>
                </div>
              ))}
            </div>
          )}
          {rewards.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3">
              <div>
                <p className="font-bold text-sm">{r.name}</p>
                <p className="text-[10px] text-stone-500">{r.points_cost} pts · use within {r.valid_days} days</p>
              </div>
              <Button
                size="sm"
                disabled={customer.points_balance < r.points_cost || redeeming === r.id}
                onClick={() => onRedeem(r.id)}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 min-w-[5rem] cursor-pointer"
              >
                {redeeming === r.id ? <Loader2 className="size-4 animate-spin" /> : 'Claim'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {view === 'history' && (
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {profile.recent_orders?.length === 0 && (
            <p className="text-xs text-stone-500 text-center py-4">No orders yet. Place your first order!</p>
          )}
          {profile.recent_orders?.map((o: any) => (
            <div key={o.id} className="rounded-xl border border-stone-200 bg-white p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold">Order #{o.id}</span>
                <Badge variant="outline" className="text-[9px]">{o.status}</Badge>
              </div>
              <p className="text-[10px] text-stone-500 mt-1">Table {o.table_number} · ₹{o.total_amount}</p>
            </div>
          ))}
          {profile.points_ledger?.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase text-stone-500 pt-2 flex items-center gap-1">
                <History className="size-3" /> Points history
              </p>
              {profile.points_ledger.slice(0, 10).map((l: any) => (
                <div key={l.id} className="flex justify-between text-xs py-1 border-b border-stone-100">
                  <span className="text-stone-600">{l.note || l.type}</span>
                  <span className={cn('font-bold', l.points > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {l.points > 0 ? '+' : ''}{l.points}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}

export function ServiceButtons({
  onWaiter,
  waiterCooldown,
  loading,
  hidden,
}: {
  onWaiter: () => void;
  waiterCooldown: boolean;
  loading: string | null;
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <div className="absolute bottom-[8.75rem] left-3 right-3 z-30 sm:left-4 sm:right-4">
      <button
        type="button"
        onClick={onWaiter}
        disabled={waiterCooldown || loading === 'waiter'}
        className="flex w-full items-center justify-center gap-2 h-12 rounded-2xl bg-stone-900 text-white text-xs font-bold uppercase tracking-wider shadow-lg disabled:opacity-50 cursor-pointer min-h-11"
      >
        {loading === 'waiter' ? <Loader2 className="size-4 animate-spin" /> : <Ticket className="size-4" />}
        Call Waiter
      </button>
    </div>
  );
}
