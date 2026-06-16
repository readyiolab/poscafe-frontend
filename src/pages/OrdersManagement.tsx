import React, { useState, useEffect, useMemo } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Play,
  XCircle,
  Loader2,
  RefreshCcw,
  Utensils,
  Search,
  AlertTriangle,
  CreditCard,
  Wallet,
  Smartphone,
  Check,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatTime, cn } from '@/lib/utils';
import { pageShell, pageHeader, statGrid, kitchenOrderGrid, statusTabGrid, touchBtn } from '@/lib/layout';
import { toast } from '@/lib/toast';
import api, { SOCKET_ORIGIN } from '../services/api';
import { io } from 'socket.io-client';
import { ServiceRequestsBar } from '@/components/ServiceRequestsBar';

const orderIdKey = (id: unknown) => (id == null ? '' : String(id));

const STATUS_TABS = [
  { key: 'Pending', label: 'New', hint: 'Pending', color: 'amber', theme: 'amber' },
  { key: 'Preparing', label: 'Cooking', hint: 'Preparing', color: 'sky', theme: 'sky' },
  { key: 'Ready', label: 'Ready', hint: 'Ready', color: 'emerald', theme: 'emerald' },
  { key: 'Completed', label: 'Served', hint: 'Done', color: 'zinc', theme: 'zinc' },
  { key: 'All', label: 'All', hint: 'Total', color: 'indigo', theme: 'indigo' },
];

const KitchenStatCard = ({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent: 'amber' | 'sky' | 'emerald' | 'indigo';
}) => {
  const accents = {
    amber: 'border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-400',
    sky: 'border-sky-500/25 bg-sky-500/5 text-sky-700 dark:text-sky-400',
    emerald: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
    indigo: 'border-indigo-500/25 bg-indigo-500/5 text-indigo-700 dark:text-indigo-400',
  };
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 md:p-5 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-sm shadow-sm min-w-0',
        accents[accent]
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-widest opacity-80 truncate">{label}</p>
      <p className="text-2xl md:text-3xl font-black mt-1 tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mt-0.5 truncate">{hint}</p>
    </div>
  );
};

const OrdersManagement = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Sheet states
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [billingInfo, setBillingInfo] = useState<any | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [payingBill, setPayingBill] = useState(false);
  const [showingBillToCustomer, setShowingBillToCustomer] = useState(false);

  // Checklist states for chef to check off items as they prepare them
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Ticker for live elapsed time
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 15000); // Tick every 15 seconds
    return () => clearInterval(timer);
  }, []);

  const getElapsedTime = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const diffMs = Date.now() - createdDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;

    return createdDate.toLocaleDateString();
  };

  const isOverdue = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins >= 15;
  };

  const toggleItemCheck = (orderId: string, idx: number) => {
    const key = `${orderId}-${idx}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleShowBillToCustomer = async () => {
    if (!selectedOrder?.table_id) return;
    try {
      setShowingBillToCustomer(true);
      await api.post('/billing/show-to-customer', { table_id: Number(selectedOrder.table_id) });
      toast('Bill is now visible on customer phone', 'success');
    } catch (err: any) {
      toast(err.response?.data?.message || 'Could not show bill to customer', 'error');
    } finally {
      setShowingBillToCustomer(false);
    }
  };

  const handlePayBill = async (method: string) => {
    if (!selectedOrder?.table_id) return;
    try {
      setPayingBill(true);
      const res = await api.post('/billing/pay', {
        table_id: Number(selectedOrder.table_id),
        payment_method: method
      });
      toast('Payment Successful! Table cleared. ✅', 'success');
      setBillingInfo(res.data?.data?.bill || null);
      fetchOrders();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Payment failed. Try again.';
      toast(msg, 'error');
    } finally {
      setPayingBill(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders', { params: { limit: 100 } });
      setOrders(res.data.data || []);
    } catch {
      toast('Could not load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const socket = io(SOCKET_ORIGIN, { transports: ['websocket', 'polling'] });
    socket.emit('join_kitchen');

    socket.on('new_order', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
      toast(`New order — Table ${newOrder.table_id}`, 'info');
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
    });

    socket.on('order_status_updated', (updatedOrder) => {
      if (!updatedOrder) return;
      setOrders((prev) =>
        prev.map((o) =>
          orderIdKey(o.id) === orderIdKey(updatedOrder.id)
            ? { ...o, ...updatedOrder, items: updatedOrder.items ?? o.items }
            : o
        )
      );

      setSelectedOrder((curr) => {
        if (curr && orderIdKey(curr.id) === orderIdKey(updatedOrder.id)) {
          return { ...curr, ...updatedOrder, items: updatedOrder.items ?? curr.items };
        }
        return curr;
      });
    });

    socket.on('table_status_updated', (data) => {
      if (data) {
        setSelectedOrder((curr) => {
          if (curr && Number(curr.table_id) === Number(data.table_id)) {
            api.get(`/billing/${curr.table_id}`)
              .then((res) => setBillingInfo(res.data?.data || null))
              .catch((err) => console.error(err));
          }
          return curr;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!selectedOrder) {
      setBillingInfo(null);
      return;
    }

    const fetchBilling = async () => {
      try {
        setLoadingBilling(true);
        const res = await api.get(`/billing/${selectedOrder.table_id}`);
        setBillingInfo(res.data?.data || null);
      } catch (err) {
        console.error('Could not fetch billing details', err);
        setBillingInfo(null);
      } finally {
        setLoadingBilling(false);
      }
    };

    fetchBilling();
  }, [selectedOrder]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      const updated = res.data?.data;
      setOrders((prev) =>
        prev.map((o) =>
          orderIdKey(o.id) === orderIdKey(updated?.id)
            ? { ...o, ...updated, items: updated.items ?? o.items }
            : o
        )
      );

      if (selectedOrder && orderIdKey(selectedOrder.id) === orderIdKey(updated?.id)) {
        setSelectedOrder((prev: any) => ({
          ...prev,
          ...updated,
          items: updated.items ?? prev.items
        }));

        if (newStatus === 'Cancelled') {
          api.get(`/billing/${selectedOrder.table_id}`)
            .then((res) => setBillingInfo(res.data?.data || null))
            .catch((err) => console.error(err));
        }
      }

      if (newStatus === 'Cancelled') {
        toast('Order cancelled', 'info');
      } else {
        toast(`Order moved to ${newStatus}`, 'success');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (typeof err.response?.data?.error === 'string' ? err.response.data.error : null) ||
        'Could not update. Try again.';
      toast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.table_id?.toString().includes(searchTerm) ||
        order.id?.toString().includes(searchTerm) ||
        order.table_number?.toString().toLowerCase().includes(searchTerm.toLowerCase());

      if (filterStatus === 'All') {
        return matchesSearch && ['Pending', 'Preparing', 'Ready', 'Completed'].includes(order.status);
      }
      return matchesSearch && order.status === filterStatus;
    });
  }, [orders, filterStatus, searchTerm]);

  const pendingCount = orders.filter((o) => o.status === 'Pending').length;

  const kitchenStats = useMemo(() => {
    const active = orders.filter((o) => ['Pending', 'Preparing', 'Ready'].includes(o.status));
    return {
      totalActive: active.length,
      pending: orders.filter((o) => o.status === 'Pending').length,
      preparing: orders.filter((o) => o.status === 'Preparing').length,
      ready: orders.filter((o) => o.status === 'Ready').length,
    };
  }, [orders]);

  const getActionButton = (order: any) => {
    const id = String(order.id);
    const busy = updatingId === id;

    if (order.status === 'Pending') {
      return (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            updateStatus(id, 'Preparing');
          }}
          disabled={busy}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md transition active:scale-[0.98] cursor-pointer"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : (
            <span className="flex items-center justify-center gap-2">
              <Play className="size-4 fill-white" />
              Start Cooking
            </span>
          )}
        </Button>
      );
    }
    if (order.status === 'Preparing') {
      return (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            updateStatus(id, 'Ready');
          }}
          disabled={busy}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition active:scale-[0.98] cursor-pointer"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4" />
              Ready
            </span>
          )}
        </Button>
      );
    }
    if (order.status === 'Ready') {
      return (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            updateStatus(id, 'Completed');
          }}
          disabled={busy}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-md transition active:scale-[0.98] cursor-pointer"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4" />
              Served
            </span>
          )}
        </Button>
      );
    }
    return null;
  };

  return (
    <div className={cn(pageShell, 'flex flex-col gap-5 md:gap-6')}>
      <ServiceRequestsBar compact />
      {/* Header — stacks on phone, row on tablet+ */}
      <div className={pageHeader}>
        <div className="flex flex-wrap items-center justify-between md:justify-start gap-3 md:gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <div className="size-12 md:size-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-zinc-950 shadow-md shrink-0">
              <ChefHat className="size-6 md:size-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-900 dark:text-white leading-tight truncate">
                Kitchen Screen
              </h1>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>Order Queue</span>
                <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-zinc-350 dark:bg-zinc-700" />
                <span className="hidden sm:inline">Live Kitchen</span>
                <span className="inline-block h-1 w-1 rounded-full bg-zinc-350 dark:bg-zinc-700" />
                {pendingCount > 0 ? (
                  <span className="text-amber-600 dark:text-amber-500 font-black animate-pulse">{pendingCount} Waiting</span>
                ) : (
                  <span className="text-zinc-500 font-semibold">No Pending</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live
          </div>
        </div>

        <div className="flex gap-2 md:gap-3 shrink-0 w-full md:w-auto md:min-w-[280px] lg:min-w-[320px]">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-450 dark:text-zinc-500 pointer-events-none" />
            <Input
              placeholder="Search table or order..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 md:pl-11 h-11 md:h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 text-sm focus-visible:ring-amber-500/20 w-full"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchOrders}
            className={cn('size-11 md:size-12 rounded-xl shrink-0 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition active:scale-95 shadow-sm', touchBtn)}
          >
            <RefreshCcw className={cn('size-4 text-zinc-600 dark:text-zinc-400', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Live kitchen statistics */}
      <div className={statGrid}>
        <KitchenStatCard label="Active Orders" value={kitchenStats.totalActive} hint="In kitchen queue" accent="indigo" />
        <KitchenStatCard label="New / Pending" value={kitchenStats.pending} hint="Awaiting start" accent="amber" />
        <KitchenStatCard label="Cooking" value={kitchenStats.preparing} hint="Preparing now" accent="sky" />
        <KitchenStatCard label="Ready" value={kitchenStats.ready} hint="Awaiting serve" accent="emerald" />
      </div>

      {/* Status filter tabs — 2×2 on phone, 5-col grid on tablet+ */}
      <div className={statusTabGrid}>
        {STATUS_TABS.map((tab) => {
          const count =
            tab.key === 'All'
              ? orders.filter((o) => ['Pending', 'Preparing', 'Ready', 'Completed'].includes(o.status)).length
              : orders.filter((o) => o.status === tab.key).length;
          const active = filterStatus === tab.key;
          
          let tabColors = '';
          if (active) {
            if (tab.color === 'amber') tabColors = 'bg-amber-500 border-amber-500 text-zinc-950 shadow-amber-500/10 shadow-lg';
            if (tab.color === 'sky') tabColors = 'bg-sky-500 border-sky-500 text-white shadow-sky-500/10 shadow-lg';
            if (tab.color === 'emerald') tabColors = 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/10 shadow-lg';
            if (tab.color === 'zinc') tabColors = 'bg-zinc-600 border-zinc-600 text-white shadow-zinc-600/10 shadow-lg';
            if (tab.color === 'indigo') tabColors = 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-600/10 shadow-lg';
          } else {
            if (tab.color === 'amber') tabColors = 'border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-amber-400/50 hover:bg-amber-500/[0.02]';
            if (tab.color === 'sky') tabColors = 'border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-sky-400/50 hover:bg-sky-500/[0.02]';
            if (tab.color === 'emerald') tabColors = 'border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-emerald-400/50 hover:bg-emerald-500/[0.02]';
            if (tab.color === 'zinc') tabColors = 'border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400/50';
            if (tab.color === 'indigo') tabColors = 'border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-indigo-400/50 hover:bg-indigo-500/[0.02]';
          }

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={cn(
                'w-full min-w-0 flex flex-col items-center justify-center min-h-[72px] md:min-h-[80px] px-3 md:px-4 py-3 md:py-4 rounded-2xl border-2 font-bold transition-all duration-200 active:scale-[0.97] cursor-pointer shadow-sm',
                tabColors
              )}
            >
              <span className="text-sm font-black tracking-tight">{tab.label}</span>
              <span className={cn('text-[9px] font-bold mt-1 uppercase tracking-widest', active ? 'opacity-80' : 'text-zinc-400 dark:text-zinc-505')}>
                {tab.hint}
              </span>
              {count > 0 && (
                <span
                  className={cn(
                    'mt-2 text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm',
                    active ? 'bg-zinc-950/10 text-current' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders Grid */}
      {loading && orders.length === 0 ? (
        <div className={kitchenOrderGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/40" />
          ))}
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className={kitchenOrderGrid}>
          {filteredOrders.map((order) => {
            const overdue = isOverdue(order.created_at) && order.status !== 'Completed' && order.status !== 'Cancelled';
            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  'bg-white dark:bg-zinc-900/95 rounded-2xl overflow-hidden flex flex-col shadow-sm border transition-all duration-300 cursor-pointer hover:shadow-lg min-w-0',
                  'md:hover:scale-[1.01]',
                  order.status === 'Pending' && 'border-amber-200 dark:border-amber-900/40 shadow-amber-500/[0.01]',
                  order.status === 'Preparing' && 'border-blue-200 dark:border-blue-900/40 shadow-blue-500/[0.01]',
                  order.status === 'Ready' && 'border-emerald-200 dark:border-emerald-900/40 shadow-emerald-500/[0.01]',
                  order.status === 'Completed' && 'opacity-65 border-zinc-200 dark:border-zinc-800/80',
                  overdue && 'border-rose-300 dark:border-rose-900/50 shadow-rose-500/[0.03] animate-pulse-subtle'
                )}
              >
                {/* Visual Status Border Line */}
                <div className={cn(
                  'h-1.5 w-full',
                  order.status === 'Pending' && 'bg-amber-500',
                  order.status === 'Preparing' && 'bg-sky-500',
                  order.status === 'Ready' && 'bg-emerald-500',
                  order.status === 'Completed' && 'bg-zinc-400'
                )} />

                {/* Ticket Header */}
                <div className="p-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/20">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'size-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner border transition-all',
                        order.status === 'Pending' && 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
                        order.status === 'Preparing' && 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400',
                        order.status === 'Ready' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
                        order.status === 'Completed' && 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      {order.table_number?.toString().replace(/\D/g, '') || order.table_id}
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-black tracking-widest leading-none">Table Number</p>
                      <p className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 mt-1.5">Order #{order.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        'inline-block text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider',
                        order.status === 'Pending' && 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
                        order.status === 'Preparing' && 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400',
                        order.status === 'Ready' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
                        order.status === 'Completed' && 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 text-zinc-600 dark:text-zinc-450'
                      )}
                    >
                      {order.status}
                    </span>
                    <div className={cn(
                      'flex items-center gap-1.5 justify-end mt-2 text-xs font-semibold',
                      overdue ? 'text-rose-500 dark:text-rose-400 animate-pulse' : 'text-zinc-450 dark:text-zinc-500'
                    )}>
                      {overdue ? <AlertTriangle className="size-3.5" /> : <Clock className="size-3.5" />}
                      <span>{getElapsedTime(order.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Items List */}
                <div className="p-4 flex-1 space-y-2">
                  {order.items?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl p-3 border border-zinc-200/30 dark:border-zinc-800/30"
                    >
                      <span className="size-9 shrink-0 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black text-sm border border-amber-500/10 shadow-sm">
                        {item.quantity}×
                      </span>
                      <span className="font-extrabold text-zinc-800 dark:text-zinc-200 text-sm leading-tight flex-1">
                        {item.name || `Item ${item.menu_item_id}`}
                      </span>
                      <Utensils className="size-3.5 text-zinc-300 dark:text-zinc-700 shrink-0" />
                    </div>
                  ))}
                </div>

                {/* Ticket Action Button Footer */}
                {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                  <div className="p-4 pt-0 flex gap-2">
                    {getActionButton(order)}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus(String(order.id), 'Cancelled');
                      }}
                      disabled={updatingId === String(order.id)}
                      className="size-12 shrink-0 rounded-xl border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 hover:text-red-600 transition cursor-pointer"
                      title="Cancel order"
                    >
                      <XCircle className="size-5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
          <ChefHat className="size-16 text-zinc-200 dark:text-zinc-850 mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-1">No Orders Found</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center max-w-xs px-4">
            {searchTerm
              ? `No orders matching "${searchTerm}"`
              : `Orders marked as "${filterStatus}" will appear here`}
          </p>
          {searchTerm && (
            <Button variant="outline" onClick={() => setSearchTerm('')} className="mt-4 rounded-xl cursor-pointer">
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* Side Sheet for Order Management & Live Billing */}
      <Sheet open={selectedOrder !== null} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl lg:max-w-lg border-l border-zinc-200 dark:border-zinc-800 flex flex-col p-0 bg-zinc-50 dark:bg-zinc-950 overflow-hidden shadow-2xl">
          <SheetHeader className="p-6 pb-4 border-b border-zinc-200/60 dark:border-zinc-855 bg-white dark:bg-zinc-900 shadow-sm shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-black tracking-widest leading-none">Active Table</p>
                <SheetTitle className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight mt-1.5">
                  Table {selectedOrder?.table_number?.toString().replace(/\D/g, '') || selectedOrder?.table_id || '...'}
                </SheetTitle>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-black tracking-widest leading-none">Order ID</p>
                <p className="text-lg font-black text-zinc-900 dark:text-zinc-150 mt-1.5">#{selectedOrder?.id}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4 items-center justify-between">
              <Badge
                className={cn(
                  'text-[9px] font-black px-3 py-1 rounded-full border-0 uppercase tracking-wider',
                  selectedOrder?.status === 'Pending' && 'bg-amber-500 text-zinc-950 hover:bg-amber-600',
                  selectedOrder?.status === 'Preparing' && 'bg-sky-500 text-white hover:bg-sky-600',
                  selectedOrder?.status === 'Ready' && 'bg-emerald-500 text-white hover:bg-emerald-600',
                  selectedOrder?.status === 'Completed' && 'bg-zinc-650 text-white hover:bg-zinc-700',
                  selectedOrder?.status === 'Cancelled' && 'bg-rose-600 text-white hover:bg-rose-700'
                )}
              >
                {selectedOrder?.status === 'Pending' && 'New / Naya'}
                {selectedOrder?.status === 'Preparing' && 'Cooking / Bana Rahe'}
                {selectedOrder?.status === 'Ready' && 'Ready / Taiyar'}
                {selectedOrder?.status === 'Completed' && 'Served / De Diya'}
                {selectedOrder?.status === 'Cancelled' && 'Cancelled / Radd'}
              </Badge>

              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
                <Clock className="size-4" />
                <span>{selectedOrder ? formatTime(selectedOrder.created_at) : ''}</span>
              </div>
            </div>
          </SheetHeader>

          {/* Side Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {/* Interactive Items Checklist */}
            <div className="space-y-3">
              <h3 className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
                <span>🍽️ Items Checklist</span>
                <span className="text-zinc-350 dark:text-zinc-750 font-normal">({selectedOrder?.items?.length || 0})</span>
              </h3>

              <div className="space-y-2">
                {selectedOrder?.items?.map((item: any, idx: number) => {
                  const itemKey = `${selectedOrder.id}-${idx}`;
                  const isChecked = !!checkedItems[itemKey];

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleItemCheck(selectedOrder.id, idx)}
                      className={cn(
                        'flex items-center gap-4 bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-200 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 select-none',
                        isChecked && 'bg-zinc-100/50 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800'
                      )}
                    >
                      <div className={cn(
                        'size-5 rounded border flex items-center justify-center transition-all',
                        isChecked ? 'bg-amber-500 border-amber-500 text-zinc-950' : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                      )}>
                        {isChecked && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex-1 flex items-center justify-between leading-tight">
                        <span className={cn(
                          'font-extrabold text-sm text-zinc-800 dark:text-zinc-100 transition-all',
                          isChecked && 'line-through text-zinc-400 dark:text-zinc-650 font-medium'
                        )}>
                          {item.name || `Item ${item.menu_item_id}`}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ml-3',
                          isChecked ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        )}>
                          {item.quantity} Qty
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thermal Receipt Billing Summary */}
            <div className="space-y-3">
              <h3 className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest">
                💸 Receipt Billing Summary
              </h3>

              {loadingBilling ? (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm flex items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-amber-500 mr-2" />
                  <span className="text-xs font-bold text-zinc-550">Billing breakdown compiling...</span>
                </div>
              ) : billingInfo && billingInfo.orders?.length > 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200/60 dark:border-zinc-800/40 shadow-md relative overflow-hidden font-mono text-xs">
                  {/* Subtle thermal paper side cuts */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-b from-zinc-100 dark:from-zinc-950 to-transparent" />
                  
                  <div className="text-center pb-4 border-b border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="font-extrabold tracking-widest text-zinc-900 dark:text-white uppercase">House Cafe</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Kitchen Bill Review</p>
                  </div>

                  <div className="py-4 space-y-2 border-b border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <div className="flex justify-between">
                      <span className="font-bold text-zinc-400">Subtotal (MRP)</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">₹{billingInfo.sub_total_before_discount ?? billingInfo.sub_total}</span>
                    </div>
                    {billingInfo.discount_total > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Combo Discount</span>
                        <span>- ₹{billingInfo.discount_total}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800/50 pt-2">
                      <span>Subtotal (After Disc)</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">₹{billingInfo.sub_total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (5%)</span>
                      <span>₹{billingInfo.gst_amount}</span>
                    </div>
                  </div>

                  {/* Grand Total Highlight */}
                  <div className="py-4 flex justify-between items-center bg-amber-500/10 dark:bg-amber-500/5 p-4 rounded-xl border border-amber-500/25 mt-3">
                    <div>
                      <span className="text-[9px] font-black uppercase text-amber-800/80 dark:text-amber-500 tracking-wider">Grand Total</span>
                      <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">₹{billingInfo.grand_total}</p>
                    </div>
                    <span className="bg-amber-500 text-zinc-950 font-black px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider shadow-sm">
                      Unpaid
                    </span>
                  </div>

                  {/* Show bill to customer before payment */}
                  <div className="mt-5 border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-4 space-y-3 font-sans">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleShowBillToCustomer}
                      disabled={showingBillToCustomer}
                      className="w-full h-11 rounded-xl border-amber-300 text-amber-800 font-bold cursor-pointer"
                    >
                      {showingBillToCustomer ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                      Show Bill to Customer
                    </Button>
                  </div>

                  {/* Quick Payment Options */}
                  <div className="mt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-4 space-y-3 font-sans">
                    <p className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
                      <TrendingUp className="size-3 text-emerald-500" />
                      Receive Table Payment:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        onClick={() => handlePayBill('cash')}
                        disabled={payingBill}
                        className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm active:scale-[0.97]"
                      >
                        <span className="flex items-center gap-1">
                          <Wallet className="size-3" />
                          Cash
                        </span>
                        <span className="text-[8px] opacity-75 font-bold">Nabad Payment</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePayBill('upi')}
                        disabled={payingBill}
                        className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm active:scale-[0.97]"
                      >
                        <span className="flex items-center gap-1">
                          <Smartphone className="size-3" />
                          UPI
                        </span>
                        <span className="text-[8px] opacity-75 font-bold">QR / Online</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePayBill('card')}
                        disabled={payingBill}
                        className="h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm active:scale-[0.97]"
                      >
                        <span className="flex items-center gap-1">
                          <CreditCard className="size-3" />
                          Card
                        </span>
                        <span className="text-[8px] opacity-75 font-bold">POS Terminal</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/20 text-center space-y-2">
                  <CheckCircle2 className="size-10 text-emerald-600 mx-auto animate-pulse" />
                  <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-400">Bill Cleared & Settled!</p>
                  <p className="text-xs text-zinc-450 dark:text-zinc-500">All orders for this table have been fully paid and cleared.</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="p-6 border-t border-zinc-200/60 dark:border-zinc-800/40 bg-white dark:bg-zinc-900 shadow-lg space-y-3 shrink-0">
            {selectedOrder && selectedOrder.status !== 'Completed' && selectedOrder.status !== 'Cancelled' && (
              <>
                {selectedOrder.status === 'Pending' && (
                  <Button
                    onClick={() => updateStatus(String(selectedOrder.id), 'Preparing')}
                    disabled={updatingId === String(selectedOrder.id)}
                    className="w-full h-15 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-md transition active:scale-[0.98] cursor-pointer"
                  >
                    {updatingId === String(selectedOrder.id) ? (
                      <Loader2 className="size-5 animate-spin mx-auto" />
                    ) : 'Start Cooking / Shuru Karein 🍳'}
                  </Button>
                )}

                {selectedOrder.status === 'Preparing' && (
                  <Button
                    onClick={() => updateStatus(String(selectedOrder.id), 'Ready')}
                    disabled={updatingId === String(selectedOrder.id)}
                    className="w-full h-15 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-md transition active:scale-[0.98] cursor-pointer"
                  >
                    {updatingId === String(selectedOrder.id) ? (
                      <Loader2 className="size-5 animate-spin mx-auto" />
                    ) : 'Ready / Taiyar Hai! 🔔'}
                  </Button>
                )}

                {selectedOrder.status === 'Ready' && (
                  <Button
                    onClick={() => updateStatus(String(selectedOrder.id), 'Completed')}
                    disabled={updatingId === String(selectedOrder.id)}
                    className="w-full h-15 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold text-base shadow-md transition active:scale-[0.98] cursor-pointer"
                  >
                    {updatingId === String(selectedOrder.id) ? (
                      <Loader2 className="size-5 animate-spin mx-auto" />
                    ) : 'Served / De Diya! 🍽️'}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => updateStatus(String(selectedOrder.id), 'Cancelled')}
                  disabled={updatingId === String(selectedOrder.id)}
                  className="w-full h-11 rounded-lg border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 hover:text-red-600 text-xs font-bold uppercase tracking-wider transition cursor-pointer mt-2"
                >
                  Cancel Order / Radd Karein ❌
                </Button>
              </>
            )}

            {selectedOrder && (selectedOrder.status === 'Completed' || selectedOrder.status === 'Cancelled') && (
              <div className="text-center py-2 text-xs text-zinc-400 font-bold uppercase tracking-wider">
                Order processing complete
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default OrdersManagement;
