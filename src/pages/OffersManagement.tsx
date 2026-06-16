import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Zap,
  Loader2,
  CheckCircle2,
  Search,
  Package,
  ArrowRight,
  TrendingUp,
  Tag,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { pageShell, pageHeader } from '@/lib/layout';
import api, { LIST_ALL_PARAMS } from '../services/api';

const OffersManagement = () => {
  const [offers, setOffers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    menu_item_id: '',
    offer_price: '',
    status: 'active',
    combo_items: []
  });

  const fetchData = async () => {
    try {
      const [offerRes, menuRes] = await Promise.all([
        api.get('/offers/admin'),
        api.get('/menu', { params: LIST_ALL_PARAMS })
      ]);
      setOffers(offerRes.data.data);
      setMenuItems(menuRes.data.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveOffer = async () => {
    try {
      setSaving(true);
      const payload = { 
        ...offerForm, 
        combo_items: JSON.stringify(offerForm.combo_items) 
      };
      
      if (editingOffer) {
        await api.put(`/offers/${editingOffer.id}`, payload);
      } else {
        await api.post('/offers', payload);
      }
      
      setIsDialogOpen(false);
      setEditingOffer(null);
      setOfferForm({ title: '', description: '', menu_item_id: '', offer_price: '', status: 'active', combo_items: [] });
      fetchData();
    } catch (err) {
      console.error('Failed to save offer', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffer = async (id) => {
    if (window.confirm('Are you sure you want to delete this offer?')) {
      try {
        await api.delete(`/offers/${id}`);
        fetchData();
      } catch (err) {
        console.error('Failed to delete offer', err);
      }
    }
  };

  const handleEditOffer = (offer) => {
    setEditingOffer(offer);
    setOfferForm({
      title: offer.title,
      description: offer.description,
      menu_item_id: offer.menu_item_id || '',
      offer_price: offer.offer_price || '',
      status: offer.status,
      combo_items: typeof offer.combo_items === 'string' ? JSON.parse(offer.combo_items) : (offer.combo_items || [])
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-9 text-amber-500 animate-spin" />
        <p className="text-zinc-400 dark:text-zinc-500 font-bold text-xs uppercase tracking-wider">Syncing Campaigns & Offers...</p>
      </div>
    );
  }

  const filteredOffers = offers.filter(o => o.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={pageShell}>
      {/* Header Banner */}
      <div className={pageHeader}>
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 shrink-0 shadow-md shadow-amber-500/10">
            <Tag className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-tight">Campaigns & Offers</h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">Design combo deals and menu promotions</p>
          </div>
        </div>
        <Button 
          onClick={() => { 
            setIsDialogOpen(true); 
            setEditingOffer(null); 
            setOfferForm({ title: '', description: '', menu_item_id: '', offer_price: '', status: 'active', combo_items: [] }); 
          }} 
          className="rounded-xl h-11 px-5 bg-amber-500 text-zinc-950 hover:bg-amber-400 border-none font-bold shadow-sm cursor-pointer transition-all active:scale-[0.98] shrink-0"
        >
          <Plus size={18} className="mr-1.5" />
          New Campaign
        </Button>
      </div>

      {/* Filter and search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-555" size={18} />
        <Input
          placeholder="Search campaigns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-white/50 dark:bg-zinc-955/40 border-zinc-200 dark:border-zinc-800 rounded-xl"
        />
      </div>

      {/* Offers Table */}
      <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50 dark:bg-zinc-955/20 border-b border-zinc-155 dark:border-zinc-800/50">
                <TableRow className="border-zinc-155 dark:border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="py-4 pl-6 font-bold text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider">Offer Campaign</TableHead>
                  <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider">Linked Items</TableHead>
                  <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider">Deal Price</TableHead>
                  <TableHead className="font-bold text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider text-center">Status</TableHead>
                  <TableHead className="text-right pr-6 font-bold text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffers.map((offer) => (
                  <TableRow key={offer.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 border-zinc-150 dark:border-zinc-800/50 transition-colors">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/10">
                          <Tag size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">{offer.title}</span>
                          {offer.description && (
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate max-w-[280px] mt-0.5">{offer.description}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {offer.menu_item_name && (
                          <Badge variant="outline" className="rounded-lg border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold text-[10px] px-2 py-0.5">
                            {offer.menu_item_name}
                          </Badge>
                        )}
                        {(() => {
                          const items = typeof offer.combo_items === 'string' ? JSON.parse(offer.combo_items || '[]') : (offer.combo_items || []);
                          if (items.length > 1) {
                            return (
                              <Badge className="rounded-lg bg-zinc-900 dark:bg-zinc-850 text-white font-semibold text-[10px] px-2 py-0.5 border-none">
                                +{items.length - 1} Combo Items
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                        {!offer.menu_item_name && <span className="text-zinc-450 dark:text-zinc-600 text-[10px] font-bold uppercase italic">Custom Campaign</span>}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                      {offer.offer_price ? `₹${offer.offer_price}` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        className={cn(
                          'rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border-0',
                          offer.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-400 dark:text-zinc-550'
                        )}
                      >
                        {offer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditOffer(offer)}
                          className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteOffer(offer.id)}
                          className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-800 text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOffers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center hover:bg-transparent">
                      <Zap size={36} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                      <p className="text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-xs">No campaigns configured</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>      {/* Campaigns Dialog Modal — Elegant Single Column */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl bg-white dark:bg-zinc-900 shadow-xl w-full">
          {/* Header */}
          <div className="bg-zinc-900 dark:bg-zinc-955 p-4 text-white relative overflow-hidden border-b border-zinc-800">
             <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
             <DialogHeader className="p-0 relative z-10 space-y-1">
                <DialogTitle className="text-base font-bold tracking-tight">
                  {editingOffer ? 'Edit Campaign Strategy' : 'New Campaign Strategy'}
                </DialogTitle>
                <DialogDescription className="text-zinc-400 text-[10px] font-semibold">
                  Configure promo parameters, menu targets, and deal visibility details.
                </DialogDescription>
              </DialogHeader>
          </div>

          {/* Form Scroll Area */}
          <ScrollArea className="max-h-[60vh] p-5">
            <div className="space-y-4">
              {/* Campaign Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider ml-0.5">Campaign Title</label>
                <Input 
                  placeholder="e.g. Breakfast Power Combo" 
                  value={offerForm.title} 
                  onChange={e => setOfferForm({ ...offerForm, title: e.target.value })} 
                  className="h-10 font-semibold bg-zinc-50/50 dark:bg-zinc-955/20 rounded-xl text-xs" 
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-555 uppercase tracking-wider ml-0.5">Strategy description</label>
                <Input 
                  value={offerForm.description} 
                  onChange={e => setOfferForm({ ...offerForm, description: e.target.value })} 
                  className="h-10 rounded-xl bg-zinc-50/50 dark:bg-zinc-955/20 text-xs" 
                  placeholder="Describe the campaign value (e.g. Tea + Samosa discount)..." 
                />
              </div>

              {/* Select Bundle Items */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-555 uppercase tracking-wider ml-0.5">Select Bundle Items</label>
                <div className="grid grid-cols-3 gap-1.5 bg-transparent">
                  {menuItems.map(item => {
                    const isSelected = (offerForm.combo_items || []).includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          const current = offerForm.combo_items || [];
                          const next = isSelected ? current.filter(id => id !== item.id) : [...current, item.id];
                          setOfferForm({ ...offerForm, combo_items: next, menu_item_id: next[0] || null });
                        }}
                        className={cn(
                          "flex flex-col justify-between p-2 cursor-pointer transition-all rounded-lg border text-left min-h-[52px]",
                          isSelected 
                            ? "bg-amber-500/10 dark:bg-amber-500/5 border-amber-500 text-amber-600 dark:text-amber-550 font-extrabold" 
                            : "bg-zinc-50/50 dark:bg-zinc-955/20 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:border-zinc-300"
                        )}
                      >
                        <span className="text-[10px] leading-tight line-clamp-2">{item.name}</span>
                        <span className="text-[10px] font-black mt-1">₹{item.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-zinc-200/40 dark:bg-zinc-800/40" />

              {/* Commercials Section */}
              {(() => {
                const selectedItems = menuItems.filter(m => (offerForm.combo_items || []).includes(m.id));
                const originalTotal = selectedItems.reduce((acc, curr) => acc + parseFloat(curr.price || 0), 0);
                const totalRecipeCost = selectedItems.reduce((acc, curr) => acc + parseFloat(curr.recipe_cost || 0), 0);
                const offerPrice = Number(offerForm.offer_price || 0);
                const profit = offerPrice - totalRecipeCost;
                const margin = offerPrice > 0 ? (profit / offerPrice) * 100 : 0;
                const discount = originalTotal > 0 ? ((originalTotal - offerPrice) / originalTotal) * 100 : 0;

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-zinc-50 dark:bg-zinc-955 p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-xs">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Original Total</p>
                        <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-0.5">₹{originalTotal.toFixed(0)}</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-955 p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-xs">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Recipe Cost</p>
                        <p className="text-xs font-black text-red-500 mt-0.5">₹{totalRecipeCost.toFixed(0)}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-555 uppercase tracking-wider ml-0.5">New Deal Price (₹)</label>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={offerForm.offer_price} 
                        onChange={e => setOfferForm({ ...offerForm, offer_price: e.target.value })} 
                        className="h-10 font-bold text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl" 
                      />
                      {discount > 0 && (
                        <div className="flex items-center gap-1 ml-0.5 text-emerald-600 dark:text-emerald-500 font-bold text-[9px]">
                          <TrendingUp size={11} />
                          <span>Customer discount is {discount.toFixed(0)}%</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-955 text-white flex justify-between items-center border border-zinc-800 shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 blur-lg" />
                      <div className="relative z-10">
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Net Profit</span>
                        <p className={cn('text-xs font-black mt-0.5', profit > 0 ? 'text-emerald-400' : 'text-red-405')}>
                          ₹{profit.toFixed(0)}
                        </p>
                      </div>
                      <div className="text-right relative z-10">
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Strategy Margin</span>
                        <p className={cn('text-lg font-black tracking-tight mt-0.5', margin > 20 ? 'text-emerald-400' : 'text-red-405')}>
                          {margin.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Visibility and select status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-550 uppercase tracking-wider ml-0.5">Campaign Visibility</label>
                <select 
                  value={offerForm.status} 
                  onChange={e => setOfferForm({ ...offerForm, status: e.target.value })} 
                  className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 font-semibold text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                >
                  <option value="active">Visible (Active)</option>
                  <option value="inactive">Hidden (Draft)</option>
                </select>
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2.5">
            <Button 
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1 h-10 font-bold rounded-xl cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveOffer} 
              disabled={saving || !offerForm.title || !offerForm.offer_price} 
              className="flex-1 h-10 bg-amber-500 hover:bg-amber-400 text-zinc-955 font-bold rounded-xl border-none cursor-pointer text-xs"
            >
              {saving ? <Loader2 className="animate-spin size-3.5" /> : editingOffer ? 'Save Strategy' : 'Launch Campaign'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OffersManagement;
