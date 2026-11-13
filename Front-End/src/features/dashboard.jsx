import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, Panel, StatCard, Status, ViewAll } from "@/components/shared";
import { departments, money, workforceHistory } from "@/data/workspace";
export function Dashboard({ employees, navigate, onAdd, onEdit }) {
  const [range, setRange] = useState("6 tháng");
  const [offset, setOffset] = useState(0);
  const total = employees.length;
  const salary = employees.reduce(
    (sum, e) => sum + e.base_salary + e.allowance,
    0,
  );
  const newPeople = employees.filter((e) =>
    e.joined_at.startsWith("2026-11"),
  ).length;
  const history = [...workforceHistory, { month: "T11", total }].slice(
    range === "3 tháng" ? -3 : 0,
  );
  const distribution = departments.map((name, i) => ({
    name,
    count: employees.filter((e) => e.department === name).length,
    color: ["#242424", "#606060", "#929292", "#b5b5b5", "#d3d3d3", "#ededed"][
      i
    ],
  }));
  const recent = [...employees]
    .sort((a, b) => b.joined_at.localeCompare(a.joined_at))
    .slice(0, 4);
  const selectedMonth = new Date(2026, 10 + offset, 1);
  const days = new Date(2026, 11 + offset, 0).getDate();
  const blank = (selectedMonth.getDay() + 6) % 7;
  const gradient = distribution
    .map((d, i) => {
      const start = total
        ? (distribution.slice(0, i).reduce((sum, item) => sum + item.count, 0) /
            total) *
          360
        : 0;
      const end = start + (total ? (d.count / total) * 360 : 0);
      return `${d.color} ${start}deg ${end}deg`;
    })
    .join(", ");
  return (
    <>
      <div className="dashboard-welcome">
        <div>
          <div className="eyebrow">KHÔNG GIAN LÀM VIỆC CỦA BẠN</div>
          <h1>
            Mọi người. Mọi điều tốt đẹp<span>.</span>
          </h1>
          <p>
            Một góc nhìn tổng thể, để mỗi quyết định nhân sự đều có ý nghĩa.
          </p>
        </div>
        <div className="welcome-date">
          <CalendarDays size={16} />
          <span>Thứ Sáu, 13 tháng 11, 2026</span>
        </div>
      </div>
      <div className="page-title-row">
        <div className="section-caption">
          <span className="live-dot" />
          Tổng quan nhân sự<span className="caption-divider">/</span>
          <span>Tháng 11, 2026</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("reports")}
          >
            <FileText size={14} />
            Xem báo cáo
          </Button>
          <Button size="sm" onClick={onAdd}>
            <Plus size={15} />
            Thêm nhân viên
          </Button>
        </div>
      </div>
      <div className="stats-grid">
        <StatCard
          title="Tổng nhân viên"
          value={total.toString().padStart(2, "0")}
          change={`+${newPeople}`}
          detail="nhân sự mới tháng này"
          icon={<Users size={17} />}
          spark={[8, 10, 7, 17, 15, 23, 20, 29, 25, 35]}
          dark
        />
        <StatCard
          title="Đang làm việc"
          value={employees
            .filter((e) => e.status === "Đang làm việc")
            .length.toString()
            .padStart(2, "0")}
          change={`${total ? Math.round((employees.filter((e) => e.status === "Đang làm việc").length / total) * 100) : 0}%`}
          detail="trên tổng số nhân sự"
          icon={<BriefcaseBusiness size={17} />}
          spark={[6, 14, 11, 17, 14, 22, 21, 28, 26, 31]}
        />
        <StatCard
          title="Quỹ lương cơ bản & phụ cấp"
          value={`${(salary / 1000000).toLocaleString("vi-VN")} tr`}
          change={`${total}`}
          detail="hợp đồng đang quản lý"
          icon={<CircleDollarSign size={17} />}
          spark={[5, 7, 7, 14, 12, 20, 17, 25, 24, 30]}
        />
        <StatCard
          title="Phòng ban"
          value={departments.length.toString().padStart(2, "0")}
          change={`${employees.filter((e) => e.status === "Thử việc").length}`}
          detail="nhân sự đang thử việc"
          icon={<Users size={17} />}
          spark={[9, 9, 15, 15, 15, 22, 22, 22, 29, 29]}
        />
      </div>
      <div className="analytics-grid">
        <Panel
          title="Đội ngũ đang lớn lên"
          description="Biến động số lượng nhân sự theo tháng"
          action={
            <div className="chart-tabs">
              {["3 tháng", "6 tháng"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={range === r ? "active" : ""}
                >
                  {r}
                </button>
              ))}
            </div>
          }
        >
          <div className="chart-summary">
            <strong>
              {total}
              <span>nhân viên</span>
            </strong>
            <span className="chart-growth">
              <ArrowUpRight size={14} />
              {total - 21 >= 0 ? "+" : ""}
              {total - 21} so với tháng trước
            </span>
          </div>
          <div
            className="workforce-chart"
            role="img"
            aria-label={`Biểu đồ nhân sự: ${history.map((h) => `${h.month}: ${h.total}`).join(", ")}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={history}
                margin={{ top: 12, right: 8, left: -22, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#292929" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#292929" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 5"
                  vertical={false}
                  stroke="#eaeaea"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#929292", fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: "#929292", fontSize: 11 }}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #eee",
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value} nhân viên`, "Nhân sự"]}
                  labelFormatter={(label) =>
                    `Tháng ${String(label).replace("T", "")}/2026`
                  }
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#292929"
                  strokeWidth={2.5}
                  fill="url(#area-fill)"
                  activeDot={{
                    r: 5,
                    fill: "#222",
                    stroke: "#fff",
                    strokeWidth: 3,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-bottom">
            <span>
              <i />
              Tổng số nhân viên
            </span>
            <span>Dữ liệu minh họa · 2026</span>
          </div>
        </Panel>
        <Panel
          title="Cơ cấu phòng ban"
          description="Mỗi đội ngũ, một mảnh ghép"
          action={
            <ViewAll onClick={() => navigate("departments")}>Chi tiết</ViewAll>
          }
        >
          <div className="donut-wrap">
            <div
              className="donut"
              style={{
                background: total ? `conic-gradient(${gradient})` : "#eee",
              }}
              role="img"
              aria-label={distribution
                .map((d) => `${d.name}: ${d.count}`)
                .join(", ")}
            >
              <div>
                <strong>{total}</strong>
                <span>Nhân viên</span>
              </div>
            </div>
          </div>
          <div className="department-legend">
            {distribution.map((d) => (
              <button
                onClick={() => navigate(`employees:${d.name}`)}
                key={d.name}
              >
                <span>
                  <i style={{ background: d.color }} />
                  {d.name}
                </span>
                <strong>
                  {d.count}
                  <small>
                    {total ? Math.round((d.count / total) * 100) : 0}%
                  </small>
                </strong>
              </button>
            ))}
          </div>
        </Panel>
      </div>
      <div className="bottom-grid">
        <Panel
          title="Những gương mặt mới"
          description="Chào mừng các thành viên gia nhập đội ngũ"
          action={<ViewAll onClick={() => navigate("employees")} />}
        >
          <div className="table-scroll">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Phòng ban</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recent.map((e, i) => (
                  <tr
                    key={e.id}
                    onClick={() => onEdit(e)}
                    className="clickable-row"
                  >
                    <td>
                      <div className="person-cell">
                        <Avatar name={e.full_name} index={i} />
                        <div>
                          <strong>{e.full_name}</strong>
                          <small>{e.position}</small>
                        </div>
                      </div>
                    </td>
                    <td>{e.department}</td>
                    <td>
                      <Status status={e.status} />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Xem ${e.full_name}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onEdit(e);
                        }}
                      >
                        <ArrowUpRight size={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-table-footer">
            <span>
              <span className="live-dot" />
              Con người là khởi đầu của mọi điều.
            </span>
            <span>{newPeople} thành viên mới tháng này</span>
          </div>
        </Panel>
        <Panel
          title="Lịch làm việc"
          action={
            <div className="calendar-controls">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Tháng trước"
                onClick={() => setOffset((o) => o - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Tháng sau"
                onClick={() => setOffset((o) => o + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          }
        >
          <div className="calendar-month">
            Tháng {selectedMonth.getMonth() + 1}, {selectedMonth.getFullYear()}
          </div>
          <div className="calendar-grid">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
              <span className="calendar-weekday" key={day}>
                {day}
              </span>
            ))}
            {Array.from({ length: blank }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => (
              <span
                key={i}
                className={offset === 0 && i === 12 ? "calendar-today" : ""}
              >
                {i + 1}
              </span>
            ))}
          </div>
          <div className="calendar-event">
            <span className="event-icon">
              <CalendarDays size={16} />
            </span>
            <div>
              <strong>
                {offset === 0
                  ? "Hoàn thiện bảng lương tháng 11"
                  : "Không có lịch công việc mẫu"}
              </strong>
              <p>
                {offset === 0
                  ? "25 tháng 11 · Nhắc việc minh họa"
                  : "Lịch trong chế độ dữ liệu mẫu"}
              </p>
            </div>
          </div>
        </Panel>
      </div>
      <div className="dashboard-note">
        <span>Được xây dựng cho những đội ngũ tốt đẹp hơn.</span>
        <span>Quỹ lương: {money(salary)} · Dữ liệu mẫu</span>
      </div>
    </>
  );
}
