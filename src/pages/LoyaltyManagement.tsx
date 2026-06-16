import { useState, useEffect } from 'react';
import { Gift, Plus, Trash2, Loader2, Settings } from 'lucide-react';
import api from '../services/api';
import { toast } from '@/lib/toast';
import { pageShell, pageHeader, cardGrid } from '@/lib/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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

const LoyaltyManagement = () => {
  const [settings, setSettings] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    menu_item_id: '',
    points_cost: '',
    tier: 'small',
    valid_days: '7',
    active: true,
  });

  const fetchAll = async () => {
    try {
      const [settingsRes, rewardsRes, menuRes] = await Promise.all([
        api.get('/loyalty/settings'),
        api.get('/loyalty/rewards?all=1'),
        api.get('/menu', { params: { limit: 500, page: 1 } }),
      ]);
      setSettings(settingsRes.data.data);
      setRewards(rewardsRes.data.data || []);
      setMenuItems(menuRes.data.data || []);
    } catch {
      toast('Failed to load loyalty data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      await api.patch('/loyalty/settings', {
        points_per_rupee: Number(settings.points_per_rupee),
        visit_bonus_points: Number(settings.visit_bonus_points),
        min_order_for_points: Number(settings.min_order_for_points),
        max_points_per_order: Number(settings.max_points_per_order),
        enabled: Boolean(settings.enabled),
      });
      toast('Settings saved', 'success');
    } catch {
      toast('Could not save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', menu_item_id: '', points_cost: '', tier: 'small', valid_days: '7', active: true });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description || '',
      menu_item_id: r.menu_item_id ? String(r.menu_item_id) : '',
      points_cost: String(r.points_cost),
      tier: r.tier,
      valid_days: String(r.valid_days),
      active: Boolean(r.active),
    });
    setDialogOpen(true);
  };

  const saveReward = async () => {
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        description: form.description,
        menu_item_id: form.menu_item_id ? Number(form.menu_item_id) : null,
        points_cost: Number(form.points_cost),
        tier: form.tier,
        valid_days: Number(form.valid_days),
        active: form.active,
      };
      if (editing) {
        await api.patch(`/loyalty/rewards/${editing.id}`, payload);
      } else {
        await api.post('/loyalty/rewards', payload);
      }
      setDialogOpen(false);
      fetchAll();
      toast('Reward saved', 'success');
    } catch {
      toast('Could not save reward', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteReward = async (id: number) => {
    if (!window.confirm('Delete this reward?')) return;
    try {
      await api.delete(`/loyalty/rewards/${id}`);
      fetchAll();
      toast('Reward deleted', 'info');
    } catch {
      toast('Could not delete', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-10 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className={pageShell}>
      <div className={pageHeader}>
        <div className="flex items-center gap-3">
          <Gift className="size-8 text-amber-600" />
          <div>
            <h1 className="text-2xl font-extrabold">Loyalty & Points</h1>
            <p className="text-xs text-zinc-500">Earn rules and redemption rewards</p>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="size-5" /> Earn settings
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Points per ₹1 spent</Label>
            <Input type="number" step="0.01" value={settings?.points_per_rupee ?? ''} onChange={(e) => setSettings({ ...settings, points_per_rupee: e.target.value })} className="h-11 rounded-xl" />
            <p className="text-[10px] text-zinc-500">0.1 = 10 pts per ₹100</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Visit bonus points</Label>
            <Input type="number" value={settings?.visit_bonus_points ?? ''} onChange={(e) => setSettings({ ...settings, visit_bonus_points: e.target.value })} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Min order (₹) to earn</Label>
            <Input type="number" value={settings?.min_order_for_points ?? ''} onChange={(e) => setSettings({ ...settings, min_order_for_points: e.target.value })} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max points per bill</Label>
            <Input type="number" value={settings?.max_points_per_order ?? ''} onChange={(e) => setSettings({ ...settings, max_points_per_order: e.target.value })} className="h-11 rounded-xl" />
          </div>
          <Button onClick={saveSettings} disabled={saving} className="sm:col-span-2 lg:col-span-4 h-11 rounded-xl bg-amber-500 text-zinc-950 font-bold cursor-pointer">
            {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save earn settings'}
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Rewards catalog</h2>
        <Button onClick={openCreate} className="rounded-xl h-11 bg-amber-500 text-zinc-950 font-bold cursor-pointer">
          <Plus className="size-4 mr-1" /> Add reward
        </Button>
      </div>

      <div className={cardGrid}>
        {rewards.map((r) => (
          <Card key={r.id} className="rounded-2xl">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-xs text-zinc-500">{r.points_cost} pts · {r.valid_days} days · {r.tier}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => openEdit(r)}>Edit</Button>
                  <Button variant="ghost" size="icon" className="text-red-500 cursor-pointer" onClick={() => deleteReward(r.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              {r.description && <p className="text-xs text-zinc-600">{r.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit reward' : 'New reward'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Name e.g. Free Chai" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl" />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-11 rounded-xl" />
            <Input type="number" placeholder="Points cost" value={form.points_cost} onChange={(e) => setForm({ ...form, points_cost: e.target.value })} className="h-11 rounded-xl" />
            <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v, valid_days: v === 'small' ? '7' : v === 'medium' ? '21' : '60' })}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (7 days)</SelectItem>
                <SelectItem value="medium">Medium (21 days)</SelectItem>
                <SelectItem value="large">Large (60 days)</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Valid days" value={form.valid_days} onChange={(e) => setForm({ ...form, valid_days: e.target.value })} className="h-11 rounded-xl" />
            <Select value={form.menu_item_id || 'none'} onValueChange={(v) => setForm({ ...form, menu_item_id: v === 'none' ? '' : v })}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Free menu item (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked item</SelectItem>
                {menuItems.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl cursor-pointer">Cancel</Button>
            <Button onClick={saveReward} disabled={saving || !form.name || !form.points_cost} className="rounded-xl bg-amber-500 font-bold cursor-pointer">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoyaltyManagement;
