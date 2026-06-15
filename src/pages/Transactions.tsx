import React, { useState, useEffect } from 'react';
import {
  Search,
  Receipt,
  Loader2,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import api from '../services/api';
import { formatDate } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const Transactions = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [period, setPeriod] = useState('7d');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, summaryRes] = await Promise.all([
        api.get(`/transactions/logs?period=${period}`),
        api.get(`/transactions/summary?period=${period}`),
      ]);
      setLogs(logsRes.data.data || []);
      setSummary(summaryRes.data.data);
    } catch {
      toast('Failed to load sales data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === 'ALL' || log.activity_type === filter;
    const matchesSearch =
      log.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.detail?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const periods = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
  ];

  const filters = [
    { label: 'All Logs', value: 'ALL' },
    { label: 'Sales', value: 'SALE' },
    { label: 'Stock Buys', value: 'INVENTORY_REFILL' },
    { label: 'Expenses', value: 'PETTY_EXPENSE' },
  ];

  const typeLabel: Record<string, string> = {
    SALE: 'Sale Receive',
    INVENTORY_REFILL: 'Stock Purchase',
    PETTY_EXPENSE: 'Outflow Expense',
    PETTY_REFILL: 'Petty Cash In',
  };

  return (
    <div className="space-y-6">
      {/* Banner Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md p-5 md:p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 shrink-0 shadow-md shadow-amber-500/10">
            <Activity className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-tight">Sales & Ledger</h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">Track daily revenue streams and operational outflows</p>
          </div>
        </div>

        <Tabs value={period} onValueChange={setPeriod} className="shrink-0">
          <TabsList className="bg-zinc-100 dark:bg-zinc-955 rounded-xl p-1 h-11 border border-zinc-200/50 dark:border-zinc-800/30">
            {periods.map((p) => (
              <TabsTrigger key={p.value} value={p.value} className="rounded-lg px-4 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-500 cursor-pointer">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Total Sales Inflow</CardTitle>
            <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500 tracking-tight">
              ₹{parseFloat(summary?.total_sales || 0).toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider">Operational Expenses</CardTitle>
            <ArrowDownRight className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-red-600 dark:text-red-500 tracking-tight">
              ₹{parseFloat(summary?.total_expenses || 0).toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 dark:bg-zinc-950 text-white rounded-2xl shadow-sm border border-zinc-850 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 relative z-10">
            <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Net Cash Position</CardTitle>
            <Wallet className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <p className="text-3xl font-black text-amber-500 tracking-tight">
              ₹{parseFloat(summary?.net_balance || 0).toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and search logs */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-555" size={18} />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-white/50 dark:bg-zinc-955/40 border-zinc-200 dark:border-zinc-800 rounded-xl w-full"
          />
        </div>

        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto overflow-x-auto shrink-0">
          <TabsList className="bg-zinc-100 dark:bg-zinc-955 rounded-xl p-1 h-11 border border-zinc-200/50 dark:border-zinc-800/30">
            {filters.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-500 cursor-pointer">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Logs Card list */}
      <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-8 animate-spin text-amber-500" />
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Loading Ledger...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt size={36} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-zinc-450 dark:text-zinc-500 font-bold uppercase tracking-wider text-xs">No transactions recorded for this range</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[580px]">
              <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/40">
                {filteredLogs.map((log, idx) => {
                  const isIncome = log.activity_type === 'SALE' || log.activity_type === 'PETTY_REFILL';
                  return (
                    <div key={idx} className="flex items-center gap-4 p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                      <div className={cn(
                        'size-10 rounded-xl flex items-center justify-center shrink-0 border',
                        isIncome 
                          ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-600 dark:text-emerald-500' 
                          : 'bg-amber-500/10 border-amber-500/10 text-amber-600 dark:text-amber-500'
                      )}>
                        {isIncome ? <ArrowUpRight className="size-5" /> : <ArrowDownRight className="size-5" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate">{log.source}</p>
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider rounded-md border-zinc-200 dark:border-zinc-800/80 text-zinc-500">
                            {typeLabel[log.activity_type] || log.activity_type}
                          </Badge>
                        </div>
                        {log.detail && (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{log.detail}</p>
                        )}
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 mt-1 md:hidden">
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className={cn('font-black text-base tracking-tight', isIncome ? 'text-emerald-600 dark:text-emerald-550' : 'text-red-600 dark:text-red-500')}>
                          {isIncome ? '+' : '-'}₹{parseFloat(log.amount).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 mt-0.5 hidden md:block">
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;
