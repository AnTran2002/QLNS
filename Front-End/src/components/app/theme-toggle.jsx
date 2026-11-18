import { Moon, Sun } from "lucide-react";
import { ThemeToggler } from "@/components/animate-ui/primitives/effects/theme-toggler";
import { ThemeTogglerButton, ThemeTogglerButtonIcon } from "@/components/animate-ui/buttons/theme-toggler";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

/**
 * Nút chuyển trắng / đen trên header.
 * - Animate UI ThemeToggler: màn hình mới "quét" qua bằng View Transition (clip-path).
 * - Animate UI ThemeTogglerButton: biểu tượng mặt trời ↔ mặt trăng xoay & nhoè khi đổi.
 */
export function ThemeToggle({ className, direction = "ltr" }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <ThemeToggler theme={theme} resolvedTheme={resolvedTheme} setTheme={setTheme} direction={direction}>
      {({ toggleTheme, resolved }) => (
        <ThemeTogglerButton
          theme={resolved}
          resolvedTheme={resolved}
          setTheme={toggleTheme}
          modes={["light", "dark"]}
          variant="ghost"
          size="default"
          aria-label={resolved === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
          title={resolved === "dark" ? "Giao diện sáng" : "Giao diện tối"}
          className={cn("rounded-full text-foreground/80 hover:bg-muted hover:text-foreground", className)}
        >
          <ThemeTogglerButtonIcon light={<Sun className="size-[17px]" />} dark={<Moon className="size-[16px]" />} />
        </ThemeTogglerButton>
      )}
    </ThemeToggler>
  );
}
