import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { Eye, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EmployeeStatusBadge,
  EmptyState,
  ErrorState,
  InfoItem,
  LoadingBlock,
  PageHeader,
  PersonAvatar,
} from "@/components/app/shared";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { EMPLOYEE_STATUSES, ROLES } from "@/lib/constants";
import { formatDate, formatMoney, tenureLabel } from "@/lib/format";
import { EmployeeFormDialog } from "./employee-form-dialog";

const ALL = "__all__";

function EmployeeSheet({ employee, onOpenChange, onEdit }) {
  return (
    <Sheet open={Boolean(employee)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-hairline bg-canvas sm:max-w-md">
        {employee && (
          <>
            <SheetHeader className="gap-4 border-b border-hairline-soft p-6">
              <PersonAvatar name={employee.full_name} seed={employee.employee_code} size="lg" />
              <div className="space-y-1">
                <SheetTitle>{employee.full_name}</SheetTitle>
                <SheetDescription>{employee.position} · {employee.department}</SheetDescription>
              </div>
              <EmployeeStatusBadge status={employee.status} />
            </SheetHeader>
            <dl className="grid grid-cols-2 gap-5 p-6">
              <InfoItem label="Mã nhân viên" mono>{employee.employee_code}</InfoItem>
              <InfoItem label="Vai trò">{ROLES[employee.role] ?? employee.role}</InfoItem>
              <div className="col-span-2"><InfoItem label="Email">{employee.email}</InfoItem></div>
              <InfoItem label="Ngày vào làm">{formatDate(employee.joined_at)}</InfoItem>
              <InfoItem label="Thâm niên">{tenureLabel(employee.joined_at)}</InfoItem>
            </dl>
            <div className="mx-6 rounded-lg bg-surface-card p-5">
              <p className="caption-upper text-muted-foreground">Hợp đồng hiện hành</p>
              {employee.contract_id ? (
                <dl className="mt-4 grid grid-cols-2 gap-5">
                  <InfoItem label="Lương cơ bản"><span className="tabular">{formatMoney(employee.base_salary)}</span></InfoItem>
                  <InfoItem label="Lương đóng BHXH"><span className="tabular">{formatMoney(employee.insurance_salary)}</span></InfoItem>
                  <InfoItem label="Phụ cấp"><span className="tabular">{formatMoney(employee.allowance)}</span></InfoItem>
                  <InfoItem label="Người phụ thuộc">{employee.dependents_count}</InfoItem>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Chưa có hợp đồng.</p>
              )}
            </div>
            <div className="p-6">
              <Button variant="outline" className="w-full" onClick={() => onEdit(employee)}>
                <Pencil /> Sửa hồ sơ
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: employees = [], isPending, error, refetch } = useQuery({ queryKey: ["employees"], queryFn: api.employees });

  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // /admin/nhan-vien?moi=1 → mở sẵn form thêm mới (từ nút ở trang Tổng quan)
  useEffect(() => {
    if (searchParams.get("moi") === "1") {
      setEditing(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const departments = useMemo(() => [...new Set(employees.map((e) => e.department))].sort(), [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (department !== ALL && e.department !== department) return false;
      if (status !== ALL && e.status !== status) return false;
      if (!q) return true;
      return [e.full_name, e.employee_code, e.email, e.position].some((v) => String(v).toLowerCase().includes(q));
    });
  }, [employees, query, department, status]);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteEmployee(id),
    onSuccess: () => {
      toast.success(`Đã xoá ${deleting?.full_name}`);
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e) => { setViewing(null); setEditing(e); setFormOpen(true); };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Nhân sự"
        title="Danh sách nhân viên"
        description="Toàn bộ hồ sơ trong bảng users, kèm hợp đồng mới nhất của từng người."
        actions={<Button onClick={openCreate}><Plus /> Thêm nhân viên</Button>}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-soft" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, mã nhân viên, email, chức danh…"
            className="pl-10"
            aria-label="Tìm nhân viên"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-full md:w-44" aria-label="Lọc phòng ban"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi phòng ban</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full md:w-44" aria-label="Lọc trạng thái"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi trạng thái</SelectItem>
              {EMPLOYEE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending ? (
        <LoadingBlock rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={employees.length ? "Không có nhân viên phù hợp" : "Chưa có nhân viên"}
          description={employees.length ? "Thử đổi từ khoá hoặc bộ lọc." : "Bấm “Thêm nhân viên” để tạo hồ sơ đầu tiên."}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-hairline">
          <Table>
            <TableHeader className="bg-surface-soft">
              <TableRow className="hover:bg-transparent">
                <TableHead>Nhân viên</TableHead>
                <TableHead className="hidden md:table-cell">Phòng ban</TableHead>
                <TableHead className="hidden lg:table-cell">Ngày vào</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Lương cơ bản</TableHead>
                <TableHead className="w-12"><span className="sr-only">Thao tác</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <button className="flex items-center gap-3 text-left" onClick={() => setViewing(e)}>
                      <PersonAvatar name={e.full_name} seed={e.employee_code} size="sm" />
                      <span className="grid">
                        <span className="font-medium text-ink">{e.full_name}</span>
                        <span className="text-[13px] text-muted-foreground">
                          <span className="font-mono text-[12px]">{e.employee_code}</span> · {e.position}
                        </span>
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{e.department}</TableCell>
                  <TableCell className="tabular hidden lg:table-cell">{formatDate(e.joined_at)}</TableCell>
                  <TableCell><EmployeeStatusBadge status={e.status} /></TableCell>
                  <TableCell className="tabular hidden text-right text-ink sm:table-cell">
                    {e.contract_id ? formatMoney(e.base_salary) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${e.full_name}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => setViewing(e)}><Eye /> Xem chi tiết</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openEdit(e)}><Pencil /> Sửa</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={e.id === user?.id}
                          onSelect={() => setDeleting(e)}
                        >
                          <Trash2 /> Xoá
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="border-t border-hairline-soft bg-surface-soft px-4 py-2.5 text-[13px] text-muted-foreground">
            Hiển thị {filtered.length} / {employees.length} nhân viên
          </p>
        </div>
      )}

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editing} employees={employees} />
      <EmployeeSheet employee={viewing} onOpenChange={(o) => !o && setViewing(null)} onEdit={openEdit} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="border-hairline bg-canvas">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá {deleting?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Hồ sơ, hợp đồng và toàn bộ dòng lương của nhân viên này sẽ bị xoá vĩnh viễn (ON DELETE CASCADE). Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(ev) => { ev.preventDefault(); deleteMutation.mutate(deleting.id); }}
            >
              Xoá vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
