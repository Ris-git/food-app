import React, { useState, useEffect } from 'react';
import { partnerService } from '../../features/partner/services/partnerService';
import type { RestaurantApplication } from '../../types';
import Status from './Status';
import WizardContainer from './WizardContainer';

export const Application: React.FC = () => {
  const [application, setApplication] = useState<RestaurantApplication | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setFetching(true);
    try {
      const res = await partnerService.getPartnerApplication();
      if (res.hasApplication && res.application) {
        setApplication(res.application);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch application status.');
    } finally {
      setFetching(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ textAlign: 'center', margin: '60px auto', color: '#FFF' }}>
        <p>Loading application status...</p>
      </div>
    );
  }

  // If application exists and user is not explicitly editing, show Status view
  if (application && !isEditing) {
    return <Status application={application} onEditResubmit={() => setIsEditing(true)} />;
  }

  return <WizardContainer />;
};

export default Application;
