import React, { useState } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';

export const Signup: React.FC = () => {
  const { signup, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    phone: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await signup(formData);
      setMessage('Account created! Please check your email to verify your account.');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '50px auto', padding: '32px', backgroundColor: '#FFFFFF', borderRadius: '24px', color: '#0F172A', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
      <h2 style={{ marginBottom: '20px', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>Create Your Account</h2>
      {error && <div style={{ color: '#EF4444', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
      {message && <div style={{ color: '#10B981', marginBottom: '16px', fontSize: '14px' }}>{message}</div>}
      <form onSubmit={handleSubmit}>
        <Input label="Full Name" name="name" placeholder="e.g. John Doe" value={formData.name} onChange={handleChange} required />
        <Input label="Email Address" name="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleChange} required />
        <Input label="Username" name="username" placeholder="e.g. johndoe" value={formData.username} onChange={handleChange} required />
        <Input label="Phone Number" name="phone" placeholder="9876543210" value={formData.phone} onChange={handleChange} required />
        <Input label="Password" name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
        <Button type="submit" isLoading={isLoading} style={{ width: '100%', marginTop: '12px' }}>
          Sign Up
        </Button>
      </form>
    </div>
  );
};

export default Signup;
