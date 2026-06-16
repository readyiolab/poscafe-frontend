import { useState } from 'react';
import { Loader2, Receipt, Wallet, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CustomerBillStatus = {
  table_id?: number;
  table_number?: string | number;
  has_orders: boolean;
  all_served: boolean;
  bill_requested: boolean;
  bill_requested_at?: string | null;
  payment_preference?: 'cash' | 'upi' | null;
  bill_visible: boolean;
  bill?: {
    table_number?: string | number;
    orders?: Array<{
      order_id: number;
      items: Array<{ name: string; quantity: number; price: number }>;
    }>;
    sub_total_before_discount?: number;
    discount_total?: number;
    sub_total: number;
    gst_amount: number;
    grand_total: number;
    date?: string;
  } | null;
};

type Props = {
  status: CustomerBillStatus | null;
  loading: boolean;
  requesting: boolean;
  settingPreference: boolean;
  onRequestBill: () => void;
  onSetPreference: (method: 'cash' | 'upi') => void;
  hidden?: boolean;
};

export function CustomerBillPanel({
  status,
  loading,
  requesting,
  settingPreference,
  onRequestBill,
  onSetPreference,
  hidden,
}: Props) {
  if (hidden) return null;

  if (loading && !status) {
    return (
      <div className="absolute bottom-[4.75rem] left-3 right-3 z-40 sm:left-4 sm:right-4">
        <div className="flex h-12 items-center justify-center rounded-2xl bg-white/95 border border-stone-200 shadow-lg">
          <Loader2 className="size-4 animate-spin text-amber-600" />
        </div>
      </div>
    );
  }

  if (!status?.has_orders) {
    return (
      <div className="absolute bottom-[4.75rem] left-3 right-3 z-40 sm:left-4 sm:right-4">
        <div className="rounded-2xl border border-stone-200/80 bg-white/95 px-4 py-3 text-center shadow-lg">
          <p className="text-xs font-bold text-stone-600">No order yet</p>
          <p className="text-[10px] text-stone-400 mt-0.5">Add items to your plate to start</p>
        </div>
      </div>
    );
  }

  if (status.bill_visible && status.bill) {
    const allItems = status.bill.orders?.flatMap((o) => o.items) || [];
    return (
      <div className="absolute bottom-[4.75rem] left-3 right-3 z-40 max-h-[45dvh] overflow-y-auto sm:left-4 sm:right-4">
        <div className="rounded-2xl border border-emerald-200 bg-white shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 px-4 py-3 text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Your Bill</p>
            <p className="text-sm font-bold">Table {status.bill.table_number || status.table_number}</p>
          </div>
          <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
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
              <div className="flex justify-between text-stone-500">
                <span>Discount</span>
                <span>- ₹{status.bill.discount_total}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span>₹{status.bill.sub_total}</span>
            </div>
            <div className="flex justify-between text-stone-600">
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
      </div>
    );
  }

  if (status.bill_requested && status.payment_preference) {
    return (
      <div className="absolute bottom-[4.75rem] left-3 right-3 z-40 sm:left-4 sm:right-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-900">Bill requested</p>
              <p className="text-[10px] text-amber-800">
                You chose {status.payment_preference === 'cash' ? 'Cash' : 'UPI'} — bill will be brought to you
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status.bill_requested) {
    return (
      <div className="absolute bottom-[4.75rem] left-3 right-3 z-40 sm:left-4 sm:right-4">
        <div className="rounded-2xl border border-amber-200 bg-white shadow-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold text-stone-800">Bill requested — waiter notified</p>
          </div>
          <p className="text-[10px] text-stone-500 px-1">How would you like to pay?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSetPreference('cash')}
              disabled={settingPreference}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-stone-900 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
            >
              {settingPreference ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
              Cash
            </button>
            <button
              type="button"
              onClick={() => onSetPreference('upi')}
              disabled={settingPreference}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-amber-600 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
            >
              {settingPreference ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
              UPI
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!status.all_served) {
    return (
      <div className="absolute bottom-[4.75rem] left-3 right-3 z-40 sm:left-4 sm:right-4">
        <div className="rounded-2xl border border-stone-200/80 bg-white/95 px-4 py-3 text-center shadow-lg">
          <p className="text-xs font-bold text-stone-600">Food still being prepared</p>
          <p className="text-[10px] text-stone-400 mt-0.5">Request bill after your order is served</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-[4.75rem] left-3 right-3 z-40 sm:left-4 sm:right-4">
      <button
        type="button"
        onClick={onRequestBill}
        disabled={requesting}
        className={cn(
          'flex w-full items-center justify-center gap-2 h-12 rounded-2xl bg-amber-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg disabled:opacity-50 cursor-pointer'
        )}
      >
        {requesting ? <Loader2 className="size-4 animate-spin" /> : <Receipt className="size-4" />}
        Request Bill
      </button>
    </div>
  );
}
