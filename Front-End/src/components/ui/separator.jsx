import { cn } from "@/lib/utils";

/** shadcn/ui Separator (bản tĩnh, không cần Radix). */
function Separator({ className, orientation = "horizontal", decorative = true, ...props }) {
  return (
    <div
      data-slot="separator"
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
