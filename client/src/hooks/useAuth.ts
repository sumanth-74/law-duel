import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      console.log('Checking auth status...');
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      console.log('Auth check response:', response.status);
      if (response.status === 401) {
        console.log('Not authenticated');
        return null; // Not authenticated, this is expected
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const userData = await response.json();
      console.log('User authenticated:', userData.username);
      return userData;
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      console.log('Login mutation called with:', { username: credentials.username, password: credentials.password ? '***' : 'empty' });
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      console.log('Login response status:', response.status);
      if (!response.ok) {
        const error = await response.json();
        console.log('Login error:', error);
        throw new Error(error.message || 'Login failed');
      }
      const userData = await response.json();
      console.log('Login successful:', userData.username);
      return userData;
    },
    onSuccess: (user: User) => {
      console.log('Login onSuccess called with user:', user.username);
      queryClient.setQueryData(['/api/auth/me'], user);
      // Force a full page reload to ensure the app recognizes the new auth state
      window.location.reload();
    },
    onError: (error) => {
      console.log('Login onError called:', error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { 
      username: string; 
      displayName: string;
      password: string; 
      confirmPassword: string; 
      avatarData: any;
      email?: string;
      lawSchool?: string;
    }) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      return response.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(['/api/auth/me'], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      return response.ok;
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
    isAuthError: false, // No longer needed since we handle 401 properly
  };
}