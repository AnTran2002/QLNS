import { Children } from "react";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { Slide } from "@/components/animate-ui/primitives/effects/slide";
import { Blur } from "@/components/animate-ui/primitives/effects/blur";
import { CountingNumber } from "@/components/animate-ui/primitives/texts/counting-number";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import { formatMoney, formatMoneyShort, formatNumber } from "@/lib/format";
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

/**
 * Số nguyên đếm lên (Animate UI CountingNumber). Trình đọc màn hình nhận giá trị cuối cùng.
 */
export function Count({ value, className, suffix }) {
  const n = Number(value) || 0;
  return (
    <span className={cn("tabular", className)}>
      <span className="sr-only">{formatNumber(n)}{suffix}</span>
      <span aria-hidden="true">
        <CountingNumber number={n} inView inViewOnce transition={{ stiffness: 70, damping: 30 }} />
        {suffix}
      </span>
    </span>
  );
}

/**
 * Số tiền với các chữ số lăn như đồng hồ cơ (Animate UI SlidingNumber).
 * Văn bản đầy đủ "25.000.000 ₫" luôn có trong DOM cho trợ năng và kiểm thử.
 */
export function Money({ value, className, currencyClassName }) {
  const n = Math.round(Number(value) || 0);
  return (
    <span className={cn("tabular inline-flex items-baseline", className)}>
      <span className="sr-only">{formatMoney(n)}</span>
      <span aria-hidden="true" className="inline-flex items-baseline">
        {n < 0 && "−"}
        <SlidingNumber number={Math.abs(n)} fromNumber={0} thousandSeparator="." inView inViewOnce />
        <span className={cn("ml-[0.18em] opacity-60", currencyClassName)}>₫</span>
      </span>
    </span>
  );
}

/** "18,5 tr" — số rút gọn có hiệu ứng lăn. */
export function MoneyShort({ value, className }) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const [scaled, unit] = abs >= 1e9 ? [n / 1e9, "tỷ"] : abs >= 1e6 ? [n / 1e6, "tr"] : [null, null];
  if (scaled === null) return <Money value={n} className={className} />;
  const rounded = Math.round(scaled * 10) / 10;
  return (
    <span className={cn("tabular inline-flex items-baseline", className)}>
      <span className="sr-only">{formatMoneyShort(n)}</span>
      <span aria-hidden="true" className="inline-flex items-baseline">
        <SlidingNumber
          number={rounded}
          fromNumber={0}
          decimalSeparator=","
          decimalPlaces={Number.isInteger(rounded) ? 0 : 1}
          inView
          inViewOnce
        />
        <span className="ml-[0.2em] opacity-60">{unit}</span>
      </span>
    </span>
  );
}
