import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { ChevronsUpDown, LogOut, Monitor, Moon, Search, Sun } from "lucide-react";
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
                  {item.badge && (
                    <span className="ml-auto rounded-md bg-primary/10 px-1.5 py-px text-[10.5px] font-semibold text-primary group-data-[state=collapsed]/sidebar:hidden">
                      {item.badge}
                    </span>
                  )}
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
  const { theme, setTheme } = useTheme();
  const { isMobile } = useSidebar();
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
          aria-label={`Tài khoản: ${user?.full_name ?? ""}`}
          className="flex h-12 w-full items-center gap-2.5 overflow-hidden rounded-xl px-1.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-sidebar-accent"
        >
          <PersonAvatar name={user?.full_name} seed={user?.employee_code} size="sm" />
          <span className="grid min-w-0 flex-1 leading-tight group-data-[state=collapsed]/sidebar:hidden">
            <span className="truncate text-[13px] font-semibold">{user?.full_name}</span>
            <span className="truncate text-[11.5px] text-sidebar-foreground/60">{user?.email ?? user?.employee_code}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/50 group-data-[state=collapsed]/sidebar:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" sideOffset={8} className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 font-normal">
          <PersonAvatar name={user?.full_name} seed={user?.employee_code} size="sm" />
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

function AdminHeader({ groups, title, onSearch }) {
  const { pathname } = useLocation();
  const current = groups.flatMap((g) => g.items).find((i) => isActive(i, pathname));
  const group = groups.find((g) => g.items.includes(current));

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-inset/80 px-3 backdrop-blur-xl md:rounded-t-2xl md:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mx-1 !h-4" />
      <nav aria-label="Vị trí" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <span className="hidden text-muted-foreground sm:inline">{title}</span>
        {group && group.label !== current?.label && (
          <>
            <span className="hidden text-muted-foreground/50 sm:inline">/</span>
            <span className="hidden text-muted-foreground sm:inline">{group.label}</span>
          </>
        )}
        <span className="text-muted-foreground/50 max-sm:hidden">/</span>
        <span className="truncate font-medium text-foreground">{current?.label ?? "Trang"}</span>
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-8 items-center gap-2 rounded-lg border border-border/80 bg-background px-2.5 text-[13px] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
          aria-label="Tìm kiếm (⌘K)"
        >
          <Search className="size-3.5" />
          <span className="hidden sm:inline">Tìm trang, nhân viên…</span>
          <kbd className="ml-auto hidden rounded border border-border/80 bg-muted px-1.5 font-sans text-[11px] sm:inline">⌘K</kbd>
        </button>
        <ThemeToggle className="size-8" />
      </div>
    </header>
  );
}

/** Bố cục quản trị kiểu shadcn "sidebar-inset": thanh bên trái + vùng nội dung bo góc. */
export function AdminShell({ groups, title = "Quản trị" }) {
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
          <div className="flex h-10 items-center gap-2.5 overflow-hidden px-1.5">
            <BrandMark className="size-7" />
            <span className="grid leading-tight whitespace-nowrap group-data-[state=collapsed]/sidebar:hidden">
              <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">QLNS</span>
              <span className="text-[11.5px] text-sidebar-foreground/60">Quản trị nhân sự & lương</span>
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <NavGroups groups={groups} />
        </SidebarContent>
        <SidebarFooter>
          <SidebarUser />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <AdminHeader groups={groups} title={title} onSearch={() => setSearchOpen(true)} />
        <div id="noi-dung" data-density="compact" className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-6 pb-16 md:px-6 lg:px-8">
          <Suspense fallback={<LoadingState rows={4} />}>
            <PageTransition effect="fade">
              <Outlet />
            </PageTransition>
          </Suspense>
        </div>
      </SidebarInset>

      <Spotlight open={searchOpen} onOpenChange={setSearchOpen} items={items} />
    </SidebarProvider>
  );
}
