import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { ChevronsUpDown, GraduationCap, LogOut, Monitor, Moon, Search, Sun } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
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
import { BrandMark } from "@/components/app/brand";
import { LoadingState, PersonAvatar } from "@/components/app/kit";
import { Spotlight } from "@/components/app/spotlight";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { EmployeeTutorial } from "@/components/app/tutorial";
import { api } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { ROLES } from "@/lib/constants";

const isActive = (item, pathname) => (item.end ? pathname === item.to : pathname.startsWith(item.to));

function NavGroups({ groups }) {
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  return groups.map((group) => (
    <SidebarGroup key={group.label}>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarMenu>
        {group.items.map((item) => {
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton asChild isActive={isActive(item, pathname)} tooltip={item.label}>
                <NavLink to={item.to} end={item.end} onClick={() => isMobile && setOpenMobile(false)}>
                  <Icon />
                  <span>{item.label}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  ));
}

function SidebarUser() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { isMobile } = useSidebar();
  const navigate = useNavigate();

  const replayTutorial = async () => {
    try {
      await api.resetTutorial();
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      toast.error(err.message);
    }
  };

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
          aria-label={`Tài khoản: ${user?.full_name ?? ""}`}
          className="flex h-12 w-full items-center gap-2.5 overflow-hidden rounded-xl px-1.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-sidebar-accent"
        >
          <PersonAvatar name={user?.full_name} seed={user?.employee_code} src={user?.avatar} size="sm" />
          <span className="grid min-w-0 flex-1 leading-tight group-data-[state=collapsed]/sidebar:hidden">
            <span className="truncate text-[13px] font-semibold">{user?.full_name}</span>
            <span className="truncate text-[11.5px] text-sidebar-foreground/60">{user?.email ?? user?.employee_code}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/50 group-data-[state=collapsed]/sidebar:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" sideOffset={8} className="w-64">
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
        {user?.role === "EMPLOYEE" && (
          <DropdownMenuItem onSelect={replayTutorial}>
            <GraduationCap /> Xem lại hướng dẫn
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={handleLogout} variant="destructive">
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** true khi trang đã cuộn khỏi đỉnh — header hiện viền + bóng mờ. */
function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > threshold));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);
  return scrolled;
}

/** Cuộn về đầu trang mỗi khi đổi trang. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function AdminHeader({ groups, title, searchLabel, onSearch }) {
  const { pathname } = useLocation();
  const current = groups.flatMap((g) => g.items).find((i) => isActive(i, pathname));
  const group = groups.find((g) => g.items.includes(current));
  const scrolled = useScrolled();

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-transparent bg-inset/75 px-3 backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-300 data-[scrolled]:border-border/60 data-[scrolled]:bg-inset/85 data-[scrolled]:shadow-[0_6px_20px_-12px_rgb(0_0_0/0.25)] lg:rounded-t-2xl lg:px-4"
    >
      <SidebarTrigger />
      <Separator orientation="vertical" className="mx-1 !h-4" />
      <nav aria-label="Vị trí" className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] whitespace-nowrap">
        <span className="hidden text-muted-foreground lg:inline">{title}</span>
        {group && group.label !== current?.label && (
          <>
            <span className="hidden text-muted-foreground/50 lg:inline">/</span>
            <span className="hidden text-muted-foreground md:inline">{group.label}</span>
          </>
        )}
        <span className="hidden text-muted-foreground/50 md:inline">/</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={current?.label ?? "Trang"}
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="truncate font-medium text-foreground"
          >
            {current?.label ?? "Trang"}
          </motion.span>
        </AnimatePresence>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-8 items-center gap-2 rounded-lg border border-border/80 bg-background px-2.5 text-[13px] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:w-56 xl:w-64"
          aria-label="Tìm kiếm (⌘K)"
        >
          <Search className="size-3.5" />
          <span className="hidden md:inline">{searchLabel}</span>
          <kbd className="ml-auto hidden rounded border border-border/80 bg-muted px-1.5 font-sans text-[11px] md:inline">⌘K</kbd>
        </button>
        <ThemeToggle className="size-8" />
      </div>
    </header>
  );
}

/**
 * Bố cục kiểu shadcn "sidebar-inset": thanh bên trái + vùng nội dung bo góc.
 * Dùng chung cho trang quản trị và cổng nhân viên (khác nhau ở `groups`, `subtitle`, `searchLabel`).
 */
export function AdminShell({
  groups,
  title = "Quản trị",
  subtitle = "Quản trị nhân sự & lương",
  searchLabel = "Tìm trang, nhân viên…",
}) {
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
    <SidebarProvider>
      <a
        href="#noi-dung"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Bỏ qua điều hướng
      </a>

      <Sidebar>
        <SidebarHeader className="pt-3">
          <motion.div initial="rest" animate="rest" whileHover="hover" className="flex h-10 items-center gap-2.5 px-1.5">
            <BrandMark className="size-7" hoverFromParent />
            <span className="grid leading-tight whitespace-nowrap group-data-[state=collapsed]/sidebar:hidden">
              <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">PeopleOS</span>
              <span className="text-[11.5px] text-sidebar-foreground/60">{subtitle}</span>
            </span>
          </motion.div>
        </SidebarHeader>
        <SidebarContent>
          <NavGroups groups={groups} />
        </SidebarContent>
        <SidebarFooter>
          <SidebarUser />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <ScrollToTop />
        <AdminHeader groups={groups} title={title} searchLabel={searchLabel} onSearch={() => setSearchOpen(true)} />
        <div id="noi-dung" data-density="compact" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-5 pb-16 sm:px-5 sm:pt-6 md:px-6 xl:px-8">
          <Suspense fallback={<LoadingState rows={4} />}>
            <PageTransition effect="fade">
              <Outlet />
            </PageTransition>
          </Suspense>
        </div>
      </SidebarInset>

      <Spotlight open={searchOpen} onOpenChange={setSearchOpen} items={items} />
      <EmployeeTutorial />
    </SidebarProvider>
  );
}
