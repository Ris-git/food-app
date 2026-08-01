import React, { useState, useEffect } from 'react';
import { adminService } from '../../features/admin/services/adminService';
import type { RestaurantApplication } from '../../types';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../features/auth/context/AuthContext';

export const AdminApplications: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<RestaurantApplication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reject Modal state
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState<string>('');

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'superAdmin')) {
      fetchApplications();
    }
  }, [user]);

  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) {
    return (
      <div style={{ maxWidth: '480px', margin: '60px auto', padding: '32px', backgroundColor: '#FFFFFF', borderRadius: '24px', color: '#0F172A', textAlign: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
        <h3 style={{ color: '#EF4444', fontFamily: 'var(--font-display)', marginBottom: '8px', fontSize: '20px' }}>Access Denied</h3>
        <p style={{ color: '#64748B', fontSize: '14px' }}>You must be logged in as an Admin or SuperAdmin to view the Admin Console.</p>
      </div>
    );
  }


  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getApplications();
      if (res.applications) {
        setApplications(res.applications);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminService.approveApplication(id);
      setSuccessMsg(res.message || 'Application approved successfully!');
      await fetchApplications();
    } catch (err: any) {
      setError(err.message || 'Failed to approve application.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingAppId) return;

    setActionLoadingId(rejectingAppId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await adminService.rejectApplication(rejectingAppId, rejectRemarks);
      setSuccessMsg(res.message || 'Application rejected.');
      setRejectingAppId(null);
      setRejectRemarks('');
      await fetchApplications();
    } catch (err: any) {
      setError(err.message || 'Failed to reject application.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '24px', backgroundColor: '#FFFFFF', borderRadius: '24px', color: '#0F172A', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>
          Admin Console: Partner Applications
        </h2>
        <Button variant="outline" onClick={fetchApplications} isLoading={loading}>
          Refresh List
        </Button>
      </div>

      {error && <div style={{ padding: '12px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
      {successMsg && <div style={{ padding: '12px', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: '12px', marginBottom: '16px', fontSize: '14px' }}>{successMsg}</div>}

      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>Loading applications...</p>
      ) : applications.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>No partner applications found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                <th style={{ padding: '12px 8px' }}>Applicant</th>
                <th style={{ padding: '12px 8px' }}>Restaurant Details</th>
                <th style={{ padding: '12px 8px' }}>Cuisine</th>
                <th style={{ padding: '12px 8px' }}>Status</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id || (app as any)._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{ fontWeight: 600 }}>{(app as any).user?.name || 'N/A'}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{(app as any).user?.email}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{(app as any).user?.phone || app.phone}</div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>
                    <div style={{ fontWeight: 600 }}>{app.restaurantName}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{app.address}</div>
                  </td>
                  <td style={{ padding: '16px 8px' }}>{app.cuisine}</td>
                  <td style={{ padding: '16px 8px' }}>
                    <Badge status={app.status as any} />
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                    {app.status === 'pending' ? (
                      <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Button
                          variant="primary"
                          disabled={actionLoadingId === (app.id || (app as any)._id)}
                          onClick={() => handleApprove(app.id || (app as any)._id)}
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          disabled={actionLoadingId === (app.id || (app as any)._id)}
                          onClick={() => setRejectingAppId(app.id || (app as any)._id)}
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#64748B' }}>Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Remarks Modal */}
      {rejectingAppId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', maxWidth: '440px', width: '90%' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>Reject Partner Application</h3>
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '16px' }}>
              Please enter the reason for rejection so the applicant can correct their details.
            </p>
            <form onSubmit={handleRejectSubmit}>
              <Input
                label="Rejection Remarks"
                placeholder="e.g. Invalid phone number or incomplete address"
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button variant="secondary" type="button" onClick={() => setRejectingAppId(null)}>
                  Cancel
                </Button>
                <Button variant="danger" type="submit" isLoading={actionLoadingId === rejectingAppId}>
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplications;
