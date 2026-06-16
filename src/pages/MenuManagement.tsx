import React, { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import {
  Plus,
  Search,
  Trash2,
  Loader2,
  Utensils,
  CheckCircle2,
  ChefHat,
  Scale,
  ArrowLeft,
  Tags,
  ChevronRight,
  Image as ImageIcon,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import api, { API_ORIGIN, SOCKET_ORIGIN, LIST_ALL_PARAMS } from '../services/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { pageShell, pageHeader, cardGrid } from '@/lib/layout';

type View = 'categories' | 'items' | 'item-edit' | 'category-edit';

function resolveImage(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_ORIGIN.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

interface SearchableSelectProps {
  items: { id: number | string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  items,
  value,
  onChange,
  placeholder = "Search..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedItem = useMemo(() => {
    return items.find((item) => String(item.id) === value);
  }, [items, value]);

  useEffect(() => {
    if (selectedItem) {
      setSearch(selectedItem.name);
    } else {
      setSearch('');
    }
  }, [selectedItem]);

  const filteredItems = useMemo(() => {
    if (selectedItem && search === selectedItem.name) {
      return items;
    }
    return items.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search, selectedItem]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (!e.target.value) {
              onChange('');
            }
          }}
          onFocus={() => setIsOpen(true)}
          className="h-11 rounded-xl pl-10 pr-10 focus-visible:ring-2 focus-visible:ring-amber-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                onChange('');
                setIsOpen(true);
              }}
              className="p-0.5 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 rounded-full cursor-pointer hover:bg-zinc-150 dark:hover:bg-zinc-800"
            >
              <X className="size-3.5" />
            </button>
          )}
          <ChevronRight 
            className={cn(
              "size-4 text-zinc-400 transition-transform duration-200 pointer-events-none",
              isOpen ? "rotate-90 text-zinc-650 dark:text-zinc-200" : ""
            )} 
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 shadow-lg max-h-60 overflow-y-auto p-1.5 focus:outline-none">
          {filteredItems.length === 0 ? (
            <div className="p-3.5 text-xs text-center text-zinc-500 dark:text-zinc-400 font-medium">
              No items found / Koi saman nahi mila
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = String(item.id) === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(String(item.id));
                    setSearch(item.name);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg py-2.5 px-3 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer select-none transition-colors",
                    isSelected ? "bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-semibold" : "text-zinc-700 dark:text-zinc-300"
                  )}
                >
                  <span>{item.name}</span>
                  {isSelected && <CheckCircle2 className="size-4 text-amber-500 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const MenuManagement = () => {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<View>('categories');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [newIngredient, setNewIngredient] = useState({ inventory_id: '', quantity_used: '', unit: 'gm' });
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [editRecipeQty, setEditRecipeQty] = useState('');

  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: '', category_id: '', status: 'available', image_url: '', calories: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  const fetchData = async () => {
    try {
      const [menuRes, catRes] = await Promise.all([
        api.get('/menu', { params: LIST_ALL_PARAMS }),
        api.get('/categories', { params: LIST_ALL_PARAMS }),
      ]);
      setItems(menuRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch {
      toast('Failed to load menu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const res = await api.get('/inventory', { params: LIST_ALL_PARAMS });
      setInventoryItems(res.data.data || []);
    } catch {
      toast('Failed to load ingredients list', 'error');
    }
  };

  const fetchRecipe = async (menuItemId: number) => {
    try {
      const res = await api.get(`/recipes/${menuItemId}`);
      setRecipeIngredients(res.data.data || []);
    } catch {
      setRecipeIngredients([]);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = io(SOCKET_ORIGIN);
    socket.on('menu_updated', fetchData);
    socket.on('categories_updated', fetchData);
    return () => {
      socket.disconnect();
    };
  }, []);

  const categoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    return items.filter(
      (i) =>
        i.category_id === selectedCategory.id &&
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, selectedCategory, searchTerm]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [categories, searchTerm]
  );

  const openCategory = (cat: any) => {
    setSelectedCategory(cat);
    setSearchTerm('');
    setView('items');
  };

  const openItem = async (item: any) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category_id: String(item.category_id),
      status: item.status || 'available',
      image_url: item.image_url || '',
      calories: item.calories != null ? String(item.calories) : '',
    });
    setImagePreview(resolveImage(item.image_url) || '');
    setView('item-edit');
    await fetchInventoryItems();
    await fetchRecipe(item.id);
  };

  const openCategoryEdit = (cat: any) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '' });
    setView('category-edit');
  };

  const goHome = () => {
    setView('categories');
    setSelectedCategory(null);
    setEditingItem(null);
    setEditingCategory(null);
    setSearchTerm('');
  };

  const goToCategoryItems = () => {
    setView('items');
    setEditingItem(null);
  };

  const handleIngredientChange = (inventoryId: string) => {
    const selected = inventoryItems.find((i) => i.id === parseInt(inventoryId, 10));
    let defaultUnit = 'gm';
    if (selected) {
      const base = selected.unit.toLowerCase();
      if (base === 'kg') defaultUnit = 'gm';
      else if (base === 'ltr') defaultUnit = 'ml';
      else defaultUnit = base;
    }
    setNewIngredient({ inventory_id: inventoryId, quantity_used: '', unit: defaultUnit });
  };

  const calculateIngredientCost = (invId: string, qty: string, unit: string) => {
    const selected = inventoryItems.find((i) => i.id === parseInt(invId, 10));
    if (!selected || !qty || parseFloat(qty) <= 0) return 0;
    let numericQty = parseFloat(qty);
    const base = selected.unit.toLowerCase();
    const input = unit.toLowerCase();
    if (input === 'gm' && base === 'kg') numericQty /= 1000;
    if (input === 'ml' && base === 'ltr') numericQty /= 1000;
    return numericQty * selected.unit_price;
  };

  const handleAddIngredient = async () => {
    if (!editingItem || !newIngredient.inventory_id || !newIngredient.quantity_used) return;
    try {
      setAddingIngredient(true);
      let qty = parseFloat(newIngredient.quantity_used);
      const selectedInv = inventoryItems.find((i) => i.id === parseInt(newIngredient.inventory_id, 10));
      if (selectedInv) {
        const base = selectedInv.unit.toLowerCase();
        const input = newIngredient.unit.toLowerCase();
        if (input === 'gm' && base === 'kg') qty /= 1000;
        if (input === 'ml' && base === 'ltr') qty /= 1000;
        if (input === 'kg' && base === 'gm') qty *= 1000;
        if (input === 'ltr' && base === 'ml') qty *= 1000;
      }
      await api.post('/recipes', {
        menu_item_id: editingItem.id,
        inventory_id: parseInt(newIngredient.inventory_id, 10),
        quantity_used: qty,
      });
      fetchRecipe(editingItem.id);
      setNewIngredient({ inventory_id: '', quantity_used: '', unit: 'gm' });
      toast('Ingredient added to recipe', 'success');
    } catch {
      toast('Could not add ingredient', 'error');
    } finally {
      setAddingIngredient(false);
    }
  };

  const handleDeleteIngredient = async (id: number) => {
    if (!editingItem) return;
    try {
      await api.delete(`/recipes/${id}`);
      fetchRecipe(editingItem.id);
      toast('Ingredient removed', 'info');
    } catch {
      toast('Could not remove ingredient', 'error');
    }
  };

  const startEditIngredient = (ing: any) => {
    setEditingRecipeId(ing.id);
    setEditRecipeQty(String(ing.quantity_used));
  };

  const handleSaveIngredientQty = async (id: number) => {
    if (!editingItem || !editRecipeQty) return;
    try {
      await api.patch(`/recipes/${id}`, { quantity_used: parseFloat(editRecipeQty) });
      setEditingRecipeId(null);
      setEditRecipeQty('');
      fetchRecipe(editingItem.id);
      toast('Recipe quantity updated', 'success');
    } catch {
      toast('Could not update quantity', 'error');
    }
  };

  const handleSaveItem = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      Object.entries(itemForm).forEach(([k, v]) => formData.append(k, v));
      if (imageFile) formData.append('image', imageFile);

      if (editingItem) {
        await api.patch(`/menu/${editingItem.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast('Item saved', 'success');
        await fetchData();
        goToCategoryItems();
      } else {
        const res = await api.post('/menu', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await fetchData();
        setShowAddItem(false);
        if (res.data?.data) openItem(res.data.data);
        toast('New item created', 'success');
      }
    } catch {
      toast('Failed to save item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      setSaving(true);
      await api.delete(`/menu/${id}`);
      toast('Item deleted', 'info');
      await fetchData();
      goToCategoryItems();
    } catch {
      toast('Could not delete item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategory = async () => {
    try {
      setSaving(true);
      if (editingCategory) {
        await api.patch(`/categories/${editingCategory.id}`, categoryForm);
        toast('Category updated', 'success');
      } else {
        await api.post('/categories', categoryForm);
        toast('Category created', 'success');
        setShowAddCategory(false);
      }
      await fetchData();
      goHome();
    } catch {
      toast('Failed to save category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    const count = items.filter((i) => i.category_id === cat.id).length;
    const msg =
      count > 0
        ? `Delete "${cat.name}"? This will also remove ${count} menu item(s) in this category.`
        : `Delete category "${cat.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      setSaving(true);
      await api.delete(`/categories/${cat.id}`);
      toast('Category deleted', 'info');
      await fetchData();
      goHome();
    } catch {
      toast('Could not delete category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const startAddItem = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      description: '',
      price: '',
      category_id: selectedCategory ? String(selectedCategory.id) : '',
      status: 'available',
      image_url: '',
      calories: '',
    });
    setImagePreview('');
    setImageFile(null);
    setShowAddItem(true);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-10 text-amber-600 animate-spin" />
      </div>
    );
  }

  const recipeCost = recipeIngredients.reduce(
    (acc, curr) => acc + parseFloat(curr.quantity_used) * parseFloat(curr.unit_price || 0),
    0
  );
  const previewCost = calculateIngredientCost(
    newIngredient.inventory_id,
    newIngredient.quantity_used,
    newIngredient.unit
  );
  const totalCost = recipeCost + previewCost;
  const price = Number(itemForm.price || 0);
  const profit = price - totalCost;
  const margin = price > 0 ? (profit / price) * 100 : 0;

  return (
    <div className={pageShell}>
      {/* Breadcrumb */}
      <div className="bg-white/50 dark:bg-zinc-900/30 px-4 py-2.5 rounded-xl border border-zinc-200/40 dark:border-zinc-800/30 backdrop-blur-sm">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer font-bold text-zinc-650 dark:text-zinc-400 hover:text-amber-500"
                onClick={goHome}
              >
                Menu Sections
              </BreadcrumbLink>
            </BreadcrumbItem>
            {view !== 'categories' && selectedCategory && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {view === 'items' ? (
                    <BreadcrumbPage className="font-extrabold text-zinc-900 dark:text-white">{selectedCategory.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink className="cursor-pointer font-bold text-zinc-650 dark:text-zinc-400 hover:text-amber-500" onClick={goToCategoryItems}>
                      {selectedCategory.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </>
            )}
            {view === 'item-edit' && editingItem && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-extrabold text-zinc-900 dark:text-white">{editingItem.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
            {view === 'category-edit' && editingCategory && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-extrabold text-zinc-900 dark:text-white">Edit Category</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* ── CATEGORIES HOME ── */}
      {view === 'categories' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200/60 dark:border-zinc-800/40 p-4 md:p-6 shadow-sm">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Menu Management</h1>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">
                Categories & Products · {categories.length} categories active
              </p>
            </div>
            <Button onClick={() => { setCategoryForm({ name: '', description: '' }); setShowAddCategory(true); }} className="bg-amber-500 text-zinc-950 hover:bg-amber-400 border-none rounded-xl h-11 cursor-pointer font-bold shrink-0">
              <Plus className="size-4 mr-2" /> New Category
            </Button>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-455" />
            <Input
              placeholder="Search categories... / Khojo"
              className="pl-9 h-11 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={cardGrid}>
            {filteredCategories.map((cat) => {
              const count = items.filter((i) => i.category_id === cat.id).length;
              return (
                <Card
                  key={cat.id}
                  className="cursor-pointer hover:border-amber-400/50 dark:hover:border-amber-500/30 hover:shadow-md transition-all active:scale-[0.98] border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl"
                  onClick={() => openCategory(cat)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="size-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 flex items-center justify-center border border-amber-500/10 shrink-0">
                        <Tags className="size-5" />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="font-bold border-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350">{count} items</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-zinc-500 hover:text-amber-600 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); openCategoryEdit(cat); }}
                          title="Edit category"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                          title="Delete category"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-4 font-extrabold text-zinc-900 dark:text-white truncate">{cat.name}</CardTitle>
                    {cat.description && (
                      <CardDescription className="line-clamp-2 text-xs text-zinc-500 mt-1">{cat.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-xs text-zinc-400 text-center">Tap to view items</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredCategories.length === 0 && (
            <Card className="py-16 text-center border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
              <Tags className="size-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="font-bold text-zinc-700 dark:text-zinc-300">No categories active</p>
              <Button className="mt-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl cursor-pointer font-bold border-none" onClick={() => setShowAddCategory(true)}>
                Create first category
              </Button>
            </Card>
          )}
        </>
      )}

      {/* ── ITEMS IN CATEGORY ── */}
      {view === 'items' && selectedCategory && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200/60 dark:border-zinc-800/40 p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={goHome} className="rounded-xl border-zinc-200 dark:border-zinc-800 cursor-pointer">
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-tight">{selectedCategory.name}</h1>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-550 uppercase tracking-wide font-semibold mt-0.5">
                  Category Section · {categoryItems.length} menu items listed
                </p>
              </div>
            </div>
            <Button onClick={startAddItem} className="bg-amber-500 text-zinc-950 hover:bg-amber-400 border-none rounded-xl h-11 cursor-pointer font-bold shrink-0">
              <Plus className="size-4 mr-2" /> Add Menu Item
            </Button>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-455" />
            <Input
              placeholder="Search in this category..."
              className="pl-9 h-11 rounded-xl border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-955/40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categoryItems.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:border-amber-400/50 dark:hover:border-amber-500/30 hover:shadow-md transition-all active:scale-[0.99] border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl"
                onClick={() => openItem(item)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="size-16 rounded-xl bg-zinc-100 dark:bg-zinc-955 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800">
                    {item.image_url ? (
                      <img src={resolveImage(item.image_url) || ''} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Utensils className="size-6 text-zinc-300 dark:text-zinc-700" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-zinc-900 dark:text-zinc-150 truncate leading-snug">{item.name}</p>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-555 mt-1">₹{item.price}</p>
                    <Badge
                      className={cn(
                        'mt-1.5 text-[9px] font-bold border-0 px-2 py-0.5 uppercase tracking-wide',
                        item.status === 'available' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      )}
                    >
                      {item.status === 'available' ? 'Available' : 'Sold Out'}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg text-zinc-500 hover:text-amber-600 cursor-pointer" onClick={() => openItem(item)} title="Edit">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer" onClick={() => handleDeleteItem(item.id)} title="Delete">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {categoryItems.length === 0 && (
            <Card className="py-16 text-center border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
              <Utensils className="size-12 mx-auto text-zinc-300 dark:text-zinc-750 mb-3" />
              <p className="font-bold text-zinc-700 dark:text-zinc-300">No menu items active in this section</p>
              <Button className="mt-4 bg-amber-500 hover:bg-amber-400 text-zinc-955 rounded-xl cursor-pointer font-bold border-none" onClick={startAddItem}>Add first item</Button>
            </Card>
          )}
        </>
      )}

      {/* ── EDIT ITEM ── */}
      {view === 'item-edit' && editingItem && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200/60 dark:border-zinc-800/40 p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={goToCategoryItems} className="rounded-xl border-zinc-200 dark:border-zinc-800 cursor-pointer">
                <ArrowLeft className="size-4" />
              </Button>
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white leading-tight">{editingItem.name}</h1>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="destructive" className="rounded-xl font-bold h-11 cursor-pointer" onClick={() => handleDeleteItem(editingItem.id)}>
                <Trash2 className="size-4 mr-1.5" /> Delete Product
              </Button>
              <Button onClick={handleSaveItem} disabled={saving} className="bg-amber-500 text-zinc-950 hover:bg-amber-400 border-none rounded-xl h-11 cursor-pointer font-bold px-5">
                {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <CheckCircle2 className="size-4 mr-1.5" />}
                Save Changes
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 min-w-0">
            <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
              <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <CardTitle className="text-lg font-bold">Item Specifications</CardTitle>
                <CardDescription className="text-xs">Setup dish details, pricing, and photo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex justify-center">
                  <label className="relative size-28 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 overflow-hidden cursor-pointer group hover:border-amber-500 transition-colors">
                    {imagePreview ? (
                      <img src={imagePreview} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-955/20">
                        <ImageIcon className="size-8 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Upload photo</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Dish Name</Label>
                  <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} className="h-11 rounded-xl" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-555">Selling Price (₹)</Label>
                    <Input type="number" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-555">Menu Section</Label>
                    <Select value={itemForm.category_id} onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Description</Label>
                  <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} rows={3} className="rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Calories (kcal)</Label>
                  <Input type="number" min={0} value={itemForm.calories} onChange={(e) => setItemForm({ ...itemForm, calories: e.target.value })} placeholder="Optional" className="h-11 rounded-xl" />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-555">Sale status</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant={itemForm.status === 'available' ? 'default' : 'destructive'}
                    className={cn('rounded-xl h-10 px-4 cursor-pointer font-bold border-none text-zinc-950 hover:bg-amber-400', itemForm.status === 'available' && 'bg-emerald-600 text-white hover:bg-emerald-700')}
                    onClick={() =>
                      setItemForm({
                        ...itemForm,
                        status: itemForm.status === 'available' ? 'sold_out' : 'available',
                      })
                    }
                  >
                    {itemForm.status === 'available' ? 'Active / On Sale' : 'Sold Out / Unavailable'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
              <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <ChefHat className="size-5 text-amber-500 animate-spin-slow" /> Recipe Ingredients Costings
                </CardTitle>
                <CardDescription className="text-xs">Estimate profitability and markup margins</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950/40 p-3 border border-zinc-200/30 dark:border-zinc-800/40">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Recipe Cost</p>
                    <p className="font-black text-lg text-zinc-850 dark:text-zinc-100 mt-0.5">₹{totalCost.toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-955/40 p-3 border border-zinc-200/30 dark:border-zinc-800/40">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Profit Margin</p>
                    <p className={cn('font-black text-lg mt-0.5', profit >= 0 ? 'text-emerald-600' : 'text-red-655')}>
                      ₹{profit.toFixed(0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/10">
                    <p className="text-[10px] text-amber-600 dark:text-amber-550 font-bold uppercase tracking-wider">Markup %</p>
                    <p className="font-black text-lg text-amber-600 dark:text-amber-550 mt-0.5">{margin.toFixed(0)}%</p>
                  </div>
                </div>

                <Separator className="bg-zinc-200/40 dark:bg-zinc-800/40" />

                <div className="space-y-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/40 p-4 bg-zinc-50/50 dark:bg-zinc-950/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-550">Link Raw Ingredient</p>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-zinc-550">Choose stock item / Saman Chuno</Label>
                    <SearchableSelect
                      items={inventoryItems}
                      value={newIngredient.inventory_id}
                      onChange={handleIngredientChange}
                      placeholder="Search stock item... / Saman Khojo"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-zinc-550">Amount used</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 50"
                        value={newIngredient.quantity_used}
                        onChange={(e) => setNewIngredient({ ...newIngredient, quantity_used: e.target.value })}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-zinc-550">Measurement Unit</Label>
                      <Select value={newIngredient.unit} onValueChange={(v) => setNewIngredient({ ...newIngredient, unit: v })}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {['gm', 'kg', 'ml', 'ltr', 'pcs'].map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-zinc-955 rounded-xl cursor-pointer font-bold border-none shadow-sm"
                    onClick={handleAddIngredient}
                    disabled={addingIngredient || !newIngredient.inventory_id || !newIngredient.quantity_used}
                  >
                    {addingIngredient ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Plus className="size-4 mr-1.5" />}
                    Add ingredient recipe
                  </Button>
                </div>

                <ScrollArea className="max-h-[220px]">
                  <div className="space-y-2 pr-2">
                    {recipeIngredients.map((ing) => (
                      <div key={ing.id} className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm gap-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Scale className="size-4 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-zinc-850 dark:text-zinc-150 truncate">{ing.inventory_name}</p>
                            {editingRecipeId === ing.id ? (
                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  type="number"
                                  value={editRecipeQty}
                                  onChange={(e) => setEditRecipeQty(e.target.value)}
                                  className="h-8 w-24 rounded-lg text-xs"
                                />
                                <span className="text-xs text-zinc-500">{ing.unit}</span>
                                <Button size="sm" className="h-8 rounded-lg bg-amber-500 text-zinc-950 font-bold border-none cursor-pointer" onClick={() => handleSaveIngredientQty(ing.id)}>
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 rounded-lg cursor-pointer" onClick={() => setEditingRecipeId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                                {ing.quantity_used} {ing.unit} · Cost: ₹{(ing.quantity_used * ing.unit_price).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        {editingRecipeId !== ing.id && (
                          <div className="flex shrink-0">
                            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-amber-600 rounded-xl cursor-pointer" onClick={() => startEditIngredient(ing)} title="Edit quantity">
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl cursor-pointer" onClick={() => handleDeleteIngredient(ing.id)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {recipeIngredients.length === 0 && (
                      <p className="text-xs font-semibold text-center text-zinc-450 dark:text-zinc-500 py-8 bg-zinc-50/30 dark:bg-zinc-950/10 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800/40">No ingredients added yet</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── EDIT CATEGORY ── */}
      {view === 'category-edit' && editingCategory && (
        <>
          <div className="flex items-center justify-between gap-3 mb-4 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200/60 dark:border-zinc-800/40 p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={goHome} className="rounded-xl border-zinc-200 dark:border-zinc-800 cursor-pointer">
                <ArrowLeft className="size-4" />
              </Button>
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">Edit Category Details</h1>
            </div>
            <Button
              variant="destructive"
              className="rounded-xl font-bold h-11 cursor-pointer"
              onClick={() => handleDeleteCategory(editingCategory)}
              disabled={saving}
            >
              <Trash2 className="size-4 mr-1.5" /> Delete Category
            </Button>
          </div>
          <Card className="max-w-lg border border-zinc-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl">
            <CardHeader>
              <CardTitle className="font-bold">{editingCategory.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Category Name</Label>
                <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Description</Label>
                <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} className="rounded-xl" />
              </div>
              <Button onClick={handleSaveCategory} disabled={saving || !categoryForm.name} className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold border-none rounded-xl h-11 cursor-pointer">
                {saving && <Loader2 className="size-4 animate-spin mr-1.5" />}
                Save Category
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">New Category</DialogTitle>
            <DialogDescription className="text-xs">Create menu folder e.g. Hot Drinks, Snacks, Main Courses</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-550">Category Name</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g. Beverages" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-550">Description (optional)</Label>
              <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="About this menu folder..." className="rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t pt-4 border-zinc-200/20 dark:border-zinc-800/20">
            <Button variant="outline" onClick={() => setShowAddCategory(false)} className="rounded-xl h-11 cursor-pointer">Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={saving || !categoryForm.name} className="bg-amber-500 hover:bg-amber-400 text-zinc-955 font-bold border-none rounded-xl h-11 cursor-pointer">Create Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">New Menu Item</DialogTitle>
            <DialogDescription className="text-xs">Add new product to {selectedCategory?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-550">Menu Item Name</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Cappuccino" className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-550">Price (₹)</Label>
                <Input type="number" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-550">Category</Label>
                <Select value={itemForm.category_id} onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-550">Description</Label>
              <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Describe ingredients or taste..." className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-550">Calories (kcal)</Label>
              <Input type="number" min={0} value={itemForm.calories} onChange={(e) => setItemForm({ ...itemForm, calories: e.target.value })} placeholder="Optional" className="h-11 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t pt-4 border-zinc-200/20 dark:border-zinc-800/20">
            <Button variant="outline" onClick={() => setShowAddItem(false)} className="rounded-xl h-11 cursor-pointer">Cancel</Button>
            <Button
              onClick={handleSaveItem}
              disabled={saving || !itemForm.name || !itemForm.price || !itemForm.category_id}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold border-none rounded-xl h-11 cursor-pointer"
            >
              Create Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuManagement;
