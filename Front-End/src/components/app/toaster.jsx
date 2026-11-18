import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/hooks/use-theme";

/** Thông báo nổi — kính mờ, bo tròn lớn, theo chế độ sáng/tối hiện tại. */
export function Toaster(props) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme}
      position="top-center"
      offset={64}
      toastOptions={{
        classNames: {
          toast: "!glass !rounded-2xl !border !border-border/60 !shadow-popover !text-popover-foreground !text-[14px] !font-sans",
          description: "!text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
