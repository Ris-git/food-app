import React, { useState } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';

export const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ username, password });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '32px', backgroundColor: '#FFFFFF', borderRadius: '24px', color: '#0F172A', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
      <h2 style={{ marginBottom: '20px', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>Log In to Foody</h2>
      {error && <div style={{ color: '#EF4444', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
      <form onSubmit={handleSubmit} autoComplete="on">
        <Input
          label="Username"
          id="login-username"
          name="username"
          autoComplete="username"
          type="text"
          placeholder="e.g. johndoe"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Input
          label="Password"
          id="login-password"
          name="password"
          autoComplete="current-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" isLoading={isLoading} style={{ width: '100%', marginTop: '12px' }}>
          Log In
        </Button>
      </form>
    </div>
  );
};

export default Login;
