import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePersistentCart } from '../../features/cart/usePersistentCart';
import { discoveryService, type PublicRestaurant } from '../../features/discovery/services/discoveryService';

export default function Cart() {
  const cart = usePersistentCart();
  const [restaurant, setRestaurant] = useState<PublicRestaurant | null>(null);
  const [warning, setWarning] = useState('');
  const checkoutBlocked = Boolean(warning || (restaurant && !restaurant.isOpenNow));

  useEffect(() => {
    if (!cart.cart?.restaurantId) return;
    Promise.all([discoveryService.restaurant(cart.cart.restaurantId), discoveryService.menu(cart.cart.restaurantId)])
      .then(([restaurantResponse, menuResponse]) => {
        setRestaurant(restaurantResponse.restaurant);
        const currentMenu = new Map(menuResponse.menuItems.map((item) => [item._id, item]));
        const unavailable = cart.items.filter((item) => !currentMenu.get(item._id)?.isAvailable);
        setWarning(unavailable.length ? `${unavailable.map((item) => item.title).join(', ')} ${unavailable.length === 1 ? 'is' : 'are'} no longer available.` : '');
      })
      .catch((error: Error) => setWarning(error.message));
  }, [cart.cart?.restaurantId, cart.items]);

  if (!cart.cart?.items.length) return <main className="customer-page cart-page"><section className="checkout-card empty-checkout"><p className="eyebrow">YOUR CART</p><h1>Your cart is empty</h1><p>Browse restaurants and add something delicious.</p><Link className="primary-action-link" to="/restaurants">Browse restaurants</Link></section></main>;

  return <main className="customer-page cart-page">
    <Link className="back-link" to={`/restaurants/${cart.cart.restaurantId}`}>← Continue browsing {cart.cart.restaurantName}</Link>
    <div className="checkout-layout">
      <section className="checkout-card"><p className="eyebrow">YOUR CART</p><h1>Review your order</h1><p className="muted-copy">Ordering from <strong>{cart.cart.restaurantName}</strong>{restaurant ? ` · ${restaurant.estimatedDeliveryMinutes} min` : ''}</p>
        {warning && <div className="inline-warning">{warning}</div>}
        <div className="checkout-items">{cart.items.map((item) => <article key={item._id}><div><h3>{item.title}</h3><p>₹{item.price} each</p></div><div className="cart-controls"><button onClick={() => cart.changeQuantity(item._id, -1)}>−</button><b>{item.quantity}</b><button onClick={() => cart.changeQuantity(item._id, 1)}>+</button></div><strong>₹{item.price * item.quantity}</strong><button className="remove-cart-item" onClick={() => cart.removeItem(item._id)}>Remove</button></article>)}</div>
        <button className="text-danger-button" onClick={cart.clear}>Clear cart</button>
      </section>
      <aside className="checkout-card order-summary"><p className="eyebrow">SUMMARY</p><h2>Bill details</h2><dl><div><dt>Item subtotal</dt><dd>₹{cart.subtotal}</dd></div><div><dt>Delivery fee</dt><dd>{cart.subtotal >= 499 ? 'FREE' : '₹40'}</dd></div><div><dt>Estimated taxes</dt><dd>₹{(cart.subtotal * 0.05).toFixed(2)}</dd></div><div className="summary-total"><dt>Estimated total</dt><dd>₹{(cart.subtotal + (cart.subtotal >= 499 ? 0 : 40) + cart.subtotal * 0.05).toFixed(2)}</dd></div></dl><p className="cart-note">Final prices and availability are verified at checkout.</p>{checkoutBlocked ? <button className="primary-action-button" disabled>Proceed to checkout</button> : <Link className="primary-action-link" to="/checkout">Proceed to checkout</Link>}</aside>
    </div>
  </main>;
}
