import { Link } from "react-router";
import { LogIn } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";

/** Khung cho trang công khai (tuyển dụng, link hợp đồng) — không cần đăng nhập. */
export function PublicShell({ children, company }) {
  return (
    <div className="relative isolate flex min-h-svh flex-col bg-background">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="login-grid absolute inset-0 opacity-40" />
        <div className="login-aurora absolute top-[-6%] left-[60%] size-[480px] rounded-full bg-primary/12 blur-[120px]" />
      </div>
      <header className="relative z-10 flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Link to="/tuyen-dung" aria-label="Trang tuyển dụng">
          <Brand />
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">
              <LogIn /> Đăng nhập
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">{children}</main>
      {company && (
        <footer className="relative z-10 px-5 py-6 text-center text-[12px] text-muted-foreground">
          {company.name} · MST {company.tax_code} · {company.address} · {company.phone}
        </footer>
      )}
    </div>
  );
}
