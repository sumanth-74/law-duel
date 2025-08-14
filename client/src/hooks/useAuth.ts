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
      
      if (!response.ok) {
        console.log('Not authenticated');
        return null;
      }
      
      const data = await response.json();
      
      if (data.ok && data.user) {
        console.log('User authenticated:', data.user.username);
        return data.user;
      }
      
      return null;
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
      const data = await response.json();
      console.log('Login successful:', data.user?.username || data.username);
      // Handle both old and new response formats
      return data.user || data;
    },
    onSuccess: (data: any) => {
      const user = data.user || data;
      console.log('Login onSuccess called with user:', user.username);
      // Set the user data in the cache
      queryClient.setQueryData(['/api/auth/me'], user);
      // Refetch to ensure session is properly established
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      // Small delay to ensure session is saved before redirect
      setTimeout(() => {
        window.location.href = '/play';
      }, 100);
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
    onSuccess: (data: any) => {
      const user = data.user || data;
      console.log('Registration successful for user:', user.username);
      // Set the user data in the cache
      queryClient.setQueryData(['/api/auth/me'], user);
      // Refetch to ensure session is properly established
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      // Small delay to ensure session is saved before redirect
      setTimeout(() => {
        window.location.href = '/play';
      }, 100);
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
      window.location.reload();
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