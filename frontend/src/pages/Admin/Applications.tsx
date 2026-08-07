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

  // Selected Application for Detailed Preview Modal
  const [selectedApp, setSelectedApp] = useState<RestaurantApplication | null>(null);

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
      setSelectedApp(null);
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
      setSelectedApp(null);
      setRejectRemarks('');
      await fetchApplications();
    } catch (err: any) {
      setError(err.message || 'Failed to reject application.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1040px', margin: '40px auto', padding: '24px', backgroundColor: '#FFFFFF', borderRadius: '24px', color: '#0F172A', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
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
              {applications.map((app) => {
                const appId = app.id || (app as any)._id;
                return (
                  <tr
                    key={appId}
                    style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                    onClick={() => setSelectedApp(app)}
                  >
                    <td style={{ padding: '16px 8px' }}>
                      <div style={{ fontWeight: 600 }}>{(app as any).user?.name || 'N/A'}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{(app as any).user?.email}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>{(app as any).user?.phone || app.phone}</div>
                    </td>
                    <td style={{ padding: '16px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {app.logoUrl ? (
                          <img src={app.logoUrl} alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🏬</div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{app.restaurantName}</div>
                          {app.franchiseName && <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>{app.franchiseName}</div>}
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{app.formattedAddress || app.address}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 8px' }}>{app.cuisine}</td>
                    <td style={{ padding: '16px 8px' }}>
                      <Badge status={app.status as any} />
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          👁️ View Details
                        </button>
                        {app.status === 'pending' && (
                          <>
                            <Button
                              variant="primary"
                              disabled={actionLoadingId === appId}
                              onClick={() => handleApprove(appId)}
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              disabled={actionLoadingId === appId}
                              onClick={() => setRejectingAppId(appId)}
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detailed Application Preview Modal */}
      {selectedApp && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedApp(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                  Application Details Preview
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Applicant: <strong>{(selectedApp as any).user?.name}</strong> ({(selectedApp as any).user?.email})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                style={{ fontSize: '18px', border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {/* Brand Card */}
            <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '16px', marginBottom: '16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              {selectedApp.logoUrl ? (
                <img src={selectedApp.logoUrl} alt="Logo" style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏬</div>
              )}
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: 800 }}>{selectedApp.restaurantName}</h4>
                {selectedApp.franchiseName && <p style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Franchise: {selectedApp.franchiseName}</p>}
                <p style={{ fontSize: '13px', color: '#64748B' }}>Cuisine: {selectedApp.cuisine} | Phone: {selectedApp.phone}</p>
              </div>
            </div>

            {/* Location & Geocoding */}
            <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '16px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>📍 Geocoded Location</div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>{selectedApp.formattedAddress || selectedApp.address}</p>
              <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                GeoJSON Coordinates: <code>[{selectedApp.location?.coordinates?.[0] ?? 77.6412}, {selectedApp.location?.coordinates?.[1] ?? 12.9719}]</code>
              </span>
            </div>

            {/* Schedule & Shifts */}
            {selectedApp.operatingHours && (
              <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '16px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>⏰ Operating Schedule & Shifts</div>
                <p style={{ fontSize: '13px', color: '#334155' }}>
                  Monday Hours: <strong>{selectedApp.operatingHours.monday?.isOpen ? `${selectedApp.operatingHours.monday?.openTime} - ${selectedApp.operatingHours.monday?.closeTime}` : 'Closed'}</strong>
                </p>
              </div>
            )}

            {/* Staged Menu Items Table */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                📋 Staged Menu Items ({selectedApp.stagedMenuItems?.length || 0} Items)
              </div>
              {selectedApp.stagedMenuItems && selectedApp.stagedMenuItems.length > 0 ? (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F1F5F9', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Name</th>
                        <th style={{ padding: '8px 10px' }}>Category</th>
                        <th style={{ padding: '8px 10px' }}>Price</th>
                        <th style={{ padding: '8px 10px' }}>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedApp.stagedMenuItems.map((item, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.name}</td>
                          <td style={{ padding: '8px 10px' }}>{item.category}</td>
                          <td style={{ padding: '8px 10px' }}>₹{item.price}</td>
                          <td style={{ padding: '8px 10px' }}>{item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#94A3B8' }}>No staged menu items provided.</p>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge status={selectedApp.status as any} />

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={() => setSelectedApp(null)}>
                  Close Preview
                </Button>

                {selectedApp.status === 'pending' && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => setRejectingAppId(selectedApp.id || (selectedApp as any)._id)}
                      disabled={actionLoadingId === (selectedApp.id || (selectedApp as any)._id)}
                    >
                      Reject Application
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleApprove(selectedApp.id || (selectedApp as any)._id)}
                      isLoading={actionLoadingId === (selectedApp.id || (selectedApp as any)._id)}
                    >
                      Approve & Provision Restaurant ✓
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
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
            zIndex: 1001,
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
