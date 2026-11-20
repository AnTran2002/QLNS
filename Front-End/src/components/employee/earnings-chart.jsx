import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  columnCursor,
  columnProps,
} from "@/components/ui/chart";
import { formatMoney, formatMoneyShort, formatPeriod } from "@/lib/format";

/* Cùng thứ tự màu với "Cơ cấu chi trả" của dashboard quản trị. */
const CONFIG = {
  net: { label: "Thực nhận", color: "var(--chart-1)" },
  insurance: { label: "BHXH · BHYT · BHTN", color: "var(--chart-2)" },
  tax: { label: "Thuế TNCN", color: "var(--chart-3)" },
};

const shortPeriod = (m) => formatPeriod(m).replace("Tháng ", "T");

/**
 * Cột chồng theo kỳ: chiều cao cột = Gross = Thực nhận + BH + Thuế. Một trục; mỗi đoạn một màu.
 */
export function EarningsChart({ history = [], limit = 12, className, title = "Thu nhập theo kỳ", description }) {
  const data = useMemo(
    () =>
      [...history]
        .reverse()
        .slice(-limit)
        .map((i) => ({
          label: shortPeriod(i.month_year),
          period: formatPeriod(i.month_year),
          net: i.net_salary,
          insurance: i.social_insurance,
          tax: i.personal_tax,
          gross: i.gross_salary,
        })),
    [history, limit],
  );

  return (
    <Card className={className ?? "h-full gap-4"}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description ?? "Tổng thu nhập (Gross) tách thành thực nhận và các khoản khấu trừ"}</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {data.length === 0 ? (
          <p className="flex h-[240px] items-center justify-center text-[13px] text-muted-foreground">Chưa có kỳ lương nào được tính.</p>
        ) : data.length === 1 ? (
          <SinglePeriod row={data[0]} />
        ) : (
          <ChartContainer config={CONFIG} className="aspect-auto h-[260px] w-full">
            <BarChart data={data} margin={{ left: 4, right: 8, top: 10 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => formatMoneyShort(v)} />
              <ChartTooltip
                cursor={columnCursor}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload;
                      return row ? `${row.period} · Gross ${formatMoney(row.gross)}` : "";
                    }}
                    valueFormatter={formatMoney}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar {...columnProps("net", 0, { stackId: "g" })} />
              <Bar {...columnProps("insurance", 1, { stackId: "g" })} />
              <Bar {...columnProps("tax", 2, { stackId: "g", top: true })} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Chỉ có 1 kỳ → chưa có gì để so sánh; hiện cơ cấu Gross của kỳ đó dạng thanh phân đoạn. */
function SinglePeriod({ row }) {
  const keys = ["net", "insurance", "tax"];
  const total = keys.reduce((s, k) => s + (row[k] || 0), 0) || 1;
  return (
    <div className="flex min-h-[240px] flex-col justify-center gap-5 px-1">
      <div>
        <p className="text-[12.5px] text-muted-foreground">{row.period} · Gross</p>
        <p className="font-display text-[26px] font-semibold tracking-[-0.02em] tabular-nums">{formatMoney(row.gross)}</p>
      </div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Cơ cấu thu nhập kỳ này">
        {keys.map((k) =>
          row[k] > 0 ? (
            <span
              key={k}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(row[k] / total) * 100}%`,
                background: CONFIG[k].color,
              }}
            />
          ) : null,
        )}
      </div>
      <dl className="grid gap-2.5 text-[13px] sm:grid-cols-3">
        {keys.map((k) => (
          <div key={k} className="flex items-center justify-between gap-2 sm:block">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: CONFIG[k].color }} aria-hidden="true" />
              {CONFIG[k].label}
            </dt>
            <dd className="font-medium tabular-nums sm:mt-0.5">
              {formatMoney(row[k])}
              <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
                {((row[k] / total) * 100).toLocaleString("vi-VN", {
                  maximumFractionDigits: 1,
                })}
                %
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[12px] text-muted-foreground">Biểu đồ cột theo kỳ hiển thị khi có từ 2 kỳ lương trở lên.</p>
    </div>
  );
}
