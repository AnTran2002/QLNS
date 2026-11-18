import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CornerDownLeft, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { Highlight, HighlightItem } from "@/components/animate-ui/primitives/effects/highlight";
import { PersonAvatar } from "@/components/app/kit";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

const normalize = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

function SpotlightBody({ items, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const isAdmin = user?.role === "ADMIN";
  const employeesQuery = useQuery({ queryKey: ["employees"], queryFn: api.employees, enabled: isAdmin });

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const pages = items
      .filter((i) => !q || normalize(i.label).includes(q))
      .map((i) => ({ id: `page:${i.to}`, kind: "Trang", label: i.label, icon: i.icon, to: i.to }));
    const people = isAdmin && q
      ? (employeesQuery.data ?? [])
          .filter((e) => [e.full_name, e.employee_code, e.email, e.department].some((v) => normalize(v).includes(q)))
          .slice(0, 6)
          .map((e) => ({
            id: `emp:${e.id}`,
            kind: "Nhân viên",
            label: e.full_name,
            sub: `${e.employee_code} · ${e.position} · ${e.department}`,
            person: e,
            to: `/admin/nhan-vien?xem=${e.id}`,
          }))
      : [];
    return [...pages, ...people];
  }, [query, items, isAdmin, employeesQuery.data]);

  const go = (r) => {
    if (!r) return;
    onClose();
    navigate(r.to);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  const activeId = results[active]?.id ?? null;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border/60 px-5">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={isAdmin ? "Tìm trang hoặc nhân viên…" : "Tìm trang…"}
          aria-label="Tìm nhanh"
          role="combobox"
          aria-expanded="true"
          aria-controls="spotlight-results"
          aria-activedescendant={activeId ?? undefined}
          className="h-16 w-full bg-transparent text-[19px] tracking-[-0.01em] text-foreground outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      <div className="max-h-[min(60svh,420px)] overflow-y-auto p-2">
        {results.length === 0 ? (
          <p className="px-4 py-10 text-center text-[15px] text-muted-foreground">Không tìm thấy kết quả cho “{query}”.</p>
        ) : (
          <Highlight
            value={activeId}
            controlledItems
            click={false}
            className="rounded-xl bg-primary"
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
          >
            <div id="spotlight-results" role="listbox" aria-label="Kết quả">
              {results.map((r, i) => {
                const on = i === active;
                return (
                  <HighlightItem key={r.id} value={r.id}>
                    <div
                      id={r.id}
                      role="option"
                      aria-selected={on}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(r)}
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                    >
                      {r.person ? (
                        <PersonAvatar name={r.person.full_name} seed={r.person.employee_code} size="xs" />
                      ) : (
                        <span className={on ? "flex size-7 items-center justify-center rounded-lg bg-white/20 text-white" : "flex size-7 items-center justify-center rounded-lg bg-muted text-foreground/70"}>
                          <r.icon className="size-4" />
                        </span>
                      )}
                      <span className="grid min-w-0 flex-1">
                        <span className={on ? "truncate text-[15px] text-white" : "truncate text-[15px] text-foreground"}>{r.label}</span>
                        {r.sub && <span className={on ? "truncate text-[12px] text-white/75" : "truncate text-[12px] text-muted-foreground"}>{r.sub}</span>}
                      </span>
                      <span className={on ? "text-[12px] text-white/75" : "text-[12px] text-muted-foreground"}>{r.kind}</span>
                      {on && <CornerDownLeft className="size-3.5 text-white/80" aria-hidden="true" />}
                    </div>
                  </HighlightItem>
                );
              })}
            </div>
          </Highlight>
        )}
      </div>
      <div className="flex items-center gap-4 border-t border-border/60 px-5 py-2.5 text-[12px] text-muted-foreground">
        <span><kbd className="font-sans">↑ ↓</kbd> di chuyển</span>
        <span><kbd className="font-sans">↵</kbd> mở</span>
        <span><kbd className="font-sans">esc</kbd> đóng</span>
      </div>
    </>
  );
}

/** Tìm nhanh kiểu Spotlight — ⌘K / Ctrl K. */
export function Spotlight({ open, onOpenChange, items }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl sm:p-0">
        <DialogTitle className="sr-only">Tìm nhanh</DialogTitle>
        <DialogDescription className="sr-only">Gõ để tìm trang hoặc nhân viên, Enter để mở.</DialogDescription>
        {open && <SpotlightBody items={items} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
