import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, CircleDollarSign, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { departments } from "@/data/workspace";
export function EmployeeEditor({ employee, employees, mode, onClose, onSave }) {
  const [value, setValue] = useState(
    () =>
      employee ?? {
        id: Math.max(0, ...employees.map((e) => e.id)) + 1,
        employee_code: `NV${String(Math.max(0, ...employees.map((e) => e.id)) + 1).padStart(3, "0")}`,
        full_name: "",
        email: "",
        department: "Kỹ thuật",
        position: "",
        status: "Thử việc",
        joined_at: "2026-11-13",
        base_salary: 15000000,
        insurance_salary: 12000000,
        dependents_count: 0,
        allowance: 1500000,
      },
  );
  function update(key, next) {
    setValue((v) => ({ ...v, [key]: next }));
  }
  function submit(event) {
    event.preventDefault();
    if (
      !value.full_name.trim() ||
      !value.position.trim() ||
      !value.employee_code.trim()
    ) {
      toast.error("Vui lòng điền đầy đủ thông tin nhân viên.");
      return;
    }
    if (
      employees.some(
        (e) =>
          e.id !== value.id &&
          (e.email.toLowerCase() === value.email.trim().toLowerCase() ||
            e.employee_code.toLowerCase() ===
              value.employee_code.trim().toLowerCase()),
      )
    ) {
      toast.error("Email hoặc mã nhân viên đã tồn tại.");
      return;
    }
    onSave({
      ...value,
      full_name: value.full_name.trim(),
      email: value.email.trim(),
      position: value.position.trim(),
      employee_code: value.employee_code.trim(),
    });
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="editor-dialog">
        <DialogHeader>
          <span className="dialog-icon">
            {mode === "contract" ? (
              <CircleDollarSign size={22} />
            ) : (
              <UserRound size={22} />
            )}
          </span>
          <DialogTitle>
            {mode === "contract"
              ? "Thông tin hợp đồng"
              : employee
                ? "Hồ sơ nhân viên"
                : "Chào đón thành viên mới"}
          </DialogTitle>
          <DialogDescription>
            {mode === "contract"
              ? `Điều chỉnh thông số hợp đồng của ${value.full_name}.`
              : "Những thông tin cần thiết để kết nối với đội ngũ."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="editor-form">
          {mode === "employee" && (
            <>
              <div className="form-grid">
                <label>
                  Họ và tên
                  <Input
                    autoFocus
                    required
                    maxLength={100}
                    value={value.full_name}
                    onChange={(e) => update("full_name", e.target.value)}
                    placeholder="Nguyễn Minh Anh"
                  />
                </label>
                <label>
                  Mã nhân viên
                  <Input
                    required
                    maxLength={20}
                    value={value.employee_code}
                    onChange={(e) => update("employee_code", e.target.value)}
                  />
                </label>
              </div>
              <label>
                Email công việc
                <Input
                  required
                  type="email"
                  maxLength={100}
                  value={value.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="minhanh@acme.vn"
                />
              </label>
              <div className="form-grid">
                <label>
                  Phòng ban
                  <Select
                    value={value.department}
                    onValueChange={(v) => update("department", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label>
                  Chức danh
                  <Input
                    required
                    maxLength={100}
                    value={value.position}
                    onChange={(e) => update("position", e.target.value)}
                    placeholder="Product Designer"
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Ngày gia nhập
                  <Input
                    type="date"
                    required
                    min="1900-01-01"
                    max="2100-12-31"
                    value={value.joined_at}
                    onChange={(e) => update("joined_at", e.target.value)}
                  />
                </label>
                <label>
                  Trạng thái
                  <Select
                    value={value.status}
                    onValueChange={(v) => update("status", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Đang làm việc", "Thử việc", "Nghỉ phép"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </>
          )}
          <div className="form-section-title">
            <BadgeCheck size={15} />
            Thông số hợp đồng
          </div>
          <div className="form-grid">
            <label>
              Lương cơ bản (VNĐ)
              <Input
                type="number"
                required
                min={0}
                max={9999999999}
                step={1000}
                value={value.base_salary}
                onChange={(e) => update("base_salary", Number(e.target.value))}
              />
            </label>
            <label>
              Lương đóng bảo hiểm (VNĐ)
              <Input
                type="number"
                required
                min={0}
                max={9999999999}
                step={1000}
                value={value.insurance_salary}
                onChange={(e) =>
                  update("insurance_salary", Number(e.target.value))
                }
              />
            </label>
            <label>
              Phụ cấp hàng tháng (VNĐ)
              <Input
                type="number"
                required
                min={0}
                max={9999999999}
                step={1000}
                value={value.allowance}
                onChange={(e) => update("allowance", Number(e.target.value))}
              />
            </label>
            <label>
              Số người phụ thuộc
              <Input
                type="number"
                required
                min={0}
                max={99}
                step={1}
                value={value.dependents_count}
                onChange={(e) =>
                  update("dependents_count", Number(e.target.value))
                }
              />
            </label>
          </div>
          <div className="form-note">
            Chế độ mẫu · Thay đổi được lưu trên trình duyệt này.
          </div>
          <div className="dialog-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit">
              {employee ? "Lưu thay đổi" : "Thêm nhân viên"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
