import { useCallback, useEffect, useState } from "react";
import { authApi } from "@/lib/auth-api";

/**
 * Trạng thái đăng nhập lấy hoàn toàn từ session PHP (không lưu localStorage).
 * Khi mở trang: gọi ?action=me để biết đã đăng nhập hay chưa.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((data) => {
        if (!cancelled) setUser(data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier, password) => {
    setError(null);
    try {
      const data = await authApi.login(identifier, password);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const msg = err.message || "Mã nhân viên hoặc mật khẩu không chính xác.";
      setError(msg);
      return { success: false, message: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Dù backend lỗi vẫn đăng xuất phía giao diện
    }
    setUser(null);
  }, []);

  return { user, loading, error, login, logout };
}
