import { useState, useEffect, useMemo, useCallback, type ComponentPropsWithoutRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import {
  Coffee,
  ShoppingBasket,
  Plus,
  Minus,
  Search,
  Receipt,
  Trash2,
  CheckCircle2,
  Loader2,
  Clock,
  ArrowRight,
  Menu,
  Home,
  Ticket,
  BellRing,
  MessageSquare,
  Sparkles,
  Zap,
  QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import api, { API_ORIGIN, LIST_ALL_PARAMS, SOCKET_ORIGIN } from '../services/api';
import { io } from 'socket.io-client';
import { toast } from '@/lib/toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from '@/lib/utils';

const CAFE_LOGO_SRC = '/logo.png';

function resolveMenuImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_ORIGIN.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseComboItemIds(raw: unknown, fallbackId?: unknown): number[] {
  if (Array.isArray(raw)) return raw.map(toNumber).filter((id) => id > 0);

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(toNumber).filter((id) => id > 0);
    } catch {
      // Ignore malformed combo payload and fall back to single item id
    }
  }

  const fallback = toNumber(fallbackId);
  return fallback > 0 ? [fallback] : [];
}

function allocateBundlePrices(itemIds: number[], menuById: Map<number, any>, offerPrice: number) {
  const basePaise = itemIds.map((id) => Math.round(toNumber(menuById.get(id)?.price) * 100));
  const sumBase = basePaise.reduce((acc, v) => acc + v, 0);
  const offerPaise = Math.round(toNumber(offerPrice) * 100);

  if (sumBase <= 0 || offerPaise <= 0 || offerPaise >= sumBase) return null;

  const shares = basePaise.map((bp, idx) => {
    const exact = (offerPaise * bp) / sumBase;
    const floor = Math.floor(exact);
    return { idx, floor, frac: exact - floor };
  });

  let used = shares.reduce((acc, s) => acc + s.floor, 0);
  let remainder = offerPaise - used;
  shares.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < shares.length && remainder > 0; i += 1) {
    shares[i].floor += 1;
    remainder -= 1;
  }
  shares.sort((a, b) => a.idx - b.idx);

  return shares.map((s) => s.floor / 100);
}

function getPricedCartItems(cart: any[], menuItems: any[], offers: any[]) {
  const menuById = new Map(menuItems.map(m => [m.id, m]));
  
  const remainingByMenuId = new Map<number, number>();
  const pricedUnitsByMenuId = new Map<number, number[]>();
  
  for (const item of cart) {
    const menuId = Number(item.id);
    const qty = Number(item.quantity) || 0;
    remainingByMenuId.set(menuId, (remainingByMenuId.get(menuId) || 0) + qty);
    pricedUnitsByMenuId.set(menuId, []);
  }

  const normalizedOffers = offers
    .map((offer) => {
      const comboItemIds = parseComboItemIds(offer.combo_items, offer.menu_item_id);
      const offerPrice = toNumber(offer.offer_price);
      const baseTotal = comboItemIds.reduce(
        (acc, id) => acc + toNumber(menuById.get(id)?.price),
        0
      );

      return {
        ...offer,
        itemIds: comboItemIds,
        offerPrice,
        savings: baseTotal - offerPrice,
      };
    })
    .filter((offer) => offer.itemIds.length > 0 && offer.savings > 0)
    .sort((a, b) => b.savings - a.savings);

  for (const offer of normalizedOffers) {
    const reqByMenuId = new Map<number, number>();
    for (const id of offer.itemIds) {
      reqByMenuId.set(id, (reqByMenuId.get(id) || 0) + 1);
    }

    let bundleCount = Infinity;
    for (const [id, reqQty] of reqByMenuId.entries()) {
      const available = remainingByMenuId.get(id) || 0;
      bundleCount = Math.min(bundleCount, Math.floor(available / reqQty));
    }
    if (!Number.isFinite(bundleCount) || bundleCount <= 0) continue;

    const expandedBundleItemIds = [];
    for (const [id, qty] of reqByMenuId.entries()) {
      for (let i = 0; i < qty; i += 1) expandedBundleItemIds.push(id);
    }

    for (let n = 0; n < bundleCount; n += 1) {
      const allocated = allocateBundlePrices(
        expandedBundleItemIds,
        menuById,
        offer.offerPrice
      );
      if (!allocated) break;

      for (let i = 0; i < expandedBundleItemIds.length; i += 1) {
        const id = expandedBundleItemIds[i];
        const price = allocated[i];
        pricedUnitsByMenuId.get(id)?.push(price);
        remainingByMenuId.set(id, (remainingByMenuId.get(id) || 0) - 1);
      }
    }
  }

  for (const [menuId, remainingQty] of remainingByMenuId.entries()) {
    const base = toNumber(menuById.get(menuId)?.price);
    for (let i = 0; i < remainingQty; i += 1) {
      pricedUnitsByMenuId.get(menuId)?.push(base);
    }
  }

  return cart.map(item => {
    const prices = pricedUnitsByMenuId.get(item.id) || [];
    const sum = prices.reduce((acc, p) => acc + p, 0);
    const avgPrice = prices.length > 0 ? Math.round(sum / prices.length) : item.price;
    return {
      ...item,
      displayPrice: avgPrice,
      displayTotal: sum,
    };
  });
}

type CafeLogoMarkProps = {
  size?: 'sm' | 'md' | 'lg';
  imgClassName?: string;
} & Omit<ComponentPropsWithoutRef<'div'>, 'children'>;

/** Same asset as Login / dashboard sidebar (`public/logo.png`). */
function CafeLogoMark({
  size = 'md',
  className,
  imgClassName,
  ...props
}: CafeLogoMarkProps) {
  const [imgOk, setImgOk] = useState(true);

  const frame =
    size === 'sm'
      ? 'h-11 w-11 rounded-xl p-1'
      : size === 'lg'
        ? 'h-[4.75rem] w-[4.75rem] rounded-[1.75rem] p-2'
        : 'h-14 w-14 rounded-2xl p-1.5';

  const iconClass =
    size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';

  if (!imgOk) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-gradient-to-br from-amber-700 to-stone-900 text-white shadow-lg shadow-amber-900/25 ring-1 ring-amber-200/50',
          frame,
          className
        )}
        {...props}
      >
        <Coffee className={iconClass} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden bg-white shadow-md shadow-amber-900/10 ring-1 ring-amber-200/70',
        frame,
        className
      )}
      {...props}
    >
      <img
        src={CAFE_LOGO_SRC}
        alt=""
        width={size === 'lg' ? 120 : size === 'sm' ? 44 : 56}
        height={size === 'lg' ? 120 : size === 'sm' ? 44 : 56}
        className={cn('h-full w-full object-contain', imgClassName)}
        onError={() => setImgOk(false)}
        decoding="async"
      />
    </div>
  );
}

const CustomerMenu = () => {
  const [searchParams] = useSearchParams();
  const tableToken = searchParams.get('table_token');
  const { cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount } = useCart();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [offers, setOffers] = useState([]);
  const [tableDetails, setTableDetails] = useState<any>(null);
  const [tableError, setTableError] = useState('');
  const [customerPhone, setCustomerPhone] = useState(localStorage.getItem('customer_phone') || '');
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const pricedCartItems = useMemo(() => {
    return getPricedCartItems(cart, menuItems, offers);
  }, [cart, menuItems, offers]);

  const displayCartTotal = useMemo(() => {
    return pricedCartItems.reduce((acc, item) => acc + item.displayTotal, 0);
  }, [pricedCartItems]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = phoneInput.trim();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    try {
      setSavingPhone(true);
      setPhoneError('');
      // Save customer phone in backend
      await api.post('/customers', { phone });
      localStorage.setItem('customer_phone', phone);
      setCustomerPhone(phone);
      toast('Welcome to House Cafe!', 'success');
    } catch (err: any) {
      console.error('Failed to save phone', err);
      const msg = err.response?.data?.message || 'Failed to verify. Please try again.';
      setPhoneError(msg);
    } finally {
      setSavingPhone(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const verifyTableAndFetchMenu = async () => {
      if (!tableToken) {
        setTableError('No table scanned. Please scan the QR code on your table again.');
        setLoading(false);
        return;
      }

      try {
        setTableError('');
        
        // Fetch table details by token
        const tableRes = await api.get(`/tables/by-token/${tableToken}`);
        if (cancelled) return;
        setTableDetails(tableRes.data.data);

        // Fetch menu
        setLoadError('');
        const [catRes, menuRes, offerRes] = await Promise.all([
          api.get('/categories', { params: LIST_ALL_PARAMS }),
          api.get('/menu', { params: LIST_ALL_PARAMS }),
          api.get('/offers', { params: LIST_ALL_PARAMS })
        ]);

        if (cancelled) return;

        setCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
        setMenuItems(Array.isArray(menuRes.data?.data) ? menuRes.data.data : []);
        setOffers(Array.isArray(offerRes.data?.data) ? offerRes.data.data : []);
      } catch (err: any) {
        console.error('Failed to initialize customer menu', err);
        if (!cancelled) {
          setTableError(err.response?.data?.message || 'Invalid table scan. Please scan the QR code again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    verifyTableAndFetchMenu();

    return () => {
      cancelled = true;
    };
  }, [tableToken]);

  useEffect(() => {
    if (!tableDetails?.id) return;

    const socket = io(SOCKET_ORIGIN, { transports: ['websocket', 'polling'] });

    socket.on('table_status_updated', (data) => {
      if (data && Number(data.table_id) === Number(tableDetails.id) && data.status === 'available') {
        localStorage.removeItem('customer_phone');
        clearCart();
        setCustomerPhone('');
        setPhoneInput('');
        setOrderSuccess(false);
        toast('Your session has ended. Thank you! 🙏', 'info');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [tableDetails?.id, clearCart]);

  const handlePlaceOrder = async () => {
    if (!tableToken || !tableDetails) {
      toast('Please scan the QR code on your table again', 'error');
      return;
    }

    try {
      setPlacingOrder(true);
      const orderData = {
        table_token: tableToken,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity
        }))
      };

      await api.post('/orders', orderData);
      setOrderSuccess(true);
      clearCart();
      toast('Order sent to kitchen!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Order failed. Please try again.';
      toast(msg, 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleClaimOffer = useCallback((offer) => {
    const comboItemIds = parseComboItemIds(offer.combo_items, offer.menu_item_id);
    comboItemIds.forEach(id => {
      const item = menuItems.find(m => m.id === id);
      if (item) {
        addToCart(item);
      }
    });
  }, [addToCart, menuItems]);

  const filteredItems = useMemo(() => {
    const categoryFiltered =
      activeCategory === 'All'
        ? menuItems
        : menuItems.filter((item) => item.category_name === activeCategory);

    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoryFiltered;

    return categoryFiltered.filter(
      (item) =>
        (item.name && String(item.name).toLowerCase().includes(q)) ||
        (item.description && String(item.description).toLowerCase().includes(q))
    );
  }, [activeCategory, menuItems, searchQuery]);

  if (!tableToken || tableError) return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-amber-50 via-stone-50 to-amber-100/80 px-8 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.15),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(120,113,108,0.08),_transparent_50%)]" />
      <div className="relative space-y-8 max-w-sm">
        <CafeLogoMark size="lg" className="mx-auto shadow-xl ring-amber-200/80" />
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-white/90 text-amber-700 shadow-lg shadow-amber-900/10 ring-1 ring-amber-200/60">
          <QrCode className="h-10 w-10" strokeWidth={1.25} aria-hidden />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            {tableError ? 'Invalid Scan' : 'Scan QR to Order'}
          </h2>
          <p className="text-stone-600 text-base leading-relaxed">
            {tableError || 'Please scan the QR code on your table to see the menu.'}
          </p>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-stone-50 to-stone-100 pb-8">
      <div className="sticky top-0 z-10 border-b border-amber-200/40 bg-stone-50/90 backdrop-blur-md px-5 pt-10 pb-6">
        <Skeleton className="h-8 w-40 rounded-lg mb-4 bg-stone-200/80" />
        <Skeleton className="h-12 w-full max-w-md rounded-2xl bg-stone-200/80" />
        <div className="flex gap-2 mt-6 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-full bg-stone-200/80" />
          ))}
        </div>
      </div>
      <div className="px-5 pt-8 space-y-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 rounded-3xl border border-stone-200/60 bg-white/70 p-4 shadow-sm">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-3/4 rounded-md bg-stone-200/80" />
              <Skeleton className="h-3 w-full rounded-md bg-stone-200/60" />
              <Skeleton className="h-3 w-2/3 rounded-md bg-stone-200/60" />
              <Skeleton className="h-9 w-24 rounded-full bg-stone-200/80" />
            </div>
            <Skeleton className="h-28 w-28 shrink-0 rounded-2xl bg-stone-200/80" />
          </div>
        ))}
      </div>
      <div className="flex justify-center pt-10 gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        <div className="h-1.5 w-1.5 rounded-full bg-amber-400/60 animate-pulse [animation-delay:150ms]" />
        <div className="h-1.5 w-1.5 rounded-full bg-amber-400/40 animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  );

  if (!customerPhone) return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-amber-50 via-stone-50 to-amber-100/80 px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.15),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(120,113,108,0.08),_transparent_50%)]" />
      
      <div className="relative w-full max-w-md border border-amber-200/60 bg-white/95 shadow-xl shadow-amber-900/10 rounded-[2rem] p-6 sm:p-8 backdrop-blur-sm z-10 space-y-6">
        <div className="space-y-4">
          <CafeLogoMark size="lg" className="mx-auto shadow-lg ring-white/50" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">Welcome to House Cafe</h2>
            <p className="text-stone-600 text-sm leading-relaxed">
              Please enter your mobile number to view the menu.
            </p>
          </div>
        </div>

        <form onSubmit={handlePhoneSubmit} className="space-y-4 text-left">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 block mb-1">
              Mobile Number
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                +91
              </span>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                value={phoneInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPhoneInput(val);
                  if (phoneError) setPhoneError('');
                }}
                className="h-12 pl-16 rounded-2xl border-stone-200 bg-white text-base shadow-sm focus-visible:border-amber-400 focus-visible:ring-amber-400/30 font-bold tracking-wider"
                autoComplete="tel"
                required
              />
            </div>
            {phoneError && (
              <p className="text-xs font-semibold text-rose-500 mt-1.5 animate-in fade-in slide-in-from-top-1">
                {phoneError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={savingPhone || phoneInput.length < 10}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-800 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-amber-900/25 hover:from-amber-700 hover:to-amber-900 transition active:scale-[0.98] disabled:opacity-40 cursor-pointer"
          >
            {savingPhone ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              <span className="flex items-center justify-center gap-2">
                Proceed to Menu
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        <p className="text-[10px] font-medium text-stone-400 text-center">
          By continuing, you agree to receive order notifications & special updates.
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-dvh bg-stone-100 flex justify-center items-center">
      <div className="relative w-full max-w-md h-dvh overflow-hidden bg-gradient-to-b from-amber-50/90 via-stone-50 to-amber-100/50 shadow-2xl border-x border-stone-200/50 flex flex-col">
        
        {/* SCROLLABLE MAIN CONTENT AREA */}
        <div className={cn(
          "flex-1 overflow-y-auto no-scrollbar transition-all duration-300",
          cartCount > 0 ? "pb-24" : "pb-6"
        )}>
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(251,191,36,0.18),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(214,211,209,0.35),transparent_45%)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23787169%22%20fill-opacity%3D%220.08%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />
          <header className="sticky top-0 z-30 border-b border-stone-200/40 bg-stone-50/90 backdrop-blur-md shadow-sm">
            <div className="mx-auto flex w-full flex-col gap-3.5 px-4 pb-3.5 pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <CafeLogoMark size="sm" className="shadow-md" aria-hidden />

                  <div className="min-w-0 pt-0.5">
                    <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800/90">
                      Table {tableDetails?.table_number || '...'} • Welcome! 🙏
                    </p>
                    <h1 className="text-lg font-bold tracking-tight text-stone-950">
                      What would you like today? 🍔
                    </h1>
                  </div>
                </div>
                <div className="flex h-11 min-w-[2.75rem] items-center justify-center rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 px-3 text-sm font-semibold text-white shadow-md shadow-amber-900/20 ring-1 ring-white/20">
                  {tableDetails?.table_number || '...'}
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
                <Input
                  type="search"
                  placeholder="Search for tasty food... 🔍"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-2xl border-stone-200/80 bg-white/90 pl-11 pr-4 text-xs shadow-inner shadow-stone-900/5 placeholder:text-stone-400 focus-visible:border-amber-400 focus-visible:ring-amber-400/20 transition-all"
                  autoComplete="off"
                />
              </div>

              <div className="relative -mx-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-stone-50 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-stone-50 to-transparent" />
                <div className="flex gap-2 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('All')}
                    className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                      activeCategory === 'All'
                        ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md shadow-amber-900/20'
                        : 'bg-white/80 text-stone-600 border border-stone-200/70 hover:bg-stone-50/80'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.name)}
                      className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                        activeCategory === cat.name
                          ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md shadow-amber-900/20'
                          : 'bg-white/80 text-stone-600 border border-stone-200/70 hover:bg-stone-50/80'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          {offers.length > 0 && (
            <section className="px-4 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-800">
                  <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-500 animate-pulse" />
                  🔥 Special Offers & Deals
                </h2>
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50/60 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-900"
                >
                  Limited Time!
                </Badge>
              </div>
              <div className="-mx-1 flex gap-3.5 overflow-x-auto pb-2 px-1 no-scrollbar">
                {offers.map((offer) => {
                  const comboItemIds =
                    typeof offer.combo_items === 'string'
                      ? JSON.parse(offer.combo_items || '[]')
                      : offer.combo_items || [offer.menu_item_id];
                  const linkedItems = menuItems.filter((m) => comboItemIds.includes(m.id));
                  const originalTotal = linkedItems.reduce((acc, curr) => acc + parseFloat(curr.price), 0);

                  return (
                    <div
                      key={offer.id}
                      className="relative min-w-[240px] overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950 p-4 text-white shadow-lg shadow-amber-950/20 ring-1 ring-white/10 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-500/20 blur-2xl" />
                      <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-40 rounded-full bg-orange-500/10 blur-2xl" />
                      <div className="relative z-10 flex min-h-[110px] flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold leading-snug tracking-tight">{offer.title}</h3>
                            {linkedItems.length > 1 && (
                              <Badge className="border-none bg-amber-500 px-1.5 py-0 text-[8px] font-black uppercase tracking-wider text-stone-950 hover:bg-amber-500">
                                Combo
                              </Badge>
                            )}
                          </div>
                          <p className="line-clamp-2 text-[10px] font-medium leading-relaxed text-white/70">
                            {offer.description}
                          </p>
                        </div>

                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-white/50">
                              Deal Price
                            </span>
                            <div className="mt-0.5 flex flex-wrap items-baseline gap-1">
                              <span className="text-lg font-black tracking-tight">
                                ₹{offer.offer_price || originalTotal}
                              </span>
                              {offer.offer_price && originalTotal > offer.offer_price && (
                                <span className="text-[10px] text-white/40 line-through">₹{originalTotal}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleClaimOffer(offer)}
                            className="shrink-0 rounded-xl bg-white px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-stone-900 shadow-md transition hover:bg-amber-50 active:scale-95 cursor-pointer"
                          >
                            Add Deal
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="space-y-3 px-4 pt-4 pb-2">
            {filteredItems.map((item) => {
              const cartItem = cart.find(i => i.id === item.id);
              return (
                <div key={item.id} className="group">
                  <div className="group/item flex items-stretch gap-3.5 rounded-2xl border border-stone-200/70 bg-white/90 p-3 shadow-sm transition hover:border-amber-200/50 hover:shadow-md">
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold leading-snug tracking-tight text-stone-900">
                            {item.name}
                          </h3>
                          {item.status === 'sold_out' && (
                            <Badge className="h-4.5 rounded-md border-none bg-rose-50 px-1.5 py-0 text-[8px] font-bold uppercase tracking-wider text-rose-600">
                              SOLD OUT
                            </Badge>
                          )}
                        </div>
                        <p className="line-clamp-2 text-[11px] leading-normal text-stone-500">
                          {item.description || 'Our special menu item - highly recommended! ⭐'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-black tracking-tight text-stone-900">₹{item.price}</span>
                        {item.category_name ? (
                          <>
                            <span className="text-stone-300">·</span>
                            <span className="truncate text-[9px] font-bold uppercase tracking-wider text-stone-400">
                              {item.category_name}
                            </span>
                          </>
                        ) : null}
                      </div>

                      <div className="pt-0.5">
                        {cartItem ? (
                          <div className="flex w-fit items-center rounded-xl bg-stone-900 p-0.5 shadow-sm animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10 active:scale-90"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                            <span className="min-w-[1.75rem] px-1 text-center text-xs font-bold text-white">
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition hover:bg-white/10 active:scale-90"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            disabled={item.status === 'sold_out'}
                            className="h-8 min-w-[84px] rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer hover:from-amber-700 hover:to-amber-900"
                          >
                            + Add to Plate
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200/80">
                      {(() => {
                        const imageSrc = resolveMenuImageUrl(item.image_url);
                        return imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-100 to-amber-50">
                            <Coffee className="h-6 w-6 text-stone-300" strokeWidth={1.25} />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white/50 py-12 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                  <Search className="h-6 w-6" strokeWidth={1.25} />
                </div>
                <p className="text-xs font-bold text-stone-800">
                  {searchQuery.trim() ? 'No items found!' : 'This category is currently empty.'}
                </p>
                <p className="mt-1 max-w-xs text-[11px] text-stone-500 px-4">
                  Try searching for something else or switch categories.
                </p>
                {searchQuery.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 rounded-full border-stone-200 text-xs"
                    onClick={() => setSearchQuery('')}
                  >
                    Reset Search
                  </Button>
                ) : null}
              </div>
            )}
          </div>

          {loadError ? (
            <div className="px-4 pb-4 pt-6">
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {loadError}
              </div>
            </div>
          ) : null}
        </div>

        {/* FIXED APP-STYLE FLOATING CART TRIGGER BAR */}
        <Sheet>
          {cartCount > 0 && (
            <SheetTrigger asChild>
              <div className="absolute bottom-5 left-4 right-4 z-50">
                <button
                  type="button"
                  className="group flex h-15 w-full items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900 px-5 shadow-2xl shadow-amber-950/35 ring-1 ring-white/10 transition active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex flex-col text-left">
                    <span className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200/90">
                      View Plate 🛒
                    </span>
                    <span className="text-lg font-black tracking-tight text-white">₹{displayCartTotal}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-xs font-bold text-white">
                      {cartCount}
                    </div>
                    <ArrowRight className="h-4 w-4 text-white transition group-hover:translate-x-0.5" strokeWidth={2} />
                  </div>
                </button>
              </div>
            </SheetTrigger>
          )}

          <SheetContent
            side="bottom"
            className="mx-auto flex h-[85vh] max-h-[85vh] w-full max-w-md flex-col rounded-t-[2.5rem] border-x border-t border-stone-200/60 bg-gradient-to-b from-stone-50 to-white px-0 shadow-2xl transition-all duration-300 left-0 min-[448px]:left-1/2 min-[448px]:-translate-x-1/2 bottom-0"
          >
            <SheetHeader className="flex flex-row items-center justify-between border-b border-stone-200/80 px-6 py-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-stone-500">
                  Plate Review
                </span>
                <SheetTitle className="text-base font-bold tracking-tight text-stone-900">
                  Review Your Order
                </SheetTitle>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-200/60 bg-amber-50/90 px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-800" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-900/80">
                  ~15 Min ⚡
                </span>
              </div>
            </SheetHeader>

            <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {pricedCartItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 py-1.5 border-b border-stone-100 last:border-0">
                  <div className="flex gap-3 min-w-0">
                    <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center font-bold text-xs text-stone-900 border border-stone-200/50">
                      {item.quantity}×
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-bold text-xs text-stone-800 tracking-tight truncate leading-tight">{item.name}</h4>
                      <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">₹{item.displayPrice} per plate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-bold text-sm text-stone-900 tracking-tight">₹{item.displayTotal}</span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="rounded-lg p-1 text-stone-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && !orderSuccess && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-stone-400">
                  <ShoppingBasket className="mb-4 h-12 w-12 opacity-40" strokeWidth={1} />
                  <p className="text-xs font-bold text-stone-600">Your plate is empty! 🥺</p>
                  <p className="mt-1 max-w-[220px] text-[11px] text-stone-500 px-4">
                    Add tasty items from the menu to see them here.
                  </p>
                </div>
              )}

              {orderSuccess && (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner ring-4 ring-emerald-50">
                    <CheckCircle2 className="h-8 w-8" strokeWidth={1.25} />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-stone-900">Order sent to the kitchen! 🍳</h3>
                  <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-stone-600">
                    The kitchen has received your order and is preparing it right now.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setOrderSuccess(false)}
                    className="mt-6 h-11 rounded-2xl bg-stone-950 hover:bg-stone-900 px-8 text-xs font-semibold uppercase tracking-wider text-white shadow-md cursor-pointer"
                  >
                    Order More
                  </Button>
                </div>
              )}
            </div>

            {!orderSuccess && cart.length > 0 && (
              <SheetFooter className="gap-4 border-t border-stone-200/80 bg-white/95 p-5 backdrop-blur-sm">
                <div className="flex w-full items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                      Subtotal
                    </span>
                    <span className="text-2xl font-black tracking-tight text-stone-900">₹{displayCartTotal}</span>
                  </div>
                  <div className="rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-1.5 text-center text-[10px] font-bold text-amber-950">
                    Table {tableDetails?.table_number || '...'}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                  className="h-12 w-full rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-amber-900/20 transition hover:from-amber-600 hover:to-amber-800 disabled:opacity-70 cursor-pointer"
                >
                  {placingOrder ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Send to Kitchen! 🚀'}
                </Button>
              </SheetFooter>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default CustomerMenu;
