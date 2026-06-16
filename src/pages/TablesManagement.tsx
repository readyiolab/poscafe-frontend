import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  QrCode,
  Trash2,
  Download,
  Users,
  Receipt,
  CreditCard,
  Banknote,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  LayoutGrid,
  RotateCcw,
  Smartphone,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import api, { SOCKET_ORIGIN, LIST_ALL_PARAMS } from '../services/api';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { pageShell, pageHeader } from '@/lib/layout';

const TablesManagement = () => {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [billData, setBillData] = useState<any>(null);
  const [fetchingBill, setFetchingBill] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showingBillToCustomer, setShowingBillToCustomer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('bill');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({ table_number: '', capacity: 4 });
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables', { params: LIST_ALL_PARAMS });
      setTables(res.data.data || []);
    } catch {
      toast('Failed to load tables', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    const socket = io(SOCKET_ORIGIN);
    socket.on('table_status_updated', fetchTables);
    socket.on('new_order', fetchTables);
    return () => {
      socket.disconnect();
    };
  }, []);

  const openTable = async (table: any) => {
    setSelectedTable(table);
    setActiveTab('bill');
    setPaymentSuccess(false);
    setBillData(null);
    setFormData({ table_number: table.table_number, capacity: table.capacity || 4 });
    setEditingId(table.id);
    try {
      setFetchingBill(true);
      const res = await api.get(`/billing/${table.id}`);
      setBillData(res.data.data);
    } catch {
      setBillData(null);
    } finally {
      setFetchingBill(false);
    }
  };

  const closeDetail = () => {
    setSelectedTable(null);
    setBillData(null);
    setPaymentSuccess(false);
    setEditingId(null);
  };

  const handlePayment = async (method: string) => {
    if (!selectedTable) return;
    try {
      setProcessingPayment(true);
      const res = await api.post('/billing/pay', {
        table_id: selectedTable.id,
        payment_method: method,
      });
      if (res.data.data.bill) setBillData(res.data.data.bill);
      setPaymentSuccess(true);
      fetchTables();
      toast('Payment recorded', 'success');
    } catch {
      toast('Payment failed', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleShowBillToCustomer = async () => {
    if (!selectedTable) return;
    try {
      setShowingBillToCustomer(true);
      await api.post('/billing/show-to-customer', { table_id: selectedTable.id });
      toast('Bill is now visible on customer phone', 'success');
    } catch (err: any) {
      toast(err.response?.data?.message || 'Could not show bill', 'error');
    } finally {
      setShowingBillToCustomer(false);
    }
  };

  const handleResetTable = async () => {
    if (!selectedTable || !window.confirm('Mark this table as free?')) return;
    try {
      await api.post(`/tables/${selectedTable.id}/reset`);
      toast('Table reset', 'success');
      closeDetail();
      fetchTables();
    } catch {
      toast('Reset failed', 'error');
    }
  };

  const handleSaveTable = async () => {
    if (!formData.table_number) return;
    try {
      setSaving(true);
      if (editingId && selectedTable) {
        await api.put(`/tables/${editingId}`, formData);
        toast('Table updated', 'success');
      } else {
        await api.post('/tables', formData);
        toast('Table created', 'success');
        setShowAddDialog(false);
      }
      fetchTables();
      if (selectedTable) {
        const updated = { ...selectedTable, ...formData };
        setSelectedTable(updated);
      }
    } catch {
      toast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!editingId || !window.confirm('Delete this table?')) return;
    try {
      await api.delete(`/tables/${editingId}`);
      toast('Table deleted', 'info');
      closeDetail();
      fetchTables();
    } catch {
      toast('Delete failed', 'error');
    }
  };

  const handleDownloadQR = () => {
    if (!selectedTable?.qr_code_url) return;
    const link = document.createElement('a');
    link.href = selectedTable.qr_code_url;
    link.download = `QR_${selectedTable.table_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = tables.filter((t) =>
    t.table_number?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  const occupied = tables.filter((t) => t.status === 'occupied').length;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-10 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className={pageShell}>
      {!selectedTable ? (
        <>
          <div className={pageHeader}>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Tables</h1>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">
                Layout Manager · {tables.length} total outlets · {occupied} active billing tables
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" asChild className="rounded-xl border-zinc-200 dark:border-zinc-800 h-11 cursor-pointer">
                <Link to="/transactions"><Receipt className="size-4 mr-2" /> Sales Log</Link>
              </Button>
              <Button onClick={() => { setFormData({ table_number: '', capacity: 4 }); setEditingId(null); setShowAddDialog(true); }} className="bg-amber-500 text-zinc-950 hover:bg-amber-400 border-none rounded-xl h-11 cursor-pointer font-bold">
                <Plus className="size-4 mr-2" /> Add Table
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-455" />
            <Input
              placeholder="Search table... / Khojo"
              className="pl-9 h-11 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Grid layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 min-w-0">
            {filtered.map((table) => (
              <Card
                key={table.id}
                className={cn(
                  'cursor-pointer hover:shadow-md transition-all active:scale-[0.98] border border-zinc-200/60 dark:border-zinc-800/40 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md',
                  table.status === 'occupied' ? 'border-orange-500 bg-orange-500/[0.02]' : 'border-emerald-500/30 bg-emerald-500/[0.01]'
                )}
                onClick={() => openTable(table)}
              >
                <CardContent className="p-5 text-center">
                  <div className={cn(
                    'size-14 mx-auto rounded-2xl flex items-center justify-center text-2xl font-black text-zinc-955 mb-4 shadow-sm border border-transparent',
                    table.status === 'occupied' ? 'bg-orange-500 text-zinc-950' : 'bg-emerald-500 text-zinc-950'
                  )}>
                    {table.table_number?.toString().replace(/\D/g, '') || table.id}
                  </div>
                  <p className="font-extrabold text-base text-zinc-900 dark:text-zinc-150 truncate">{table.table_number}</p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Badge variant={table.status === 'occupied' ? 'destructive' : 'secondary'} className={cn('text-[10px] font-bold px-2 py-0.5 border-0', table.status !== 'occupied' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-orange-500/10 text-orange-600 dark:text-orange-500')}>
                      {table.status === 'occupied' ? 'Busy' : 'Free'}
                    </Badge>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-semibold">
                      <Users className="size-3.5" /> {table.capacity}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            <button
              type="button"
              onClick={() => { setFormData({ table_number: '', capacity: 4 }); setShowAddDialog(true); }}
              className="min-h-[145px] rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-white/20 dark:bg-zinc-900/10 flex flex-col items-center justify-center text-zinc-400 hover:border-amber-400 hover:text-amber-600 dark:hover:border-amber-500/50 transition-all cursor-pointer"
            >
              <Plus className="size-8 mb-1.5" />
              <span className="text-xs font-bold uppercase tracking-wider">New Table</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200/60 dark:border-zinc-800/40 p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={closeDetail} className="rounded-xl border-zinc-200 dark:border-zinc-800 cursor-pointer">
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-tight">Table {selectedTable.table_number}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn('text-[10px] font-bold border-0 px-2 py-0.5', selectedTable.status === 'occupied' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-500' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500')}>
                    {selectedTable.status === 'occupied' ? 'Occupied' : 'Available'}
                  </Badge>
                  <span className="text-xs text-zinc-400 dark:text-zinc-550 flex items-center gap-1 font-semibold"><Users className="size-3.5" /> {selectedTable.capacity} capacity</span>
                </div>
              </div>
            </div>
            {selectedTable.status === 'occupied' && (
              <Button variant="destructive" className="rounded-xl font-bold h-11 cursor-pointer" onClick={handleResetTable}>
                <RotateCcw className="size-4 mr-2 animate-spin-slow" /> Reset Table
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-lg grid-cols-3 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-2xl">
              <TabsTrigger value="bill" className="rounded-xl font-bold"><Receipt className="size-4 mr-1.5 hidden sm:inline" /> Bill / Order</TabsTrigger>
              <TabsTrigger value="qr" className="rounded-xl font-bold"><QrCode className="size-4 mr-1.5 hidden sm:inline" /> QR Code</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl font-bold"><LayoutGrid className="size-4 mr-1.5 hidden sm:inline" /> Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="bill" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
                  <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <CardTitle className="text-lg font-bold">Active Bill Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {fetchingBill ? (
                      <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-amber-500 size-8" /></div>
                    ) : billData?.orders?.length > 0 ? (
                      <ScrollArea className="max-h-[400px]">
                        <div className="divide-y divide-zinc-250/20 dark:divide-zinc-800/30">
                          {billData.orders.flatMap((o: any) =>
                            o.items.map((item: any, i: number) => (
                              <div key={`${o.order_id}-${i}`} className="flex justify-between items-center p-4 bg-zinc-50/[0.01]">
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.quantity}× {item.name}</span>
                                <span className="font-black text-zinc-900 dark:text-white">₹{item.price * item.quantity}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="py-16 text-center text-zinc-400 dark:text-zinc-550">
                        <Receipt className="size-10 mx-auto opacity-30 mb-2" />
                        <p className="font-semibold">No active orders or unpaid items</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-2xl shadow-lg border border-zinc-850">
                  <CardHeader className="border-b border-white/10 pb-4">
                    <CardTitle className="text-white text-base font-semibold">Payment Summary</CardTitle>
                    {billData && (
                      <p className="text-5xl font-black text-white mt-3">₹{billData.grand_total}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {billData && (
                      <>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex justify-between"><span className="text-zinc-400">Subtotal</span><span className="font-bold">₹{billData.sub_total}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-400">GST 5%</span><span className="font-bold">₹{billData.gst_amount}</span></div>
                        </div>
                        <Separator className="bg-white/10" />
                      </>
                    )}

                    {paymentSuccess ? (
                      <div className="text-center py-6 space-y-4">
                        <CheckCircle2 className="size-16 text-emerald-400 mx-auto" />
                        <p className="font-black text-xl">Payment Completed!</p>
                        <Button variant="outline" className="w-full h-12 rounded-xl text-white hover:bg-white/10 cursor-pointer" onClick={closeDetail}>Return to Tables</Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="w-full h-12 rounded-xl text-white hover:bg-white/10 border-amber-400/40 text-amber-200 cursor-pointer font-bold"
                          disabled={showingBillToCustomer || !billData?.grand_total}
                          onClick={handleShowBillToCustomer}
                        >
                          {showingBillToCustomer ? <Loader2 className="size-4 animate-spin mr-2" /> : <Receipt className="size-4 mr-2" />}
                          Show Bill to Customer
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            className="h-16 flex-col gap-1.5 rounded-xl text-white hover:bg-white/5 border-white/10 cursor-pointer"
                            disabled={processingPayment || !billData?.grand_total}
                            onClick={() => handlePayment('cash')}
                          >
                            <Banknote className="size-6 text-emerald-400" /> Cash Payment
                          </Button>
                          <Button
                            className="h-16 flex-col gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl border-none cursor-pointer font-bold"
                            disabled={processingPayment || !billData?.grand_total}
                            onClick={() => handlePayment('card/upi')}
                          >
                            <Smartphone className="size-6 text-zinc-950" /> Card / UPI
                          </Button>
                        </div>
                        {(!billData?.grand_total || billData.grand_total === 0) && (
                          <Button variant="ghost" className="w-full text-red-400 hover:bg-white/5 rounded-xl cursor-pointer mt-2" onClick={handleResetTable}>
                            <RotateCcw className="size-4 mr-2" /> Force Free Table
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="qr" className="mt-4">
              <Card className="max-w-sm mx-auto border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
                <CardContent className="flex flex-col items-center py-8 gap-5">
                  {selectedTable.qr_code_url ? (
                    <>
                      <div className="p-3 bg-white rounded-2xl border shadow-sm">
                        <img src={selectedTable.qr_code_url} alt="QR" className="w-52 h-52 rounded-xl" loading="lazy" />
                      </div>
                      <p className="text-xs text-center text-zinc-550 leading-relaxed px-4">
                        Digital ordering active. Customers scan this QR to see the live menu and order from Table {selectedTable.table_number}.
                      </p>
                      <Button onClick={handleDownloadQR} className="rounded-xl h-11 bg-amber-500 text-zinc-950 font-bold border-none hover:bg-amber-400 cursor-pointer">
                        <Download className="size-4 mr-2" /> Download QR Image
                      </Button>
                    </>
                  ) : (
                    <p className="text-zinc-500 py-6">QR code not loaded. Check connection.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <Card className="max-w-md border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Edit Table Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Table Name / ID</Label>
                    <Input
                      value={formData.table_number}
                      onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Seat Capacity</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 4, 6, 8].map((cap) => (
                        <Button
                          key={cap}
                          type="button"
                          variant={formData.capacity === cap ? 'default' : 'outline'}
                          onClick={() => setFormData({ ...formData, capacity: cap })}
                          className="h-11 rounded-xl cursor-pointer"
                        >
                          {cap} Seats
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full h-11 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold border-none rounded-xl cursor-pointer" onClick={handleSaveTable} disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Save Settings
                  </Button>
                  <div className="flex gap-2 pt-4 border-t border-zinc-200/30 dark:border-zinc-800/40">
                    <Button variant="outline" className="flex-1 h-11 rounded-xl border-zinc-200 dark:border-zinc-800 cursor-pointer" onClick={handleResetTable}>
                      <RotateCcw className="size-4 mr-2" /> Reset Status
                    </Button>
                    <Button variant="destructive" size="icon" className="h-11 w-11 rounded-xl cursor-pointer" onClick={handleDeleteTable}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-550">Table number / identifier</Label>
              <Input
                placeholder="e.g. 10, T-05, Outdoor 2"
                value={formData.table_number}
                onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-550">Seat count</Label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 4, 6, 8].map((cap) => (
                  <Button
                    key={cap}
                    type="button"
                    variant={formData.capacity === cap ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, capacity: cap })}
                    className="h-11 rounded-xl cursor-pointer"
                  >
                    {cap}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t pt-4 border-zinc-200/20 dark:border-zinc-800/20">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl h-11 cursor-pointer">Cancel</Button>
            <Button onClick={handleSaveTable} disabled={saving || !formData.table_number} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold border-none rounded-xl h-11 cursor-pointer">Create Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablesManagement;
