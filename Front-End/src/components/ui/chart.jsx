import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Chart (bản JavaScript). `config` khai báo nhãn + màu cho từng series:
 *   { net: { label: "Thực nhận", color: "var(--chart-1)" } }
 * Mỗi series có biến CSS `--color-<key>` để dùng trong recharts: fill="var(--color-net)".
 */
const ChartContext = React.createContext(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart phải nằm trong <ChartContainer />");
  return ctx;
}

function ChartContainer({ id, className, children, config, ...props }) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-[12px]",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/60",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/70",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer debounce={80}>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }) {
  const entries = Object.entries(config).filter(([, c]) => c.color);
  if (!entries.length) return null;
  const vars = entries.map(([key, c]) => `  --color-${key}: ${c.color};`).join("\n");
  return <style dangerouslySetInnerHTML={{ __html: `[data-chart=${id}] {\n${vars}\n}` }} />;
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  formatter,
  valueFormatter = (v) => v?.toLocaleString?.("vi-VN") ?? v,
  nameKey,
  labelKey,
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  const first = payload[0];
  const labelItem = config[labelKey || first?.dataKey || first?.name || "value"];
  const labelValue = !labelKey && typeof label === "string" ? config[label]?.label || label : labelItem?.label;
  const tooltipLabel = hideLabel ? null : (
    <div className="font-medium text-foreground">
      {labelFormatter ? labelFormatter(label ?? labelValue, payload) : labelValue ?? label}
    </div>
  );

  return (
    <div className="grid min-w-[9rem] items-start gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-[12px] shadow-popover">
      {tooltipLabel}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = config[key] ?? config[item.dataKey] ?? {};
          const color = item.payload?.fill || item.color;
          if (formatter && item.value !== undefined && item.name) {
            return <React.Fragment key={key}>{formatter(item.value, item.name, item, index, item.payload)}</React.Fragment>;
          }
          return (
            <div key={key} className="flex w-full items-center gap-2">
              {!hideIndicator && (
                <span
                  className={cn("shrink-0 rounded-[2px]", indicator === "dot" ? "size-2.5" : "h-2.5 w-1")}
                  style={{ background: color }}
                />
              )}
              <span className="flex-1 text-muted-foreground">{itemConfig.label || item.name}</span>
              <span className="font-mono font-medium text-foreground tabular-nums">{valueFormatter(item.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }) {
  const { config } = useChart();
  if (!payload?.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", className)}>
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = config[key] ?? {};
        return (
          <div key={item.value} className="flex items-center gap-1.5 text-muted-foreground">
            {!hideIcon && <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />}
            {itemConfig.label ?? item.value}
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };

/**
 * Chuyển động chung cho cột biểu đồ: mọc lên mượt, các chuỗi nối tiếp nhau (stagger).
 * Recharts tự tắt animation khi người dùng bật "giảm chuyển động" thông qua isAnimationActive bên dưới.
 */
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function barMotion(index = 0, step = 140) {
  return {
    isAnimationActive: !prefersReducedMotion(),
    animationBegin: 120 + index * step,
    animationDuration: 850,
    animationEasing: "ease-out",
  };
}

/**
 * Biểu đồ cột: đầu cột bo 4px neo vào trục, các chuỗi mọc lên nối tiếp nhau.
 * - Cột đứng riêng / nhóm cạnh nhau: `columnProps(key, i)`.
 * - Cột chồng: cùng `stackId`, chỉ đoạn trên cùng bo góc (`top: true`); viền 2px màu nền tách các đoạn.
 */
export function columnProps(key, index = 0, { stackId, top = !stackId } = {}) {
  return {
    dataKey: key,
    fill: `var(--color-${key})`,
    radius: top ? [4, 4, 0, 0] : 0,
    maxBarSize: 34,
    ...(stackId ? { stackId, stroke: "var(--card)", strokeWidth: 1.5 } : {}),
    ...barMotion(index),
  };
}

/** Nền mờ phía sau cột đang rê chuột (tooltip). */
export const columnCursor = { fill: "var(--muted)", fillOpacity: 0.7, radius: 6 };
