import { createContext, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

/**
 * Phiên đăng nhập dựa trên cookie PHPSESSID của Back-End.
 * Khi tải trang, gọi `?action=me` để khôi phục phiên; 401 nghĩa là chưa đăng nhập.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api.me();
      } catch (err) {
        if (err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: ({ identifier, password }) => api.login(identifier, password),
    onSuccess: async () => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      await queryClient.refetchQueries({ queryKey: ["me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.logout().catch(() => null),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(["me"], null);
    },
  });

  const value = useMemo(
    () => ({
      session: meQuery.data ?? null,
      user: meQuery.data?.user ?? null,
      isLoading: meQuery.isPending,
      error: meQuery.error,
      retry: meQuery.refetch,
      login: loginMutation.mutateAsync,
      isLoggingIn: loginMutation.isPending,
      logout: logoutMutation.mutateAsync,
    }),
    [meQuery.data, meQuery.isPending, meQuery.error, meQuery.refetch, loginMutation.mutateAsync, loginMutation.isPending, logoutMutation.mutateAsync],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong <AuthProvider>");
  return ctx;
}

/** Trang mặc định theo vai trò */
export const homeFor = (role) => (role === "ADMIN" ? "/admin" : "/nhan-vien");
