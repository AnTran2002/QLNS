import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Eye, MoreHorizontal, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
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
} from "@/components/animate-ui/components/radix/alert-dialog";
import { Button } from "@/components/animate-ui/components/buttons/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/animate-ui/components/radix/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EmployeeStatusBadge,
  EmptyState,
  ErrorState,
  InfoItem,
  LoadingState,
  PageHeader,
  PersonAvatar,
  SearchField,
  Segmented,
} from "@/components/app/kit";
import { Reveal, RevealGroup, SPRING } from "@/components/app/motion";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { EMPLOYEE_STATUSES, ROLES } from "@/lib/constants";
import { formatDate, formatMoney, tenureLabel } from "@/lib/format";
import { EmployeeFormDialog } from "./employee-form-dialog";

const ALL = "__all__";

function EmployeeSheet({ employee, onOpenChange, onEdit }) {
  return (
    <Sheet open={Boolean(employee)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-[420px]">
        {employee && (
          <>
            <SheetHeader className="items-center gap-3 px-6 pt-10 pb-6 text-center">
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...SPRING, delay: 0.1 }}>
                <PersonAvatar name={employee.full_name} seed={employee.employee_code} src={employee.avatar} size="xl" />
              </motion.div>
              <div className="space-y-1">
                <SheetTitle>{employee.full_name}</SheetTitle>
                <SheetDescription className="text-[15px]">{employee.position} · {employee.department}</SheetDescription>
              </div>
              <EmployeeStatusBadge status={employee.status} />
            </SheetHeader>
            <div className="space-y-4 px-6 pb-6">
              <RevealGroup step={60} delay={120}>
                <dl className="grid grid-cols-2 gap-5 rounded-2xl bg-muted p-5">
                  <InfoItem label="Mã nhân viên" mono>{employee.employee_code}</InfoItem>
                  <InfoItem label="Vai trò">{ROLES[employee.role] ?? employee.role}</InfoItem>
                  <InfoItem label="Email" className="col-span-2 break-all">{employee.email}</InfoItem>
                  <InfoItem label="Ngày vào làm">{formatDate(employee.joined_at)}</InfoItem>
                  <InfoItem label="Thâm niên">{tenureLabel(employee.joined_at)}</InfoItem>
                </dl>
                <div className="rounded-2xl bg-muted p-5">
                  <p className="text-eyebrow">Hợp đồng hiện hành</p>
                  {employee.contract_id ? (
                    <dl className="mt-4 grid grid-cols-2 gap-5">
                      <InfoItem label="Lương cơ bản"><span className="tabular">{formatMoney(employee.base_salary)}</span></InfoItem>
                      <InfoItem label="Lương đóng BHXH"><span className="tabular">{formatMoney(employee.insurance_salary)}</span></InfoItem>
                      <InfoItem label="Phụ cấp"><span className="tabular">{formatMoney(employee.allowance)}</span></InfoItem>
                      <InfoItem label="Người phụ thuộc">{employee.dependents_count}</InfoItem>
                    </dl>
                  ) : (
                    <p className="mt-3 text-[14px] text-muted-foreground">Chưa có hợp đồng.</p>
                  )}
                </div>
                <Button variant="secondary" className="w-full" onClick={() => onEdit(employee)}>
                  <Pencil /> Sửa hồ sơ
                </Button>
              </RevealGroup>
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

  // ?moi=1 → mở form thêm mới · ?xem=<id> → mở hồ sơ (từ Tổng quan / tìm nhanh)
  useEffect(() => {
    if (searchParams.get("moi") === "1") {
      setEditing(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
      return;
    }
    const viewId = searchParams.get("xem");
    if (viewId && employees.length) {
      const found = employees.find((e) => String(e.id) === viewId);
      if (found) setViewing(found);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, employees]);

  const departments = useMemo(() => [...new Set(employees.map((e) => e.department))].sort((a, b) => a.localeCompare(b, "vi")), [employees]);

  const counts = useMemo(
    () => Object.fromEntries(EMPLOYEE_STATUSES.map((s) => [s, employees.filter((e) => e.status === s).length])),
    [employees],
  );

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

  const statusOptions = [
    { value: ALL, label: "Tất cả", count: employees.length },
    ...EMPLOYEE_STATUSES.map((s) => ({ value: s, label: s, count: counts[s] })),
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Nhân sự"
        title="Nhân viên"
        description="Toàn bộ hồ sơ trong bảng users, kèm hợp đồng mới nhất của từng người."
        actions={<Button onClick={openCreate}><Plus /> Thêm nhân viên</Button>}
      />

      <Reveal delay={120}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Tìm theo tên, mã, email, chức danh"
            label="Tìm nhân viên"
            className="flex-1"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Segmented value={status} onValueChange={setStatus} options={statusOptions} label="Lọc trạng thái" className="w-max" />
            </div>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger size="sm" className="w-full sm:w-44" aria-label="Lọc phòng ban"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Mọi phòng ban</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Reveal>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending ? (
        <LoadingState rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={employees.length ? "Không có nhân viên phù hợp" : "Chưa có nhân viên"}
          description={employees.length ? "Thử đổi từ khoá hoặc bộ lọc." : "Bấm “Thêm nhân viên” để tạo hồ sơ đầu tiên."}
        />
      ) : (
        <Reveal delay={180}>
          <div className="card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nhân viên</TableHead>
                  <TableHead className="hidden md:table-cell">Phòng ban</TableHead>
                  <TableHead className="hidden lg:table-cell">Ngày vào</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Lương cơ bản</TableHead>
                  <TableHead className="w-14"><span className="sr-only">Thao tác</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence initial={false} mode="popLayout">
                  {filtered.map((e, i) => (
                    <motion.tr
                      key={e.id}
                      layout="position"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, transition: { ...SPRING, delay: Math.min(i, 12) * 0.025 } }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      transition={SPRING}
                      data-slot="table-row"
                      className="border-b border-border/60 transition-colors duration-200 hover:bg-muted/60"
                    >
                      <TableCell>
                        <button className="flex items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setViewing(e)}>
                          <PersonAvatar name={e.full_name} seed={e.employee_code} src={e.avatar} size="sm" />
                          <span className="grid min-w-0">
                            <span className="text-[15px] font-medium text-foreground max-sm:whitespace-normal">{e.full_name}</span>
                            <span className="text-[13px] text-muted-foreground max-sm:whitespace-normal">
                              <span className="font-mono text-[12px]">{e.employee_code}</span> · {e.position}
                            </span>
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="hidden text-foreground/85 md:table-cell">{e.department}</TableCell>
                      <TableCell className="tabular hidden text-foreground/85 lg:table-cell">{formatDate(e.joined_at)}</TableCell>
                      <TableCell><EmployeeStatusBadge status={e.status} /></TableCell>
                      <TableCell className="tabular hidden text-right text-foreground sm:table-cell">
                        {e.contract_id ? formatMoney(e.base_salary) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Thao tác với ${e.full_name}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => setViewing(e)}><Eye /> Xem chi tiết</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openEdit(e)}><Pencil /> Sửa</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" disabled={e.id === user?.id} onSelect={() => setDeleting(e)}>
                              <Trash2 /> Xoá
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
            <p className="border-t border-border/60 px-5 py-3 text-[13px] text-muted-foreground">
              Hiển thị <span className="tabular text-foreground">{filtered.length}</span> / {employees.length} nhân viên
            </p>
          </div>
        </Reveal>
      )}

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editing} employees={employees} />
      <EmployeeSheet employee={viewing} onOpenChange={(o) => !o && setViewing(null)} onEdit={openEdit} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá {deleting?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Hồ sơ, hợp đồng và toàn bộ dòng lương của nhân viên này sẽ bị xoá vĩnh viễn. Không thể hoàn tác.
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
