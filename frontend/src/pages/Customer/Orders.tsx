import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerService, type CustomerOrder } from '../../features/customer/services/customerService';

export default function Orders() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { customerService.orders().then((response) => setOrders(response.orders)).catch((reason: Error) => setError(reason.message)); }, []);
  return <main className="customer-page orders-page"><div className="section-heading"><div><p className="eyebrow">YOUR ORDERS</p><h1>Order history</h1></div><Link className="back-link" to="/restaurants">Browse restaurants</Link></div>{error && <div className="state-card error">{error}</div>}{orders.length ? <div className="orders-list">{orders.map((order) => <Link key={order.id} to={`/orders/${order.id}`}><div><strong>{typeof order.restaurant === 'string' ? 'Restaurant' : order.restaurant.name}</strong><span>{order.orderNumber} · {new Date(order.createdAt).toLocaleString()}</span></div><div><b>{order.status.replace('OutForDelivery', 'Out for delivery')}</b><strong>₹{order.totalPrice.toFixed(2)}</strong></div></Link>)}</div> : !error && <div className="state-card">You have not placed any orders yet.</div>}</main>;
}
