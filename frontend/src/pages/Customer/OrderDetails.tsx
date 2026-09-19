import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { customerService, type CustomerOrder } from '../../features/customer/services/customerService';

const stages = ['Pending', 'Preparing', 'OutForDelivery', 'Delivered'];
export default function OrderDetails() {
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const load = () => customerService.order(orderId)
      .then((response) => { setOrder(response.order); setError(''); })
      .catch((reason: Error) => setError(reason.message));
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, [orderId]);
  if (error) return <main className="customer-page"><div className="state-card error">{error}</div></main>;
  if (!order) return <main className="customer-page"><div className="state-card">Loading your order…</div></main>;
  const restaurantName = typeof order.restaurant === 'string' ? 'Restaurant' : order.restaurant.name;
  const activeStage = stages.indexOf(order.status);
  const cancel = async () => { try { const response = await customerService.cancelOrder(order.id); setOrder(response.order); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to cancel order.'); } };
  return <main className="customer-page order-page"><section className="checkout-card order-success"><p className="eyebrow">ORDER CONFIRMED</p><h1>{order.status === 'Cancelled' ? 'Order cancelled' : 'Your order is in!'}</h1><p>Order <strong>{order.orderNumber}</strong> from {restaurantName}</p><div className={`order-progress ${order.status === 'Cancelled' ? 'cancelled' : ''}`}>{stages.map((stage, index) => <div className={index <= activeStage ? 'complete' : ''} key={stage}><span>{index + 1}</span><small>{stage.replace('OutForDelivery', 'Out for delivery')}</small></div>)}</div><div className="order-detail-grid"><div><span>Delivering to</span><strong>{order.deliveryAddressLabel}</strong><p>{order.deliveryAddress}</p></div><div><span>Payment</span><strong>Cash on Delivery</strong><p>₹{order.totalPrice.toFixed(2)}</p></div></div><div className="order-item-receipt"><h2>Order items</h2>{order.items.map((item, index) => <div key={typeof item.menuItem === 'string' ? `${item.menuItem}-${index}` : item.menuItem?._id || index}><span>{item.quantity} × {typeof item.menuItem === 'string' ? 'Menu item' : item.menuItem?.title || 'Removed menu item'}</span><strong>₹{(item.quantity * item.priceAtPurchase).toFixed(2)}</strong></div>)}<div><span>Delivery and taxes</span><strong>₹{(order.deliveryFee + order.taxes).toFixed(2)}</strong></div><div className="receipt-total"><span>Total</span><strong>₹{order.totalPrice.toFixed(2)}</strong></div></div>{order.status === 'Pending' && <button className="text-danger-button" onClick={cancel}>Cancel order</button>}<div className="order-page-actions"><Link className="primary-action-link" to="/orders">View all orders</Link><Link className="secondary-action-link" to="/restaurants">Browse restaurants</Link></div></section></main>;
}
