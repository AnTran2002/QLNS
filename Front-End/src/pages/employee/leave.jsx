import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, CalendarPlus, DatabaseZap, Hourglass, Loader2, Plane, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/admin/kpi-card";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { EmptyState, ErrorState, FormError, LoadingState } from "@/components/app/kit";
import { Reveal, SPRING } from "@/components/app/motion";
import { todayKey } from "@/components/employee/month-calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Meter } from "@/components/ui/meter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import { LEAVE_STATUS, LEAVE_TYPES, countWorkdays, formatRange } from "@/lib/leave";

const days = (n) => `${formatNumber(n)} ngày`;

function LeaveForm({ balance, onDone }) {
  const queryClient = useQueryClient();
  const today = todayKey();
  const [form, setForm] = useState({ type: "ANNUAL", start_date: today, end_date: today, reason: "" });
  const [error, setError] = useState("");
  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v?.target ? v.target.value : v }));

  const count = countWorkdays(form.start_date, form.end_date);
  const after = form.type === "ANNUAL" ? balance.remaining - count : null;

  const mutation = useMutation({
    mutationFn: () => api.createLeave(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave"] });
      toast.success("Đã gửi đơn nghỉ — chờ quản trị duyệt");
      onDone();
    },
    onError: (err) => setError(err.message),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date) return setError("Hãy chọn ngày bắt đầu và kết thúc");
    if (form.end_date < form.start_date) return setError("Ngày kết thúc phải sau hoặc trùng ngày bắt đầu");
    if (form.start_date < today) return setError("Ngày bắt đầu không được ở quá khứ");
    if (count === 0) return setError("Khoảng thời gian đã chọn không có ngày làm việc nào (T2–T6)");
    if (after !== null && after < 0) return setError(`Vượt quỹ phép năm: còn ${days(balance.remaining)}, đơn này cần ${days(count)}`);
    if (form.reason.trim().length < 3) return setError("Hãy ghi lý do (ít nhất 3 ký tự)");
    setError("");
    mutation.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div className="space-y-2">
        <Label htmlFor="leave-type">Loại nghỉ</Label>
        <Select value={form.type} onValueChange={set("type")}>
          <SelectTrigger id="leave-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LEAVE_TYPES).map(([k, t]) => (
              <SelectItem key={k} value={k}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[12.5px] text-muted-foreground">{LEAVE_TYPES[form.type].hint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="leave-start">Từ ngày</Label>
          <Input id="leave-start" type="date" min={today} value={form.start_date} onChange={set("start_date")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="leave-end">Đến ngày</Label>
          <Input id="leave-end" type="date" min={form.start_date} value={form.end_date} onChange={set("end_date")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="leave-reason">Lý do</Label>
        <Textarea
          id="leave-reason"
          maxLength={500}
          value={form.reason}
          onChange={set("reason")}
          placeholder="VD: Về quê giải quyết việc gia đình"
        />
      </div>
      <div className="tile grid grid-cols-2 gap-4 p-5" aria-live="polite">
        <div>
          <p className="text-[13px] text-tile-muted">Ngày làm việc nghỉ</p>
          <p className="mt-1 text-[20px] font-semibold tabular-nums">{days(count)}</p>
        </div>
        <div>
          <p className="text-[13px] text-tile-muted">{after === null ? "Phép năm" : "Phép năm còn lại sau đơn"}</p>
          <p className="mt-1 text-[20px] font-semibold tabular-nums">{after === null ? "Không trừ" : days(Math.max(after, 0))}</p>
        </div>
      </div>
      <FormError message={error} />
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone}>
          Huỷ
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="animate-spin" />} Gửi đơn
        </Button>
      </DialogFooter>
    </form>
  );
}

function LeaveRow({ r, action }) {
  const status = LEAVE_STATUS[r.status];
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-medium">{LEAVE_TYPES[r.type]?.label ?? r.type}</span>
          <Badge variant={status?.variant}>{status?.label ?? r.status}</Badge>
        </div>
        <p className="text-[13.5px] text-foreground/85 tabular-nums">
          {formatRange(r.start_date, r.end_date)} · {days(r.days)}
        </p>
        <p className="text-[13px] break-words text-muted-foreground">{r.reason}</p>
        {r.review_note && (
          <p className="text-[12.5px] text-muted-foreground">
            Phản hồi{r.reviewer_name ? ` của ${r.reviewer_name}` : ""}: <span className="text-foreground/85">{r.review_note}</span>
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
        <span className="text-[12px] text-muted-foreground">Gửi {formatDate(r.created_at)}</span>
        {action}
      </div>
    </div>
  );
}

export default function EmployeeLeavePage() {
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({ queryKey: ["my-leave"], queryFn: api.myLeave });
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const cancelMutation = useMutation({
    mutationFn: (id) => api.cancelLeave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave"] });
      toast.success("Đã huỷ đơn nghỉ");
      setCancelling(null);
    },
    onError: (err) => toast.error(err.message),
  });

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isPending) return <LoadingState rows={4} />;

  const balance = data.balance;
  const requests = data.requests ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Reveal offset={8}>
          <h1 className="page-title">Nghỉ phép</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Quỹ phép năm, gửi đơn nghỉ và theo dõi trạng thái duyệt.</p>
        </Reveal>
        {data.available && (
          <Button onClick={() => setCreating(true)} className="self-start sm:self-auto">
            <CalendarPlus /> Tạo đơn nghỉ
          </Button>
        )}
      </header>

      {!data.available ? (
        <EmptyState
          icon={DatabaseZap}
          title="Chưa bật nghỉ phép"
          description="Database chưa có bảng leave_requests. Hãy chạy migration Back-End/database/migrations/005_leave_requests.sql."
        />
      ) : (
        <>
          <section aria-label={`Quỹ phép năm ${balance.year}`} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: `Quỹ phép ${balance.year}`, icon: Wallet, value: days(balance.quota), hint: "12 ngày + 1 ngày mỗi 5 năm thâm niên" },
              {
                label: "Đã nghỉ",
                icon: Plane,
                value: days(balance.used),
                hint: `${formatNumber(balance.quota ? (balance.used / balance.quota) * 100 : 0)}% quỹ phép`,
                children: <Meter value={balance.quota ? (balance.used / balance.quota) * 100 : 0} label="Tỉ lệ phép đã dùng" />,
              },
              { label: "Đang chờ duyệt", icon: Hourglass, value: days(balance.pending), hint: "Tạm giữ trong quỹ phép" },
              { label: "Còn lại", icon: CalendarClock, value: days(balance.remaining), hint: "Có thể đăng ký thêm" },
            ].map((k, i) => (
              <Reveal key={k.label} delay={60 + i * 50} offset={10} className="h-full">
                <KpiCard {...k} />
              </Reveal>
            ))}
          </section>

          <Reveal delay={140} offset={14}>
            <Card className="gap-4">
              <CardHeader>
                <CardTitle>Đơn nghỉ của tôi</CardTitle>
                <CardDescription>{requests.length ? `${requests.length} đơn · mới nhất ở trên` : "Chưa có đơn nào"}</CardDescription>
                <CardAction>
                  <Button variant="ghost" size="sm" onClick={() => setCreating(true)}>
                    <CalendarPlus /> Tạo đơn
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <p className="py-8 text-center text-[13.5px] text-muted-foreground">Bạn chưa gửi đơn nghỉ nào.</p>
                ) : (
                  <div className="divide-y divide-border/60">
                    <AnimatePresence initial={false}>
                      {requests.map((r) => (
                        <motion.div key={r.id} layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
                          <LeaveRow
                            r={r}
                            action={
                              r.status === "PENDING" && (
                                <Button variant="ghost" size="sm" onClick={() => setCancelling(r)}>
                                  <Undo2 /> Huỷ đơn
                                </Button>
                              )
                            }
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo đơn nghỉ</DialogTitle>
            <DialogDescription>Ngày bắt đầu phải từ hôm nay trở đi. Chỉ tính ngày làm việc T2–T6; đơn sẽ được gửi tới quản trị để duyệt.</DialogDescription>
          </DialogHeader>
          {creating && balance && <LeaveForm balance={balance} onDone={() => setCreating(false)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(cancelling)} onOpenChange={(o) => !o && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ đơn nghỉ?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelling && `${LEAVE_TYPES[cancelling.type]?.label} · ${formatRange(cancelling.start_date, cancelling.end_date)}. `}
              Số ngày đang giữ sẽ được trả lại quỹ phép.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ đơn</AlertDialogCancel>
            <AlertDialogAction disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(cancelling.id)}>
              {cancelMutation.isPending && <Loader2 className="animate-spin" />} Huỷ đơn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
