import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  Code2,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Layers3,
  LockKeyhole,
  RotateCcw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, EmptyState, Panel } from "@/components/shared";
import { departments, exportCsv, money } from "@/data/workspace";
export function DepartmentsPage({ employees, navigate }) {
  const icons = [
    Code2,
    Layers3,
    ArrowUpRight,
    CircleDollarSign,
    Users,
    Building2,
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CÙNG NHAU TIẾN XA HƠN</div>
          <h1>
            Mỗi đội ngũ, một thế mạnh<span>.</span>
          </h1>
          <p>Kết nối các phòng ban, xây dựng một tổ chức vững vàng.</p>
        </div>
        <Badge variant="outline" className="overview-badge">
          <Building2 size={14} />
          {departments.length} phòng ban
        </Badge>
      </div>
      <div className="department-cards">
        {departments.map((d, i) => {
          const members = employees.filter((e) => e.department === d);
          const Icon = icons[i];
          return (
            <section className="panel department-card" key={d}>
              <div className="department-card-top">
                <span className="department-icon">
                  <Icon size={22} />
                </span>
                <Badge variant="outline">{members.length} thành viên</Badge>
              </div>
              <h2>{d}</h2>
              <p>
                {
                  [
                    "Xây dựng nền tảng, tạo nên giải pháp.",
                    "Biến ý tưởng thành trải nghiệm.",
                    "Kết nối thương hiệu với mọi người.",
                    "Tạo giá trị qua mỗi kết nối.",
                    "Đồng hành với mỗi bước phát triển.",
                    "Vững nền tảng, sáng tương lai.",
                  ][i]
                }
              </p>
              <div className="department-card-stats">
                <div>
                  <span>Đang làm việc</span>
                  <strong>
                    {members.filter((e) => e.status === "Đang làm việc").length}
                  </strong>
                </div>
                <div>
                  <span>Quỹ lương cơ bản</span>
                  <strong>
                    {(
                      members.reduce((sum, e) => sum + e.base_salary, 0) /
                      1000000
                    ).toLocaleString("vi-VN")}{" "}
                    <small>tr</small>
                  </strong>
                </div>
              </div>
              <div className="department-card-foot">
                <div className="avatar-stack">
                  {members.slice(0, 3).map((e, idx) => (
                    <Avatar key={e.id} name={e.full_name} index={idx} small />
                  ))}
                  {members.length > 3 && (
                    <span className="stack-more">+{members.length - 3}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`employees:${d}`)}
                >
                  Xem đội ngũ
                  <ArrowUpRight size={14} />
                </Button>
              </div>
            </section>
          );
        })}
      </div>
      <p className="page-footnote">
        Phân nhóm phòng ban trong bản mẫu · Database qlns hiện chưa có bảng
        phòng ban.
      </p>
    </>
  );
}
export function PayrollPage({ employees }) {
  const [period, setPeriod] = useState("2026-11");
  const [detail, setDetail] = useState(null);
  const total = employees.reduce(
    (sum, e) => sum + e.base_salary + e.allowance,
    0,
  );
  const month = Number(period.split("-")[1]);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">RÕ RÀNG TRONG TỪNG CON SỐ</div>
          <h1>
            Bảng lương & đãi ngộ<span>.</span>
          </h1>
          <p>Theo dõi thông số hợp đồng và chuẩn bị cho mỗi kỳ lương.</p>
        </div>
        <Button
          variant="outline"
          disabled={!employees.length}
          onClick={() => {
            exportCsv(
              employees.map((e) => ({
                "Kỳ dự toán": period,
                "Mã NV": e.employee_code,
                "Họ tên": e.full_name,
                "Lương cơ bản": e.base_salary,
                "Phụ cấp": e.allowance,
                "Tổng theo hợp đồng": e.base_salary + e.allowance,
                "Lương BHXH": e.insurance_salary,
                "Người phụ thuộc": e.dependents_count,
                "Trạng thái": "Dự toán mẫu, chưa tính thuế và ngày công",
              })),
              `du-toan-luong-${period}.csv`,
            );
            toast.success("Đã xuất dự toán theo thông số hợp đồng hiện tại.");
          }}
        >
          <Download size={15} />
          Xuất dự toán
        </Button>
      </div>
      <div className="payroll-summary">
        <div className="payroll-summary-main">
          <span className="stat-icon">
            <CircleDollarSign size={20} />
          </span>
          <div>
            <p>Tổng lương cơ bản & phụ cấp</p>
            <strong>{money(total)}</strong>
            <span>Thông số hiện tại · {employees.length} hợp đồng mẫu</span>
          </div>
        </div>
        <div>
          <span>Lương cơ bản</span>
          <strong>
            {money(employees.reduce((s, e) => s + e.base_salary, 0))}
          </strong>
        </div>
        <div>
          <span>Tổng phụ cấp</span>
          <strong>
            {money(employees.reduce((s, e) => s + e.allowance, 0))}
          </strong>
        </div>
      </div>
      <div className="info-callout">
        <FileText size={17} />
        <p>
          <strong>Dự toán từ hợp đồng mẫu.</strong> Chưa tính công thực tế, OT,
          thuế và lương thực nhận. Các kỳ hiển thị cùng thông số hiện tại, chưa
          có dữ liệu lịch sử.
        </p>
      </div>
      <Panel
        title={`Dự toán kỳ tháng ${month}/2026`}
        description="Đối chiếu thông tin lương trước khi lập bảng lương"
        action={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger aria-label="Chọn kỳ lương">
              <CalendarDays size={14} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["2026-11", "2026-10", "2026-09"].map((p) => (
                <SelectItem key={p} value={p}>
                  Tháng {Number(p.split("-")[1])}/2026
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Lương cơ bản</th>
                <th>Phụ cấp</th>
                <th>Tổng theo hợp đồng</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) => (
                <tr key={e.id}>
                  <td>
                    <button
                      className="person-cell person-button"
                      onClick={() => setDetail(e)}
                    >
                      <Avatar name={e.full_name} index={i} />
                      <div>
                        <strong>{e.full_name}</strong>
                        <small>
                          {e.employee_code} · {e.department}
                        </small>
                      </div>
                    </button>
                  </td>
                  <td>{money(e.base_salary)}</td>
                  <td>{money(e.allowance)}</td>
                  <td className="money-cell">
                    {money(e.base_salary + e.allowance)}
                  </td>
                  <td>
                    <Badge variant="outline">Nháp</Badge>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Xem dự toán ${e.full_name}`}
                      onClick={() => setDetail(e)}
                    >
                      <ArrowUpRight size={15} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!employees.length && (
            <EmptyState
              title="Chưa có hợp đồng"
              description="Thêm nhân viên để bắt đầu chuẩn bị bảng lương."
            />
          )}
        </div>
      </Panel>
      {detail && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setDetail(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <span className="dialog-icon">
                <FileSpreadsheet size={22} />
              </span>
              <DialogTitle>Dự toán lương tháng {month}/2026</DialogTitle>
              <DialogDescription>
                {detail.full_name} · {detail.employee_code}
              </DialogDescription>
            </DialogHeader>
            <div className="payslip">
              {[
                ["Lương cơ bản", money(detail.base_salary)],
                ["Phụ cấp", money(detail.allowance)],
                ["Lương đóng BHXH", money(detail.insurance_salary)],
                ["Người phụ thuộc", `${detail.dependents_count} người`],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              <div className="payslip-total">
                <span>Tổng theo hợp đồng</span>
                <strong>{money(detail.base_salary + detail.allowance)}</strong>
              </div>
            </div>
            <p className="form-note">
              Thông tin mẫu. Tổng theo hợp đồng chưa phải lương thực nhận và
              chưa bao gồm các khoản khấu trừ.
            </p>
            <Button onClick={() => setDetail(null)}>Đóng</Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
export function ReportsPage({ employees }) {
  function downloadReport(type) {
    let rows;
    if (type === "Cơ cấu phòng ban")
      rows = departments.map((d) => ({
        "Phòng ban": d,
        "Nhân sự": employees.filter((e) => e.department === d).length,
        "Lương cơ bản": employees
          .filter((e) => e.department === d)
          .reduce((s, e) => s + e.base_salary, 0),
      }));
    else if (type === "Tình trạng nhân sự")
      rows = ["Đang làm việc", "Thử việc", "Nghỉ phép"].map((s) => ({
        "Trạng thái": s,
        "Số lượng": employees.filter((e) => e.status === s).length,
      }));
    else
      rows = employees.map((e) =>
        type === "Tổng hợp hợp đồng"
          ? {
              "Mã NV": e.employee_code,
              "Họ tên": e.full_name,
              "Lương cơ bản": e.base_salary,
              "Phụ cấp": e.allowance,
              "Lương BHXH": e.insurance_salary,
              "Người phụ thuộc": e.dependents_count,
            }
          : {
              "Mã NV": e.employee_code,
              "Họ tên": e.full_name,
              Email: e.email,
              "Phòng ban": e.department,
              "Ngày gia nhập": e.joined_at,
              "Trạng thái": e.status,
            },
      );
    if (!rows.length) {
      toast.info("Chưa có dữ liệu để xuất.");
      return;
    }
    exportCsv(rows, `bao-cao-${type.toLowerCase().replaceAll(" ", "-")}.csv`);
    toast.success(`Đã xuất báo cáo ${type.toLowerCase()}.`);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TỪ DỮ LIỆU ĐẾN GÓC NHÌN</div>
          <h1>
            Hiểu đội ngũ qua con số<span>.</span>
          </h1>
          <p>Báo cáo gọn gàng, sẵn sàng cho quyết định tiếp theo.</p>
        </div>
        <Badge variant="outline" className="overview-badge">
          <Database size={14} />
          Dữ liệu mẫu hiện tại
        </Badge>
      </div>
      <div className="report-hero">
        <span className="report-hero-icon">
          <FileSpreadsheet size={34} />
        </span>
        <div>
          <h2>Một đội ngũ. Nhiều góc nhìn.</h2>
          <p>
            Xuất dữ liệu từ không gian làm việc của bạn dưới định dạng CSV,
            <br />
            dễ dàng mở bằng Excel hoặc Google Sheets.
          </p>
        </div>
        <span className="report-hero-decoration">Aa / 01</span>
      </div>
      <div className="report-cards">
        {[
          {
            title: "Danh sách nhân viên",
            description: "Thông tin nhân sự, liên hệ và ngày gia nhập.",
            icon: Users,
            count: `${employees.length} nhân viên`,
          },
          {
            title: "Cơ cấu phòng ban",
            description: "Phân bổ nhân sự và quỹ lương theo từng đội.",
            icon: Building2,
            count: `${departments.length} phòng ban`,
          },
          {
            title: "Tổng hợp hợp đồng",
            description: "Lương cơ bản, bảo hiểm và phụ cấp.",
            icon: FileText,
            count: `${employees.length} hợp đồng`,
          },
          {
            title: "Tình trạng nhân sự",
            description: "Tổng hợp số lượng theo trạng thái làm việc.",
            icon: Check,
            count: "3 nhóm trạng thái",
          },
        ].map((r) => (
          <section className="panel report-card" key={r.title}>
            <span className="department-icon">
              <r.icon size={22} />
            </span>
            <h2>{r.title}</h2>
            <p>{r.description}</p>
            <div>
              <span>{r.count}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadReport(r.title)}
              >
                <ArrowDownToLine size={14} />
                Tải CSV
              </Button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
export function SettingsPage({ company, onCompanyChange, onReset }) {
  const [name, setName] = useState(company);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THEO CÁCH CỦA BẠN</div>
          <h1>
            Không gian làm việc<span>.</span>
          </h1>
          <p>Một vài thiết lập nhỏ cho trải nghiệm quen thuộc hơn.</p>
        </div>
      </div>
      <div className="settings-grid">
        <Panel
          title="Thông tin tổ chức"
          description="Tên hiển thị trong không gian làm việc"
        >
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              onCompanyChange(name.trim());
              toast.success("Đã cập nhật tên tổ chức.");
            }}
          >
            <label>
              Tên tổ chức
              <Input
                required
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="settings-readonly">
              <span>Ngôn ngữ</span>
              <strong>Tiếng Việt</strong>
            </div>
            <div className="settings-readonly">
              <span>Múi giờ</span>
              <strong>Asia/Ho_Chi_Minh (UTC+7)</strong>
            </div>
            <Button type="submit">Lưu thiết lập</Button>
          </form>
        </Panel>
        <Panel
          title="Nguồn dữ liệu"
          description="Thông tin kết nối của phiên bản hiện tại"
        >
          <div className="settings-source">
            <span className="source-icon">
              <Database size={24} />
            </span>
            <Badge variant="secondary">Chế độ dữ liệu mẫu</Badge>
            <p>
              Nhân viên, phòng ban và hợp đồng đang dùng dữ liệu mẫu lưu trên
              trình duyệt. Chưa kết nối cơ sở dữ liệu PHP/MySQL.
            </p>
            <div className="source-api">
              <Code2 size={16} />
              <span>Adapter sẵn có: GET / PUT /api/contracts</span>
            </div>
            <p className="source-api-note">
              Backend hiện mới có route Home; cần triển khai API và xác thực
              trước khi tích hợp dữ liệu thực.
            </p>
          </div>
        </Panel>
        <Panel
          title="Khôi phục dữ liệu mẫu"
          description="Bắt đầu lại với danh sách mẫu ban đầu"
          className="reset-panel"
        >
          <div>
            <p>
              Thao tác này thay thế dữ liệu nhân sự đã chỉnh sửa trên trình
              duyệt này.
            </p>
            <Button variant="outline" onClick={onReset}>
              <RotateCcw size={14} />
              Khôi phục dữ liệu
            </Button>
          </div>
        </Panel>
        <div className="settings-privacy">
          <LockKeyhole size={17} />
          <p>
            Thông tin trong phiên bản này chỉ dùng để trải nghiệm giao diện,
            không dùng để xử lý bảng lương thực tế.
          </p>
        </div>
      </div>
    </>
  );
}
