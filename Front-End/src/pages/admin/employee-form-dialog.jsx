import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FilePen, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormError } from "@/components/app/kit";
import { api } from "@/lib/api";
import { DEPARTMENT_SUGGESTIONS, EMPLOYEE_STATUSES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  employee_code: "",
  full_name: "",
  email: "",
  department: "",
  position: "",
  status: "Đang làm việc",
  joined_at: today(),
  base_salary: "",
  insurance_salary: "",
  allowance: "",
  dependents_count: 0,
  password: "",
  salary_change_reason: "",
};

const SALARY_KEYS = ["base_salary", "insurance_salary", "allowance", "dependents_count"];
const salaryChanged = (a, b) => SALARY_KEYS.some((k) => Number(a[k] || 0) !== Number(b[k] || 0));

function suggestCode(employees = []) {
  const max = employees.reduce((m, e) => {
    const n = Number(String(e.employee_code).replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `NV${String(max + 1).padStart(3, "0")}`;
}

function Field({ label, htmlFor, hint, children, className }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Kiểm tra phía client — cùng quy tắc với EmployeeController::validate() */
function validate(f, isEdit, amending, original) {
  for (const [key, label, max] of [
    ["employee_code", "Mã nhân viên", 20],
    ["full_name", "Họ và tên", 100],
    ["email", "Email", 100],
    ["department", "Phòng ban", 100],
    ["position", "Chức danh", 100],
  ]) {
    const v = String(f[key] ?? "").trim();
    if (!v) return `${label} không được để trống`;
    if (v.length > max) return `${label} tối đa ${max} ký tự`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return "Email không hợp lệ";
  for (const [key, label] of [["base_salary", "Lương cơ bản"], ["insurance_salary", "Lương đóng BHXH"], ["allowance", "Phụ cấp"]]) {
    const n = Number(f[key] || 0);
    if (!Number.isFinite(n) || n < 0) return `${label} phải là số không âm`;
  }
  const d = Number(f.dependents_count);
  if (!Number.isInteger(d) || d < 0 || d > 99) return "Người phụ thuộc phải là số nguyên 0–99";
  if (!isEdit && f.password && f.password.length < 6) return "Mật khẩu tối thiểu 6 ký tự";
  if (amending) {
    if (!salaryChanged(f, original)) return "Điều khoản lương chưa thay đổi so với hợp đồng hiện hành";
    const r = f.salary_change_reason.trim().length;
    if (r < 5 || r > 500) return "Lý do điều chỉnh lương phải từ 5–500 ký tự (lưu thành phụ lục hợp đồng)";
  }
  return null;
}

function EmployeeForm({ employee, employees, onDone }) {
  const isEdit = Boolean(employee);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() =>
    isEdit
      ? { ...EMPTY, ...employee, password: "", salary_change_reason: "" }
      : { ...EMPTY, employee_code: suggestCode(employees), joined_at: today() },
  );
  const [error, setError] = useState("");
  // Hợp đồng đã ký là cố định: chỉ đổi lương qua "phụ lục" có lý do.
  const hasContract = isEdit && employee.contract_id != null;
  const [amending, setAmending] = useState(false);
  const salaryLocked = hasContract && !amending;
  const toggleAmend = () => {
    if (amending) setForm((f) => ({ ...f, ...Object.fromEntries(SALARY_KEYS.map((k) => [k, employee[k]])), salary_change_reason: "" }));
    setAmending((a) => !a);
    setError("");
  };
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? api.updateEmployee(employee.id, payload) : api.createEmployee(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success(amending ? "Đã lưu phụ lục điều chỉnh lương" : isEdit ? "Đã cập nhật hồ sơ nhân viên" : "Đã thêm nhân viên mới");
      onDone();
    },
    onError: (err) => setError(err.message),
  });

  const submit = (e) => {
    e.preventDefault();
    const msg = validate(form, isEdit, amending, employee);
    if (msg) return setError(msg);
    setError("");
    mutation.mutate(amending ? form : { ...form, salary_change_reason: "" });
  };

  const departments = [...new Set([...employees.map((e) => e.department), ...DEPARTMENT_SUGGESTIONS])].filter(Boolean);
  const money = (key) => (form[key] ? formatMoney(form[key]) : null);

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <p className="text-eyebrow sm:col-span-2">Hồ sơ</p>
        <Field label="Mã nhân viên" htmlFor="employee_code">
          <Input id="employee_code" value={form.employee_code} onChange={set("employee_code")} className="font-mono" maxLength={20} />
        </Field>
        <Field label="Họ và tên" htmlFor="full_name">
          <Input id="full_name" value={form.full_name} onChange={set("full_name")} maxLength={100} />
        </Field>
        <Field label="Email" htmlFor="email" className="sm:col-span-2">
          <Input id="email" type="email" value={form.email} onChange={set("email")} maxLength={100} placeholder="ten@company.vn" />
        </Field>
        <Field label="Phòng ban" htmlFor="department">
          <Input id="department" list="department-options" value={form.department} onChange={set("department")} maxLength={100} />
          <datalist id="department-options">
            {departments.map((d) => <option key={d} value={d} />)}
          </datalist>
        </Field>
        <Field label="Chức danh" htmlFor="position">
          <Input id="position" value={form.position} onChange={set("position")} maxLength={100} />
        </Field>
        <Field label="Trạng thái" htmlFor="status">
          <Select value={form.status} onValueChange={set("status")}>
            <SelectTrigger id="status" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EMPLOYEE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Ngày vào làm" htmlFor="joined_at">
          <Input id="joined_at" type="date" value={form.joined_at ?? ""} onChange={set("joined_at")} />
        </Field>
        {!isEdit && (
          <Field label="Mật khẩu ban đầu" htmlFor="password" hint="Bỏ trống để dùng mật khẩu mặc định 123456." className="sm:col-span-2">
            <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} />
          </Field>
        )}
      </section>

      <section className="grid gap-4 rounded-2xl bg-muted p-5 sm:grid-cols-2">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
          <p className="text-eyebrow">{hasContract ? "Điều khoản hợp đồng" : "Hợp đồng"}</p>
          {hasContract && (
            <Button type="button" size="sm" variant={amending ? "secondary" : "outline"} onClick={toggleAmend}>
              {amending ? "Huỷ điều chỉnh" : <><FilePen /> Điều chỉnh lương (phụ lục)</>}
            </Button>
          )}
        </div>
        {salaryLocked && (
          <p className="flex items-start gap-2 text-[12.5px] text-muted-foreground sm:col-span-2">
            <Lock className="mt-0.5 size-3.5 shrink-0" /> Hợp đồng đã ký là văn bản cố định. Muốn đổi lương, bấm “Điều chỉnh lương” và ghi lý do — hệ thống lưu thành phụ lục mới.
          </p>
        )}
        <Field label="Lương cơ bản (₫)" htmlFor="base_salary" hint={money("base_salary")}>
          <Input id="base_salary" disabled={salaryLocked} type="number" min="0" step="100000" inputMode="numeric" value={form.base_salary} onChange={set("base_salary")} className="tabular" />
        </Field>
        <Field label="Lương đóng BHXH (₫)" htmlFor="insurance_salary" hint={money("insurance_salary")}>
          <Input id="insurance_salary" disabled={salaryLocked} type="number" min="0" step="100000" inputMode="numeric" value={form.insurance_salary} onChange={set("insurance_salary")} className="tabular" />
        </Field>
        <Field label="Phụ cấp cố định (₫)" htmlFor="allowance" hint={money("allowance")}>
          <Input id="allowance" disabled={salaryLocked} type="number" min="0" step="100000" inputMode="numeric" value={form.allowance} onChange={set("allowance")} className="tabular" />
        </Field>
        <Field label="Số người phụ thuộc" htmlFor="dependents_count">
          <Input id="dependents_count" disabled={salaryLocked} type="number" min="0" max="99" step="1" value={form.dependents_count} onChange={set("dependents_count")} className="tabular" />
        </Field>
        {amending && (
          <Field label="Lý do điều chỉnh" htmlFor="salary_change_reason" hint="Bắt buộc 5–500 ký tự — ghi vào phụ lục hợp đồng." className="sm:col-span-2">
            <Textarea
              id="salary_change_reason"
              maxLength={500}
              value={form.salary_change_reason}
              onChange={set("salary_change_reason")}
              placeholder="VD: Tăng lương định kỳ sau đánh giá năm 2026"
            />
          </Field>
        )}
      </section>

      <FormError message={error} />

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone}>Huỷ</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {isEdit ? "Lưu thay đổi" : "Thêm nhân viên"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EmployeeFormDialog({ open, onOpenChange, employee, employees = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee ? "Sửa hồ sơ nhân viên" : "Thêm nhân viên"}</DialogTitle>
          <DialogDescription>
            {employee
              ? `Cập nhật ${employee.full_name} — thay đổi được ghi thẳng vào cơ sở dữ liệu.`
              : "Tạo tài khoản vai trò nhân viên kèm hợp đồng đầu tiên."}
          </DialogDescription>
        </DialogHeader>
        {open && <EmployeeForm employee={employee} employees={employees} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
