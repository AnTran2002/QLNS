import { useState } from "react";
import { Eye, EyeOff, Lock, LogIn, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function LoginPage({ onLogin }) {
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!employeeCode.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ Mã nhân viên và Mật khẩu.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await onLogin(employeeCode.trim(), password);
    if (!result.success) {
      setError(result.message);
      toast.error(result.message);
    } else {
      toast.success("Đăng nhập thành công!");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[400px] bg-white border border-[#e8e8e8] rounded-2xl p-8 sm:p-9 shadow-sm">
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-3 pt-1 pb-2">
          <span className="brand-mark inline-grid grid-cols-2 gap-[3px] -rotate-6">
            <span className="w-2.5 h-2.5 rounded-full bg-[#242424]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#242424]" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#242424]" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#242424]" />
          </span>
          <span className="text-[28px] font-bold tracking-tight text-[#202020]">
            people<span className="font-normal">os</span>
            <sup className="text-[11px] font-normal relative -top-3 left-1 text-[#888]">®</sup>
          </span>
        </div>

        {/* Heading */}
        <div className="text-center mt-3 mb-6">
          <h1 className="text-[20px] font-semibold tracking-tight text-[#242424]">
            Đăng nhập hệ thống
          </h1>
          <p className="text-[12px] text-[#888] mt-1.5 leading-relaxed">
            Nhập Mã nhân viên và mật khẩu để tiếp tục
          </p>
        </div>

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="login-employee-code"
              className="text-[12px] text-[#555] font-medium flex items-center gap-1.5"
            >
              <User size={13} className="text-[#888]" />
              Mã nhân viên
            </Label>
            <Input
              id="login-employee-code"
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="VD: NV001 hoặc NV002"
              autoComplete="username"
              className="h-10 text-[13px] border-[#e2e2e2] bg-white shadow-none focus-visible:ring-1"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="login-password"
                className="text-[12px] text-[#555] font-medium flex items-center gap-1.5"
              >
                <Lock size={13} className="text-[#888]" />
                Mật khẩu
              </Label>
              <button
                type="button"
                onClick={() => toast.info("Vui lòng liên hệ bộ phận IT hoặc HR để đặt lại mật khẩu.")}
                className="text-[11px] text-[#888] hover:text-[#242424] transition-colors"
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-10 text-[13px] border-[#e2e2e2] bg-white pr-10 shadow-none focus-visible:ring-1"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555]"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="login-remember"
              checked={remember}
              onCheckedChange={setRemember}
              className="size-4 rounded border-[#ccc]"
            />
            <label htmlFor="login-remember" className="text-[12px] text-[#777] cursor-pointer select-none">
              Ghi nhớ đăng nhập trên thiết bị này
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[12px] leading-relaxed">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="h-10 text-[13px] rounded-lg mt-1 gap-2 w-full bg-[#242424] hover:bg-[#333] text-white shadow-none font-medium"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xác thực…
              </>
            ) : (
              <>
                <LogIn size={15} />
                Đăng nhập
              </>
            )}
          </Button>
        </form>

        {/* Footer info */}
        <p className="text-[11px] text-center text-[#aaa] mt-7 leading-relaxed border-t border-[#f0f0f0] pt-4">
          PeopleOS — Hệ thống Quản trị & Chấm công Nhân sự
        </p>
      </div>
    </div>
  );
}

