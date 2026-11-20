import { cn } from "@/lib/utils";

/** shadcn/ui Textarea — cùng kiểu viền / focus với Input. */
function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-xl border border-input bg-card px-4 py-3 text-[16px] text-foreground transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground/70 hover:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-[15px]",
        "focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15",
        "aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/12",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
