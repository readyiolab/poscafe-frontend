import React, { createContext, useContext, useState } from 'react';

type CartItem = any & { id: number; price: number; quantity: number };

type CartContextValue = {
  cart: CartItem[];
  addToCart: (item: any) => void;
  removeFromCart: (itemId: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cafe_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('cafe_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = React.useCallback((item: any) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((i) => i.id === item.id);
      if (existingItem) {
        return prevCart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  }, []);

  const removeFromCart = React.useCallback((itemId: number) => {
    setCart((prevCart) =>
      prevCart
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const clearCart = React.useCallback(() => setCart([]), []);

  const cartTotal = React.useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const cartCount = React.useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const value = React.useMemo(() => ({
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    cartTotal,
    cartCount
  }), [cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
