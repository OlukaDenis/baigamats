import { useQuery } from '@tanstack/react-query';

import { authApi } from '../../auth/api/authApi';
import { useAuthStore } from '../../auth/store/authStore';

export const businessQueryKey = ['account', 'business'] as const;

export function useBusinessQuery() {
  const status = useAuthStore(state => state.status);
  const needsOrganizationSetup = useAuthStore(
    state => state.needsOrganizationSetup,
  );

  return useQuery({
    queryKey: businessQueryKey,
    queryFn: () => authApi.getBusiness(),
    enabled: status === 'authenticated' && !needsOrganizationSetup,
  });
}
