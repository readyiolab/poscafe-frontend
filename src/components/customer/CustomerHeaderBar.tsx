import { Loader2, Receipt, Wallet, Smartphone, CheckCircle2, BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomerBillStatus } from './CustomerBillPanel';

type Props = {
  status: CustomerBillStatus | null;
  loading: boolean;
  requesting: boolean;
  settingPreference: boolean;
  waiterCooldown: boolean;
  waiterLoading: boolean;
  onWaiter: () => void;
  onRequestBill: () => void;
  onSetPreference: (method: 'cash' | 'upi') => void;
};

export function CustomerHeaderBar({
  status,
  loading,
  requesting,
  settingPreference,
  waiterCooldown,
  waiterLoading,
  onWaiter,
  onRequestBill,
  onSetPreference,
}: Props) {
  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={onWaiter}
        disabled={waiterCooldown || waiterLoading}
        className="flex shrink-0 items-center gap-1.5 h-9 rounded-xl bg-stone-900 px-3 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm disabled:opacity-50 cursor-pointer"
      >
        {waiterLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <BellRing className="size-3.5" />
        )}
        <span>Call Waiter</span>
      </button>

      <div className="min-w-0 flex-1 flex items-center">
        {loading && !status ? (
          <div className="flex h-9 w-full items-center justify-center rounded-xl border border-stone-200/80 bg-white/90">
            <Loader2 className="size-3.5 animate-spin text-amber-600" />
          </div>
        ) : !status?.has_orders ? (
          <div className="flex h-9 w-full items-center rounded-xl border border-stone-200/70 bg-white/80 px-3">
            <p className="truncate text-[10px] font-semibold text-stone-500">
              <span className="font-bold text-stone-600">No order yet</span>
              <span className="text-stone-400"> · Add items to start</span>
            </p>
          </div>
        ) : status.bill_visible && status.bill ? (
          <div className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3">
            <span className="truncate text-[10px] font-bold text-emerald-800">Your bill is ready</span>
            <span className="shrink-0 text-xs font-black text-emerald-900">₹{status.bill.grand_total}</span>
          </div>
        ) : status.bill_requested && status.payment_preference ? (
          <div className="flex h-9 w-full items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3">
            <CheckCircle2 className="size-3.5 shrink-0 text-amber-600" />
            <p className="truncate text-[10px] font-semibold text-amber-900">
              Bill requested · Pay by {status.payment_preference === 'cash' ? 'Cash' : 'UPI'}
            </p>
          </div>
        ) : status.bill_requested ? (
          <div className="flex h-9 w-full items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-2">
            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
            <span className="shrink-0 text-[9px] font-bold text-stone-700">Pay:</span>
            <button
              type="button"
              onClick={() => onSetPreference('cash')}
              disabled={settingPreference}
              className="flex h-7 items-center gap-1 rounded-lg bg-stone-900 px-2 text-[9px] font-bold text-white disabled:opacity-50 cursor-pointer"
            >
              {settingPreference ? <Loader2 className="size-3 animate-spin" /> : <Wallet className="size-3" />}
              Cash
            </button>
            <button
              type="button"
              onClick={() => onSetPreference('upi')}
              disabled={settingPreference}
              className="flex h-7 items-center gap-1 rounded-lg bg-amber-600 px-2 text-[9px] font-bold text-white disabled:opacity-50 cursor-pointer"
            >
              {settingPreference ? <Loader2 className="size-3 animate-spin" /> : <Smartphone className="size-3" />}
              UPI
            </button>
          </div>
        ) : !status.all_served ? (
          <div className="flex h-9 w-full items-center rounded-xl border border-stone-200/70 bg-white/80 px-3">
            <p className="truncate text-[10px] font-semibold text-stone-500">
              Food preparing · bill after served
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRequestBill}
            disabled={requesting}
            className={cn(
              'flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm disabled:opacity-50 cursor-pointer'
            )}
          >
            {requesting ? <Loader2 className="size-3.5 animate-spin" /> : <Receipt className="size-3.5" />}
            Request Bill
          </button>
        )}
      </div>
    </div>
  );
}

export function CustomerBillDetailCard({ status }: { status: CustomerBillStatus }) {
  if (!status.bill_visible || !status.bill) return null;

  const allItems = status.bill.orders?.flatMap((o) => o.items) || [];

  return (
    <section className="px-4 pt-3">
      <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 px-4 py-2.5 text-white">
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-90">Your Bill</p>
          <p className="text-sm font-bold">Table {status.bill.table_number || status.table_number}</p>
        </div>
        <div className="px-4 py-3 space-y-2">
          {allItems.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="flex justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-stone-700">
                {item.quantity}× {item.name}
              </span>
              <span className="shrink-0 font-semibold text-stone-900">
                ₹{(item.price * item.quantity).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-stone-100 px-4 py-3 space-y-1 text-sm">
          {(status.bill.discount_total ?? 0) > 0 && (
            <div className="flex justify-between text-stone-500 text-xs">
              <span>Discount</span>
              <span>- ₹{status.bill.discount_total}</span>
            </div>
          )}
          <div className="flex justify-between text-stone-600 text-xs">
            <span>Subtotal</span>
            <span>₹{status.bill.sub_total}</span>
          </div>
          <div className="flex justify-between text-stone-600 text-xs">
            <span>GST (5%)</span>
            <span>₹{status.bill.gst_amount}</span>
          </div>
          <div className="flex justify-between font-black text-base text-stone-900 pt-1 border-t border-stone-100">
            <span>Grand Total</span>
            <span>₹{status.bill.grand_total}</span>
          </div>
          {status.payment_preference && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 pt-1">
              Paying by {status.payment_preference === 'cash' ? 'Cash' : 'UPI'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
