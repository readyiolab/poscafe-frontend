import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  DollarSign,
  Users,
  ChefHat,
  Package,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Monitor,
  Wallet,
  Clock,
  ArrowRight,
  Utensils,
} from 'lucide-react';
import api, { SOCKET_ORIGIN } from '../services/api';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { pageShell, pageHeader, statGrid } from '@/lib/layout';
import { ServiceRequestsBar } from '@/components/ServiceRequestsBar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const StatCard = ({
  label,
  hint,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  hint: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'amber' | 'blue' | 'emerald' | 'stone';
}) => {
  const colors = {
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20',
    stone: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
  };
  return (
    <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold tracking-wider uppercase">{label}</p>
          <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{value}</p>
          <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 block uppercase tracking-wide">
            {hint}
          </span>
        </div>
        <div className={cn('size-12 rounded-xl flex items-center justify-center border shadow-sm', colors[color])}>
          <Icon className="size-6" />
        </div>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [caddy, setCaddy] = useState({ balance: 0, history: [] as any[] });
  const navigate = useNavigate();

  const [showDrawerDialog, setShowDrawerDialog] = useState(false);
  const [txType, setTxType] = useState<'refill' | 'spend'>('spend');
  const [txAmount, setTxAmount] = useState('');
  const [txReason, setTxReason] = useState('');
  const [savingTx, setSavingTx] = useState(false);

  // States for linked stock refill in petty cash drawer
  const [buyIngredient, setBuyIngredient] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [refillQty, setRefillQty] = useState('');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data.data);
    } catch {
      toast('Could not load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCaddyStatus = async () => {
    try {
      const res = await api.get('/petty-cash');
      setCaddy(res.data.data);
    } catch {
      /* optional feature */
    }
  };

  const fetchIngredients = async () => {
    try {
      setLoadingIngredients(true);
      const res = await api.get('/inventory', { params: { limit: 500, page: 1 } });
      setIngredients(res.data.data || []);
    } catch {
      toast('Failed to load ingredients dropdown', 'error');
    } finally {
      setLoadingIngredients(false);
    }
  };

  const calculatedUnitPrice = () => {
    const amt = parseFloat(txAmount);
    const qty = parseFloat(refillQty);
    if (!isNaN(amt) && !isNaN(qty) && qty > 0) {
      return (amt / qty).toFixed(2);
    }
    return null;
  };

  const handleAddDrawerTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !txReason) {
      toast('Please enter amount and reason.', 'error');
      return;
    }
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      toast('Enter a valid positive amount.', 'error');
      return;
    }

    let selectedIngredient = null;
    let qty = 0;
    if (txType === 'spend' && buyIngredient) {
      if (!selectedIngredientId) {
        toast('Please select an ingredient.', 'error');
        return;
      }
      qty = parseFloat(refillQty);
      if (isNaN(qty) || qty <= 0) {
        toast('Please enter a valid stock quantity.', 'error');
        return;
      }
      selectedIngredient = ingredients.find((i) => String(i.id) === String(selectedIngredientId));
      if (!selectedIngredient) {
        toast('Selected ingredient not found.', 'error');
        return;
      }
    }
    
    try {
      setSavingTx(true);
      // 1. Post transaction
      await api.post('/petty-cash/transaction', {
        type: txType,
        amount: amt,
        reason: txReason.trim()
      });

      // 2. If linking to inventory, perform refill
      if (txType === 'spend' && buyIngredient && selectedIngredient) {
        await api.post('/inventory/refill', {
          inventory_id: selectedIngredient.id,
          quantity_added: qty,
          unit_price: amt / qty,
        });
      }

      toast('Drawer transaction logged successfully!', 'success');
      setShowDrawerDialog(false);
      setTxAmount('');
      setTxReason('');
      setBuyIngredient(false);
      setSelectedIngredientId('');
      setRefillQty('');
      fetchCaddyStatus();
      fetchDashboardData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save transaction. Try again.';
      toast(msg, 'error');
    } finally {
      setSavingTx(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchCaddyStatus();
    fetchIngredients();

    const socket = io(SOCKET_ORIGIN);
    socket.on('new_order', fetchDashboardData);
    socket.on('order_status_updated', fetchDashboardData);
    socket.on('petty_cash_updated', fetchCaddyStatus);
    socket.on('inventory_updated', fetchIngredients);
    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-12 text-amber-600 animate-spin" />
          <p className="text-base font-semibold text-stone-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const { stats, recentOrders, stockAlerts } = data || {
    stats: { totalRevenue: 0, activeOrders: 0, totalStaff: 0, occupancy: 0 },
    recentOrders: [],
    stockAlerts: [],
  };

  const quickActions = [
    {
      label: 'Take Order',
      hint: 'New order billing',
      icon: Monitor,
      path: '/pos',
      color: 'from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-amber-500/10',
    },
    {
      label: 'Kitchen Screen',
      hint: 'View kitchen orders',
      icon: ChefHat,
      path: '/kitchen',
      color: 'from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 text-white shadow-zinc-900/10 dark:from-zinc-900 dark:to-zinc-950 dark:border dark:border-zinc-800',
    },
    {
      label: 'Stock Manager',
      hint: 'Check stock inventory',
      icon: Package,
      path: '/inventory',
      color: 'from-zinc-100 to-zinc-200 hover:from-zinc-200 hover:to-zinc-300 text-zinc-800 shadow-zinc-200/20 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-200 dark:border dark:border-zinc-800/40',
    },
  ];

  return (
    <div className={pageShell}>
      <ServiceRequestsBar />
      {/* Welcome header */}
      <div className={pageHeader}>
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-zinc-950 shadow-md">
            <Utensils className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Today's Overview</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold mt-0.5">
              Daily Operations Summary
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-200/40 dark:border-zinc-700/30">
          <Clock className="size-4 text-amber-500" />
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Live POS Terminal Active</span>
        </div>
      </div>

      {/* Quick action buttons — touch optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.path}
            type="button"
            onClick={() => navigate(action.path)}
            className={cn(
              'flex items-center gap-4 p-5 rounded-2xl font-bold shadow-lg cursor-pointer transform active:scale-[0.98] transition-all duration-200 min-h-[90px] border border-transparent bg-gradient-to-r',
              action.color
            )}
          >
            <action.icon className="size-8 shrink-0" />
            <div className="text-left">
              <p className="text-lg leading-tight font-extrabold">{action.label}</p>
              <p className="text-xs opacity-75 font-semibold mt-0.5 uppercase tracking-wide">{action.hint}</p>
            </div>
            <ArrowRight className="size-5 ml-auto opacity-70" />
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className={statGrid}>
        <StatCard
          label="Today's Sales"
          hint="Total daily revenue"
          value={`₹${Number(stats.totalRevenue || 0).toLocaleString('en-IN')}`}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          label="Active Orders"
          hint="Active kitchen orders"
          value={stats.activeOrders || 0}
          icon={ShoppingBag}
          color="amber"
        />
        <StatCard
          label="Staff Online"
          hint="Staff logged in"
          value={stats.totalStaff || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Tables Busy"
          hint="Table occupancy"
          value={`${stats.occupancy || 0}%`}
          icon={ChefHat}
          color="stone"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 min-w-0">
        {/* Recent orders */}
        <Card className="lg:col-span-2 border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-zinc-200/60 dark:border-zinc-800/60">
            <div>
              <h2 className="text-lg font-bold text-zinc-905 dark:text-zinc-50">Recent Orders</h2>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Latest updates</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-bold border-zinc-200 dark:border-zinc-800 h-10 px-4 cursor-pointer"
              onClick={() => navigate('/kitchen')}
            >
              Kitchen Screen <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </div>
          <div className="divide-y divide-zinc-200/30 dark:divide-zinc-800/40">
            {recentOrders.length > 0 ? (
              recentOrders.slice(0, 8).map((order: any) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => navigate('/kitchen')}
                  className="w-full flex items-center justify-between p-4 hover:bg-amber-500/5 dark:hover:bg-amber-500/5 transition-colors text-left active:bg-amber-500/10 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 flex items-center justify-center font-black text-lg border border-amber-500/25">
                      {order.table_number?.toString().replace(/\D/g, '') ||
                        order.table_id ||
                        '?'}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-800 dark:text-zinc-200">Order #{order.id}</p>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                        <Clock className="size-3.5 text-zinc-400" />
                        {new Date(order.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <p className="font-extrabold text-lg text-zinc-950 dark:text-white">₹{order.total_amount}</p>
                    <Badge
                      className={cn(
                        'text-xs font-bold rounded-lg border-0 px-2.5 py-1',
                        order.status === 'Completed'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20'
                          : order.status === 'Cancelled'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20'
                      )}
                    >
                      {order.status}
                    </Badge>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-16 text-center text-zinc-400 dark:text-zinc-500">
                <ShoppingBag className="size-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">No orders yet today</p>
              </div>
            )}
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Petty cash drawer */}
          <Card className="border-0 bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-2xl overflow-hidden shadow-lg border border-zinc-800/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Wallet className="size-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold">Cash in Drawer</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Petty cash drawer balance</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-4xl font-black tracking-tight text-white">
                  ₹{Number(caddy.balance || 0).toLocaleString('en-IN')}
                </p>
                <Button
                  onClick={() => {
                    setTxType('spend');
                    setTxAmount('');
                    setTxReason('');
                    setBuyIngredient(false);
                    setSelectedIngredientId('');
                    setRefillQty('');
                    setShowDrawerDialog(true);
                  }}
                  className="h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs font-bold px-3 cursor-pointer active:scale-95 transition"
                >
                  Log Action
                </Button>
              </div>
              {caddy.history.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Recent Drawer Actions</p>
                  {caddy.history.slice(0, 3).map((tx: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                      <span className="text-white/80 truncate max-w-[150px] font-medium">{tx.reason || 'Transaction'}</span>
                      <span className={tx.type === 'spend' ? 'text-red-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>
                        {tx.type === 'spend' ? '-' : '+'}₹{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock alerts */}
          <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="size-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">Low Stock</h3>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Items running low</p>
                </div>
              </div>
              {stockAlerts.length > 0 && (
                <Badge className="bg-red-500 text-white border-0 font-bold text-xs rounded-full px-2 py-0.5">{stockAlerts.length}</Badge>
              )}
            </div>
            <ScrollArea className="max-h-[240px]">
              {stockAlerts.length > 0 ? (
                <div className="divide-y divide-zinc-200/30 dark:divide-zinc-800/40">
                  {stockAlerts.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-red-500/[0.02]">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{item.name}</p>
                      <span className="text-xs font-black bg-red-500/10 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-lg border border-red-500/10">
                        {item.stock} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <CheckCircle2 className="size-10 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-semibold text-emerald-700">Stock levels are healthy</p>
                </div>
              )}
            </ScrollArea>
            {stockAlerts.length > 0 && (
              <div className="p-3 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30">
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl font-bold text-xs border-zinc-200 dark:border-zinc-800 cursor-pointer"
                  onClick={() => navigate('/inventory')}
                >
                  Restock Ingredients
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
       {/* Petty Cash Dialog */}
      <Dialog open={showDrawerDialog} onOpenChange={(open) => {
        setShowDrawerDialog(open);
        if (!open) {
          setTxAmount('');
          setTxReason('');
          setBuyIngredient(false);
          setSelectedIngredientId('');
          setRefillQty('');
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/40 text-zinc-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Manage Petty Cash Drawer</DialogTitle>
            <DialogDescription className="text-xs">
              Log manual cash inflow (refill) or outflow expense (spend) from the register.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDrawerTx} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Transaction Type</Label>
              <Select value={txType} onValueChange={(v: any) => {
                setTxType(v);
                if (v !== 'spend') {
                  setBuyIngredient(false);
                  setSelectedIngredientId('');
                  setRefillQty('');
                }
              }}>
                <SelectTrigger className="h-11 rounded-xl text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-905">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="spend">Expense (Outflow)</SelectItem>
                  <SelectItem value="refill">Deposit (Inflow)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {txType === 'spend' && (
              <div className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                <input
                  type="checkbox"
                  id="buyIngredient"
                  checked={buyIngredient}
                  onChange={(e) => {
                    setBuyIngredient(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedIngredientId('');
                      setRefillQty('');
                    }
                  }}
                  className="size-4 rounded border-zinc-350 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label
                  htmlFor="buyIngredient"
                  className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
                >
                  Buy Ingredient? (Auto updates stock)
                </label>
              </div>
            )}

            {txType === 'spend' && buyIngredient && (
              <div className="space-y-4 bg-zinc-50/50 dark:bg-zinc-800/20 p-4 rounded-xl border border-zinc-200/40 dark:border-zinc-800/40 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Ingredient Dropdown */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Select Ingredient
                  </Label>
                  {loadingIngredients ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 py-1">
                      <Loader2 className="size-3 animate-spin text-amber-600" />
                      <span>Loading ingredients...</span>
                    </div>
                  ) : (
                    <Select
                      value={selectedIngredientId}
                      onValueChange={(val) => {
                        setSelectedIngredientId(val);
                        // Auto populate description/reason with ingredient name
                        const item = ingredients.find((i) => String(i.id) === String(val));
                        if (item) {
                          setTxReason(`Bought ${item.name}`);
                        }
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <SelectValue placeholder="Choose ingredient..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-[200px]">
                        {ingredients.map((item: any) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name} ({item.current_stock} {item.unit} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Display Unit and Quantity Input */}
                {selectedIngredientId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Measured In / Unit
                      </Label>
                      <div className="h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 flex items-center px-3 text-sm font-bold text-zinc-650 dark:text-zinc-400">
                        {ingredients.find((i) => String(i.id) === String(selectedIngredientId))?.unit || '-'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Quantity
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. 5"
                        value={refillQty}
                        onChange={(e) => setRefillQty(e.target.value)}
                        className="h-11 rounded-xl text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Dynamically calculated stock cost / unit price details */}
                {selectedIngredientId && refillQty && txAmount && (
                  <div className="bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-800 dark:text-emerald-400 space-y-1">
                    <p className="font-bold flex justify-between">
                      <span>Calculated Unit Cost:</span>
                      <span>
                        ₹{calculatedUnitPrice()} /{' '}
                        {ingredients.find((i) => String(i.id) === String(selectedIngredientId))?.unit}
                      </span>
                    </p>
                    <p className="opacity-85 text-[10px]">
                      This will update the ingredient's average cost in the stock inventory automatically.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Amount (₹)</Label>
              <Input
                type="number"
                placeholder="e.g. 50"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="h-11 rounded-xl text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Reason / Description</Label>
              <Input
                placeholder="e.g. Bread purchase, Milk, Staff tea, Refill"
                value={txReason}
                onChange={(e) => setTxReason(e.target.value)}
                className="h-11 rounded-xl text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-6 border-t pt-4 border-zinc-200/20 dark:border-zinc-800/20">
              <Button type="button" variant="outline" onClick={() => setShowDrawerDialog(false)} className="rounded-xl h-11 cursor-pointer">Cancel</Button>
              <Button type="submit" disabled={savingTx || !txAmount || !txReason} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold border-none rounded-xl h-11 cursor-pointer">
                {savingTx ? <Loader2 className="size-4 animate-spin" /> : 'Confirm Log'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
