import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Loader2,
  Flame,
  Package,
  Clock,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { pageShell, pageHeader, statGrid } from '@/lib/layout';

const Analytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics?period=${period}`);
      setData(res.data.data);
    } catch {
      toast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const periods = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
  ];

  if (loading && !data) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-9 text-amber-500 animate-spin" />
        <p className="text-zinc-400 dark:text-zinc-500 font-bold text-xs uppercase tracking-wider">Compiling analytics reports...</p>
      </div>
    );
  }

  const metrics = data?.metrics || { totalRevenue: 0, totalOrders: 0 };
  const avgOrder = metrics.totalOrders > 0 ? metrics.totalRevenue / metrics.totalOrders : 0;
  const topItem = data?.topItems?.[0];
  const peakHour = data?.peakHours?.length
    ? [...data.peakHours].sort((a: any, b: any) => b.order_count - a.order_count)[0]
    : null;

  return (
    <div className={pageShell}>
      {/* Header Banner */}
      <div className={pageHeader}>
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 shrink-0 shadow-md shadow-amber-500/10">
            <Activity className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-tight">Analytics & Reports</h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">Visualize sales trends, busiest hours, and menu performance</p>
          </div>
        </div>

        <Tabs value={period} onValueChange={setPeriod} className="shrink-0 w-full md:w-auto overflow-x-auto">
          <TabsList className="bg-zinc-100 dark:bg-zinc-955 rounded-xl p-1 h-11 border border-zinc-200/50 dark:border-zinc-800/30 w-full md:w-auto inline-flex min-w-max">
            {periods.map((p) => (
              <TabsTrigger key={p.value} value={p.value} className="rounded-lg px-4 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-500 cursor-pointer">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Numerical metric summaries */}
      <div className={statGrid}>
        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Revenue</p>
            <p className="text-2xl font-black mt-1 text-zinc-900 dark:text-zinc-100 tracking-tight">
              ₹{metrics.totalRevenue?.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-black mt-1 text-zinc-900 dark:text-zinc-100 tracking-tight">
              {metrics.totalOrders}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Avg. Bill Ticket</p>
            <p className="text-2xl font-black mt-1 text-zinc-900 dark:text-zinc-100 tracking-tight">
              ₹{Math.round(avgOrder).toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 dark:bg-zinc-950 text-white rounded-2xl shadow-sm border border-zinc-850 relative overflow-hidden col-span-2 md:col-span-1 min-w-0">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
          <CardContent className="p-4 relative z-10">
            <p className="text-xs text-amber-500 font-bold flex items-center gap-1 uppercase tracking-wider">
              <Flame className="size-3.5 fill-amber-500" /> Best Seller Item
            </p>
            <p className="text-base font-extrabold mt-1 truncate text-white tracking-tight">
              {topItem?.name || '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales Area Chart and Busy Hours Bar Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <CardTitle className="text-base font-extrabold text-zinc-900 dark:text-white">Daily Revenue Flow</CardTitle>
            <CardDescription className="text-xs">Sales performance trajectory over period</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.revenueTrend || []}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800/40" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#71717a' }}
                    tickFormatter={(s) => formatDate(s).split(',')[0]}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(24, 24, 27, 0.95)', 
                      border: '1px solid rgba(63, 63, 70, 0.4)',
                      borderRadius: '0.75rem',
                      color: '#ffffff'
                    }}
                    labelStyle={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold' }}
                    formatter={(v: number) => [`₹${v}`, 'Sales']} 
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <CardTitle className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <Clock className="size-4.5 text-amber-500" /> Busiest Shop Hours
            </CardTitle>
            <CardDescription className="text-xs">
              {peakHour ? `Peak operations window around ${peakHour.hour}:00` : 'Hourly order distribution'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.peakHours || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800/40" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(24, 24, 27, 0.95)', 
                      border: '1px solid rgba(63, 63, 70, 0.4)',
                      borderRadius: '0.75rem',
                      color: '#ffffff'
                    }}
                    labelStyle={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="order_count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top items & stock consumption list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <CardTitle className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="size-4.5 text-amber-500" /> Best Performing Items
            </CardTitle>
            <CardDescription className="text-xs">Top sales rank by volume and turnover contribution</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {(data?.topItems || []).slice(0, 5).map((item: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-850 bg-white/50 dark:bg-zinc-900/40 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/15 flex items-center justify-center font-bold text-xs shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mt-0.5">{item.total_sold} units sold</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">₹{parseFloat(item.revenue).toLocaleString('en-IN')}</p>
                  <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-500 flex items-center gap-0.5 mt-0.5">
                    <ArrowUpRight size={10} />
                    <span>Top seller</span>
                  </p>
                </div>
              </div>
            ))}
            {(!data?.topItems || data.topItems.length === 0) && (
              <div className="py-10 text-center">
                <ShoppingCart size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-400 dark:text-zinc-550 font-bold uppercase tracking-wider">No sales reports logged</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <CardTitle className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <Package className="size-4.5 text-amber-500" /> Stock Ingredients Consumption
            </CardTitle>
            <CardDescription className="text-xs">Estimate remaining volumes based on recipe usage logs</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {(data?.inventoryConsumption || []).slice(0, 5).map((inv: any, idx: number) => {
              const low = parseFloat(inv.current_stock) < 5;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-850 dark:text-zinc-200">{inv.name}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'rounded-md text-[9px] font-bold uppercase border-0 px-2 py-0.5',
                        low ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      )}
                    >
                      {inv.current_stock} {inv.unit} left
                    </Badge>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-955 rounded-full overflow-hidden border border-zinc-200/20 dark:border-zinc-800/10">
                    <div
                      className={cn('h-full rounded-full transition-all', low ? 'bg-red-500' : 'bg-amber-500')}
                      style={{
                        width: `${Math.min((inv.total_consumed / (parseFloat(inv.current_stock) + inv.total_consumed || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-550">{inv.total_consumed} {inv.unit} consumed this period</p>
                </div>
              );
            })}
            {(!data?.inventoryConsumption || data.inventoryConsumption.length === 0) && (
              <div className="py-10 text-center">
                <Package size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-400 dark:text-zinc-550 font-bold uppercase tracking-wider">No stock usage compiled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
