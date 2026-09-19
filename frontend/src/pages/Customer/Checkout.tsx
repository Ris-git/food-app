import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { usePersistentCart } from '../../features/cart/usePersistentCart';
import { customerService, type DeliveryAddress } from '../../features/customer/services/customerService';

const emptyAddress: DeliveryAddress = { type: 'Home', addressLine: '', city: '' };

export default function Checkout() {
  const navigate = useNavigate();
  const cart = usePersistentCart();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState(-1);
  const [newAddress, setNewAddress] = useState<DeliveryAddress>(() => ({ ...emptyAddress, city: localStorage.getItem('deliveryLocation') || '' }));
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [requestId] = useState(() => globalThis.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    customerService.addresses().then((response) => { setAddresses(response.addresses); if (response.addresses.length) setSelectedAddress(0); }).catch((reason: Error) => setError(reason.message));
  }, []);

  const deliveryAddress = selectedAddress >= 0 ? addresses[selectedAddress] : newAddress;
  const estimatedTotal = useMemo(() => cart.subtotal + (cart.subtotal >= 499 ? 0 : 40) + cart.subtotal * 0.05, [cart.subtotal]);
  if (!cart.cart?.items.length) return <Navigate to="/cart" replace />;

  const placeOrder = async () => {
    if (!deliveryAddress?.addressLine.trim() || !deliveryAddress.city.trim()) return setError('Enter a complete delivery address.');
    if (selectedAddress < 0 && addresses.length >= 5) return setError('Select an existing address. You already have five saved addresses.');
    setPlacing(true); setError('');
    try {
      if (selectedAddress < 0) {
        const next = [...addresses, deliveryAddress];
        const saved = await customerService.saveAddresses(next);
        setAddresses(saved.addresses);
      }
      const response = await customerService.placeOrder({
        restaurantId: cart.cart!.restaurantId,
        items: cart.items.map((item) => ({ menuItemId: item._id, quantity: item.quantity })),
        deliveryAddress,
        deliveryInstructions: instructions,
        clientRequestId: requestId,
      });
      cart.clear();
      navigate(`/orders/${response.order.id}`, { replace: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to place order.'); }
    finally { setPlacing(false); }
  };

  return <main className="customer-page checkout-page"><Link className="back-link" to="/cart">← Back to cart</Link><div className="checkout-layout">
    <section className="checkout-card"><p className="eyebrow">CHECKOUT</p><h1>Where should we deliver?</h1>
      {addresses.length > 0 && <div className="address-list">{addresses.map((address, index) => <label className={selectedAddress === index ? 'selected' : ''} key={address._id || `${address.type}-${index}`}><input type="radio" name="address" checked={selectedAddress === index} onChange={() => setSelectedAddress(index)} /><span><strong>{address.type}</strong>{address.addressLine}, {address.city}</span></label>)}<button onClick={() => setSelectedAddress(-1)}>+ Use a new address</button></div>}
      {(selectedAddress < 0 || !addresses.length) && <div className="address-form"><label>Label<select value={newAddress.type} onChange={(event) => setNewAddress({ ...newAddress, type: event.target.value as DeliveryAddress['type'] })}><option>Home</option><option>Work</option><option>Other</option></select></label><label>Address<input value={newAddress.addressLine} onChange={(event) => setNewAddress({ ...newAddress, addressLine: event.target.value })} placeholder="Flat, building and street" /></label><label>City or area<input value={newAddress.city} onChange={(event) => setNewAddress({ ...newAddress, city: event.target.value })} placeholder="City or area" /></label>{addresses.length >= 5 && <p className="inline-warning">You can save up to five addresses. Select an existing address to continue.</p>}</div>}
      <label className="instructions-field">Delivery instructions<textarea maxLength={300} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Gate number, landmark or delivery note (optional)" /></label>
      <div className="payment-choice"><span>Cash on Delivery</span><strong>Available</strong><p>Online customer payments can be added after the core order flow is verified.</p></div>
      {error && <div className="inline-warning">{error}</div>}
    </section>
    <aside className="checkout-card order-summary"><p className="eyebrow">FINAL REVIEW</p><h2>{cart.cart.restaurantName}</h2>{cart.items.map((item) => <div className="checkout-summary-item" key={item._id}><span>{item.quantity} × {item.title}</span><strong>₹{item.quantity * item.price}</strong></div>)}<dl><div><dt>Subtotal</dt><dd>₹{cart.subtotal}</dd></div><div><dt>Delivery</dt><dd>{cart.subtotal >= 499 ? 'FREE' : '₹40'}</dd></div><div><dt>Estimated taxes</dt><dd>₹{(cart.subtotal * .05).toFixed(2)}</dd></div><div className="summary-total"><dt>Estimated total</dt><dd>₹{estimatedTotal.toFixed(2)}</dd></div></dl><p className="cart-note">The server will verify every item and calculate the final total.</p><button className="primary-action-button" disabled={placing} onClick={placeOrder}>{placing ? 'Placing order…' : 'Place order'}</button></aside>
  </div></main>;
}
