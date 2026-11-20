import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, LogOut, Monitor, Moon, Search, Sun } from "lucide-react";
import { toast } from "sonner";
import { Highlight, HighlightItem } from "@/components/animate-ui/primitives/effects/highlight";
import { PageTransition } from "@/components/animate-ui/components/page-transition";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Spotlight } from "@/components/app/spotlight";
import { LoadingState, PersonAvatar } from "@/components/app/kit";
import { SPRING } from "@/components/app/motion";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const isActive = (item, pathname) => (item.end ? pathname === item.to : pathname.startsWith(item.to));

/* ------------------------------------------------------------------ */
/* Global nav — thanh đen mỏng 44px (DESIGN.md › global-nav)          */
/* ------------------------------------------------------------------ */

function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Đã đăng xuất");
    navigate("/login", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center rounded-full p-0.5 transition-transform duration-200 outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-tile-link active:scale-95"
          aria-label={`Tài khoản: ${user?.full_name ?? ""}`}
        >
          <PersonAvatar name={user?.full_name} seed={user?.employee_code} src={user?.avatar} size="xs" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 font-normal">
          <PersonAvatar name={user?.full_name} seed={user?.employee_code} src={user?.avatar} size="sm" />
          <span className="grid min-w-0">
            <span className="truncate text-[14px] font-semibold text-foreground">{user?.full_name}</span>
            <span className="truncate text-[12px] text-muted-foreground">
              {user?.employee_code} · {ROLES[user?.role] ?? user?.role}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="pb-1 text-[12px] font-normal text-muted-foreground">Giao diện</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light"><Sun /> Sáng</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon /> Tối</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor /> Theo hệ thống</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} variant="destructive">
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GlobalNav({ onSearch }) {
  const { user } = useAuth();
  const [isMac] = useState(() => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform));

  return (
    <div className="dark relative z-40 bg-black text-white">
      <div className="mx-auto flex h-11 max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
        <NavLink to="/" className="rounded-md text-white outline-none focus-visible:ring-2 focus-visible:ring-tile-link" aria-label="QLNS — Trang chủ">
          <Brand />
        </NavLink>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSearch}
            className="group flex h-8 items-center gap-2 rounded-full px-2.5 text-[12px] text-white/70 transition-colors duration-200 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-tile-link sm:bg-white/8 sm:pr-2 sm:pl-3"
            aria-label="Tìm nhanh"
          >
            <Search className="size-[15px]" />
            <span className="hidden sm:inline">Tìm nhanh</span>
            <kbd className="hidden rounded-md bg-white/10 px-1.5 py-0.5 font-sans text-[11px] text-white/60 sm:inline">{isMac ? "⌘K" : "Ctrl K"}</kbd>
          </button>
          <ThemeToggle className="size-8 text-white/80 hover:bg-white/10 hover:text-white" />
          <span className="mx-1 hidden h-4 w-px bg-white/15 sm:block" aria-hidden="true" />
          <span className="hidden text-[12px] text-white/70 lg:block">{user?.full_name}</span>
          <UserMenu />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-nav kính mờ 52px (DESIGN.md › sub-nav-frosted)                 */
/* ------------------------------------------------------------------ */

function DesktopLinks({ items, pathname }) {
  return (
    <Highlight
      hover
      controlledItems
      className="rounded-full bg-foreground/[0.06] dark:bg-white/[0.08]"
      transition={{ type: "spring", stiffness: 400, damping: 34 }}
    >
      <ul className="flex items-center gap-0.5">
        {items.map((item) => {
          const active = isActive(item, pathname);
          return (
            <li key={item.to}>
              <HighlightItem value={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={cn(
                    "relative flex h-8 items-center rounded-full px-3.5 text-[13px] transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "font-medium text-foreground" : "text-foreground/65 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="subnav-active"
                      className="absolute inset-x-3.5 -bottom-[10px] h-[2px] rounded-full bg-foreground"
                      transition={SPRING}
                    />
                  )}
                  {item.label}
                </NavLink>
              </HighlightItem>
            </li>
          );
        })}
      </ul>
    </Highlight>
  );
}

function MobileMenu({ items, pathname, open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.nav
          key="mobile-menu"
          aria-label="Điều hướng"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={SPRING}
          className="overflow-hidden border-t border-border/60 md:hidden"
        >
          <ul className="px-4 pt-2 pb-5">
            {items.map((item, i) => {
              const active = isActive(item, pathname);
              return (
                <motion.li
                  key={item.to}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ ...SPRING, delay: 0.03 * i }}
                >
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-2 py-3 text-[19px] font-semibold tracking-[-0.02em] transition-colors",
                      active ? "text-foreground" : "text-foreground/55 hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-5 opacity-70" />
                    {item.label}
                  </NavLink>
                </motion.li>
              );
            })}
          </ul>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

function SubNav({ title, items }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const current = items.find((i) => isActive(i, pathname));

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="glass-nav sticky top-0 z-30 border-b border-border/60">
      <div className="mx-auto flex h-[52px] max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
        <p className="text-title truncate">{title}</p>

        <nav aria-label="Điều hướng chính" className="hidden md:block">
          <DesktopLinks items={items} pathname={pathname} />
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Đóng menu" : "Mở menu"}
          className="flex h-8 items-center gap-1.5 rounded-full pr-2 pl-3 text-[13px] text-foreground/80 transition-colors hover:bg-muted md:hidden"
        >
          <span className="max-w-[40vw] truncate">{current?.label}</span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={SPRING} className="flex">
            <ChevronDown className="size-4" />
          </motion.span>
        </button>
      </div>
      <MobileMenu items={items} pathname={pathname} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Khung ứng dụng                                                      */
/* ------------------------------------------------------------------ */

export function AppShell({ groups, title }) {
  const items = groups.flatMap((g) => g.items);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#noi-dung"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Bỏ qua điều hướng
      </a>
      <GlobalNav onSearch={() => setSearchOpen(true)} />
      <SubNav title={title} items={items} />

      <main id="noi-dung" className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-10 pb-20 md:px-6 md:pt-14">
        <Suspense fallback={<LoadingState rows={4} />}>
          <PageTransition effect="zoom">
            <Outlet />
          </PageTransition>
        </Suspense>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-4 py-6 text-[12px] text-muted-foreground sm:flex-row sm:justify-between md:px-6">
          <p>© {new Date().getFullYear()} QLNS · Hệ thống quản trị nhân sự</p>
          <p>Dữ liệu đọc trực tiếp từ cơ sở dữ liệu qlns.</p>
        </div>
      </footer>

      <Spotlight open={searchOpen} onOpenChange={setSearchOpen} items={items} />
    </div>
  );
}
