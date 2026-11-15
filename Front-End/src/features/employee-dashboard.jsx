import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  Calendar,
  CalendarCheck2,
  CircleDollarSign,
  Clock,
  Copy,
  FileSpreadsheet,
  FileText,
  IdCard,
  LayoutDashboard,
  LogOut,
  Mail,
  Phone,
  Timer,
  TrendingUp,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/shared";
import { dateLabel, money } from "@/data/workspace";
import { authApi } from "@/lib/auth-api";

const NOT_SET = "Chưa cập nhật";
const HOURS_PER_DAY = 8;

const PERIOD_STATUS = {
  DRAFT: "Đang tính",
  LOCKED: "Đã chốt",
  PAID: "Đã chi trả",
};

const WEEK_DAYS = [
  ["monday", "Thứ Hai"],
  ["tuesday", "Thứ Ba"],
  ["wednesday", "Thứ Tư"],
  ["thursday", "Thứ Năm"],
  ["friday", "Thứ Sáu"],
  ["saturday", "Thứ Bảy"],
  ["sunday", "Chủ Nhật"],
];

const ddmm = (d) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthYear = (date) => {
  if (!date) return NOT_SET;
  const [y, m] = date.slice(0, 7).split("-");
  return `${m}/${y}`;
};

/** Lịch tuần hiện tại dựng từ work_schedule (backend) + ngày hôm nay. */
function buildWeek(schedule = {}, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return WEEK_DAYS.map(([key, day], i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const shift = schedule[key] ?? "Nghỉ tuần";
    const off = !/\d/.test(shift);
    const isToday = date.getTime() === today.getTime();
    return {
      day,
      date: ddmm(date),
      shift,
      type: off ? "Nghỉ" : "Ca hành chính",
      hours: off ? "0h" : `${HOURS_PER_DAY}.0h`,
      isToday,
      status: off
        ? "Nghỉ"
        : isToday
          ? "Hôm nay"
          : date < today
            ? "Đã qua"
            : "Sắp tới",
    };
  });
}

/** Chuyển payload ?action=employee/dashboard sang dạng giao diện dùng. */
function toViewModel(data, user) {
  const info = data.user_info ?? user ?? {};
  const contract = data.contract;
  const payroll = (data.payroll_history ?? []).map((p) => ({
    id: p.id,
    period: p.month_year,
    standard_days: p.standard_days,
    actual_days: p.actual_days,
    ot_hours: p.ot_hours,
    gross: p.gross_salary,
    bhxh: p.social_insurance,
    tax: p.personal_tax,
    net: p.net_salary,
    status: PERIOD_STATUS[p.period_status] ?? p.period_status,
  }));
  const latest = payroll[0];
  const team = (data.team_members ?? []).map((m) => ({
    id: m.id,
    code: m.employee_code,
    name: m.full_name,
    title: m.position || NOT_SET,
    email: m.email,
    status: m.status,
    joined: monthYear(m.joined_at),
    role: m.employee_code === info.employee_code ? "Thành viên (Tôi)" : "Thành viên",
  }));
  const week = buildWeek(data.work_schedule);
  const workShift = week.find((d) => d.type !== "Nghỉ")?.shift ?? "08:30 - 17:30";

  return {
    full_name: info.full_name ?? "",
    employee_code: info.employee_code ?? "",
    email: info.email ?? "",
    department: info.department || NOT_SET,
    position: info.position || NOT_SET,
    status: info.status || "Đang làm việc",
    joined_at: info.joined_at ? dateLabel(info.joined_at) : NOT_SET,
    contract,
    contract_no: contract ? `#${contract.id}` : "Chưa có hợp đồng",
    contract_signed: contract?.created_at
      ? dateLabel(contract.created_at.slice(0, 10))
      : NOT_SET,
    salary: {
      base: contract?.base_salary ?? 0,
      insurance: contract?.insurance_salary ?? 0,
      allowance: contract?.allowance ?? 0,
      dependents: contract?.dependents_count ?? 0,
      latest_gross: latest?.gross ?? 0,
      latest_bhxh: latest?.bhxh ?? 0,
      latest_tax: latest?.tax ?? 0,
      latest_net: latest?.net ?? 0,
      payment_status: latest
        ? `Kỳ ${latest.period} · ${latest.status}`
        : "Chưa có kỳ lương nào",
    },
    attendance: {
      period: latest?.period,
      standard_days: latest?.standard_days ?? data.current_period?.standard_days ?? 0,
      actual_days: latest?.actual_days ?? 0,
      ot_hours: latest?.ot_hours ?? 0,
      total_hours: (latest?.actual_days ?? 0) * HOURS_PER_DAY,
      on_time_rate:
        latest && latest.standard_days
          ? `${Math.round((latest.actual_days / latest.standard_days) * 1000) / 10}%`
          : "—",
    },
    current_period: data.current_period,
    team_members: team,
    team_active: team.filter((m) => m.status === "Đang làm việc").length,
    payroll_history: payroll,
    schedule_this_week: week,
    work_shift: workShift,
    week_range: `${week[0].date} - ${week[6].date}`,
  };
}

/** Lấy dữ liệu cổng nhân viên từ backend rồi mới render giao diện. */
export function EmployeeDashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    return authApi
      .employeeDashboard()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    authApi
      .employeeDashboard()
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <Card className="border-[#e5e5e5] shadow-none bg-white max-w-[420px] w-full">
          <CardHeader>
            <CardTitle className="text-[15px]">
              {error ? "Không tải được dữ liệu" : "Đang tải dữ liệu…"}
            </CardTitle>
            <CardDescription className="text-[12px]">
              {error ?? "Đang lấy thông tin của bạn từ máy chủ."}
            </CardDescription>
          </CardHeader>
          {error && (
            <CardContent className="flex gap-2">
              <Button size="sm" onClick={load}>
                Thử lại
              </Button>
              <Button size="sm" variant="outline" onClick={onLogout}>
                Đăng xuất
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <EmployeeDashboardView
      employeeData={toViewModel(data, user)}
      onLogout={onLogout}
    />
  );
}

function EmployeeDashboardView({ employeeData, onLogout }) {
  const [activeMenu, setActiveMenu] = useState("overview"); // 'overview' | 'profile' | 'team' | 'salary' | 'schedule' | 'attendance' | 'contract'
  const [selectedSlip, setSelectedSlip] = useState(null);
  const latestSlip = employeeData.payroll_history[0];

  const navItems = [
    { id: "overview", label: "Tổng quan cá nhân", icon: LayoutDashboard },
    { id: "profile", label: "Hồ sơ cá nhân", icon: User },
    { id: "team", label: "Đội ngũ (Team's)", icon: Users, badge: `${employeeData.team_members.length}` },
    { id: "salary", label: "Lương & Phiếu lương", icon: CircleDollarSign },
    { id: "schedule", label: "Lịch làm việc tuần", icon: Calendar },
    { id: "attendance", label: "Chấm công & Giờ làm", icon: Clock },
    { id: "contract", label: "Hợp đồng & Phúc lợi", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] flex font-sans">
      {/* SIDEBAR BÊN CẠNH DÀNH CHO NHÂN VIÊN */}
      <aside className="w-[245px] shrink-0 bg-white border-r border-[#e9e9e9] flex flex-col justify-between hidden md:flex min-h-screen sticky top-0 h-screen">
        <div className="p-5 flex flex-col gap-5">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 px-1 pt-1">
            <span className="brand-mark inline-grid grid-cols-2 gap-[3px] -rotate-6">
              <span className="w-2 h-2 rounded-full bg-[#242424]" />
              <span className="w-2 h-2 rounded-full bg-[#242424]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#242424]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#242424]" />
            </span>
            <span className="text-[21px] font-bold tracking-tight text-[#242424]">
              people<span className="font-normal">os</span>
            </span>
          </div>

          {/* Profile Card nhân viên ở Sidebar */}
          <div className="p-3 bg-[#fafafa] border border-[#eee] rounded-xl flex items-center gap-3">
            <Avatar name={employeeData.full_name} small />
            <div className="min-w-0 flex-1">
              <strong className="text-[12px] font-semibold text-[#242424] block truncate">
                {employeeData.full_name}
              </strong>
              <span className="text-[10px] text-[#888] block truncate">
                {employeeData.employee_code} · {employeeData.position}
              </span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex flex-col gap-1">
            <div className="text-[10px] font-semibold text-[#aaa] uppercase tracking-wider px-2 mb-1">
              MỤC LIÊN QUAN
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-medium transition-all text-left cursor-pointer ${
                    active
                      ? "bg-[#242424] text-white shadow-xs"
                      : "text-[#666] hover:bg-[#f5f5f5] hover:text-[#242424]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={active ? "text-white" : "text-[#888]"} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        active ? "bg-white/20 text-white" : "bg-[#eee] text-[#666]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar: Logout */}
        <div className="p-4 border-t border-[#f0f0f0] space-y-2">
          <div className="px-2 text-[10px] text-[#aaa] truncate">
            {employeeData.department}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-full justify-start text-[12px] text-red-600 hover:text-red-700 hover:bg-red-50 gap-2 h-9"
          >
            <LogOut size={15} />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* CONTENT AREA BÊN PHẢI */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar mobile / tablet */}
        <header className="h-14 bg-white border-b border-[#e9e9e9] px-4 md:px-8 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-bold text-[#242424]">
              people<span>os</span>
            </span>
            <Badge variant="outline" className="text-[10px]">
              {employeeData.employee_code}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-red-600 text-[12px] h-8">
            <LogOut size={14} className="mr-1" />
            Đăng xuất
          </Button>
        </header>

        {/* Main Content */}
        <main className="p-4 md:p-8 space-y-6 max-w-[1200px] w-full mx-auto">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#ededed]">
            <div>
              <div className="text-[10px] tracking-wider text-[#999] uppercase font-semibold">
                CỔNG THÔNG TIN NHÂN VIÊN
              </div>
              <h1 className="text-[24px] md:text-[26px] font-bold tracking-tight text-[#202020] mt-1">
                {activeMenu === "profile"
                  ? "Hồ sơ cá nhân"
                  : activeMenu === "team"
                  ? "Đội ngũ & Đồng nghiệp (Team's)"
                  : activeMenu === "salary"
                  ? "Thông số Lương & Phiếu lương"
                  : activeMenu === "schedule"
                  ? "Lịch làm việc & Ca trực tuần"
                  : activeMenu === "attendance"
                  ? "Nhật ký Chấm công & Giờ làm"
                  : activeMenu === "contract"
                  ? "Hợp đồng & Phúc lợi"
                  : `Xin chào, ${employeeData.full_name}! 👋`}
              </h1>
              <p className="text-[12px] text-[#888] mt-1">
                Phòng: <strong className="text-[#333]">{employeeData.department}</strong> · Mã:{" "}
                <strong className="text-[#333]">{employeeData.employee_code}</strong>
              </p>
            </div>

            {/* Trạng thái chấm công */}
            <div className="flex items-center gap-3 bg-white border border-[#e5e5e5] rounded-xl p-3 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-[#f4f4f4] flex items-center justify-center text-[#555]">
                <Clock size={18} />
              </div>
              <div>
                <div className="text-[10px] text-[#888] uppercase font-medium flex items-center gap-1.5">
                  <span>Kỳ lương hiện tại</span>
                </div>
                <div className="text-[12px] font-semibold flex items-center gap-2 text-[#242424] mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {employeeData.current_period ? (
                    <span>
                      {employeeData.current_period.month_year} ·{" "}
                      <span className="text-[#666] font-normal">
                        {employeeData.current_period.standard_days} ngày công chuẩn
                      </span>
                    </span>
                  ) : (
                    <span className="text-[#666] font-normal">Chưa mở kỳ lương</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4 KPI CARDS (Hiển thị ở overview hoặc tab khác) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-[#e5e5e5] shadow-none bg-white">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[11px] font-medium text-[#777] uppercase">
                  Lương thực nhận (Net)
                </CardTitle>
                <div className="w-7 h-7 rounded-md bg-[#f4f4f4] flex items-center justify-center text-[#555]">
                  <Wallet size={15} />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-[23px] font-bold text-[#1f1f1f]">
                  {money(employeeData.salary.latest_net)}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <TrendingUp size={12} />
                  <span>Gross: {money(employeeData.salary.latest_gross)}</span>
                </div>
                <p className="text-[10px] text-[#999] pt-1 border-t border-[#f0f0f0]">
                  {employeeData.salary.payment_status}
                </p>
              </CardContent>
            </Card>

            <Card className="border-[#e5e5e5] shadow-none bg-white">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[11px] font-medium text-[#777] uppercase">
                  Ngày công kỳ gần nhất
                </CardTitle>
                <div className="w-7 h-7 rounded-md bg-[#f4f4f4] flex items-center justify-center text-[#555]">
                  <CalendarCheck2 size={15} />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-[23px] font-bold text-[#1f1f1f]">
                  {employeeData.attendance.actual_days}{" "}
                  <span className="text-[13px] font-normal text-[#888]">
                    / {employeeData.attendance.standard_days} ngày
                  </span>
                </div>
                <div className="text-[11px] text-[#666]">
                  Tỷ lệ công: <strong className="text-emerald-600">{employeeData.attendance.on_time_rate}</strong>
                </div>
                <p className="text-[10px] text-[#999] pt-1 border-t border-[#f0f0f0]">
                  {employeeData.attendance.period
                    ? `Kỳ ${employeeData.attendance.period}`
                    : "Chưa có dữ liệu chấm công"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-[#e5e5e5] shadow-none bg-white">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[11px] font-medium text-[#777] uppercase">
                  Thời gian làm & OT
                </CardTitle>
                <div className="w-7 h-7 rounded-md bg-[#f4f4f4] flex items-center justify-center text-[#555]">
                  <Timer size={15} />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-[23px] font-bold text-[#1f1f1f]">
                  {employeeData.attendance.total_hours}{" "}
                  <span className="text-[13px] font-normal text-[#888]">giờ</span>
                </div>
                <div className="text-[11px] text-amber-700 font-medium">
                  Giờ làm thêm: +{employeeData.attendance.ot_hours}h OT
                </div>
                <p className="text-[10px] text-[#999] pt-1 border-t border-[#f0f0f0]">
                  Ước tính {HOURS_PER_DAY} giờ / ngày công
                </p>
              </CardContent>
            </Card>

            <Card className="border-[#e5e5e5] shadow-none bg-white">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[11px] font-medium text-[#777] uppercase">
                  Quy mô Team
                </CardTitle>
                <div className="w-7 h-7 rounded-md bg-[#f4f4f4] flex items-center justify-center text-[#555]">
                  <Users size={15} />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-[23px] font-bold text-[#1f1f1f]">
                  {employeeData.team_members.length}{" "}
                  <span className="text-[13px] font-normal text-[#888]">thành viên</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-medium">
                  {employeeData.team_active} đang làm việc
                  {employeeData.team_members.length - employeeData.team_active > 0 &&
                    ` · ${employeeData.team_members.length - employeeData.team_active} khác`}
                </div>
                <p className="text-[10px] text-[#999] pt-1 border-t border-[#f0f0f0]">
                  Phòng {employeeData.department}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* MỤC 1: TỔNG QUAN */}
          {activeMenu === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-[#e5e5e5] shadow-none bg-white">
                  <CardHeader className="pb-3 border-b border-[#f0f0f0]">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[14px] font-semibold text-[#242424]">
                        Lịch làm việc tuần này ({employeeData.week_range})
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px]">
                        {employeeData.work_shift}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-[#f2f2f2]">
                      {employeeData.schedule_this_week.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3.5 px-5 text-[12px] ${
                            item.isToday ? "bg-[#fbfbf9] font-medium" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.status === "Đã qua"
                                  ? "bg-emerald-500"
                                  : item.status === "Hôm nay"
                                  ? "bg-blue-600 animate-ping"
                                  : item.type === "Nghỉ"
                                  ? "bg-gray-300"
                                  : "bg-amber-400"
                              }`}
                            />
                            <div>
                              <div className="font-semibold text-[#242424]">
                                {item.day} {item.isToday && "(Hôm nay)"}
                              </div>
                              <div className="text-[10px] text-[#888]">{item.date}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[#333] font-medium">{item.shift}</div>
                            <div className="text-[10px] text-[#888]">{item.hours}</div>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              item.status === "Đã qua"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : item.status === "Hôm nay"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : item.status === "Nghỉ"
                                ? "bg-gray-100 text-gray-500 border-gray-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="border-[#e5e5e5] shadow-none bg-white">
                  <CardHeader className="pb-3 border-b border-[#f0f0f0]">
                    <CardTitle className="text-[13px] font-semibold text-[#242424]">
                      Phiếu lương kỳ gần nhất
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2.5 text-[12px]">
                    <div className="flex justify-between text-[#666]">
                      <span>Lương cơ bản HĐLĐ:</span>
                      <strong>{money(employeeData.salary.base)}</strong>
                    </div>
                    <div className="flex justify-between text-[#666]">
                      <span>Phụ cấp:</span>
                      <strong>{money(employeeData.salary.allowance)}</strong>
                    </div>
                    <div className="flex justify-between text-[#666]">
                      <span>Trích trừ BHXH (10.5%):</span>
                      <span className="text-red-600">-{money(employeeData.salary.latest_bhxh)}</span>
                    </div>
                    <div className="pt-2 border-t border-[#eee] flex justify-between items-baseline">
                      <span className="font-semibold text-[#242424]">Thực lĩnh (Net):</span>
                      <strong className="text-[17px] text-[#242424]">
                        {money(employeeData.salary.latest_net)}
                      </strong>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-[11px] h-8 mt-2"
                      disabled={!latestSlip}
                      onClick={() => setSelectedSlip(latestSlip)}
                    >
                      <FileSpreadsheet size={14} className="mr-1.5" />
                      {latestSlip ? "Xem chi tiết phiếu lương" : "Chưa có phiếu lương"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Team Quick preview */}
                <Card className="border-[#e5e5e5] shadow-none bg-white p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
                    <span className="text-[12px] font-semibold text-[#242424] flex items-center gap-1.5">
                      <Users size={14} className="text-[#666]" />
                      Đồng nghiệp cùng team
                    </span>
                    <button
                      onClick={() => setActiveMenu("team")}
                      className="text-[11px] text-[#666] hover:text-[#242424] underline"
                    >
                      Xem tất cả
                    </button>
                  </div>
                  <div className="pt-3 space-y-2.5">
                    {employeeData.team_members.slice(0, 3).map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <Avatar name={m.name} small />
                          <div>
                            <span className="font-medium text-[#333] block">{m.name}</span>
                            <span className="text-[10px] text-[#888]">{m.title}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] py-0 px-1">
                          {m.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* MỤC 2: HỒ SƠ CÁ NHÂN (PERSONAL PROFILE) */}
          {activeMenu === "profile" && (
            <div className="space-y-6">
              {/* Profile Overview Card */}
              <Card className="border-[#e5e5e5] shadow-none bg-white">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#f0f0f0]">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-[#f4f4f4] border border-[#e5e5e5] flex items-center justify-center text-[20px] font-semibold text-[#444]">
                        {employeeData.full_name
                          .split(" ")
                          .slice(-2)
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-[18px] font-bold text-[#242424]">
                            {employeeData.full_name}
                          </h2>
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            {employeeData.status}
                          </Badge>
                        </div>
                        <p className="text-[12px] text-[#777] mt-0.5">
                          {employeeData.position} · {employeeData.department}
                        </p>
                        <p className="text-[11px] text-[#999] mt-1">
                          Mã nhân viên: <strong className="text-[#444]">{employeeData.employee_code}</strong> · Gia nhập: {employeeData.joined_at}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#999] max-w-[260px]">
                      Cần thay đổi thông tin? Liên hệ phòng nhân sự để cập nhật
                      trong hệ thống.
                    </p>
                  </div>

                  {/* Thông tin lấy từ bảng users + contracts */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-[12px]">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-[#242424] text-[13px] flex items-center gap-1.5 pb-2 border-b border-[#f5f5f5]">
                        <IdCard size={15} className="text-[#666]" />
                        Thông tin công việc
                      </h3>
                      <div className="space-y-2 text-[#666]">
                        <ProfileField label="Mã nhân viên" value={employeeData.employee_code} mono />
                        <ProfileField label="Phòng ban" value={employeeData.department} />
                        <ProfileField label="Chức danh" value={employeeData.position} />
                        <ProfileField label="Ngày vào làm" value={employeeData.joined_at} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-[#242424] text-[13px] flex items-center gap-1.5 pb-2 border-b border-[#f5f5f5]">
                        <Mail size={15} className="text-[#666]" />
                        Thông tin liên hệ
                      </h3>
                      <div className="space-y-2 text-[#666]">
                        <ProfileField label="Email công ty" value={employeeData.email} />
                        <ProfileField label="Số điện thoại" value={NOT_SET} />
                        <ProfileField label="Địa chỉ" value={NOT_SET} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-[#242424] text-[13px] flex items-center gap-1.5 pb-2 border-b border-[#f5f5f5]">
                        <Phone size={15} className="text-[#666]" />
                        Hợp đồng & Gia cảnh
                      </h3>
                      <div className="space-y-2 text-[#666]">
                        <ProfileField label="Mã hợp đồng" value={employeeData.contract_no} />
                        <ProfileField label="Ngày ký" value={employeeData.contract_signed} />
                        <ProfileField
                          label="Người phụ thuộc"
                          value={`${employeeData.salary.dependents} người`}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* MỤC 3: ĐỘI NGŨ & ĐỒNG NGHIỆP (TEAM'S) */}
          {activeMenu === "team" && (
            <div className="space-y-6">
              {/* Banner phòng ban */}
              <div className="p-5 bg-gradient-to-r from-[#242424] to-[#3a3a3a] text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-300 uppercase tracking-wider">
                    <Building2 size={14} />
                    <span>ĐỘI NGŨ PHÒNG BAN</span>
                  </div>
                  <h2 className="text-[20px] font-bold mt-1">{employeeData.department}</h2>
                  <p className="text-[12px] text-gray-300 mt-1">
                    Đồng nghiệp cùng phòng ban, lấy từ bảng users trong database qlns.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-center sm:text-right border-t sm:border-t-0 sm:border-l border-white/20 pt-3 sm:pt-0 sm:pl-6">
                  <div>
                    <div className="text-[24px] font-bold leading-none">{employeeData.team_members.length}</div>
                    <div className="text-[10px] text-gray-400 mt-1">Thành viên</div>
                  </div>
                  <div>
                    <div className="text-[24px] font-bold leading-none text-emerald-400">{employeeData.team_active}</div>
                    <div className="text-[10px] text-gray-400 mt-1">Đang làm việc</div>
                  </div>
                </div>
              </div>

              {/* Danh sách thành viên trong Team */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employeeData.team_members.map((member) => (
                  <Card key={member.id} className={`border-[#e5e5e5] shadow-none bg-white transition-all hover:border-[#bbb] ${member.code === employeeData.employee_code ? "ring-1 ring-[#242424]/40" : ""}`}>
                    <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.name} />
                        <div>
                          <CardTitle className="text-[13px] font-semibold text-[#242424] flex items-center gap-1.5">
                            <span>{member.name}</span>
                            {member.code === employeeData.employee_code && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                Bạn
                              </span>
                            )}
                          </CardTitle>
                          <div className="text-[11px] text-[#777] mt-0.5">{member.title}</div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          member.status === "Đang làm việc"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {member.status}
                      </Badge>
                    </CardHeader>

                    <CardContent className="space-y-2 text-[11px] text-[#666] pt-1 border-t border-[#f5f5f5]">
                      <div className="flex justify-between items-center">
                        <span className="text-[#999]">Mã nhân viên:</span>
                        <strong className="text-[#333] font-mono">{member.code}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#999]">Email:</span>
                        <a href={`mailto:${member.email}`} className="text-blue-600 hover:underline">
                          {member.email}
                        </a>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#999]">Ngày vào làm:</span>
                        <span className="text-[#444]">{member.joined}</span>
                      </div>
                    </CardContent>

                    <div className="p-3 px-6 bg-[#fafafa] border-t border-[#f0f0f0] flex items-center justify-between text-[11px]">
                      <span className="text-[#888] font-medium">{member.role}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2"
                        onClick={() => {
                          navigator.clipboard?.writeText(member.email);
                          toast.success(`Đã sao chép email ${member.email}`);
                        }}
                      >
                        <Copy size={11} className="mr-1" />
                        Sao chép
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* MỤC 4: LƯƠNG & PHIẾU LƯƠNG */}
          {activeMenu === "salary" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-[#e5e5e5] shadow-none bg-white p-4">
                  <span className="text-[11px] text-[#888] uppercase">Lương HĐLĐ thỏa thuận</span>
                  <div className="text-[22px] font-bold text-[#242424] mt-1">{money(employeeData.salary.base)}</div>
                  <p className="text-[10px] text-[#999] mt-1">Căn cứ tính đơn giá công</p>
                </Card>
                <Card className="border-[#e5e5e5] shadow-none bg-white p-4">
                  <span className="text-[11px] text-[#888] uppercase">Mức đóng BHXH</span>
                  <div className="text-[22px] font-bold text-[#242424] mt-1">{money(employeeData.salary.insurance)}</div>
                  <p className="text-[10px] text-[#999] mt-1">Trích nộp 10.5% NLĐ</p>
                </Card>
                <Card className="border-[#e5e5e5] shadow-none bg-white p-4">
                  <span className="text-[11px] text-[#888] uppercase">Phụ cấp & Giảm trừ</span>
                  <div className="text-[22px] font-bold text-[#242424] mt-1">{money(employeeData.salary.allowance)}</div>
                  <p className="text-[10px] text-[#999] mt-1">{employeeData.salary.dependents} người phụ thuộc (4.4tr/tháng/người)</p>
                </Card>
              </div>

              <Card className="border-[#e5e5e5] shadow-none bg-white">
                <CardHeader className="pb-3 border-b border-[#f0f0f0]">
                  <CardTitle className="text-[14px] font-semibold text-[#242424]">
                    Lịch sử chi trả các kỳ lương
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-[12px] border-collapse">
                    <thead className="bg-[#f9f9f9] text-[#777] border-b border-[#ececec]">
                      <tr>
                        <th className="py-3 px-4 font-medium">Kỳ lương</th>
                        <th className="py-3 px-4 font-medium">Công thực tế</th>
                        <th className="py-3 px-4 font-medium">Giờ OT</th>
                        <th className="py-3 px-4 font-medium">Gross</th>
                        <th className="py-3 px-4 font-medium">Trừ BHXH</th>
                        <th className="py-3 px-4 font-medium">Net thực nhận</th>
                        <th className="py-3 px-4 font-medium">Trạng thái</th>
                        <th className="py-3 px-4 font-medium text-right">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2f2f2]">
                      {!employeeData.payroll_history.length && (
                        <tr>
                          <td colSpan={8} className="py-6 px-4 text-center text-[#888]">
                            Chưa có kỳ lương nào được tính cho bạn.
                          </td>
                        </tr>
                      )}
                      {employeeData.payroll_history.map((slip, i) => (
                        <tr key={i} className="hover:bg-[#fafafa]">
                          <td className="py-3.5 px-4 font-semibold text-[#242424]">{slip.period}</td>
                          <td className="py-3.5 px-4 text-[#555]">{slip.actual_days} / {slip.standard_days} ngày</td>
                          <td className="py-3.5 px-4 text-amber-700">+{slip.ot_hours}h</td>
                          <td className="py-3.5 px-4 font-medium">{money(slip.gross)}</td>
                          <td className="py-3.5 px-4 text-red-600">-{money(slip.bhxh)}</td>
                          <td className="py-3.5 px-4 font-bold text-[#1f1f1f]">{money(slip.net)}</td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="text-[9px]">
                              {slip.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px]"
                              onClick={() => setSelectedSlip(slip)}
                            >
                              Xem phiếu
                              <ArrowUpRight size={13} className="ml-1" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* MỤC 5: LỊCH LÀM VIỆC TUẦN */}
          {activeMenu === "schedule" && (
            <Card className="border-[#e5e5e5] shadow-none bg-white">
              <CardHeader className="pb-3 border-b border-[#f0f0f0]">
                <CardTitle className="text-[14px] font-semibold text-[#242424]">
                  Ca làm việc tuần {employeeData.week_range} (Thứ 2 - Thứ 6: {employeeData.work_shift})
                </CardTitle>
                <CardDescription className="text-[11px] text-[#888]">
                  Lịch hành chính chuẩn do backend cung cấp (work_schedule)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-[#f2f2f2]">
                  {employeeData.schedule_this_week.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between text-[12px] hover:bg-[#fafafa]">
                      <div>
                        <strong className="text-[#242424] block">{item.day} ({item.date})</strong>
                        <span className="text-[11px] text-[#888]">{item.type}</span>
                      </div>
                      <div className="text-center font-medium text-[#444]">{item.shift}</div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[10px]">
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* MỤC 6: CHẤM CÔNG & GIỜ LÀM */}
          {activeMenu === "attendance" && (
            <Card className="border-[#e5e5e5] shadow-none bg-white">
              <CardHeader className="pb-3 border-b border-[#f0f0f0]">
                <CardTitle className="text-[14px] font-semibold text-[#242424]">
                  Tổng hợp công theo kỳ lương
                </CardTitle>
                <CardDescription className="text-[11px] text-[#888]">
                  Lấy từ bảng payroll_items · Hệ thống chưa lưu giờ check-in/check-out từng ngày.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-[12px] border-collapse">
                  <thead className="bg-[#f9f9f9] text-[#777] border-b border-[#ececec]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Kỳ lương</th>
                      <th className="py-3 px-4 font-medium">Công chuẩn</th>
                      <th className="py-3 px-4 font-medium">Công thực tế</th>
                      <th className="py-3 px-4 font-medium">Giờ OT</th>
                      <th className="py-3 px-4 font-medium">Trạng thái kỳ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2f2f2]">
                    {!employeeData.payroll_history.length && (
                      <tr>
                        <td colSpan={5} className="py-6 px-4 text-center text-[#888]">
                          Chưa có dữ liệu chấm công.
                        </td>
                      </tr>
                    )}
                    {employeeData.payroll_history.map((slip) => (
                      <tr key={slip.id} className="hover:bg-[#fafafa]">
                        <td className="py-3.5 px-4 font-semibold text-[#242424]">{slip.period}</td>
                        <td className="py-3.5 px-4 text-[#555]">{slip.standard_days} ngày</td>
                        <td className="py-3.5 px-4 text-[#333] font-medium">{slip.actual_days} ngày</td>
                        <td className="py-3.5 px-4 text-amber-700">+{slip.ot_hours}h</td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            {slip.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* MỤC 7: HỢP ĐỒNG & PHÚC LỢI */}
          {activeMenu === "contract" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-[#e5e5e5] shadow-none bg-white text-[12px]">
                <CardHeader className="pb-3 border-b border-[#f0f0f0]">
                  <CardTitle className="text-[14px] font-semibold text-[#242424]">
                    Hợp đồng lao động
                  </CardTitle>
                  <CardDescription className="text-[11px] text-[#888]">
                    Mã hợp đồng: {employeeData.contract_no} · Ngày ký: {employeeData.contract_signed}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-[#666]">
                  <div className="flex justify-between border-b border-[#f5f5f5] pb-2">
                    <span>Số người phụ thuộc:</span>
                    <strong className="text-[#333]">{employeeData.salary.dependents}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#f5f5f5] pb-2">
                    <span>Lương cơ bản HĐLĐ:</span>
                    <strong className="text-[#333]">{money(employeeData.salary.base)}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#f5f5f5] pb-2">
                    <span>Lương đóng BHXH:</span>
                    <strong className="text-[#333]">{money(employeeData.salary.insurance)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Phụ cấp cố định:</span>
                    <strong className="text-[#333]">{money(employeeData.salary.allowance)}</strong>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#e5e5e5] shadow-none bg-white text-[12px]">
                <CardHeader className="pb-3 border-b border-[#f0f0f0]">
                  <CardTitle className="text-[14px] font-semibold text-[#242424]">
                    Thông tin định danh & Bảo hiểm
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-[#666]">
                  <div className="flex justify-between border-b border-[#f5f5f5] pb-2">
                    <span>Mã số thuế cá nhân:</span>
                    <strong className="text-[#999] font-normal">{NOT_SET}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#f5f5f5] pb-2">
                    <span>Số sổ BHXH (VssID):</span>
                    <strong className="text-[#999] font-normal">{NOT_SET}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tài khoản nhận lương:</span>
                    <strong className="text-[#999] font-normal">{NOT_SET}</strong>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* POPUP PAYSLIP */}
      {selectedSlip && (
        <Dialog open onOpenChange={(open) => !open && setSelectedSlip(null)}>
          <DialogContent className="max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-[17px] font-bold text-[#242424]">
                Phiếu Lương Kỳ {selectedSlip.period}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-[#888]">
                {employeeData.full_name} ({employeeData.employee_code}) · {employeeData.department}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-[12px]">
              <div className="bg-[#f9f9f9] border border-[#eee] rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-[#666]">
                  <span>Ngày công thực tế:</span>
                  <strong>{selectedSlip.actual_days} / {selectedSlip.standard_days} ngày</strong>
                </div>
                <div className="flex justify-between text-[#666]">
                  <span>Giờ làm thêm (OT):</span>
                  <strong>+{selectedSlip.ot_hours}h</strong>
                </div>
                <div className="flex justify-between text-[#333] font-semibold pt-1 border-t border-[#e5e5e5]">
                  <span>Tổng thu nhập Gross:</span>
                  <span>{money(selectedSlip.gross)}</span>
                </div>
              </div>

              <div className="bg-[#f9f9f9] border border-[#eee] rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-[#666]">
                  <span>Trừ BHXH (10.5%):</span>
                  <span className="text-red-600">-{money(selectedSlip.bhxh)}</span>
                </div>
                <div className="flex justify-between text-[#666]">
                  <span>Thuế TNCN tạm tính:</span>
                  <span className="text-red-600">-{money(selectedSlip.tax)}</span>
                </div>
              </div>

              <div className="p-4 bg-[#242424] text-white rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#aaa] uppercase tracking-wider block">LƯƠNG THỰC NHẬN (NET)</span>
                  <strong className="text-[20px] font-bold">{money(selectedSlip.net)}</strong>
                </div>
                <Badge variant="outline" className="border-white/20 text-white bg-white/10 text-[10px]">
                  {selectedSlip.status}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#eee]">
              <Button size="sm" className="text-[11px] h-8" onClick={() => setSelectedSlip(null)}>
                Đóng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

function ProfileField({ label, value, mono = false }) {
  const missing = !value || value === NOT_SET;
  return (
    <div>
      <span className="text-[10px] text-[#999] uppercase block">{label}:</span>
      <strong
        className={`${missing ? "text-[#aaa] font-normal" : "text-[#333]"} ${mono ? "font-mono" : ""}`}
      >
        {value || NOT_SET}
      </strong>
    </div>
  );
}
