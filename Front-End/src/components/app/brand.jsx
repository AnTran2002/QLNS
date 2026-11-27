import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/*
 * Logo PeopleOS — "Đội ngũ đi lên": ba cột tăng dần (bảng lương / sự phát triển),
 * mỗi cột đội một "cái đầu" tròn (con người). Rê chuột → các cột lần lượt thụt xuống rồi bật lên,
 * nền xoay nhẹ. Người bật "giảm chuyển động" sẽ không thấy hiệu ứng (MotionConfig reducedMotion="user").
 */
const BASE = 25; // đáy chung của 3 cột
const COLS = [
  { x: 7, h: 6 },
  { x: 14, h: 10 },
  { x: 21, h: 14 },
];
const EASE = [0.34, 1.56, 0.64, 1];

const tile = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: -8, scale: 1.06, transition: { type: "spring", stiffness: 320, damping: 14 } },
};
const bar = {
  rest: { scaleY: 1 },
  hover: (i) => ({ scaleY: [1, 0.3, 1.12, 1], transition: { duration: 0.75, delay: i * 0.09, ease: EASE } }),
};
// Đầu đi theo đỉnh cột: cột co còn 30% thì đầu hạ đúng 70% chiều cao cột.
const head = {
  rest: { y: 0 },
  hover: (i) => {
    const h = COLS[i].h;
    return { y: [0, h * 0.7, -h * 0.12, 0], transition: { duration: 0.75, delay: i * 0.09, ease: EASE } };
  },
};

/**
 * Biểu tượng PeopleOS.
 * - Mặc định tự xử lý hover. Đặt `hoverFromParent` khi cha là motion có `whileHover="hover"` (cả cụm logo + chữ).
 * - `playing`: lặp hiệu ứng liên tục (màn hình chờ).
 */
export function BrandMark({ className, hoverFromParent = false, playing = false }) {
  const control = playing
    ? { initial: "rest", animate: "hover" }
    : hoverFromParent
      ? {}
      : { initial: "rest", animate: "rest", whileHover: "hover" };

  return (
    <motion.svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 shrink-0 overflow-visible", className)} {...control}>
      <motion.rect width="32" height="32" rx="9" className="fill-primary" variants={playing ? undefined : tile} style={{ originX: 0.5, originY: 0.5 }} />
      {COLS.map(({ x, h }, i) => (
        <g key={x} className="fill-primary-foreground">
          <motion.rect
            x={x}
            y={BASE - h}
            width="4"
            height={h}
            rx="2"
            custom={i}
            variants={playing ? loop(bar, i) : bar}
            style={{ originY: 1 }}
          />
          <motion.circle cx={x + 2} cy={BASE - h - 3.6} r="2.1" custom={i} variants={playing ? loop(head, i) : head} />
        </g>
      ))}
    </motion.svg>
  );
}

/** Biến thể lặp vô hạn cho chế độ `playing`. */
function loop(variants, i) {
  const v = variants.hover(i);
  return { rest: variants.rest, hover: { ...v, transition: { ...v.transition, repeat: Infinity, repeatDelay: 0.5 } } };
}

/** Logo + chữ PeopleOS; rê vào bất kỳ đâu trong cụm đều chạy hiệu ứng. */
export function Brand({ className, label = "PeopleOS" }) {
  return (
    <motion.span initial="rest" animate="rest" whileHover="hover" className={cn("inline-flex cursor-default items-center gap-2", className)}>
      <BrandMark hoverFromParent />
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">{label}</span>
    </motion.span>
  );
}
