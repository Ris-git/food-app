import { useEffect, useMemo, useState } from 'react';
import type { PublicMenuItem } from '../discovery/services/discoveryService';

export type CartItem = Pick<PublicMenuItem, '_id' | 'title' | 'price'> & { quantity: number };
export type StoredCart = { restaurantId: string; restaurantName: string; items: CartItem[] };

const CART_STORAGE_KEY = 'foodyCustomerCart';
const CART_EVENT = 'foody-cart-change';

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

const saveCart = (cart: StoredCart | null) => {
  if (cart?.items.length) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  else localStorage.removeItem(CART_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: cart }));
};

export function usePersistentCart(restaurantId = '', restaurantName = 'Restaurant') {
  const [cart, setCartState] = useState<StoredCart | null>(readCart);

  useEffect(() => {
    const sync = (event: Event) => setCartState((event as CustomEvent<StoredCart | null>).detail ?? readCart());
    const syncStorage = () => setCartState(readCart());
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  const setCart = (updater: (current: StoredCart | null) => StoredCart | null) => {
    // localStorage is the shared source of truth because the header, menu and
    // cart page can all mount this hook at the same time. Compute and publish
    // outside React's state updater so one component never updates another
    // component while React is rendering.
    const next = updater(readCart());
    saveCart(next);
    setCartState(next);
  };
  const visibleItems = useMemo(() => !restaurantId || cart?.restaurantId === restaurantId ? cart?.items || [] : [], [cart, restaurantId]);
  const subtotal = useMemo(() => visibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [visibleItems]);
  const hasDifferentRestaurant = Boolean(restaurantId && cart?.items.length && cart.restaurantId !== restaurantId);

  const addItem = (item: PublicMenuItem, quantity = 1, replaceDifferentRestaurant = false) => setCart((current) => {
    if (current?.items.length && current.restaurantId !== restaurantId && !replaceDifferentRestaurant) return current;
    const active = current?.restaurantId === restaurantId ? current : { restaurantId, restaurantName, items: [] };
    const existing = active.items.find((cartItem) => cartItem._id === item._id);
    const items = existing
      ? active.items.map((cartItem) => cartItem._id === item._id ? { ...cartItem, quantity: Math.min(20, cartItem.quantity + quantity) } : cartItem)
      : [...active.items, { _id: item._id, title: item.title, price: item.price, quantity: Math.min(20, quantity) }];
    return { ...active, restaurantName, items };
  });

  const changeQuantity = (itemId: string, delta: number) => setCart((current) => {
    if (!current || (restaurantId && current.restaurantId !== restaurantId)) return current;
    const items = current.items
      .map((item) => item._id === itemId ? { ...item, quantity: Math.min(20, item.quantity + delta) } : item)
      .filter((item) => item.quantity > 0);
    return items.length ? { ...current, items } : null;
  });

  const removeItem = (itemId: string) => setCart((current) => {
    if (!current || (restaurantId && current.restaurantId !== restaurantId)) return current;
    const items = current.items.filter((item) => item._id !== itemId);
    return items.length ? { ...current, items } : null;
  });

  const clear = () => setCart(() => null);

  return { cart, items: visibleItems, subtotal, addItem, changeQuantity, removeItem, clear, hasDifferentRestaurant };
}
