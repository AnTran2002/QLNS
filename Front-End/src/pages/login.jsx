import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { AnimatePresence, motion, useAnimate } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/app/brand";
import { FormError } from "@/components/app/kit";
import { BlurIn, Reveal, SPRING } from "@/components/app/motion";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { homeFor, useAuth } from "@/hooks/use-auth";
import { PAYROLL_RULES } from "@/lib/constants";

/** Các quy tắc thật của PayrollEngine — hiển thị như "thông số sản phẩm". */
const FACTS = [
  { value: PAYROLL_RULES.insuranceRate * 100, decimals: 1, suffix: "%", label: "BHXH, BHYT, BHTN người lao động" },
  { value: 7, decimals: 0, suffix: " bậc", label: "Biểu thuế TNCN luỹ tiến" },
  { value: PAYROLL_RULES.personalDeduction / 1e6, decimals: 0, suffix: " tr", label: "Giảm trừ bản thân mỗi tháng" },
];

function HeroTile() {
  return (
    <aside className="dark relative hidden border-r border-white/10 flex-col justify-between overflow-hidden bg-black p-12 text-white lg:flex xl:p-16">
      <Brand />
      <div className="max-w-xl space-y-10">
        <div className="space-y-5">
          <Reveal offset={10}>
            <p className="text-[14px] font-semibold text-tile-muted">Hệ thống quản trị nhân sự</p>
          </Reveal>
          <h2 className="font-display text-[56px] leading-[1.05] font-semibold tracking-[-0.035em] xl:text-[64px]">
            <BlurIn delay={80}>Con người.</BlurIn>
            <BlurIn delay={220}>Hợp đồng.</BlurIn>
            <BlurIn delay={360} className="text-tile-muted">Bảng lương.</BlurIn>
          </h2>
          <Reveal delay={480} offset={12}>
            <p className="max-w-md text-[19px] leading-[1.42] text-tile-muted">
              Mọi hồ sơ, hợp đồng và kỳ lương — đọc trực tiếp từ cơ sở dữ liệu, gọn trong một nơi.
            </p>
          </Reveal>
        </div>
        <div className="grid grid-cols-3 gap-6 border-t border-white/12 pt-8">
          {FACTS.map((f, i) => (
            <Reveal key={f.label} delay={600 + i * 90} offset={14}>
              <p className="flex items-baseline font-display text-[34px] leading-none font-semibold tracking-[-0.03em]">
                <span className="sr-only">{String(f.value).replace(".", ",")}{f.suffix}</span>
                <span aria-hidden="true" className="flex items-baseline">
                  <SlidingNumber number={f.value} fromNumber={0} decimalPlaces={f.decimals} decimalSeparator="," delay={700 + i * 120} />
                  <span className="ml-1 text-[20px] text-tile-muted">{f.suffix.trim()}</span>
                </span>
              </p>
              <p className="mt-2 text-[13px] leading-snug text-tile-muted">{f.label}</p>
            </Reveal>
          ))}
        </div>
      </div>
      <p className="text-[12px] text-tile-muted">© {new Date().getFullYear()} QLNS</p>
    </aside>
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
  const [formRef, animateForm] = useAnimate();

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const fail = (message) => {
    setError(message);
    // Rung nhẹ như khi nhập sai mật khẩu trên thiết bị Apple
    if (formRef.current) animateForm(formRef.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.45, ease: "easeOut" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      fail("Vui lòng nhập mã nhân viên (hoặc email) và mật khẩu.");
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
      fail(err.message);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <HeroTile />

      <main className="relative flex flex-col bg-background px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Brand className="lg:invisible" />
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          <div className="space-y-3 text-center">
            <BlurIn>
              <h1 className="text-display">Đăng nhập</h1>
            </BlurIn>
            <Reveal delay={100} offset={10}>
              <p className="text-[17px] text-muted-foreground">Dùng mã nhân viên hoặc email công ty.</p>
            </Reveal>
          </div>

          <Reveal delay={180} offset={16}>
            <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-10 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Mã nhân viên hoặc email</Label>
                <Input
                  id="identifier"
                  name="identifier"
                  autoComplete="username"
                  autoFocus
                  placeholder="NV001 hoặc ten@company.vn"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  aria-invalid={Boolean(error) || undefined}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-12"
                    aria-invalid={Boolean(error) || undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={showPassword ? "off" : "on"}
                        initial={{ opacity: 0, scale: 0.6, filter: "blur(4px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.6, filter: "blur(4px)" }}
                        transition={SPRING}
                        className="flex"
                      >
                        {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              <FormError message={error} />

              <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoggingIn}>
                {isLoggingIn ? <Loader2 className="animate-spin" /> : null}
                {isLoggingIn ? "Đang đăng nhập…" : "Đăng nhập"}
                {!isLoggingIn && <ArrowRight />}
              </Button>
            </form>
          </Reveal>

          {import.meta.env.DEV && (
            <Reveal delay={320} offset={12}>
              <div className="mt-10 rounded-2xl bg-muted p-4 text-center text-[13px] leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground">Tài khoản mẫu · chỉ hiện khi chạy dev</p>
                <p className="mt-1">
                  <span className="font-mono text-foreground">NV001</span> quản trị · <span className="font-mono text-foreground">NV002</span> nhân viên · mật khẩu{" "}
                  <span className="font-mono text-foreground">123456</span>
                </p>
              </div>
            </Reveal>
          )}
        </div>

        <p className="text-center text-[12px] text-muted-foreground lg:hidden">© {new Date().getFullYear()} QLNS · Quản trị nhân sự</p>
      </main>
    </div>
  );
}
