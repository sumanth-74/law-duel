import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { setToken, getToken } from "@/authToken";
import type { User } from "@shared/schema";
import { useState } from "react";

export function useAuth() {
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    refetchOnWindowFocus: !isLoggingOut, // Disable refetch when logging out
    refetchOnMount: !isLoggingOut, // Disable refetch on mount when logging out
    refetchOnReconnect: !isLoggingOut, // Disable refetch on reconnect when logging out
    enabled: !isLoggingOut, // Disable query when logging out
    queryFn: async () => {
      // Don't make API calls if we're logging out
      if (isLoggingOut) {
        console.log('Auth check disabled - logging out');
        return null;
      }
      
      console.log('Checking auth status...');
      const token = getToken();
      const headers: Record<string, string> = {};
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log('Using token for auth check');
      }
      
      const response = await fetch('/api/auth/me', {
        headers,
        credentials: 'include',
      });
      console.log('Auth check response:', response.status);
      
      if (!response.ok) {
        console.log('Not authenticated');
        return null;
      }
      
      const data = await response.json();
      
      if (data.ok && data.user) {
        console.log('User authenticated:', data.user.username, 'mode:', data.mode);
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
      // Store the token if provided
      if (data.token) {
        setToken(data.token);
        console.log('Token stored');
      }
      // Handle both old and new response formats
      return data.user || data;
    },
    onSuccess: async (data: any) => {
      console.log('Login onSuccess called, data:', data);
      // Hard navigate to bypass any router issues
      window.location.assign('/');
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
      const data = await response.json();
      // Store the token if provided
      if (data.token) {
        setToken(data.token);
        console.log('Registration token stored');
      }
      return data;
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
      // Set logging out flag immediately to prevent API calls
      setIsLoggingOut(true);
      
      // Immediately clear user data to prevent error page flash
      queryClient.setQueryData(['/api/auth/me'], null);
      
      // Cancel any ongoing queries to prevent API calls
      queryClient.cancelQueries({ queryKey: ['/api/auth/me'] });
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      return response.ok;
    },
    onSuccess: () => {
      // Clear the token on logout
      setToken(null);
      console.log('Token cleared');
      
      // Clear all query cache to ensure clean state
      queryClient.clear();
      
      // Force a clean navigation to the landing page
      // This bypasses any cached authentication state
      window.location.replace('/');
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