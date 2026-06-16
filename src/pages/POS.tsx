import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Loader2,
  Utensils,
  User,
  Phone,
} from 'lucide-react';
import { usePOSStore } from '@/store/posStore';
import api, { API_ORIGIN, LIST_ALL_PARAMS } from '@/services/api';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

function resolveMenuImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_ORIGIN.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

function tableLabel(table: { table_number?: string | number } | null | undefined) {
  if (!table) return '';
  return String(table.table_number ?? '');
}

const STATUS_LABEL: Record<string, string> = {
  available: 'Free',
  occupied: 'Busy',
  reserved: 'Booked',
};

const POS = () => {
  const {
    cart,
    selectedTable,
    customerName,
    customerPhone,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setTable,
    setCustomerInfo,
    getSubtotal,
    getTaxAmount,
    getTotal,
    resetPOS,
  } = usePOSStore();

  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [processing, setProcessing] = useState(false);
  const [tablePickerExpanded, setTablePickerExpanded] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [customerPoints, setCustomerPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!customerPhone || !/^\d{10,15}$/.test(customerPhone)) {
      setCustomerPoints(null);
      return;
    }
    api.get('/customers/profile', { params: { phone: customerPhone } })
      .then((res) => setCustomerPoints(res.data?.data?.customer?.points_balance ?? null))
      .catch(() => setCustomerPoints(null));
  }, [customerPhone]);

  useEffect(() => {
    if (!selectedTable) {
      setTablePickerExpanded(true);
    }
  }, [selectedTable]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, menuRes, tableRes] = await Promise.all([
          api.get('/categories', { params: LIST_ALL_PARAMS }),
          api.get('/menu', { params: LIST_ALL_PARAMS }),
          api.get('/tables', { params: LIST_ALL_PARAMS }),
        ]);
        setCategories(catRes.data.data || []);
        setMenuItems(menuRes.data.data || []);
        setTables(tableRes.data.data || []);
      } catch {
        toast('Could not load menu. Check internet.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category_name === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && item.status !== 'inactive';
    });
  }, [menuItems, activeCategory, searchQuery]);

  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);

  const handleAddItem = (item: any) => {
    addItem({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      image: item.image_url,
      category: item.category_name,
    });
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!selectedTable) {
      toast('Please select a table first', 'error');
      return;
    }
    
    try {
      setProcessing(true);
      const res = await api.post('/orders/pos-checkout', {
        table_id: selectedTable?.id,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        coupon_code: couponCode || undefined,
        payment_method: paymentMethod,
        items: cart.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
        })),
      });

      const paid = res.data?.data?.payment?.total_paid ?? getTotal();
      setCartOpen(false);
      resetPOS();
      setCouponCode('');
      setCustomerPoints(null);
      toast(`Payment done! ₹${Number(paid).toFixed(0)} received ✅`, 'success');

      // Refresh dining tables floor status
      const tableRes = await api.get('/tables', { params: LIST_ALL_PARAMS });
      setTables(tableRes.data.data || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Payment failed. Try again.';
      toast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const CartContent = ({ compact = false }: { compact?: boolean }) => {
    const handleSelectTable = (t: any) => {
      setTable(t);
      setTablePickerExpanded(false);
    };

    return (
      <div className="flex flex-col flex-1 overflow-hidden h-full">
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
          {/* Table picker — High Contrast Grid or Collapsed Summary */}
          {selectedTable && !tablePickerExpanded ? (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shrink-0">
              <div className="flex items-center gap-2">
                <Utensils className="size-4 text-amber-500 shrink-0" />
                <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                  Table {selectedTable.table_number} Selected ({STATUS_LABEL[selectedTable.status || 'available'] || selectedTable.status})
                </span>
              </div>
              <button
                type="button"
                className="h-8 px-2.5 rounded-xl text-amber-600 dark:text-amber-400 font-extrabold hover:bg-amber-500/10 cursor-pointer text-xs transition"
                onClick={() => setTablePickerExpanded(true)}
              >
                Change / Badlo
              </button>
            </div>
          ) : (
            <div className="space-y-2 shrink-0 bg-zinc-50 dark:bg-zinc-950/20 p-3 rounded-2xl border border-zinc-200/50 dark:border-zinc-850/60 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-zinc-450 dark:text-zinc-555 uppercase tracking-widest">
                  Select Table / Table Chuno
                </p>
                {selectedTable && (
                  <button
                    type="button"
                    className="text-[10px] font-extrabold text-zinc-405 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer transition"
                    onClick={() => setTablePickerExpanded(false)}
                  >
                    Collapse / Chhupao ✕
                  </button>
                )}
              </div>
              <div className="max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                <div className="grid grid-cols-4 gap-2">
                  {tables.map((t) => {
                    const isSelected = selectedTable?.id === t.id;
                    const status = t.status || 'available';
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTable(t)}
                        className={cn(
                          'h-14 rounded-2xl border-2 text-xs font-black flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm',
                          isSelected
                            ? 'bg-amber-500 border-amber-600 text-zinc-955 shadow-md shadow-amber-500/20'
                            : status === 'occupied'
                              ? 'bg-red-600 border-red-700 text-white shadow-xs'
                              : 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                        )}
                      >
                        <span className="leading-none text-base font-extrabold">{t.table_number}</span>
                        <span className={cn('text-[9px] uppercase tracking-wider mt-1 font-bold', isSelected ? 'text-zinc-955' : 'text-white/90')}>
                          {status === 'occupied' ? 'Busy' : 'Free'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Guest info — inputs */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Guest Name / Naam</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-zinc-405" />
                <Input
                  placeholder="e.g. Guest"
                  className="h-12 pl-10 rounded-2xl border-zinc-200 dark:border-zinc-800 text-sm font-semibold focus-visible:ring-amber-500/25 bg-white dark:bg-zinc-950"
                  value={customerName}
                  onChange={(e) => setCustomerInfo(e.target.value, customerPhone)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Mobile Phone / Mobile</Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-zinc-405" />
                <Input
                  placeholder="optional"
                  className="h-12 pl-10 rounded-2xl border-zinc-200 dark:border-zinc-800 text-sm font-semibold focus-visible:ring-amber-500/25 bg-white dark:bg-zinc-955"
                  value={customerPhone}
                  onChange={(e) => setCustomerInfo(customerName, e.target.value)}
                />
              </div>
            </div>
          </div>
          {customerPoints !== null && (
            <p className="text-xs font-bold text-amber-600">Customer points: {customerPoints}</p>
          )}
          <div className="space-y-1.5 shrink-0">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Loyalty coupon code</Label>
            <Input
              placeholder="Optional coupon code"
              className="h-11 rounded-2xl border-zinc-200 dark:border-zinc-800 text-sm font-semibold uppercase"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            />
          </div>

          {/* Cart items list (rendered inline to scroll with container) */}
          <div className="border-y border-zinc-100 dark:border-zinc-800/65 py-2.5 space-y-2.5">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 bg-zinc-50 dark:bg-zinc-955/20 rounded-2xl p-2.5 border border-zinc-200/50 dark:border-zinc-850/60 shadow-sm"
              >
                <div className="size-12 shrink-0 rounded-xl overflow-hidden bg-zinc-105 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                  {item.image ? (
                    <img src={resolveMenuImageUrl(item.image) || ''} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Utensils className="size-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-zinc-900 dark:text-zinc-100 text-xs truncate leading-tight">{item.name}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-550 font-extrabold mt-0.5">
                    ₹{item.price} × {item.quantity} = <span className="text-amber-650 dark:text-amber-550 font-black">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </p>
                </div>

                {/* Adjuster */}
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 rounded-xl p-1 border border-zinc-250/80 dark:border-zinc-805 shadow-sm shrink-0">
                  <button
                    type="button"
                    className="size-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 active:scale-90"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    aria-label="Decrease"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-6 text-center font-black text-sm text-zinc-900 dark:text-zinc-150">{item.quantity}</span>
                  <button
                    type="button"
                    className="size-9 flex items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 active:scale-90"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label="Increase"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  className="size-9 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer shrink-0"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="text-center py-16 text-zinc-455 dark:text-zinc-650">
                <ShoppingCart className="size-12 mx-auto mb-3 opacity-30 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
                <p className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Cart is empty / Bill khali hai</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-1">Tap items in the catalog to prepare order</p>
              </div>
            )}
          </div>

          {/* Totals */}
          {cart.length > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-955/40 rounded-2xl p-4 border border-zinc-200/50 dark:border-zinc-800/40 space-y-2 shrink-0">
              <div className="flex justify-between text-xs text-zinc-555 font-bold">
                <span>Subtotal</span>
                <span>₹{getSubtotal().toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-555 font-bold">
                <span>GST (5%)</span>
                <span>₹{getTaxAmount().toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-150 dark:border-zinc-805 mt-2">
                <span className="font-extrabold text-zinc-800 dark:text-zinc-200 text-sm">Grand Total / Pura Bill</span>
                <span className="font-black text-2xl text-amber-600 dark:text-amber-500">₹{getTotal().toFixed(0)}</span>
              </div>
            </div>
          )}

          {/* Settle/Payment details */}
          {cart.length > 0 && (
            <div className="space-y-3 shrink-0 border-t border-zinc-150 dark:border-zinc-800/80 pt-3">
              <p className="text-[10px] font-black uppercase text-zinc-455 dark:text-zinc-555 tracking-wider">
                Bhugtan Mode / Payment Method
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash' as const, label: 'Cash', labelHin: 'Cash Se', color: 'emerald' },
                  { id: 'upi' as const, label: 'UPI', labelHin: 'QR Code', color: 'blue' },
                  { id: 'card' as const, label: 'Card', labelHin: 'Swipe', color: 'purple' },
                ].map((method) => {
                  const active = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={cn(
                        'py-4 rounded-2xl border-2 font-black text-xs flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm',
                        active
                          ? method.color === 'emerald'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20'
                            : method.color === 'blue'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                              : 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/20'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-550 hover:border-zinc-300 dark:text-zinc-400 dark:bg-zinc-950 bg-white'
                      )}
                    >
                      <span className="text-base font-black">
                        {method.id === 'cash' ? '💵' : method.id === 'upi' ? '📱' : '💳'} {method.label}
                      </span>
                      <span className={cn('text-[9px] font-extrabold mt-1 uppercase tracking-wide', active ? 'text-white/80' : 'text-zinc-400 dark:text-zinc-555')}>
                        {method.labelHin}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Checkout Actions */}
        <div className="pt-3 border-t border-zinc-150 dark:border-zinc-800/80 mt-3 flex gap-2.5 shrink-0 bg-white dark:bg-zinc-900">
          {cart.length > 0 && (
            <Button
              variant="outline"
              className="h-16 px-5 rounded-2xl border-zinc-200 dark:border-zinc-800 text-red-505 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold text-xs cursor-pointer active:scale-[0.97]"
              onClick={clearCart}
            >
              Clear / Saaf
            </Button>
          )}
          <Button
            className="flex-1 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-lg hover:shadow-emerald-500/20 border-none transition active:scale-[0.98] cursor-pointer"
            disabled={cart.length === 0 || !selectedTable || processing}
            onClick={handleCheckout}
          >
            {processing ? (
              <Loader2 className="size-6 animate-spin mx-auto" />
            ) : (
              <span className="flex items-center justify-center gap-2">
                Complete Bill / Payment Ok ✅
              </span>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Table statistics
  const totalTables = tables.length;
  const busyTables = tables.filter((t) => t.status === 'occupied').length;
  const freeTables = totalTables - busyTables;

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-9 text-amber-500 animate-spin" />
        <p className="text-zinc-400 dark:text-zinc-500 font-bold text-xs uppercase tracking-wider">Loading POS terminal...</p>
      </div>
    );
  }

  return (
    <div className="flex w-full h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3rem)] overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-2 sm:p-3 gap-2 sm:gap-3 min-w-0">
      {/* Main product search and catalog container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden gap-3">
        {/* Table Floor Statistics Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-805 p-3 flex flex-wrap items-center justify-between gap-4 shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-500">
              <Utensils className="size-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-zinc-900 dark:text-zinc-150 leading-tight">Rasoi Terminal / Cashier POS</h1>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-550 font-extrabold uppercase tracking-wider">Cafe Dining Floor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-center">
              <p className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Total Tables</p>
              <p className="text-base font-black text-zinc-900 dark:text-zinc-100 leading-none mt-1">{totalTables}</p>
            </div>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="text-center">
              <p className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-wider">Free / Khaali</p>
              <p className="text-base font-black text-emerald-555 leading-none mt-1">{freeTables}</p>
            </div>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="text-center">
              <p className="text-[9px] font-extrabold text-rose-500 uppercase tracking-wider">Busy / Bhara</p>
              <p className="text-base font-black text-rose-555 leading-none mt-1">{busyTables}</p>
            </div>
          </div>
        </div>

        {/* Horizontal Category pills list */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 px-0.5 scrollbar-hide shrink-0">
          {['All', ...categories.map((c) => c.name)].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'shrink-0 px-4 py-2.5 min-h-11 rounded-xl font-black text-xs whitespace-nowrap active:scale-95 cursor-pointer border transition-all',
                activeCategory === cat
                  ? 'bg-amber-500 text-zinc-955 border-amber-500 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )}
            >
              <span>{cat === 'All' ? 'All / Sab Items' : cat}</span>
            </button>
          ))}
        </div>

        {/* Search Input bar */}
        <div className="relative shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            placeholder="Search items by name / Item khojo..."
            className="h-11 pl-9 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs shadow-xs focus-visible:ring-amber-500/25 font-bold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Product grid — compact horizontal cards */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 pb-24 md:pb-4 pr-1.5 min-w-0">
            {filteredItems.map((item) => {
              const cartItem = cart.find((i) => i.id === item.id);
              const quantityInCart = cartItem ? cartItem.quantity : 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAddItem(item)}
                  className="relative flex gap-2.5 p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-855 text-left shadow-xs active:scale-[0.98] hover:border-amber-400/50 dark:hover:border-amber-500/30 transition-all cursor-pointer group"
                >
                  {quantityInCart > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md border border-white dark:border-zinc-900">
                      {quantityInCart} in Cart
                    </span>
                  )}
                  {item.image_url ? (
                    <div className="size-11 rounded-lg bg-zinc-50 dark:bg-zinc-955 overflow-hidden shrink-0 border border-zinc-200/40 dark:border-zinc-805">
                      <img
                        src={resolveMenuImageUrl(item.image_url) || ''}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="size-11 rounded-lg bg-amber-500/10 dark:bg-amber-500/5 text-amber-600 dark:text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/10">
                      <Utensils size={16} />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <p className="font-extrabold text-zinc-900 dark:text-zinc-155 text-xs leading-tight truncate">
                        {item.name}
                      </p>
                      <p className="text-[9px] text-zinc-455 dark:text-zinc-500 uppercase font-bold tracking-wider mt-0.5">{item.category_name}</p>
                    </div>
                    <p className="text-xs font-black text-amber-600 dark:text-amber-500 leading-none">₹{item.price}</p>
                  </div>
                </button>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="col-span-full py-20 text-center text-zinc-400 dark:text-zinc-650">
                <Search className="size-9 mx-auto mb-2 opacity-30" />
                <p className="font-bold text-xs uppercase tracking-wider">No matching items / Item nahi mila</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Desktop Billing sidebar */}
      <aside className="hidden md:flex w-[260px] lg:w-72 xl:w-[330px] shrink-0 flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800/80 p-3 shadow-xs overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-150 dark:border-zinc-800/60 shrink-0">
          <ShoppingCart className="size-4 text-amber-500" />
          <div>
            <h2 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 leading-tight">Order Bill</h2>
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Kaccha Bill</span>
          </div>
          {cartCount > 0 && (
            <Badge className="ml-auto bg-amber-500 text-zinc-955 font-bold px-2 py-0.5 rounded-full text-[10px] border-none">{cartCount}</Badge>
          )}
        </div>
        
        {/* Cart Form contents wrapper */}
        <div className="flex-1 flex flex-col justify-between gap-3 overflow-hidden mt-3">
          <CartContent />
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 p-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] safe-area-pb">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="relative flex items-center gap-2 bg-zinc-105 dark:bg-zinc-800 rounded-2xl px-5 py-3.5 font-bold text-zinc-700 dark:text-zinc-300 active:bg-zinc-200 dark:active:bg-zinc-700 cursor-pointer"
              >
                <ShoppingCart className="size-5" />
                <span>{cartCount} items</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 size-6 bg-amber-500 text-zinc-955 text-xs rounded-full flex items-center justify-center font-bold shadow-md">
                    {cartCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85dvh] rounded-t-3xl p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-col">
              <SheetHeader className="mb-4 flex flex-row items-center justify-between border-b pb-3 border-zinc-100 dark:border-zinc-800 shrink-0">
                <SheetTitle className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                  Cart Bill
                  <span className="block text-[10px] text-zinc-400 dark:text-zinc-550 font-semibold tracking-wider uppercase mt-0.5">Aapka Bill</span>
                </SheetTitle>
              </SheetHeader>
              <CartContent compact />
            </SheetContent>
          </Sheet>
          <div className="flex-1 text-right pr-2">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-550 uppercase tracking-wider font-semibold">Total Amount</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-500">₹{getTotal().toFixed(0)}</p>
          </div>
          <Button
            className="h-12 px-6 rounded-2xl bg-amber-500 text-zinc-955 hover:bg-amber-450 font-bold text-base border-none cursor-pointer"
            disabled={cart.length === 0}
            onClick={() => setCartOpen(true)}
          >
            Bill / Checkout 🧾
          </Button>
        </div>
      </div>
    </div>
  );
};

export default POS;
