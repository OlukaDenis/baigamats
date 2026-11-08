import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { horecaApi } from '../../../api/horecaApiClient';
import type { BusinessProfile } from '../../../api/schemas';
import { useHorecaStore } from '../../../db/offlineStore';

export const HORECA_BUSINESS_QUERY_KEY = ['horeca', 'business'] as const;

/**
 * Fetches and caches the business profile, receipt settings, and VAT settings
 * from `GET /api/v1/business` on the Business Console API.
 */
export async function fetchAndStoreBusinessProfile(): Promise<BusinessProfile | null> {
  try {
    const profile = await horecaApi.getBusiness();
    if (profile) {
      useHorecaStore.getState().setBusinessProfile(profile);
      return profile;
    }
  } catch {
    // Retain cached business profile when offline or before endpoint deployment
  }
  return useHorecaStore.getState().businessProfile;
}

export function useBusinessProfile(enabled = true) {
  const businessProfile = useHorecaStore(state => state.businessProfile);
  const hydrateBusinessProfile = useHorecaStore(state => state.hydrateBusinessProfile);

  useEffect(() => {
    hydrateBusinessProfile().catch(() => {});
  }, [hydrateBusinessProfile]);

  const query = useQuery({
    queryKey: HORECA_BUSINESS_QUERY_KEY,
    queryFn: async () => {
      const profile = await horecaApi.getBusiness();
      useHorecaStore.getState().setBusinessProfile(profile);
      return profile;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refresh periodically (every 10 minutes)
  });

  return {
    businessProfile: query.data ?? businessProfile,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
