import * as React from "react"
import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-input bg-card px-4 py-2 text-[16px] text-foreground transition-[border-color,box-shadow,background-color] duration-200 outline-none placeholder:text-muted-foreground/70 hover:border-foreground/20 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-[15px]",
        "focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15",
        "aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/12",
        className
      )}
      {...props}
    />
  )
}

export { Input }
