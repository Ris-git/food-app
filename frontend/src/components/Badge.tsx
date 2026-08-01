import React from 'react';

export type BadgeVariant = 'pending' | 'approved' | 'rejected' | 'info';

export interface BadgeProps {
  status: BadgeVariant;
  text?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, text }) => {
  const displayText = text || status.toUpperCase();

  return (
    <span className={`badge badge-${status}`}>
      {displayText}
    </span>
  );
};

export default Badge;
