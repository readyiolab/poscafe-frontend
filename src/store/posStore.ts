import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
}

export interface Table {
  id: number;
  table_number: string | number;
  status: 'available' | 'occupied' | 'reserved' | string;
}

interface POSState {
  cart: CartItem[];
  selectedTable: Table | null;
  customerName: string;
  customerPhone: string;
  taxRate: number;
  
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
  setTable: (table: Table | null) => void;
  setCustomerInfo: (name: string, phone: string) => void;
  resetPOS: () => void;
  
  // Computed (handled by functions)
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getTotal: () => number;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      cart: [],
      selectedTable: null,
      customerName: '',
      customerPhone: '',
      taxRate: 0.05, // 5% GST default

      addItem: (item) => {
        const { cart } = get();
        const existingItem = cart.find((i) => i.id === item.id);

        if (existingItem) {
          set({
            cart: cart.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          });
        } else {
          set({ cart: [...cart, { ...item, quantity: 1 }] });
        }
      },

      removeItem: (itemId) => {
        set({ cart: get().cart.filter((i) => i.id !== itemId) });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set({
          cart: get().cart.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ cart: [] }),

      setTable: (table) => set({ selectedTable: table }),

      setCustomerInfo: (name, phone) => set({ customerName: name, customerPhone: phone }),

      resetPOS: () => set({
        cart: [],
        selectedTable: null,
        customerName: '',
        customerPhone: '',
      }),

      getSubtotal: () => {
        return get().cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
      },

      getTaxAmount: () => {
        return get().getSubtotal() * get().taxRate;
      },

      getTotal: () => {
        return get().getSubtotal() + get().getTaxAmount();
      },
    }),
    {
      name: 'cafe-pos-store',
    }
  )
);
