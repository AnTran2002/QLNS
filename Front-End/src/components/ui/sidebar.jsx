import * as React from "react";
import { Slot } from "radix-ui";
import { motion } from "motion/react";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/animate-ui/components/radix/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/animate-ui/components/radix/tooltip";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Sidebar (bản JS rút gọn, kiểu "inset"):
 * - Desktop: thanh bên co giãn 16rem ↔ 3.5rem (chỉ còn icon), nhớ trạng thái trong localStorage.
 * - Mobile (< 768px): mở dạng Sheet trượt từ trái.
 * - Phím tắt ⌘/Ctrl + B để thu gọn / mở rộng.
 */
const STORAGE_KEY = "qlns.sidebar";
const MOBILE_QUERY = "(max-width: 767px)";

const SidebarContext = React.createContext(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar phải nằm trong <SidebarProvider />");
  return ctx;
}

function readStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "collapsed";
  } catch {
    return true;
  }
}

function useIsMobile() {
  const [mobile, setMobile] = React.useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(MOBILE_QUERY).matches : false,
  );
  React.useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setMobile(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return mobile;
}

function SidebarProvider({ children, className, ...props }) {
  const isMobile = useIsMobile();
  const [open, setOpenState] = React.useState(readStored);
  const [openMobile, setOpenMobile] = React.useState(false);

  const setOpen = React.useCallback((value) => {
    setOpenState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "expanded" : "collapsed");
      } catch {
        /* bỏ qua: trình duyệt chặn storage */
      }
      return next;
    });
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((v) => !v);
    else setOpen((v) => !v);
  }, [isMobile, setOpen]);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";
  const value = React.useMemo(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        className={cn("group/sidebar-wrapper flex min-h-svh w-full bg-sidebar", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({ className, children }) {
  const { isMobile, openMobile, setOpenMobile, state } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[17rem] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Điều hướng</SheetTitle>
          <SheetDescription className="sr-only">Menu quản trị</SheetDescription>
          <div data-state="expanded" className="group/sidebar flex h-full flex-col">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      className={cn(
        "group/sidebar sticky top-0 hidden h-svh shrink-0 flex-col text-sidebar-foreground md:flex",
        "w-64 transition-[width] duration-300 ease-[cubic-bezier(.32,.72,0,1)] data-[state=collapsed]:w-14",
        className,
      )}
    >
      {children}
    </aside>
  );
}

function SidebarTrigger({ className, ...props }) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      aria-label="Thu gọn / mở rộng thanh bên"
      title="Thanh bên (⌘B)"
      className={cn("rounded-lg text-foreground/80", className)}
      {...props}
    >
      <PanelLeft className="size-4" />
    </Button>
  );
}

function SidebarInset({ className, ...props }) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "relative flex min-h-svh min-w-0 flex-1 flex-col bg-inset",
        "md:my-2 md:mr-2 md:min-h-[calc(100svh-1rem)] md:rounded-2xl md:border md:border-sidebar-border md:shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }) {
  return <div data-slot="sidebar-header" className={cn("flex flex-col gap-2 p-2", className)} {...props} />;
}

function SidebarFooter({ className, ...props }) {
  return <div data-slot="sidebar-footer" className={cn("mt-auto flex flex-col gap-2 p-2", className)} {...props} />;
}

function SidebarContent({ className, ...props }) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto", className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }) {
  return <div data-slot="sidebar-group" className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "flex h-7 shrink-0 items-center overflow-hidden rounded-md px-2 text-[11px] font-medium tracking-[0.04em] whitespace-nowrap text-sidebar-foreground/55 uppercase",
        "transition-[margin,opacity] duration-200 group-data-[state=collapsed]/sidebar:-mt-7 group-data-[state=collapsed]/sidebar:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }) {
  return <ul data-slot="sidebar-menu" className={cn("flex w-full min-w-0 flex-col gap-0.5", className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }) {
  return <li data-slot="sidebar-menu-item" className={cn("group/menu-item relative", className)} {...props} />;
}

/**
 * Nút menu. `isActive` vẽ nền nổi (motion layoutId → trượt mượt giữa các mục).
 * Khi thanh bên thu gọn, nhãn ẩn đi và hiện thành tooltip.
 */
function SidebarMenuButton({ asChild = false, isActive = false, tooltip, className, children, ...props }) {
  const { state, isMobile } = useSidebar();
  const Comp = asChild ? Slot.Root : "button";

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive || undefined}
      className={cn(
        "peer/menu-button relative flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-left text-[13.5px] outline-none",
        "text-sidebar-foreground/75 transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring",
        "data-[active]:font-medium data-[active]:text-sidebar-foreground",
        "[&>svg]:relative [&>svg]:size-4 [&>svg]:shrink-0 [&>span]:relative [&>span]:truncate",
        "group-data-[state=collapsed]/sidebar:w-10 group-data-[state=collapsed]/sidebar:px-3",
        "before:absolute before:inset-0 before:rounded-lg before:bg-sidebar-accent before:opacity-0 before:transition-opacity hover:before:opacity-60",
        className,
      )}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId="sidebar-active"
          aria-hidden="true"
          className="absolute inset-0 rounded-lg bg-inset shadow-xs ring-1 ring-sidebar-border"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  );

  if (!tooltip || state !== "collapsed" || isMobile) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarMenuBadge({ className, ...props }) {
  return (
    <span
      data-slot="sidebar-menu-badge"
      className={cn(
        "pointer-events-none absolute top-1/2 right-2 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-md px-1 text-[11px] font-medium text-sidebar-foreground/70 tabular-nums",
        "group-data-[state=collapsed]/sidebar:hidden",
        className,
      )}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
};
