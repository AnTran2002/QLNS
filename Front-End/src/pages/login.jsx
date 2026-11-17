import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/app/brand";
import { homeFor, useAuth } from "@/hooks/use-auth";

function CodeWindow() {
  const lines = [
    { n: 1, c: <><span className="text-[#e8a55a]">POST</span> <span className="text-on-dark">/api/?action=login</span></> },
    { n: 2, c: <span className="text-on-dark-soft">{"{"}</span> },
    { n: 3, c: <><span className="text-[#5db8a6]">  "employee_code"</span><span className="text-on-dark-soft">: </span><span className="text-[#e6b89c]">"NV…"</span><span className="text-on-dark-soft">,</span></> },
    { n: 4, c: <><span className="text-[#5db8a6]">  "password"</span><span className="text-on-dark-soft">: </span><span className="text-[#e6b89c]">"••••••"</span></> },
    { n: 5, c: <span className="text-on-dark-soft">{"}"}</span> },
    { n: 6, c: <span className="text-muted-soft">{"// → role: ADMIN | EMPLOYEE"}</span> },
  ];
  return (
    <div className="overflow-hidden rounded-lg bg-surface-dark-elevated">
      <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#3a3833]" />
        <span className="size-2.5 rounded-full bg-[#3a3833]" />
        <span className="size-2.5 rounded-full bg-[#3a3833]" />
        <span className="ml-3 font-mono text-[12px] text-on-dark-soft">auth.http</span>
      </div>
      <pre className="overflow-x-auto bg-surface-dark-soft px-4 py-4 font-mono text-[13px] leading-[1.7]">
        {lines.map((l) => (
          <div key={l.n} className="flex gap-4">
            <span className="w-4 text-right text-muted-soft select-none">{l.n}</span>
            <span>{l.c}</span>
          </div>
        ))}
      </pre>
      <div className="flex items-center gap-2 px-4 py-2.5 font-mono text-[12px] text-on-dark-soft">
        <span className="size-1.5 rounded-full bg-teal" /> Phiên PHPSESSID · MySQL qlns
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { user, login, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      setError("Vui lòng nhập mã nhân viên (hoặc email) và mật khẩu.");
      return;
    }
    try {
      const data = await login({ identifier: identifier.trim(), password });
      const role = data?.user?.role;
      toast.success(`Chào mừng ${data?.user?.full_name ?? ""} quay lại`);
      const from = location.state?.from;
      const target = from && from.startsWith(homeFor(role)) ? from : homeFor(role);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="grid min-h-svh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      {/* Bề mặt tối — product-mockup-card-dark */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-surface-dark p-12 text-on-dark lg:flex">
        <Brand tone="dark" />
        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <p className="caption-upper text-primary">Hệ thống quản trị nhân sự</p>
            <h2 className="font-serif text-[48px] leading-[1.08] font-normal tracking-[-1px] text-on-dark">
              Mỗi con người, một phần của đội ngũ.
            </h2>
            <p className="text-[16px] leading-relaxed text-on-dark-soft">
              Hồ sơ nhân viên, hợp đồng lao động và bảng lương — đọc trực tiếp từ cơ sở dữ liệu, gọn trong một nơi.
            </p>
          </div>
          <CodeWindow />
        </div>
        <p className="text-[13px] text-on-dark-soft">© {new Date().getFullYear()} QLNS · Quản lý nhân sự</p>
      </aside>

      {/* Biểu mẫu — cream canvas */}
      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Brand className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <div className="space-y-2">
            <h1 className="display-md">Đăng nhập</h1>
            <p className="text-[15px] text-muted-foreground">
              Dùng mã nhân viên hoặc email công ty. Hệ thống tự chuyển bạn tới trang quản trị hoặc trang nhân viên.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-[14px] text-ink">Mã nhân viên hoặc email</Label>
              <Input
                id="identifier"
                name="identifier"
                autoComplete="username"
                autoFocus
                placeholder="VD: NV001 hoặc ten@company.vn"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                aria-invalid={Boolean(error) || undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[14px] text-ink">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11"
                  aria-invalid={Boolean(error) || undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-ink"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-destructive/8 px-3.5 py-2.5 text-[14px] text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? <Loader2 className="animate-spin" /> : null}
              {isLoggingIn ? "Đang đăng nhập…" : "Đăng nhập"}
              {!isLoggingIn && <ArrowRight />}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-8 rounded-lg bg-surface-card p-4 text-[13px] leading-relaxed text-body">
              <p className="font-medium text-ink">Tài khoản mẫu (chỉ hiện khi chạy dev)</p>
              <p className="mt-1">
                <span className="font-mono">NV001</span> — Quản trị viên · <span className="font-mono">NV002</span> — Nhân viên ·
                mật khẩu <span className="font-mono">123456</span>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
