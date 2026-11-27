import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Check, CalendarCheck2, DatabaseZap, Hourglass, Loader2, Plane, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/animate-ui/components/radix/dialog";
import { EmptyState, ErrorState, FormError, LoadingState, PageHeader, PersonAvatar, SearchField, Segmented, StatTile } from "@/components/app/kit";
import { Reveal, RevealGroup, SPRING } from "@/components/app/motion";
import { todayKey } from "@/components/employee/month-calendar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { LEAVE_STATUS, LEAVE_TYPES, formatRange } from "@/lib/leave";

const FILTERS = ["PENDING", "APPROVED", "REJECTED", "ALL"];

function RejectForm({ request, onDone, mutation }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (note.trim().length < 3) return setError("Hãy ghi lý do từ chối (ít nhất 3 ký tự)");
    setError("");
    mutation.mutate({ id: request.id, decision: "REJECTED", note: note.trim() }, { onSuccess: onDone, onError: (err) => setError(err.message) });
  };
  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="reject-note">Lý do từ chối</Label>
        <Textarea id="reject-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Trùng lịch bàn giao dự án" />
      </div>
      <FormError message={error} />
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone}>
          Huỷ
        </Button>
        <Button type="submit" variant="destructive" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="animate-spin" />} Từ chối đơn
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function LeaveRequestsPage() {
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({ queryKey: ["leave-requests"], queryFn: () => api.leaveRequests() });
  const [filter, setFilter] = useState("PENDING");
  const [query, setQuery] = useState("");
  const [rejecting, setRejecting] = useState(null);

  const review = useMutation({
    mutationFn: ({ id, decision, note }) => api.reviewLeave(id, decision, note),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success(`${r.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"} đơn của ${r.full_name}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const requests = data?.requests ?? [];
  const today = todayKey();
  const stats = useMemo(() => {
    const year = today.slice(0, 4);
    const by = (s) => requests.filter((r) => r.status === s);
    return {
      pending: by("PENDING").length,
      approvedDays: by("APPROVED")
        .filter((r) => r.start_date.startsWith(year))
        .reduce((s, r) => s + r.days, 0),
      rejected: by("REJECTED").length,
      onLeave: by("APPROVED").filter((r) => r.start_date <= today && r.end_date >= today).length,
    };
  }, [requests, today]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter(
      (r) =>
        (filter === "ALL" || r.status === filter) &&
        (!q || [r.full_name, r.employee_code, r.department, r.reason].some((v) => String(v ?? "").toLowerCase().includes(q))),
    );
  }, [requests, filter, query]);

  const count = (s) => (s === "ALL" ? requests.length : requests.filter((r) => r.status === s).length);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Nhân sự"
        title="Nghỉ phép"
        description="Đơn được duyệt tự ghi vào lịch chấm công. Đối chiếu căn cứ trước khi duyệt: nghỉ việc riêng hưởng lương giới hạn theo Điều 115 Bộ luật Lao động; nghỉ ốm đau cần kiểm tra hồ sơ theo Luật BHXH."
      />

      {data?.available === false ? (
        <EmptyState
          icon={DatabaseZap}
          title="Chưa bật nghỉ phép"
          description="Database chưa có bảng leave_requests. Hãy chạy migration Back-End/database/migrations/005_leave_requests.sql."
        />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isPending ? (
        <LoadingState rows={5} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <RevealGroup step={70} itemClassName="h-full">
              <StatTile label="Chờ duyệt" value={stats.pending} icon={Hourglass} hint="Đơn cần xử lý" />
              <StatTile label="Đang nghỉ hôm nay" value={stats.onLeave} icon={Plane} hint="Theo đơn đã duyệt" />
              <StatTile label={`Ngày nghỉ đã duyệt ${today.slice(0, 4)}`} value={formatNumber(stats.approvedDays)} icon={CalendarCheck2} hint="Mọi loại nghỉ" />
              <StatTile label="Đã từ chối" value={stats.rejected} icon={XCircle} hint="Có ghi lý do" />
            </RevealGroup>
          </div>

          <Reveal delay={100}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Segmented
                value={filter}
                onValueChange={setFilter}
                label="Lọc theo trạng thái"
                options={FILTERS.map((s) => ({ value: s, label: s === "ALL" ? "Tất cả" : LEAVE_STATUS[s].label, count: count(s) }))}
              />
              <SearchField value={query} onChange={setQuery} placeholder="Tìm theo tên, mã NV, phòng ban, lý do" label="Tìm đơn nghỉ" className="md:w-80" />
            </div>
          </Reveal>

          {filtered.length === 0 ? (
            <EmptyState icon={Plane} title={filter === "PENDING" && !query ? "Không có đơn nào chờ duyệt" : "Không có đơn phù hợp"} />
          ) : (
            <Reveal delay={160}>
              <div className="card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Nhân viên</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead className="hidden lg:table-cell">Lý do</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="w-24">
                        <span className="sr-only">Thao tác</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence initial={false} mode="popLayout">
                      {filtered.map((r, i) => (
                        <motion.tr
                          key={r.id}
                          layout="position"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0, transition: { ...SPRING, delay: Math.min(i, 12) * 0.025 } }}
                          exit={{ opacity: 0, transition: { duration: 0.15 } }}
                          transition={SPRING}
                          className="border-b border-border/60 align-top transition-colors duration-200 hover:bg-muted/60"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <PersonAvatar name={r.full_name} seed={r.employee_code} src={r.avatar} size="sm" />
                              <span className="grid min-w-0">
                                <span className="text-[15px] font-medium text-foreground max-sm:whitespace-normal">{r.full_name}</span>
                                <span className="text-[13px] text-muted-foreground max-sm:whitespace-normal">
                                  <span className="font-mono text-[12px]">{r.employee_code}</span> · {r.department}
                                </span>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="grid">
                              <span className="text-[14px] text-foreground tabular-nums">{formatRange(r.start_date, r.end_date)}</span>
                              <span className="text-[13px] text-muted-foreground">
                                {LEAVE_TYPES[r.type]?.label} · {formatNumber(r.days)} ngày
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="hidden max-w-[280px] lg:table-cell">
                            <span className="block truncate text-[13.5px] text-foreground/85" title={r.reason}>
                              {r.reason}
                            </span>
                            {r.review_note && (
                              <span className="block truncate text-[12.5px] text-muted-foreground" title={r.review_note}>
                                ↳ {r.review_note}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={LEAVE_STATUS[r.status]?.variant}>{LEAVE_STATUS[r.status]?.label ?? r.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {r.status === "PENDING" && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-success"
                                  disabled={review.isPending}
                                  onClick={() => review.mutate({ id: r.id, decision: "APPROVED" })}
                                  aria-label={`Duyệt đơn của ${r.full_name}`}
                                >
                                  <Check />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive"
                                  onClick={() => setRejecting(r)}
                                  aria-label={`Từ chối đơn của ${r.full_name}`}
                                >
                                  <X />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </Reveal>
          )}
        </>
      )}

      <Dialog open={Boolean(rejecting)} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối đơn nghỉ</DialogTitle>
            <DialogDescription>
              {rejecting && `${rejecting.full_name} · ${LEAVE_TYPES[rejecting.type]?.label} · ${formatRange(rejecting.start_date, rejecting.end_date)}`}
            </DialogDescription>
          </DialogHeader>
          {rejecting && <RejectForm request={rejecting} mutation={review} onDone={() => setRejecting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
