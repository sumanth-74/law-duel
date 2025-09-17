import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getToken } from "../authToken";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Ensure URL starts with /api for proper proxy handling
  const fullUrl = url.startsWith('/api') ? url : `/api${url}`;
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle both array and string query keys
    const url = Array.isArray(queryKey) ? queryKey.join('/') : queryKey;
    const token = getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(url as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        // Handle both array and string query keys
        let url = Array.isArray(queryKey) ? queryKey.join('/') : queryKey;
        
        // Ensure URL starts with /api for proper proxy handling
        if (typeof url === 'string' && !url.startsWith('/api')) {
          url = `/api${url}`;
        }
        
        const token = getToken();
        const headers: Record<string, string> = {};
        
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        
        const res = await fetch(url as string, {
          headers,
          credentials: "include",
        });
        
        if (!res.ok && res.status !== 401) {
          throw new Error(`${res.status}: ${await res.text()}`);
        }
        
        if (res.status === 401) {
          return null;
        }
        
        return await res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
