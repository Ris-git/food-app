import { apiRequest } from '../../../services/api';
import type { RestaurantApplication } from '../../../types';

export type PartnerApplicationData = {
  restaurantName: string;
  franchiseName?: string;
  logoUrl?: string;
  description?: string;
  address: string;
  formattedAddress?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  phone: string;
  cuisine: string;
  operatingHours?: any;
  mealSlots?: any;
  stagedMenuItems?: any[];
};

export interface PartnerApplicationResponse {
  success: boolean;
  hasApplication?: boolean;
  message?: string;
  application?: RestaurantApplication | null;
}

export interface UploadSignatureResponse {
  success: boolean;
  publicKey: string;
  urlEndpoint: string;
  token: string;
  expire: number;
  signature: string;
}

export const partnerService = {
  async applyForPartner(data: PartnerApplicationData): Promise<PartnerApplicationResponse> {
    return await apiRequest<PartnerApplicationResponse>('/partner/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPartnerApplication(): Promise<PartnerApplicationResponse> {
    return await apiRequest<PartnerApplicationResponse>('/partner/application', {
      method: 'GET',
    });
  },

  async getUploadSignature(): Promise<UploadSignatureResponse> {
    return await apiRequest<UploadSignatureResponse>('/media/upload-signature', {
      method: 'GET',
    });
  },

  async uploadLogoToImageKit(file: File): Promise<{ url: string; fileId: string }> {
    // 1. Client-side File Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds the 5MB limit. Please upload a smaller image.');
    }

    // 2. Fetch upload signature from backend
    const authData = await this.getUploadSignature();

    // 3. Construct FormData payload for ImageKit
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name || 'restaurant_logo');
    formData.append('publicKey', authData.publicKey);
    formData.append('signature', authData.signature);
    formData.append('expire', authData.expire.toString());
    formData.append('token', authData.token);
    formData.append('useUniqueFileName', 'true');
    formData.append('folder', '/restaurant_logos');

    // 4. Direct upload to ImageKit API
    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to upload image to ImageKit.');
    }

    return {
      url: result.url,
      fileId: result.fileId,
    };
  },
};
