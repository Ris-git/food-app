import React, { useEffect, useState } from 'react';
import { authService } from '../../features/auth/services/authService';
import Badge from '../../components/Badge';

export const VerifyEmail: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email address...');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    authService
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message || 'Email verified successfully! You can now log in.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Email verification failed or token has expired.');
      });
  }, []);

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '24px', backgroundColor: '#FFF', borderRadius: '16px', color: '#000', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '20px', fontFamily: 'var(--font-display)' }}>Email Verification</h2>
      {status === 'loading' && <Badge status="info" text="VERIFYING..." />}
      {status === 'success' && <Badge status="approved" text="VERIFIED" />}
      {status === 'error' && <Badge status="rejected" text="FAILED" />}
      <p style={{ marginTop: '16px', fontSize: '15px' }}>{message}</p>
    </div>
  );
};

export default VerifyEmail;
