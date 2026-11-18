import { Suspense } from "react";
import { LogOut, ChevronsUpDown } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Brand } from "@/components/app/brand";
import { LoadingBlock, PersonAvatar } from "@/components/app/shared";
import { useAuth } from "@/hooks/use-auth";
import { ROLES } from "@/lib/constants";

function NavItems({ groups }) {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();

  return groups.map((group) => (
    <SidebarGroup key={group.label}>
      <SidebarGroupLabel className="caption-upper text-[11px] text-muted-soft">{group.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => {
            const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.label} className="h-9 text-[14px]">
                  <NavLink to={item.to} end={item.end} onClick={() => setOpenMobile(false)}>
                    <item.icon />
                    <span>{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Đã đăng xuất");
    navigate("/login", { replace: true });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <PersonAvatar name={user?.full_name} seed={user?.employee_code} size="sm" />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-[14px] font-medium text-ink">{user?.full_name}</span>
                <span className="truncate text-[12px] text-muted-foreground">
                  {user?.employee_code} · {ROLES[user?.role] ?? user?.role}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-soft" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg">
            <DropdownMenuLabel className="font-normal">
              <p className="text-[14px] font-medium text-ink">{user?.full_name}</p>
              <p className="text-[12px] text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <LogOut /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** Khung ứng dụng: sidebar cream-soft + vùng nội dung cream canvas. */
export function AppShell({ groups, subtitle }) {
  const { pathname } = useLocation();
  const current = groups.flatMap((g) => g.items).find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)));

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 pt-4 pb-2">
          <Brand subtitle={subtitle} className="group-data-[collapsible=icon]:[&>div]:hidden" />
        </SidebarHeader>
        <SidebarContent>
          <NavItems groups={groups} />
        </SidebarContent>
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-canvas">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-hairline-soft bg-canvas/90 px-4 backdrop-blur md:px-8">
          <SidebarTrigger className="-ml-1.5 size-9" aria-label="Thu gọn / mở thanh bên" />
          <Separator orientation="vertical" className="h-5! bg-hairline" />
          <p className="truncate text-[14px] font-medium text-ink">{current?.label ?? ""}</p>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-8 md:py-10">
          <Suspense fallback={<LoadingBlock rows={4} />}>
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
