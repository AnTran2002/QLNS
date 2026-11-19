import { Children } from "react";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { Slide } from "@/components/animate-ui/primitives/effects/slide";
import { Blur } from "@/components/animate-ui/primitives/effects/blur";
import { formatMoneyShort, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Lò xo mềm kiểu Apple — dùng chung cho mọi hiệu ứng xuất hiện. */
export const SPRING = { type: "spring", stiffness: 140, damping: 24, mass: 0.9 };

/**
 * Hiện dần khi cuộn tới: mờ → rõ + trượt lên (Animate UI Fade + Slide).
 * `delay` tính bằng ms.
 */
export function Reveal({ children, delay = 0, offset = 24, className, inView = true }) {
  return (
    <Fade inView={inView} inViewMargin="-40px" delay={delay} transition={SPRING} className={className}>
      <Slide inView={inView} inViewMargin="-40px" delay={delay} offset={offset} transition={SPRING} className="h-full">
        {children}
      </Slide>
    </Fade>
  );
}

/** Các phần tử con lần lượt xuất hiện (stagger). Mỗi con được bọc trong một Reveal. */
export function RevealGroup({ children, step = 70, delay = 0, itemClassName }) {
  return Children.toArray(children).map((child, i) => (
    <Reveal key={child.key ?? i} delay={delay + i * step} className={itemClassName}>
      {child}
    </Reveal>
  ));
}

/** Tiêu đề lớn hiện ra từ trạng thái nhoè (Animate UI Blur). */
export function BlurIn({ children, delay = 0, className }) {
  return (
    <Blur delay={delay} initialBlur={12} transition={SPRING} className={className}>
      {children}
    </Blur>
  );
}

/** Số tĩnh (định dạng vi-VN) — không dùng hiệu ứng đếm / nhảy số. */
export function Count({ value, className, suffix }) {
  return (
    <span className={cn("tabular", className)}>
      {formatNumber(value)}
      {suffix}
    </span>
  );
}

/** Số tiền tĩnh "25.000.000 ₫" — không hiệu ứng lăn số. */
export function Money({ value, className, currencyClassName }) {
  const n = Math.round(Number(value) || 0);
  return (
    <span className={cn("tabular inline-flex items-baseline", className)}>
      <span className="sr-only">{`${n < 0 ? "−" : ""}${formatNumber(Math.abs(n))} ₫`}</span>
      <span aria-hidden="true" className="contents">
        {n < 0 && "−"}
        {formatNumber(Math.abs(n))}
        <span className={cn("ml-[0.18em] opacity-60", currencyClassName)}>₫</span>
      </span>
    </span>
  );
}

/** "18,5 tr" — số rút gọn, hiển thị tĩnh. */
export function MoneyShort({ value, className }) {
  const n = Number(value) || 0;
  if (Math.abs(n) < 1e6) return <Money value={n} className={className} />;
  return <span className={cn("tabular", className)}>{formatMoneyShort(n)}</span>;
}
