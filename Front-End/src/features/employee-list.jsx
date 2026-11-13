import { useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  UserRoundX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, EmptyState, Status } from "@/components/shared";
import { dateLabel, departments, exportCsv, money } from "@/data/workspace";
export function EmployeeList({
  employees,
  initialDepartment = "all",
  onAdd,
  onEdit,
  onRemove,
  contract = false,
}) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState(initialDepartment);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const normalized = (text) =>
    text
      .toLocaleLowerCase("vi")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replaceAll("đ", "d");
  const filtered = employees
    .filter(
      (e) =>
        (department === "all" || e.department === department) &&
        (status === "all" || e.status === status) &&
        normalized(`${e.full_name} ${e.email} ${e.employee_code}`).includes(
          normalized(search),
        ),
    )
    .sort((a, b) =>
      sort ? a.full_name.localeCompare(b.full_name, "vi") : b.id - a.id,
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * 8, current * 8);
  const allChecked =
    visible.length > 0 && visible.every((e) => selected.includes(e.id));
  function download() {
    const rows = selected.length
      ? filtered.filter((e) => selected.includes(e.id))
      : filtered;
    if (!rows.length) {
      toast.info("Chưa có dữ liệu để xuất.");
      return;
    }
    exportCsv(
      rows.map((e) =>
        contract
          ? {
              "Mã NV": e.employee_code,
              "Họ tên": e.full_name,
              "Lương cơ bản": e.base_salary,
              "Lương BHXH": e.insurance_salary,
              "Phụ cấp": e.allowance,
              "Người phụ thuộc": e.dependents_count,
            }
          : {
              "Mã NV": e.employee_code,
              "Họ tên": e.full_name,
              Email: e.email,
              "Phòng ban": e.department,
              "Chức danh": e.position,
              "Trạng thái": e.status,
              "Ngày gia nhập": e.joined_at,
            },
      ),
      contract ? "hop-dong.csv" : "nhan-vien.csv",
    );
    toast.success(
      `Đã xuất ${rows.length} ${contract ? "hợp đồng" : "nhân viên"}.`,
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {contract ? "ĐÃI NGỘ & PHÚC LỢI" : "CON NGƯỜI & KẾT NỐI"}
          </div>
          <h1>
            {contract ? "Hợp đồng nhân sự" : "Đội ngũ của chúng ta"}
            <span>.</span>
          </h1>
          <p>
            {contract
              ? "Quản lý thông số lương, bảo hiểm và phụ cấp ở cùng một nơi."
              : "Những con người cùng nhau tạo nên những điều khác biệt."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={download}>
            <Download size={15} />
            Xuất CSV{selected.length ? ` (${selected.length})` : ""}
          </Button>
          {!contract && (
            <Button onClick={onAdd}>
              <Plus size={16} />
              Thêm nhân viên
            </Button>
          )}
        </div>
      </div>
      <section className="panel employee-panel">
        <div className="list-tabs">
          <button
            className={status === "all" ? "active" : ""}
            onClick={() => {
              setStatus("all");
              setPage(1);
            }}
          >
            Tất cả nhân viên<span>{employees.length}</span>
          </button>
          {["Đang làm việc", "Thử việc", "Nghỉ phép"].map((s) => (
            <button
              key={s}
              className={status === s ? "active" : ""}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s}
              <span>{employees.filter((e) => e.status === s).length}</span>
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={16} />
            <Input
              aria-label="Tìm nhân viên"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên, email hoặc mã nhân viên..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={department}
              onValueChange={(v) => {
                setDepartment(v);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Lọc theo phòng ban"
                className="department-select"
              >
                <SlidersHorizontal size={14} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả phòng ban</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSort((s) => !s)}
            >
              <ArrowDownUp size={14} />
              {sort ? "Tên A → Z" : "Mới nhất"}
            </Button>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table employee-table">
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input
                    type="checkbox"
                    aria-label="Chọn trang hiện tại"
                    checked={allChecked}
                    onChange={() =>
                      setSelected((prev) =>
                        allChecked
                          ? prev.filter(
                              (id) => !visible.some((e) => e.id === id),
                            )
                          : [
                              ...new Set([
                                ...prev,
                                ...visible.map((e) => e.id),
                              ]),
                            ],
                      )
                    }
                  />
                </th>
                <th>Nhân viên</th>
                {contract ? (
                  <>
                    <th>Lương cơ bản</th>
                    <th>Lương BHXH</th>
                    <th>Phụ cấp</th>
                    <th>Phụ thuộc</th>
                  </>
                ) : (
                  <>
                    <th>Phòng ban</th>
                    <th>Chức danh</th>
                    <th>Ngày gia nhập</th>
                    <th>Trạng thái</th>
                  </>
                )}
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((e, i) => (
                <tr
                  key={e.id}
                  className={selected.includes(e.id) ? "row-selected" : ""}
                >
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${e.full_name}`}
                      checked={selected.includes(e.id)}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(e.id)
                            ? prev.filter((id) => id !== e.id)
                            : [...prev, e.id],
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="person-cell person-button"
                      onClick={() => onEdit(e)}
                    >
                      <Avatar name={e.full_name} index={i} />
                      <div>
                        <strong>{e.full_name}</strong>
                        <small>{contract ? e.employee_code : e.email}</small>
                      </div>
                    </button>
                  </td>
                  {contract ? (
                    <>
                      <td className="money-cell">{money(e.base_salary)}</td>
                      <td>{money(e.insurance_salary)}</td>
                      <td>{money(e.allowance)}</td>
                      <td>{e.dependents_count} người</td>
                    </>
                  ) : (
                    <>
                      <td>
                        <span className="department-tag">{e.department}</span>
                      </td>
                      <td>{e.position}</td>
                      <td>{dateLabel(e.joined_at)}</td>
                      <td>
                        <Status status={e.status} />
                      </td>
                    </>
                  )}
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Thao tác ${e.full_name}`}
                        >
                          <MoreHorizontal size={17} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(e)}>
                          <Pencil size={14} />
                          {contract ? "Sửa hợp đồng" : "Chỉnh sửa hồ sơ"}
                        </DropdownMenuItem>
                        {!contract && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onRemove(e)}
                          >
                            <UserRoundX size={14} />
                            Xóa nhân viên mẫu
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <EmptyState
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setDepartment("all");
                  setStatus("all");
                }}
              >
                Xóa bộ lọc
                <ArrowUpRight size={14} />
              </Button>
            }
          />
        )}
        <div className="pagination">
          <span>
            Hiển thị{" "}
            <strong>
              {filtered.length ? (current - 1) * 8 + 1 : 0}–
              {Math.min(current * 8, filtered.length)}
            </strong>{" "}
            trên <strong>{filtered.length}</strong>{" "}
            {contract ? "hợp đồng" : "nhân viên"}
          </span>
          <div>
            <Button
              variant="outline"
              size="icon"
              disabled={current === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Trang trước"
            >
              <ChevronLeft size={15} />
            </Button>
            {Array.from({ length: pages }, (_, i) => (
              <Button
                key={i}
                variant={current === i + 1 ? "default" : "ghost"}
                size="icon"
                onClick={() => setPage(i + 1)}
                aria-label={`Trang ${i + 1}`}
                aria-current={current === i + 1 ? "page" : undefined}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              disabled={current === pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              aria-label="Trang sau"
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      </section>
      <div className="page-footnote">
        Dữ liệu mẫu được lưu tại trình duyệt ·{" "}
        {contract
          ? "Các trường hợp đồng khớp với bảng contracts trong database qlns."
          : "Chọn nhân viên để xuất danh sách theo nhu cầu."}
      </div>
    </>
  );
}
