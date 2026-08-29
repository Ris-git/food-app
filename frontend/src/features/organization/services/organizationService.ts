import { apiRequest } from '../../../services/api';
import type { Organization, OrganizationRole, RestaurantRole } from '../../../types';

export type RestaurantAssignmentInput = { restaurant: string; role: Exclude<RestaurantRole, 'OWNER'> };

export const organizationService = {
  getContext: () => apiRequest('/organizations/context', { method: 'GET' }) as Promise<{ success: boolean; organizations: Organization[] }>,
  getOverview: (organizationId: string) => apiRequest(`/organizations/${organizationId}/overview`, { method: 'GET' }),
  createRestaurant: (organizationId: string, input: { name: string; address: string; phone?: string; cuisine?: string[] }) =>
    apiRequest(`/organizations/${organizationId}/restaurants`, { method: 'POST', body: JSON.stringify(input) }),
  archiveRestaurant: (organizationId: string, restaurantId: string) =>
    apiRequest(`/organizations/${organizationId}/restaurants/${restaurantId}`, { method: 'DELETE' }),
  getStaff: (organizationId: string) => apiRequest(`/organizations/${organizationId}/staff`, { method: 'GET' }) as Promise<any>,
  inviteStaff: (organizationId: string, input: { email: string; role: Exclude<OrganizationRole, 'OWNER'>; restaurantAssignments: RestaurantAssignmentInput[] }) =>
    apiRequest(`/organizations/${organizationId}/invitations`, { method: 'POST', body: JSON.stringify(input) }),
  acceptInvitation: (token: string) => apiRequest(`/organizations/invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' }),
  revokeInvitation: (organizationId: string, invitationId: string) =>
    apiRequest(`/organizations/${organizationId}/invitations/${invitationId}`, { method: 'DELETE' }),
  updateStaff: (organizationId: string, membershipId: string, input: { role?: 'ADMIN' | 'STAFF'; status?: 'ACTIVE' | 'SUSPENDED'; restaurantAssignments?: RestaurantAssignmentInput[] }) =>
    apiRequest(`/organizations/${organizationId}/staff/${membershipId}`, { method: 'PATCH', body: JSON.stringify(input) }),
  removeStaff: (organizationId: string, membershipId: string) =>
    apiRequest(`/organizations/${organizationId}/staff/${membershipId}`, { method: 'DELETE' }),
};
