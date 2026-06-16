import { useState, useEffect } from 'react';
import { BellRing, CheckCircle2, Loader2, Receipt, Smartphone, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import api, { SOCKET_ORIGIN } from '@/services/api';
import { io } from 'socket.io-client';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type ServiceRequest = {
  id: number;
  table_id: number;
  table_number: string | number;
  type: 'waiter' | 'bill';
  created_at?: string;
  payment_preference?: 'cash' | 'upi' | null;
  source?: string;
};

type BillRequest = {
  id: number;
  table_id: number;
  table_number: string | number;
  bill_requested_at?: string;
  payment_preference?: 'cash' | 'upi' | null;
  bill_visible_to_customer?: number | boolean;
};

export function useServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [billRequests, setBillRequests] = useState<BillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showingBillId, setShowingBillId] = useState<number | null>(null);

  const fetchRequests = async () => {
    try {
      const [waiterRes, billRes] = await Promise.all([
        api.get('/loyalty/requests'),
        api.get('/billing/requests'),
      ]);
      setRequests(waiterRes.data.data || []);
      setBillRequests(billRes.data.data || []);
    } catch {
      setRequests([]);
      setBillRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const resolveRequest = async (id: number) => {
    try {
      await api.patch(`/loyalty/requests/${id}`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast('Request marked done', 'success');
    } catch {
      toast('Could not update request', 'error');
    }
  };

  const showBillToCustomer = async (tableId: number, sessionId?: number) => {
    try {
      setShowingBillId(sessionId ?? tableId);
      await api.post('/billing/show-to-customer', { table_id: tableId });
      toast('Bill is now visible on customer phone', 'success');
      await fetchRequests();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Could not show bill', 'error');
    } finally {
      setShowingBillId(null);
    }
  };

  useEffect(() => {
    fetchRequests();
    const socket = io(SOCKET_ORIGIN);
    socket.on('service_request', (data: ServiceRequest & { request_id?: number }) => {
      if (data.type === 'bill' && data.source === 'billing') {
        fetchRequests();
        toast(`Table ${data.table_number} — Bill request${data.payment_preference ? ` (${data.payment_preference})` : ''}`, 'info');
        return;
      }
      const id = data.request_id ?? data.id;
      setRequests((prev) => {
        if (prev.some((r) => r.id === id)) return prev;
        return [...prev, { id, table_id: data.table_id, table_number: data.table_number, type: data.type }];
      });
      toast(`Table ${data.table_number} — ${data.type === 'waiter' ? 'Call waiter' : 'Request bill'}`, 'info');
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      } catch { /* ignore */ }
    });
    socket.on('service_request_resolved', (data: { request_id: number }) => {
      setRequests((prev) => prev.filter((r) => r.id !== data.request_id));
    });
    socket.on('bill_request_updated', () => fetchRequests());
    socket.on('customer_bill_shown', () => fetchRequests());
    return () => {
      socket.disconnect();
    };
  }, []);

  return { requests, billRequests, loading, resolveRequest, showBillToCustomer, showingBillId, fetchRequests };
}

export function ServiceRequestsBar({ compact = false }: { compact?: boolean }) {
  const { requests, billRequests, resolveRequest, showBillToCustomer, showingBillId } = useServiceRequests();
  if (requests.length === 0 && billRequests.length === 0) return null;

  return (
    <Card className={cn('border-amber-300/50 bg-amber-50/80 dark:bg-amber-950/20 rounded-2xl min-w-0', compact ? 'mb-0' : 'mb-0')}>
      <CardContent className="p-3 md:p-4 space-y-2 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
          <BellRing className="size-4" /> Table requests ({requests.length + billRequests.length})
        </p>
        {billRequests.map((req) => (
          <div key={`bill-${req.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 p-3 border border-amber-200/50 min-w-0">
            <div className="min-w-0">
              <p className="font-bold text-sm">Table {req.table_number}</p>
              <p className="text-[10px] uppercase font-semibold text-stone-500 flex items-center gap-1 flex-wrap">
                <Receipt className="size-3" /> Bill requested
                {req.payment_preference && (
                  <span className="inline-flex items-center gap-0.5 text-amber-700">
                    · {req.payment_preference === 'cash' ? <Wallet className="size-3" /> : <Smartphone className="size-3" />}
                    {req.payment_preference}
                  </span>
                )}
              </p>
              {req.bill_visible_to_customer ? (
                <p className="text-[9px] font-bold text-emerald-600 mt-0.5">Visible on customer phone</p>
              ) : null}
            </div>
            <div className="flex gap-2 shrink-0">
              {!req.bill_visible_to_customer && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-10 cursor-pointer border-amber-300 text-amber-800"
                  disabled={showingBillId === req.id}
                  onClick={() => showBillToCustomer(req.table_id, req.id)}
                >
                  {showingBillId === req.id ? <Loader2 className="size-4 animate-spin" /> : 'Show Bill'}
                </Button>
              )}
            </div>
          </div>
        ))}
        {requests.map((req) => (
          <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 p-3 border border-amber-200/50 min-w-0">
            <div>
              <p className="font-bold text-sm">Table {req.table_number}</p>
              <p className="text-[10px] uppercase font-semibold text-stone-500">
                {req.type === 'waiter' ? 'Call waiter' : 'Request bill'}
              </p>
            </div>
            <Button size="sm" className="rounded-xl h-10 min-w-[5rem] cursor-pointer" onClick={() => resolveRequest(req.id)}>
              <CheckCircle2 className="size-4 mr-1" /> Done
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ServiceRequestsBadge() {
  const { requests, billRequests } = useServiceRequests();
  const total = requests.length + billRequests.length;
  if (total === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
      {total}
    </span>
  );
}
