import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/http';
import * as api from './api';
import type { AuthUser } from './api';

export const authKeys = { me: ['auth', 'me'] } as const;

/** The current user, or `null` when signed out. Being logged out is data, not an error. */
export function useMe() {
  return useQuery<AuthUser | null>({
    queryKey: authKeys.me,
    // The session only changes via our own mutations or a failed refresh, so never refetch in the background.
    staleTime: Infinity,
    queryFn: async () => {
      try {
        return await api.getMe();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.signUp,
    onSuccess: (user) => queryClient.setQueryData<AuthUser | null>(authKeys.me, user),
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.signIn,
    onSuccess: (user) => queryClient.setQueryData<AuthUser | null>(authKeys.me, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    // Runs on success AND failure: the UI must never keep private data after a logout click.
    // Order matters: clear() first, otherwise it would wipe the null and trigger a refetch.
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData<AuthUser | null>(authKeys.me, null);
    },
  });
}
