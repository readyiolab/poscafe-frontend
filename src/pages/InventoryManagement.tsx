import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Search,
  Plus,
  Loader2,
  Package,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Pencil,
  ChevronRight,
  Coins,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import api, { SOCKET_ORIGIN, LIST_ALL_PARAMS } from '../services/api';
import { INVENTORY_UNITS } from '@/lib/constants';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const InventoryManagement = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [usageData, setUsageData] = useState<any[]>([]);
  const [fetchingUsage, setFetchingUsage] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('refill');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [newItem, setNewItem] = useState({ name: '', unit: 'gm', current_stock: '', unit_price: '' });
  const [refillQty, setRefillQty] = useState('');
  const [totalPaid, setTotalPaid] = useState('');

  const fetchInventory = async () => {
    try {
      const res = await api.get('/inventory', { params: LIST_ALL_PARAMS });
      setInventory(res.data.data || []);
    } catch {
      toast('Failed to load stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    const socket = io(SOCKET_ORIGIN);
    socket.on('inventory_updated', fetchInventory);
    return () => {
      socket.disconnect();
    };
  }, []);

  const openItem = async (item: any, tab = 'refill') => {
    setSelectedItem(item);
    setActiveTab(tab);
    setRefillQty('');
    setTotalPaid('');
    setNewItem({
      name: item.name,
      unit: item.unit,
      current_stock: String(item.current_stock),
      unit_price: String(item.unit_price || 0),
    });
    if (tab === 'usage') {
      setFetchingUsage(true);
      try {
        const res = await api.get(`/inventory/${item.id}/usage`);
        setUsageData(res.data.data || []);
      } catch {
        setUsageData([]);
      } finally {
        setFetchingUsage(false);
      }
    }
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setUsageData([]);
  };

  const handleAddIngredient = async () => {
    if (!newItem.name || !newItem.current_stock) {
      toast('Fill name and starting stock', 'error');
      return;
    }
    try {
      setProcessing(true);
      await api.post('/inventory', {
        name: newItem.name,
        unit: newItem.unit,
        current_stock: parseFloat(newItem.current_stock),
        unit_price: Number(newItem.unit_price || 0),
      });
      setShowAddDialog(false);
      setNewItem({ name: '', unit: 'gm', current_stock: '', unit_price: '' });
      fetchInventory();
      toast('Ingredient added', 'success');
    } catch {
      toast('Could not add ingredient', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRefill = async () => {
    if (!selectedItem || !refillQty || !totalPaid) {
      toast('Enter quantity and amount paid', 'error');
      return;
    }
    const qty = parseFloat(refillQty);
    const paid = parseFloat(totalPaid);
    if (qty <= 0 || paid <= 0) return;

    try {
      setProcessing(true);
      await api.post('/inventory/refill', {
        inventory_id: selectedItem.id,
        quantity_added: qty,
        unit_price: paid / qty,
      });
      toast('Stock updated', 'success');
      closeDetail();
      fetchInventory();
    } catch {
      toast('Refill failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem || !newItem.name) return;
    try {
      setProcessing(true);
      await api.put(`/inventory/${selectedItem.id}`, {
        name: newItem.name,
        unit: newItem.unit,
        unit_price: Number(newItem.unit_price || 0),
      });
      toast('Updated', 'success');
      closeDetail();
      fetchInventory();
    } catch {
      toast('Update failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = inventory
    .filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aLow = parseFloat(a.current_stock) < 10;
      const bLow = parseFloat(b.current_stock) < 10;
      if (aLow && !bLow) return -1;
      if (!aLow && bLow) return 1;
      return 0;
    });

  const lowCount = inventory.filter((i) => parseFloat(i.current_stock) < 10).length;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-10 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 px-4 sm:px-6">
      {!selectedItem ? (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-6 shadow-sm">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white leading-tight">Stock & Inventory</h1>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black mt-1.5 flex items-center flex-wrap gap-2">
                <span>Ingredients Tracker</span>
                <span className="inline-block h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span>Restock Alerts Active</span>
                <span className="inline-block h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                {lowCount > 0 ? (
                  <span className="text-rose-500 font-black animate-pulse">{lowCount} Items Running Low</span>
                ) : (
                  <span className="text-emerald-500 font-bold">All Items Healthy</span>
                )}
              </p>
            </div>
            <Button 
              onClick={() => { setNewItem({ name: '', unit: 'gm', current_stock: '', unit_price: '' }); setShowAddDialog(true); }} 
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 border-none rounded-xl h-11 cursor-pointer font-extrabold text-sm shadow-md transition active:scale-[0.98] shrink-0"
            >
              <Plus className="size-4 mr-2 stroke-[3]" /> Add Ingredient
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-zinc-200/50 dark:border-zinc-800/40 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-md transition">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-wider">Total Items</p>
                  <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{inventory.length}</p>
                </div>
                <div className="size-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/10 shadow-sm">
                  <Layers className="size-6" />
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              'border border-zinc-200/50 dark:border-zinc-800/40 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-md transition',
              lowCount > 0 && 'border-rose-200 dark:border-rose-900/30 bg-rose-500/[0.01]'
            )}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-wider">Low Stock</p>
                  <p className={cn('text-3xl font-black tracking-tight', lowCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white')}>
                    {lowCount}
                  </p>
                </div>
                <div className={cn(
                  'size-12 rounded-2xl flex items-center justify-center border shadow-sm transition-all',
                  lowCount > 0 
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/10 animate-pulse' 
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-transparent'
                )}>
                  <AlertTriangle className="size-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-zinc-200/50 dark:border-zinc-800/40 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-md transition">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-wider">Inventory Value</p>
                  <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                    ₹{inventory.reduce((a, c) => a + parseFloat(c.current_stock) * parseFloat(c.unit_price || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/10 shadow-sm">
                  <Coins className="size-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Box */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <Input
              placeholder="Search ingredient... 🔍"
              className="pl-11 h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 text-sm focus-visible:ring-amber-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Ingredient cards list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const stockVal = parseFloat(item.current_stock);
              const low = stockVal < 10;
              return (
                <Card
                  key={item.id}
                  className={cn(
                    'cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-200 border border-zinc-200/50 dark:border-zinc-800/40 bg-white dark:bg-zinc-900/95 shadow-sm rounded-2xl overflow-hidden',
                    low && 'border-rose-200 dark:border-rose-900/40 bg-rose-500/[0.01]'
                  )}
                  onClick={() => openItem(item)}
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className={cn(
                          'size-10 rounded-xl flex items-center justify-center shrink-0 border',
                          low 
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/15' 
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-transparent'
                        )}>
                          <Package className="size-5" />
                        </div>
                        {low && (
                          <Badge className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border-none bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center">
                            <AlertTriangle className="size-3 mr-1" /> Reorder
                          </Badge>
                        )}
                      </div>
                      <p className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 mt-4 truncate">{item.name}</p>
                      
                      <p className="text-3xl font-black text-zinc-950 dark:text-white mt-2 flex items-baseline">
                        {stockVal.toFixed(1)}
                        <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 ml-1.5 uppercase tracking-wide">{item.unit}</span>
                      </p>
                    </div>

                    {/* Stock level progress meter */}
                    <div className="mt-5 space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-zinc-400">
                        <span>Stock Level</span>
                        <span className={cn(low ? 'text-rose-500 font-extrabold animate-pulse' : 'text-emerald-500')}>
                          {low ? 'Low Stock' : 'Healthy'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden shadow-inner border border-zinc-200/10">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            low ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          )}
                          style={{ width: `${Math.min(100, (stockVal / 50) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-550 dark:text-zinc-500 mt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                      <span className="font-semibold">Avg Cost: ₹{parseFloat(item.unit_price || 0).toFixed(2)} / {item.unit}</span>
                      <ChevronRight className="size-4 text-zinc-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <Card className="py-16 text-center border border-zinc-200/50 dark:border-zinc-800/40 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm">
              <Package className="size-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="font-bold text-zinc-705 dark:text-zinc-300">No ingredients in stock matching search</p>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* Detail View Header */}
          <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 p-5 shadow-sm">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={closeDetail} 
              className="rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950 size-11 shrink-0 cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="size-4.5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">{selectedItem.name}</h1>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-black mt-1 flex items-center gap-2">
                <span>Ingredient details</span>
                <span className="inline-block h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span>Current Stock: {parseFloat(selectedItem.current_stock).toFixed(2)} {selectedItem.unit}</span>
              </p>
            </div>
          </div>

          {/* Details Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'usage') openItem(selectedItem, 'usage'); }} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/60 p-1 rounded-2xl h-12 shadow-sm">
              <TabsTrigger value="refill" className="rounded-xl font-black text-xs uppercase tracking-wider transition-all data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 data-[state=active]:shadow-md cursor-pointer">Restock</TabsTrigger>
              <TabsTrigger value="usage" className="rounded-xl font-black text-xs uppercase tracking-wider transition-all data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 data-[state=active]:shadow-md cursor-pointer">Used In</TabsTrigger>
              <TabsTrigger value="edit" className="rounded-xl font-black text-xs uppercase tracking-wider transition-all data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 data-[state=active]:shadow-md cursor-pointer">Settings</TabsTrigger>
            </TabsList>

            {/* Restock Panel */}
            <TabsContent value="refill" className="mt-6">
              <Card className="max-w-xl border border-zinc-200/50 dark:border-zinc-800/40 bg-white dark:bg-zinc-900 rounded-2xl shadow-md">
                <CardHeader className="p-6 pb-4">
                  <CardTitle className="text-lg font-black text-zinc-900 dark:text-white">Add Ingredient Stock</CardTitle>
                  <CardDescription className="text-xs">Enter quantity purchased and total amount paid</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Quantity added ({selectedItem.unit})</Label>
                    <Input
                      type="number"
                      placeholder={`e.g. ${selectedItem.unit === 'gm' ? '1000' : '10'}`}
                      className="h-12 text-base rounded-xl border-zinc-200 dark:border-zinc-800"
                      value={refillQty}
                      onChange={(e) => setRefillQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total amount paid (₹)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      className="h-12 text-base rounded-xl border-zinc-200 dark:border-zinc-800"
                      value={totalPaid}
                      onChange={(e) => setTotalPaid(e.target.value)}
                    />
                  </div>
                  
                  {refillQty && totalPaid && (
                    <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-5 space-y-2.5 font-mono text-xs shadow-inner">
                      <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
                        <span>Calculated Unit Price:</span>
                        <span className="font-extrabold text-sm">₹{(parseFloat(totalPaid) / parseFloat(refillQty)).toFixed(2)} / {selectedItem.unit}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-500 border-t border-emerald-500/10 pt-2.5">
                        <span>Projected Stock Level:</span>
                        <span className="font-extrabold">{(parseFloat(selectedItem.current_stock) + parseFloat(refillQty)).toFixed(2)} {selectedItem.unit}</span>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-extrabold text-sm border-none rounded-xl cursor-pointer shadow-md transition active:scale-[0.98] mt-2" 
                    onClick={handleRefill} 
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="size-4 animate-spin mx-auto" />
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="size-4" />
                        Confirm Restock / Update Stock
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recipes Used In Panel */}
            <TabsContent value="usage" className="mt-6">
              <Card className="border border-zinc-200/50 dark:border-zinc-800/40 bg-white dark:bg-zinc-900 rounded-2xl shadow-md">
                <CardHeader className="p-6 pb-4">
                  <CardTitle className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <ChefHat className="size-5 text-amber-500 animate-pulse" /> Recipes Using This Item
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  {fetchingUsage ? (
                    <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-amber-500 size-7" /></div>
                  ) : usageData.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {usageData.map((u, i) => (
                        <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-zinc-200/40 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 shadow-sm">
                          <span className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">{u.name}</span>
                          <Badge className="font-black border-none bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs px-2.5 py-0.5 rounded-lg">
                            {u.quantity_used} {u.unit}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-zinc-400 dark:text-zinc-500">
                      <ChefHat className="size-10 mx-auto opacity-20 mb-2" />
                      <p className="font-bold text-sm">Not used in any recipes yet</p>
                      <p className="text-[10px] mt-0.5 text-zinc-400">Add this ingredient to a menu item recipe in Menu Management.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings/Edit Panel */}
            <TabsContent value="edit" className="mt-6">
              <Card className="max-w-xl border border-zinc-200/50 dark:border-zinc-800/40 bg-white dark:bg-zinc-900 rounded-2xl shadow-md">
                <CardHeader className="p-6 pb-4">
                  <CardTitle className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <Pencil className="size-4" /> Edit Ingredient Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-500">Ingredient Name</Label>
                    <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="h-12 text-sm rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-amber-500/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-500">Measurement Unit</Label>
                      <Select value={newItem.unit} onValueChange={(v) => setNewItem({ ...newItem, unit: v })}>
                        <SelectTrigger className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {INVENTORY_UNITS.map((u) => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-500">Cost price per unit (₹)</Label>
                      <Input type="number" value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} className="h-12 text-sm rounded-xl border-zinc-200 dark:border-zinc-800 focus-visible:ring-amber-500/20" />
                    </div>
                  </div>
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-extrabold text-sm border-none rounded-xl cursor-pointer shadow-md transition active:scale-[0.98] mt-2" 
                    onClick={handleUpdate} 
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="size-4 animate-spin mx-auto" />
                    ) : (
                      'Save Ingredient Settings'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Add Ingredient Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/40 text-zinc-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500">
                <Package className="size-5" />
              </span>
              <span>Add New Item</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Fill these 4 easy details to add a new item to your stock list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-left">
            {/* Step 1: Ingredient name */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                1. Item Name
              </Label>
              <Input
                placeholder="e.g. Milk, Sugar, Coffee beans, Bread..."
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="h-11 rounded-xl focus-visible:ring-amber-500/20 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
              />
              <p className="text-[10px] text-zinc-400 ml-0.5">Enter the name of the ingredient</p>
            </div>

            {/* Step 2: How is it measured */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                2. Measurement Unit
              </Label>
              <Select value={newItem.unit} onValueChange={(v) => setNewItem({ ...newItem, unit: v })}>
                <SelectTrigger className="h-11 rounded-xl text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-905">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {INVENTORY_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-400 ml-0.5">Select how this item is counted (Weight, Volume, Packets etc.)</p>
            </div>

            <Separator className="my-2 opacity-50" />

            {/* Step 3 & 4: Initial Stock & Cost Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  3. Starting Stock Quantity
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type="number"
                    placeholder="0"
                    value={newItem.current_stock}
                    onChange={(e) => setNewItem({ ...newItem, current_stock: e.target.value })}
                    className="h-11 rounded-xl pr-12 focus-visible:ring-amber-500/20 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                  />
                  <div className="absolute right-3 text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-wide">
                    {newItem.unit || 'units'}
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  How much do you have in stock right now?
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  4. Buying Price per Unit (₹)
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-zinc-400">₹</span>
                  <Input
                    type="number"
                    placeholder="e.g. 50"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                    className="h-11 rounded-xl pl-7 focus-visible:ring-amber-500/20 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Buying price for 1 {newItem.unit || 'unit'}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t pt-4 border-zinc-200/20 dark:border-zinc-800/20">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl h-11 cursor-pointer">Cancel</Button>
            <Button 
              onClick={handleAddIngredient} 
              disabled={processing || !newItem.name || !newItem.current_stock} 
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black border-none rounded-xl h-11 cursor-pointer shadow-md transition active:scale-[0.98]"
            >
              {processing ? (
                <Loader2 className="size-4 animate-spin mx-auto" />
              ) : (
                'Add to Stock'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagement;
