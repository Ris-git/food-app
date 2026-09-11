import { useEffect, useMemo, useState } from 'react';
import type { PublicMenuItem } from '../discovery/services/discoveryService';

type CartItem = Pick<PublicMenuItem, '_id' | 'title' | 'price'> & { quantity: number };
type StoredCart = { restaurantId: string; restaurantName: string; items: CartItem[] };

const CART_STORAGE_KEY = 'foodyCustomerCart';

const readCart = (): StoredCart | null => {
  try {
    const value = localStorage.getItem(CART_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as StoredCart;
    return parsed.restaurantId && Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
};

export function usePersistentCart(restaurantId: string, restaurantName: string) {
  const [cart, setCart] = useState<StoredCart | null>(readCart);

  useEffect(() => {
    if (cart?.items.length) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    else localStorage.removeItem(CART_STORAGE_KEY);
  }, [cart]);

  const visibleItems = useMemo(() => cart?.restaurantId === restaurantId ? cart.items : [], [cart, restaurantId]);
  const subtotal = useMemo(() => visibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [visibleItems]);

  const addItem = (item: PublicMenuItem) => setCart((current) => {
    const active = current?.restaurantId === restaurantId
      ? current
      : { restaurantId, restaurantName, items: [] };
    const existing = active.items.find((cartItem) => cartItem._id === item._id);
    const items = existing
      ? active.items.map((cartItem) => cartItem._id === item._id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem)
      : [...active.items, { _id: item._id, title: item.title, price: item.price, quantity: 1 }];
    return { ...active, restaurantName, items };
  });

  const changeQuantity = (itemId: string, delta: number) => setCart((current) => {
    if (!current || current.restaurantId !== restaurantId) return current;
    const items = current.items
      .map((item) => item._id === itemId ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0);
    return items.length ? { ...current, items } : null;
  });

  const removeItem = (itemId: string) => setCart((current) => {
    if (!current || current.restaurantId !== restaurantId) return current;
    const items = current.items.filter((item) => item._id !== itemId);
    return items.length ? { ...current, items } : null;
  });

  return { items: visibleItems, subtotal, addItem, changeQuantity, removeItem };
}
