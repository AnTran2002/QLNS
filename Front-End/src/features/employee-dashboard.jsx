import { useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck2,
  CalendarDays,
  Cake,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  History,
  IdCard,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Scan,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { money } from "@/data/workspace";

export function EmployeeDashboard({ user, onLogout }) {
  const [activeMenu, setActiveMenu] = useState("overview"); // 'overview' | 'profile' | 'team' | 'salary' | 'schedule' | 'attendance' | 'contract'
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Dữ liệu mẫu nhân viên & hồ sơ cá nhân
  const [personalInfo, setPersonalInfo] = useState({
    full_name: user?.full_name || "Trần Thị Bình",
    employee_code: user?.employee_code || "NV002",
    email: user?.email || "binh.tran@company.vn",
    personal_email: "binhtran.design@gmail.com",
    phone: "0982 123 456",
    gender: "Nữ",
    dob: "18/06/1996",
    marital_status: "Đã kết hôn",
    nationality: "Việt Nam",
    id_card: "079196028491",
    id_card_date: "12/04/2021",
    id_card_place: "Cục Cảnh sát QLHC về TTXH",
    permanent_address: "125 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    current_address: "48/12 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP. Hồ Chí Minh",
    emergency_contact: {
      name: "Nguyễn Minh Tuấn",
      relation: "Chồng",
      phone: "0918 888 999",
    },
    education: {
      degree: "Cử nhân Thiết kế Đồ họa & Tương tác",
      school: "Đại học Kiến Trúc TP. Hồ Chí Minh",
      grad_year: "2018",
      certifications: ["Google UX Design Professional", "Nielsen Norman Group UX Master"],
    },
  });

  const employeeData = {
    ...personalInfo,
    department: user?.department || "Thiết kế & Trải nghiệm",
    position: user?.position || "Senior UI/UX Designer",
    joined_at: user?.joined_at || "2024-03-15",
    contract_type: "Hợp đồng không xác định thời hạn",
    contract_no: `HĐLĐ-${user?.employee_code || "NV002"}/2024`,
    salary: {
      base: 18500000,
      insurance: 15000000,
      allowance: 2500000,
      dependents: 1,
      latest_gross: 21000000,
      latest_bhxh: 1575000,
      latest_tax: 225000,
      latest_net: 19200000,
      payment_status: "Đã thanh toán (VCB)",
    },
    attendance: {
      standard_days: 22,
      actual_days: 21.5,
      leave_days: 0.5,
      annual_leave_total: 12,
      annual_leave_used: 3.5,
      annual_leave_remaining: 8.5,
      total_hours: 172,
      ot_hours: 6.5,
      on_time_rate: "98.5%",
      late_count: 1,
      today_in: "08:24",
      today_out: "17:30",
    },
    // Đội ngũ trong team của nhân viên (Team's)
    team_members: [
      {
        id: 9,
        code: "NV009",
        name: "Hoàng Mai Chi",
        role: "Trưởng nhóm (Team Lead)",
        title: "Head of Product Design",
        email: "maichi@acme.vn",
        phone: "0912 345 678",
        status: "Đang làm việc",
        joined: "12/2023",
        birthday: "25/11",
      },
      {
        id: 2,
        code: "NV002",
        name: personalInfo.full_name,
        role: "Thành viên (Tôi)",
        title: "Senior UI/UX Designer",
        email: personalInfo.email,
        phone: personalInfo.phone,
        status: "Đang làm việc",
        joined: "03/2024",
        birthday: "18/06",
      },
      {
        id: 7,
        code: "NV007",
        name: "Bùi Phương Anh",
        role: "Thành viên",
        title: "Product Designer",
        email: "phuonganh@acme.vn",
        phone: "0933 111 222",
        status: "Đang làm việc",
        joined: "05/2024",
        birthday: "02/12",
      },
      {
        id: 11,
        code: "NV011",
        name: "Trần Bảo Ngọc",
        role: "Thành viên",
        title: "UI Designer & Illustrator",
        email: "baongoc@acme.vn",
        phone: "0909 333 444",
        status: "Đang làm việc",
        joined: "07/2024",
        birthday: "14/01",
      },
      {
        id: 15,
        code: "NV015",
        name: "Đặng Khánh Vy",
        role: "Thành viên",
        title: "UX Researcher",
        email: "khanhvy@acme.vn",
        phone: "0977 555 666",
        status: "Đang làm việc",
        joined: "08/2024",
        birthday: "30/08",
      },
      {
        id: 20,
        code: "NV020",
        name: "Trần Mỹ Duyên",
        role: "Thành viên",
        title: "Design System Specialist",
        email: "myduyen@acme.vn",
        phone: "0988 777 888",
        status: "Nghỉ phép",
        joined: "09/2024",
        birthday: "19/04",
      },
    ],
    payroll_history: [
      {
        period: "2026-10",
        standard_days: 22,
        actual_days: 22,
        ot_hours: 8,
        gross: 21800000,
        bhxh: 1575000,
        tax: 295000,
        net: 19930000,
        status: "ĐÃ CHI TRẢ",
        paid_at: "05/11/2026",
      },
      {
        period: "2026-09",
        standard_days: 22,
        actual_days: 21,
        ot_hours: 4,
        gross: 20500000,
        bhxh: 1575000,
        tax: 185000,
        net: 18740000,
        status: "ĐÃ CHI TRẢ",
        paid_at: "05/10/2026",
      },
      {
        period: "2026-08",
        standard_days: 22,
        actual_days: 22,
        ot_hours: 6.5,
        gross: 21200000,
        bhxh: 1575000,
        tax: 245000,
        net: 19380000,
        status: "ĐÃ CHI TRẢ",
        paid_at: "05/09/2026",
      },
    ],
    schedule_this_week: [
      { day: "Thứ Hai", date: "10/11", shift: "08:30 - 17:30", type: "Văn phòng", status: "Hoàn thành", hours: "8.0h" },
      { day: "Thứ Ba", date: "11/11", shift: "08:30 - 17:30", type: "Văn phòng", status: "Hoàn thành", hours: "9.0h (1h OT)" },
      { day: "Thứ Tư", date: "12/11", shift: "08:30 - 17:30", type: "Văn phòng", status: "Hoàn thành", hours: "8.0h" },
      { day: "Thứ Năm", date: "13/11", shift: "08:30 - 17:30", type: "Văn phòng", status: "Đang làm việc", hours: "7.5h" },
      { day: "Thứ Sáu", date: "14/11", shift: "08:30 - 17:30", type: "Remote", status: "Sắp tới", hours: "8.0h" },
      { day: "Thứ Bảy", date: "15/11", shift: "Nghỉ tuần", type: "Nghỉ", status: "Nghỉ", hours: "0h" },
      { day: "Chủ Nhật", date: "16/11", shift: "Nghỉ tuần", type: "Nghỉ", status: "Nghỉ", hours: "0h" },
    ],
    recent_logs: [
      { date: "13/11/2026", in: "08:24", out: "--:--", duration: "7h 15m", note: "Đúng giờ (Face ID Camera)" },
      { date: "12/11/2026", in: "08:28", out: "17:31", duration: "8h 03m", note: "Đúng giờ (Face ID)" },
      { date: "11/11/2026", in: "08:20", out: "18:32", duration: "9h 12m", note: "OT 1.0h được duyệt" },
      { date: "10/11/2026", in: "08:25", out: "17:35", duration: "8h 10m", note: "Đúng giờ (Face ID)" },
      { date: "07/11/2026", in: "08:35", out: "17:30", duration: "7h 55m", note: "Trễ 5 phút (Đã xin phép)" },
      { date: "06/11/2026", in: "08:18", out: "17:30", duration: "8h 12m", note: "Đúng giờ (Face ID)" },
    ],
  };

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
                <Scan size={18} />
              </div>
              <div>
                <div className="text-[10px] text-[#888] uppercase font-medium flex items-center gap-1.5">
                  <span>Chấm công hôm nay</span>
                  <span className="text-[#ccc]">·</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-100 text-[9px]">
                    Face ID ghi nhận
                  </span>
                </div>
                <div className="text-[12px] font-semibold flex items-center gap-2 text-[#242424] mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Vào: <strong className="text-emerald-700">{employeeData.attendance.today_in}</strong></span>
                  <span className="text-[#ccc]">|</span>
                  <span className="text-[#666] font-normal">Ra: <strong>{employeeData.attendance.today_out}</strong></span>
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
                  Ngày công tháng này
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
                  Chuyên cần: <strong className="text-emerald-600">{employeeData.attendance.on_time_rate}</strong>
                </div>
                <p className="text-[10px] text-[#999] pt-1 border-t border-[#f0f0f0]">
                  Đi muộn: {employeeData.attendance.late_count} lần · Nghỉ: {employeeData.attendance.leave_days} ngày
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
                  Ca chuẩn: 8.0 giờ / ngày
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
                  5 đang làm việc · 1 nghỉ phép
                </div>
                <p className="text-[10px] text-[#999] pt-1 border-t border-[#f0f0f0]">
                  Lead: Hoàng Mai Chi
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
                        Lịch làm việc tuần này (10/11 - 16/11)
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px]">
                        08:30 - 17:30
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-[#f2f2f2]">
                      {employeeData.schedule_this_week.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3.5 px-5 text-[12px] ${
                            item.date === "13/11" ? "bg-[#fbfbf9] font-medium" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.status === "Hoàn thành"
                                  ? "bg-emerald-500"
                                  : item.status === "Đang làm việc"
                                  ? "bg-blue-600 animate-ping"
                                  : item.type === "Nghỉ"
                                  ? "bg-gray-300"
                                  : "bg-amber-400"
                              }`}
                            />
                            <div>
                              <div className="font-semibold text-[#242424]">
                                {item.day} {item.date === "13/11" && "(Hôm nay)"}
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
                              item.status === "Hoàn thành"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : item.status === "Đang làm việc"
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
                      onClick={() => setSelectedSlip(employeeData.payroll_history[0])}
                    >
                      <FileSpreadsheet size={14} className="mr-1.5" />
                      Xem chi tiết phiếu lương
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
                            Chính thức
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

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[12px] h-8 gap-1.5 border-[#e5e5e5]"
                      onClick={() => setEditProfileOpen(true)}
                    >
                      <Edit3 size={13} />
                      Cập nhật thông tin liên hệ
                    </Button>
                  </div>

                  {/* Grid 3 cột thông tin */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-[12px]">
                    {/* Cột 1: Thông tin cơ bản & Định danh */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-[#242424] text-[13px] flex items-center gap-1.5 pb-2 border-b border-[#f5f5f5]">
                        <IdCard size={15} className="text-[#666]" />
                        Thông tin định danh
                      </h3>
                      <div className="space-y-2 text-[#666]">
                        <div>
                          <span className="text-[10px] text-[#999] uppercase block">Ngày sinh:</span>
                          <strong className="text-[#333]">{personalInfo.dob}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#999] uppercase block">Giới tính:</span>
                          <strong className="text-[#333]">{personalInfo.gender}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#999] uppercase block">Số CCCD / Định danh:</span>
                          <strong className="text-[#333] font-mono">{personalInfo.id_card}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#999] uppercase block">Ngày cấp & Nơi cấp:</span>
                          <span className="text-[#444]">{personalInfo.id_card_date} ({personalInfo.id_card_place})</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#999] uppercase block">Quốc tịch / Hôn nhân:</span>
                          <span className="text-[#444]">{personalInfo.nationality} · {personalInfo.marital_status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cột 2: Thông tin liên lạc & Cư trú */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-[#242424] text-[13px] flex items-center gap-1.5 pb-2 border-b border-[#f5f5f5]">
                        <Mail size={15} className="text-[#666]" />
                        Thông tin liên hệ
                      </h3>
                      <div className="space-y-2 text-[#666]">
                        <div>
                          <span className="text-[10px] text-[#999] uppercase block">Số điện thoại:</span>
                          <strong className="text-[#333] font-mono">{personalInfo.phone}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#999] uppercase block">Email công ty:</span>
                          <strong className="text-[#333]">{personalInfo.email}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#999] uppercase block">Email cá nhân:</span>
                          <span className="text-[#444]">{personalInfo.personal_email}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#999] uppercase block">Địa chỉ thường trú:</span>
                          <span className="text-[#444] leading-relaxed">{personalInfo.permanent_address}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#999] uppercase block">Địa chỉ tạm trú hiện tại:</span>
                          <span className="text-[#444] leading-relaxed">{personalInfo.current_address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cột 3: Người liên hệ khẩn cấp & Học vấn */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-[#242424] text-[13px] flex items-center gap-1.5 pb-2 border-b border-[#f5f5f5]">
                        <Phone size={15} className="text-[#666]" />
                        Liên hệ khẩn cấp & Học vấn
                      </h3>
                      <div className="space-y-2 text-[#666]">
                        <div className="p-2.5 bg-[#fbfbfb] border border-[#eee] rounded-lg">
                          <span className="text-[10px] text-[#888] uppercase block font-semibold">Người liên hệ khẩn cấp:</span>
                          <strong className="text-[#333] block mt-0.5">{personalInfo.emergency_contact.name} ({personalInfo.emergency_contact.relation})</strong>
                          <span className="text-[11px] text-emerald-700 font-mono mt-0.5 block">{personalInfo.emergency_contact.phone}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#999] uppercase block">Trình độ học vấn:</span>
                          <strong className="text-[#333] block">{personalInfo.education.degree}</strong>
                          <span className="text-[11px] text-[#777]">{personalInfo.education.school} (Khóa {personalInfo.education.grad_year})</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#999] uppercase block mb-1">Chứng chỉ chuyên môn:</span>
                          <div className="flex flex-wrap gap-1">
                            {personalInfo.education.certifications.map((c, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] font-normal bg-[#f9f9f9]">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>
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
                    Chịu trách nhiệm thiết kế trải nghiệm người dùng, hệ thống Design System và giao diện sản phẩm.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-center sm:text-right border-t sm:border-t-0 sm:border-l border-white/20 pt-3 sm:pt-0 sm:pl-6">
                  <div>
                    <div className="text-[24px] font-bold leading-none">{employeeData.team_members.length}</div>
                    <div className="text-[10px] text-gray-400 mt-1">Thành viên</div>
                  </div>
                  <div>
                    <div className="text-[24px] font-bold leading-none text-emerald-400">5</div>
                    <div className="text-[10px] text-gray-400 mt-1">Đang làm việc</div>
                  </div>
                </div>
              </div>

              {/* Danh sách thành viên trong Team */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employeeData.team_members.map((member) => (
                  <Card key={member.id} className={`border-[#e5e5e5] shadow-none bg-white transition-all hover:border-[#bbb] ${member.code === "NV002" ? "ring-1 ring-[#242424]/40" : ""}`}>
                    <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.name} />
                        <div>
                          <CardTitle className="text-[13px] font-semibold text-[#242424] flex items-center gap-1.5">
                            <span>{member.name}</span>
                            {member.code === "NV002" && (
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
                        <span className="text-[#999]">Sinh nhật:</span>
                        <span className="text-[#444] flex items-center gap-1">
                          <Cake size={11} className="text-amber-500" />
                          {member.birthday}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#999]">Gia nhập team:</span>
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
                  <p className="text-[10px] text-[#999] mt-1">1 người phụ thuộc (4.4tr/tháng)</p>
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
                  Ca làm việc tuần chuẩn (Thứ 2 - Thứ 6: 08:30 - 17:30)
                </CardTitle>
                <CardDescription className="text-[11px] text-[#888]">
                  Nghỉ trưa: 12:00 - 13:00 · Địa điểm: Trụ sở chính & Hybrid
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
                  Nhật ký chấm công qua thiết bị Camera Face ID / Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-[12px] border-collapse">
                  <thead className="bg-[#f9f9f9] text-[#777] border-b border-[#ececec]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Ngày</th>
                      <th className="py-3 px-4 font-medium">Giờ vào (Check-in)</th>
                      <th className="py-3 px-4 font-medium">Giờ ra (Check-out)</th>
                      <th className="py-3 px-4 font-medium">Tổng giờ làm</th>
                      <th className="py-3 px-4 font-medium">Trạng thái ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2f2f2]">
                    {employeeData.recent_logs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-[#fafafa]">
                        <td className="py-3.5 px-4 font-semibold text-[#242424]">{log.date}</td>
                        <td className="py-3.5 px-4 text-[#333] font-medium">{log.in}</td>
                        <td className="py-3.5 px-4 text-[#555]">{log.out}</td>
                        <td className="py-3.5 px-4 font-medium">{log.duration}</td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            {log.note}
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
                    Số: {employeeData.contract_no}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-[#666]">
                  <div className="flex justify-between border-b border-[#f5f5f5] pb-2">
                    <span>Loại hợp đồng:</span>
                    <strong className="text-[#333]">{employeeData.contract_type}</strong>
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
                    <strong className="text-[#333]">8492019481</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#f5f5f5] pb-2">
                    <span>Số sổ BHXH (VssID):</span>
                    <strong className="text-[#333]">7910294821</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tài khoản nhận lương:</span>
                    <strong className="text-[#333]">1029482910 (VCB)</strong>
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

      {/* DIALOG CHỈNH SỬA THÔNG TIN LIÊN HỆ */}
      {editProfileOpen && (
        <Dialog open onOpenChange={setEditProfileOpen}>
          <DialogContent className="max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-[16px] font-bold text-[#242424]">
                Cập nhật thông tin liên hệ
              </DialogTitle>
              <DialogDescription className="text-[12px] text-[#888]">
                Thông tin này sẽ được lưu để phòng nhân sự (HR) liên hệ khi cần thiết.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setEditProfileOpen(false);
                toast.success("Đã cập nhật thông tin liên hệ thành công!");
              }}
              className="space-y-3.5 py-2 text-[12px]"
            >
              <div>
                <Label htmlFor="edit-phone" className="text-[11px] text-[#666]">Số điện thoại</Label>
                <Input
                  id="edit-phone"
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                  className="h-9 text-[12px] mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-personal-email" className="text-[11px] text-[#666]">Email cá nhân</Label>
                <Input
                  id="edit-personal-email"
                  type="email"
                  value={personalInfo.personal_email}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, personal_email: e.target.value })}
                  className="h-9 text-[12px] mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-current-addr" className="text-[11px] text-[#666]">Nơi ở hiện tại</Label>
                <Input
                  id="edit-current-addr"
                  value={personalInfo.current_address}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, current_address: e.target.value })}
                  className="h-9 text-[12px] mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#eee]">
                <Button type="button" variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => setEditProfileOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" className="h-8 text-[11px] bg-[#242424] text-white">
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
