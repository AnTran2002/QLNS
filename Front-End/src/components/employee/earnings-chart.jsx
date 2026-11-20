import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatMoney, formatMoneyShort, formatPeriod } from "@/lib/format";

/* Cùng thứ tự màu với "Cơ cấu chi trả" của dashboard quản trị. */
const CONFIG = {
  net: { label: "Thực nhận", color: "var(--chart-1)" },
  insurance: { label: "BHXH · BHYT · BHTN", color: "var(--chart-2)" },
  tax: { label: "Thuế TNCN", color: "var(--chart-3)" },
};

const shortPeriod = (m) => formatPeriod(m).replace("Tháng ", "T");

/**
 * Cột chồng theo kỳ: Gross = Thực nhận + BH + Thuế. Một trục, khe 2px giữa các đoạn (stroke màu nền thẻ).
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
        ) : (
          <ChartContainer config={CONFIG} className="aspect-auto h-[260px] w-full">
            <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => formatMoneyShort(v)} />
              <ChartTooltip
                cursor={{ radius: 6 }}
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
              <Bar dataKey="net" stackId="g" fill="var(--color-net)" stroke="var(--card)" strokeWidth={2} maxBarSize={40} />
              <Bar dataKey="insurance" stackId="g" fill="var(--color-insurance)" stroke="var(--card)" strokeWidth={2} maxBarSize={40} />
              <Bar dataKey="tax" stackId="g" fill="var(--color-tax)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
