import { Loader2, Receipt, Wallet, Smartphone, CheckCircle2, BellRing, ShoppingBag, ChefHat } from 'lucide-react';
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

function formatTableNumber(n: string | number | undefined) {
  if (n == null || n === '') return '—';
  const s = String(n);
  return s.toLowerCase().startsWith('table') ? s.replace(/^table\s*/i, '') : s;
}

export function CustomerBillPage({
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
  const tableLabel = formatTableNumber(status?.table_number ?? status?.bill?.table_number);

  return (
    <div className="px-4 py-4 space-y-4 pb-6">
      <button
        type="button"
        onClick={onWaiter}
        disabled={waiterCooldown || waiterLoading}
        className="flex w-full items-center justify-center gap-2 h-12 rounded-2xl bg-stone-900 text-white text-xs font-bold uppercase tracking-wider shadow-md disabled:opacity-50 cursor-pointer"
      >
        {waiterLoading ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
        Call Waiter
      </button>

      {loading && !status ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-stone-200 bg-white">
          <Loader2 className="size-6 animate-spin text-amber-600" />
        </div>
      ) : !status?.has_orders ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white/80 px-6 py-12 text-center">
          <ShoppingBag className="size-10 mx-auto text-stone-300 mb-3" />
          <p className="text-sm font-bold text-stone-700">No order yet</p>
          <p className="text-xs text-stone-500 mt-1">Add items from the Menu tab to start your order.</p>
        </div>
      ) : status.bill_visible && status.bill ? (
        <BillDetailFull status={status} tableLabel={tableLabel} />
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Table</p>
            <p className="text-2xl font-black text-stone-900">T-{tableLabel}</p>
          </div>

          {status.bill_requested && status.payment_preference ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-6 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-stone-900">Bill requested</p>
                  <p className="text-sm text-stone-600 mt-1">
                    You chose to pay by <strong>{status.payment_preference === 'cash' ? 'Cash' : 'UPI'}</strong>.
                    Your bill will be shown here when staff sends it.
                  </p>
                </div>
              </div>
            </div>
          ) : status.bill_requested ? (
            <div className="rounded-2xl border border-amber-200 bg-white p-4 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <p className="font-bold text-stone-900">Bill requested — waiter notified</p>
              </div>
              <p className="text-sm text-stone-600">How would you like to pay?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onSetPreference('cash')}
                  disabled={settingPreference}
                  className="flex flex-col items-center gap-2 h-20 rounded-2xl bg-stone-900 text-white font-bold text-sm disabled:opacity-50 cursor-pointer"
                >
                  {settingPreference ? <Loader2 className="size-5 animate-spin" /> : <Wallet className="size-6" />}
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => onSetPreference('upi')}
                  disabled={settingPreference}
                  className="flex flex-col items-center gap-2 h-20 rounded-2xl bg-amber-600 text-white font-bold text-sm disabled:opacity-50 cursor-pointer"
                >
                  {settingPreference ? <Loader2 className="size-5 animate-spin" /> : <Smartphone className="size-6" />}
                  UPI
                </button>
              </div>
            </div>
          ) : !status.all_served ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-center">
              <ChefHat className="size-8 mx-auto text-sky-600 mb-2" />
              <p className="font-bold text-stone-800">Food still being prepared</p>
              <p className="text-sm text-stone-600 mt-1">You can request the bill after your order is served.</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRequestBill}
              disabled={requesting}
              className={cn(
                'flex w-full items-center justify-center gap-2 h-14 rounded-2xl bg-amber-600 text-white text-sm font-bold uppercase tracking-wider shadow-lg disabled:opacity-50 cursor-pointer'
              )}
            >
              {requesting ? <Loader2 className="size-5 animate-spin" /> : <Receipt className="size-5" />}
              Request Bill
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BillDetailFull({ status, tableLabel }: { status: CustomerBillStatus; tableLabel: string }) {
  if (!status.bill) return null;
  const allItems = status.bill.orders?.flatMap((o) => o.items) || [];

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 px-5 py-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Your Bill</p>
        <p className="text-xl font-black mt-0.5">Table {tableLabel}</p>
      </div>
      <div className="divide-y divide-stone-100 max-h-[50dvh] overflow-y-auto">
        {allItems.map((item, idx) => (
          <div key={`${item.name}-${idx}`} className="flex justify-between gap-3 px-5 py-3.5">
            <span className="min-w-0 text-sm font-medium text-stone-800">
              <span className="font-bold text-stone-500">{item.quantity}×</span> {item.name}
            </span>
            <span className="shrink-0 text-sm font-bold text-stone-900">
              ₹{(item.price * item.quantity).toFixed(0)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-stone-200 bg-stone-50 px-5 py-4 space-y-2">
        {(status.bill.discount_total ?? 0) > 0 && (
          <div className="flex justify-between text-sm text-stone-600">
            <span>Discount</span>
            <span>- ₹{status.bill.discount_total}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-stone-600">
          <span>Subtotal</span>
          <span>₹{status.bill.sub_total}</span>
        </div>
        <div className="flex justify-between text-sm text-stone-600">
          <span>GST (5%)</span>
          <span>₹{status.bill.gst_amount}</span>
        </div>
        <div className="flex justify-between text-lg font-black text-stone-900 pt-2 border-t border-stone-200">
          <span>Grand Total</span>
          <span>₹{status.bill.grand_total}</span>
        </div>
        {status.payment_preference && (
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-emerald-700 pt-2">
            Paying by {status.payment_preference === 'cash' ? 'Cash' : 'UPI'}
          </p>
        )}
      </div>
    </div>
  );
}
