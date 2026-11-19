import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, UserRound } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useAnimate,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Brand } from "@/components/app/brand";
import { FormError } from "@/components/app/kit";
import { BlurIn, Reveal, SPRING } from "@/components/app/motion";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { homeFor, useAuth } from "@/hooks/use-auth";

/**
 * Nền tương tác: một quầng sáng nhoè lớn bám theo con trỏ (lò xo nên hơi trễ, mềm),
 * và lưới chấm sáng rõ hơn ngay dưới con trỏ. Tắt chuyển động khi người dùng chọn giảm chuyển động.
 */
function PointerBackdrop() {
  const reduce = useReducedMotion();
  const x = useMotionValue(typeof window !== "undefined" ? window.innerWidth / 2 : 0);
  const y = useMotionValue(typeof window !== "undefined" ? window.innerHeight * 0.42 : 0);
  const sx = useSpring(x, { stiffness: 60, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 60, damping: 18, mass: 0.6 });
  // Quầng thứ hai chậm hơn → cảm giác chiều sâu
  const lx = useSpring(x, { stiffness: 25, damping: 20, mass: 1 });
  const ly = useSpring(y, { stiffness: 25, damping: 20, mass: 1 });
  const spot = useMotionTemplate`radial-gradient(260px circle at ${sx}px ${sy}px, #000 0%, transparent 70%)`;

  useEffect(() => {
    if (reduce) return undefined;
    const onMove = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, x, y]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="login-grid absolute inset-0 opacity-70" />
      <motion.div
        className="absolute size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[110px] dark:bg-primary/30"
        style={{ left: sx, top: sy }}
      />
      <motion.div
        className="absolute size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-4/20 blur-[120px] dark:bg-chart-4/15"
        style={{ left: lx, top: ly, x: 140, y: 90 }}
      />
      {/* Lưới chấm đậm hơn, chỉ lộ ra quanh con trỏ */}
      <motion.div
        className="absolute inset-0 [background-image:radial-gradient(color-mix(in_srgb,var(--primary)_55%,transparent)_1.2px,transparent_1.2px)] [background-size:22px_22px]"
        style={{ maskImage: spot, WebkitMaskImage: spot }}
      />
      {/* Ánh mờ phía dưới cho chiều sâu */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

function IconInput({ icon: Icon, className, ...props }) {
  return (
    <div className="group/input relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/input:text-primary" />
      <Input className={`h-11 bg-background/70 pl-10 ${className ?? ""}`} {...props} />
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
  const [formRef, animateForm] = useAnimate();

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const fail = (message) => {
    setError(message);
    // Rung nhẹ thẻ đăng nhập khi sai
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

  const fillDemo = (code) => {
    setIdentifier(code);
    setPassword("123456");
    setError("");
  };

  return (
    <div className="relative isolate flex min-h-svh flex-col bg-background">
      <PointerBackdrop />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <Brand />
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[400px]">
          <Reveal offset={18}>
            <Card
              ref={formRef}
              className="gap-5 border-border/70 bg-card/75 shadow-popover backdrop-blur-2xl supports-[backdrop-filter]:bg-card/65"
            >
              <CardHeader className="justify-items-center gap-2 text-center">
                <span className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <ShieldCheck className="size-5" />
                </span>
                <BlurIn>
                  <CardTitle>
                    <h1 className="font-display text-[26px] font-semibold tracking-[-0.025em]">Đăng nhập</h1>
                  </CardTitle>
                </BlurIn>
                <CardDescription className="text-[14px]">Dùng mã nhân viên hoặc email công ty để tiếp tục.</CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Mã nhân viên hoặc email</Label>
                    <IconInput
                      icon={UserRound}
                      id="identifier"
                      name="identifier"
                      autoComplete="username"
                      autoFocus
                      placeholder="NV001 hoặc ten@company.vn"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      aria-invalid={Boolean(error) || undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <div className="relative">
                      <IconInput
                        icon={KeyRound}
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
                        className="absolute inset-y-0 right-1 flex w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </motion.span>
                        </AnimatePresence>
                      </button>
                    </div>
                  </div>

                  <FormError message={error} />

                  <Button type="submit" size="lg" className="group/submit mt-1 w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? <Loader2 className="animate-spin" /> : null}
                    {isLoggingIn ? "Đang đăng nhập…" : "Đăng nhập"}
                    {!isLoggingIn && <ArrowRight className="transition-transform duration-200 group-hover/submit:translate-x-0.5" />}
                  </Button>
                </form>
              </CardContent>

              {import.meta.env.DEV && (
                <CardFooter className="flex-col gap-2 border-t border-border/60 pt-5 text-[12.5px] text-muted-foreground">
                  <p>Tài khoản mẫu · chỉ hiện khi chạy dev · mật khẩu <span className="font-mono text-foreground">123456</span></p>
                  <div className="flex gap-2">
                    {[
                      { code: "NV001", label: "Quản trị" },
                      { code: "NV002", label: "Nhân viên" },
                    ].map((d) => (
                      <button
                        key={d.code}
                        type="button"
                        onClick={() => fillDemo(d.code)}
                        className="rounded-lg border border-border/80 bg-background/60 px-2.5 py-1 transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <span className="font-mono text-foreground">{d.code}</span> · {d.label}
                      </button>
                    ))}
                  </div>
                </CardFooter>
              )}
            </Card>
          </Reveal>

          <Reveal delay={200} offset={8}>
            <p className="mt-6 text-center text-[12px] text-muted-foreground">
              © {new Date().getFullYear()} QLNS · Hệ thống quản trị nhân sự & tiền lương
            </p>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
