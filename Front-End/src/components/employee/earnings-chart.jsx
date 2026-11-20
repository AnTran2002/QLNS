import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, WaveGradients, useWaveIds, waveCursor, waveProps } from "@/components/ui/chart";
import { formatMoney, formatMoneyShort, formatPeriod } from "@/lib/format";

/* Cùng thứ tự màu với "Cơ cấu chi trả" của dashboard quản trị. */
const CONFIG = {
  net: { label: "Thực nhận", color: "var(--chart-1)" },
  insurance: { label: "BHXH · BHYT · BHTN", color: "var(--chart-2)" },
  tax: { label: "Thuế TNCN", color: "var(--chart-3)" },
};

const shortPeriod = (m) => formatPeriod(m).replace("Tháng ", "T");

/**
 * Sóng chồng theo kỳ: Gross = Thực nhận + BH + Thuế. Một trục; mỗi lớp là một dải màu cong mềm.
 */
export function EarningsChart({ history = [], limit = 12, className, title = "Thu nhập theo kỳ", description }) {
  const gid = useWaveIds();
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
            <AreaChart data={data} margin={{ left: 4, right: 8, top: 10 }}>
              <WaveGradients id={gid} keys={["net", "insurance", "tax"]} from={0.4} to={0.08} />
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => formatMoneyShort(v)} />
              <ChartTooltip
                cursor={waveCursor}
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
              <Area {...waveProps(gid, "net", 0)} stackId="g" />
              <Area {...waveProps(gid, "insurance", 1)} stackId="g" />
              <Area {...waveProps(gid, "tax", 2)} stackId="g" />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
