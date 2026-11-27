import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, MailCheck, Send } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { ErrorState, FormError, LoadingState } from "@/components/app/kit";
import { Reveal } from "@/components/app/motion";
import { PublicShell } from "@/components/app/public-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMeta } from "@/hooks/use-meta";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const EMPTY = {
  full_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  gender: "",
  national_id: "",
  address: "",
  branch_id: "",
  department: "",
  position: "",
  education: "",
  experience_years: "0",
  expected_salary: "",
  available_from: "",
  introduction: "",
  agree_terms: false,
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function Field({ id, label, error, required = true, className, children }) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[12.5px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Choice({ id, value, onChange, options, placeholder, invalid }) {
  return (
    <Select value={value ? String(value) : undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={String(o.value)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ApplyPage() {
  const meta = useMeta();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };
  const input = (key) => ({
    id: key,
    value: form[key],
    onChange: (e) => set(key)(e.target.value),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  const submit = useMutation({
    mutationFn: () =>
      api.applyJob({
        ...form,
        branch_id: Number(form.branch_id) || 0,
        experience_years: Number(form.experience_years) || 0,
        expected_salary: Number(String(form.expected_salary).replace(/\D/g, "")) || 0,
      }),
    onSuccess: (data, _vars) => setDone({ ...data, email: form.email }),
    onError: (err) => setErrors(err.details?.errors ?? {}),
  });

  const branch = meta.branches.find((b) => String(b.id) === String(form.branch_id));
  const minimum = branch && meta.payroll?.regional_minimum_wage?.[branch.region];

  const onSubmit = (e) => {
    e.preventDefault();
    const local = {};
    if (!form.agree_terms) local.agree_terms = "Bạn cần đồng ý điều khoản tuyển dụng và xử lý dữ liệu cá nhân";
    if (!form.branch_id) local.branch_id = "Vui lòng chọn chi nhánh";
    if (Object.keys(local).length) return setErrors(local);
    submit.mutate();
  };

  if (meta.error) {
    return (
      <PublicShell>
        <ErrorState error={meta.error} onRetry={meta.refetch} />
      </PublicShell>
    );
  }

  if (done) {
    return (
      <PublicShell company={meta.company}>
        <Reveal offset={14}>
          <Card className="mx-auto mt-10 max-w-lg items-center gap-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-success/12 text-success">
              <MailCheck className="size-6" />
            </span>
            <CardHeader className="justify-items-center">
              <CardTitle className="text-[20px]">Đã nhận hồ sơ #{done.id}</CardTitle>
              <CardDescription className="text-[14.5px]">
                Bộ phận nhân sự sẽ xem xét và phản hồi qua <strong className="text-foreground">{done.email}</strong>. Nếu hồ sơ được duyệt, bạn sẽ nhận
                email chứa link để tải mẫu hợp đồng lao động, điền thông tin và nộp lại.
              </CardDescription>
            </CardHeader>
            <Button
              variant="outline"
              onClick={() => {
                setDone(null);
                setForm(EMPTY);
              }}
            >
              Nộp hồ sơ khác
            </Button>
          </Card>
        </Reveal>
      </PublicShell>
    );
  }

  const fieldError = (k) => errors[k];
  const generalError = submit.error && !submit.error.details?.errors ? submit.error.message : "";

  return (
    <PublicShell company={meta.company}>
      <Reveal offset={10}>
        <div className="mt-6 mb-8 space-y-2">
          <p className="text-[13px] font-medium text-primary">Tuyển dụng · {meta.company?.name ?? meta.appName}</p>
          <h1 className="page-title">Ứng tuyển vào {meta.appName}</h1>
          <p className="max-w-2xl text-[15px] text-muted-foreground">
            Điền đầy đủ thông tin bên dưới. Sau khi nhân sự duyệt, bạn nhận email kèm link hợp đồng lao động để tải về, điền và nộp lại kèm bản
            scan có chữ ký. Tài khoản nhân viên được tạo sau khi hợp đồng được đối chiếu.
          </p>
        </div>
      </Reveal>

      {meta.isPending ? (
        <LoadingState rows={3} label="Đang tải danh mục" />
      ) : (
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <Reveal delay={60}>
            <Card className="gap-5">
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>Khớp với CCCD — dùng để lập hợp đồng lao động.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="full_name" label="Họ và tên" error={fieldError("full_name")} className="sm:col-span-2">
                  <Input {...input("full_name")} autoComplete="name" maxLength={100} placeholder="Nguyễn Văn An" />
                </Field>
                <Field id="email" label="Email" error={fieldError("email")}>
                  <Input {...input("email")} type="email" autoComplete="email" placeholder="ban@example.com" />
                </Field>
                <Field id="phone" label="Số điện thoại" error={fieldError("phone")}>
                  <Input {...input("phone")} type="tel" autoComplete="tel" inputMode="tel" placeholder="09xxxxxxxx" />
                </Field>
                <Field id="date_of_birth" label="Ngày sinh" error={fieldError("date_of_birth")}>
                  <Input {...input("date_of_birth")} type="date" max={todayIso()} />
                </Field>
                <Field id="gender" label="Giới tính" error={fieldError("gender")}>
                  <Choice
                    id="gender"
                    value={form.gender}
                    onChange={set("gender")}
                    placeholder="Chọn giới tính"
                    invalid={Boolean(fieldError("gender"))}
                    options={meta.genders.map((g) => ({ value: g, label: g }))}
                  />
                </Field>
                <Field id="national_id" label="Số CCCD" error={fieldError("national_id")}>
                  <Input {...input("national_id")} inputMode="numeric" maxLength={12} placeholder="12 chữ số" />
                </Field>
                <Field id="education" label="Trình độ" error={fieldError("education")}>
                  <Choice
                    id="education"
                    value={form.education}
                    onChange={set("education")}
                    placeholder="Chọn trình độ"
                    invalid={Boolean(fieldError("education"))}
                    options={meta.educationLevels.map((g) => ({ value: g, label: g }))}
                  />
                </Field>
                <Field id="address" label="Địa chỉ thường trú" error={fieldError("address")} className="sm:col-span-2">
                  <Input {...input("address")} autoComplete="street-address" maxLength={255} />
                </Field>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={100}>
            <Card className="gap-5">
              <CardHeader>
                <CardTitle>Vị trí ứng tuyển</CardTitle>
                <CardDescription>Chi nhánh quyết định vùng lương tối thiểu áp dụng cho hợp đồng.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="branch_id" label="Chi nhánh" error={fieldError("branch_id")} className="sm:col-span-2">
                  <Choice
                    id="branch_id"
                    value={form.branch_id}
                    onChange={set("branch_id")}
                    placeholder="Chọn chi nhánh làm việc"
                    invalid={Boolean(fieldError("branch_id"))}
                    options={meta.branches.map((b) => ({ value: b.id, label: `${b.name} — ${b.address}, ${b.city} (vùng ${b.region})` }))}
                  />
                </Field>
                <Field id="department" label="Phòng ban" error={fieldError("department")}>
                  <Choice
                    id="department"
                    value={form.department}
                    onChange={set("department")}
                    placeholder="Chọn phòng ban"
                    invalid={Boolean(fieldError("department"))}
                    options={meta.departments.map((d) => ({ value: d, label: d }))}
                  />
                </Field>
                <Field id="position" label="Vị trí" error={fieldError("position")}>
                  <Input {...input("position")} maxLength={100} placeholder="VD: Nhân viên kinh doanh" />
                </Field>
                <Field id="experience_years" label="Số năm kinh nghiệm" error={fieldError("experience_years")}>
                  <Input {...input("experience_years")} type="number" min={0} max={50} step={0.5} />
                </Field>
                <Field id="expected_salary" label="Mức lương mong muốn (VNĐ/tháng)" error={fieldError("expected_salary")}>
                  <Input {...input("expected_salary")} inputMode="numeric" placeholder="VD: 15000000" />
                  {!fieldError("expected_salary") && (
                    <p className="text-[12px] text-muted-foreground">
                      {form.expected_salary ? formatMoney(String(form.expected_salary).replace(/\D/g, "")) : ""}
                      {minimum ? `${form.expected_salary ? " · " : ""}Tối thiểu vùng ${branch.region}: ${formatMoney(minimum)}` : ""}
                    </p>
                  )}
                </Field>
                <Field id="available_from" label="Ngày có thể đi làm" error={fieldError("available_from")}>
                  <Input {...input("available_from")} type="date" min={todayIso()} />
                </Field>
                <Field id="introduction" label="Giới thiệu bản thân" required={false} error={fieldError("introduction")} className="sm:col-span-2">
                  <Textarea {...input("introduction")} maxLength={2000} rows={4} placeholder="Kinh nghiệm, kỹ năng nổi bật, lý do ứng tuyển…" />
                </Field>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={140}>
            <Card className="gap-4">
              <CardContent className="grid gap-4">
                <div className="max-h-44 overflow-y-auto rounded-xl bg-muted/50 p-4 text-[13px] leading-relaxed text-muted-foreground">
                  <p className="mb-2 font-semibold text-foreground">Điều khoản tuyển dụng &amp; xử lý dữ liệu cá nhân</p>
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Thông tin bạn cung cấp là trung thực; thông tin sai lệch có thể khiến hồ sơ hoặc hợp đồng bị huỷ.</li>
                    <li>
                      {meta.company?.name ?? "Công ty"} xử lý dữ liệu cá nhân (họ tên, CCCD, liên hệ…) chỉ cho mục đích tuyển dụng và lập hợp đồng lao động,
                      theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
                    </li>
                    <li>Hồ sơ không trúng tuyển được lưu tối đa 12 tháng rồi xoá; bạn có quyền yêu cầu xem, sửa hoặc xoá dữ liệu bất cứ lúc nào.</li>
                    <li>Ứng viên phải đủ 18 tuổi. Hợp đồng lao động lập theo Bộ luật Lao động 2019.</li>
                    <li>Link hợp đồng gửi qua email chỉ dùng cho bạn và có thời hạn.</li>
                  </ol>
                </div>
                <label htmlFor="agree_terms" className="flex cursor-pointer items-start gap-3 text-[14px]">
                  <input
                    id="agree_terms"
                    type="checkbox"
                    checked={form.agree_terms}
                    onChange={(e) => set("agree_terms")(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
                    aria-invalid={errors.agree_terms ? true : undefined}
                  />
                  <span>
                    Tôi đã đọc và đồng ý với điều khoản tuyển dụng và xử lý dữ liệu cá nhân. <span className="text-destructive">*</span>
                  </span>
                </label>
                {errors.agree_terms && <p className="text-[12.5px] text-destructive">{errors.agree_terms}</p>}
                <FormError message={generalError} />
                {Object.values(errors).filter(Boolean).length > 1 && (
                  <p className="text-[13px] text-destructive">Còn {Object.values(errors).filter(Boolean).length} trường cần sửa — xem các ô được đánh dấu đỏ.</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <CheckCircle2 className="size-3.5" /> Các trường có dấu <span className="text-destructive">*</span> là bắt buộc
                  </p>
                  <Button type="submit" disabled={submit.isPending}>
                    {submit.isPending ? <Loader2 className="animate-spin" /> : <Send />} Gửi hồ sơ
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </form>
      )}
    </PublicShell>
  );
}
