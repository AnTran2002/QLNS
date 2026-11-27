import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarCheck, Check, FileText, LayoutDashboard, Loader2, Plane, Sparkles, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { SPRING } from "@/components/app/motion";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { givenName } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    to: "/nhan-vien",
    icon: Sparkles,
    title: (u) => `Chào mừng ${givenName(u?.full_name)} đến với PeopleOS`,
    body: "Đây là cổng nhân viên của bạn. Hướng dẫn ngắn này đi qua từng trang — mất khoảng 1 phút. Bạn có thể bỏ qua và xem lại bất cứ lúc nào trong menu tài khoản.",
  },
  {
    to: "/nhan-vien",
    icon: LayoutDashboard,
    title: () => "Tổng quan",
    body: "Lương tạm tính tháng này cập nhật theo từng ngày chấm công: số đã làm được, dự kiến cuối tháng, bảo hiểm và thuế ước tính. Bấm \"Xem cách tính\" để thấy công thức chi tiết.",
  },
  {
    to: "/nhan-vien/ho-so",
    icon: UserRound,
    title: () => "Hồ sơ & hợp đồng",
    body: "Thông tin cá nhân, chi nhánh và hợp đồng lao động đang hiệu lực: lương, thử việc, giờ làm, ngày phép năm và các cam kết đã ký. Bạn có thể đổi ảnh đại diện tại đây.",
  },
  {
    to: "/nhan-vien/phieu-luong",
    icon: FileText,
    title: () => "Phiếu lương",
    body: "Mỗi kỳ có phiếu lương chi tiết: ngày công, OT theo hệ số, bảo hiểm từng loại, thuế TNCN theo bậc và phần công ty đóng thêm. Kỳ đã chốt có thể tải về.",
  },
  {
    to: "/nhan-vien/cham-cong",
    icon: CalendarCheck,
    title: () => "Chấm công",
    body: "Lịch chấm công theo tháng: đi làm, đi muộn, làm từ xa, nghỉ phép và giờ làm thêm. Đây là dữ liệu dùng để tính lương của bạn.",
  },
  {
    to: "/nhan-vien/nghi-phep",
    icon: Plane,
    title: () => "Nghỉ phép",
    body: "Gửi đơn nghỉ, theo dõi số ngày phép còn lại và trạng thái duyệt. Đơn được duyệt tự ghi vào lịch chấm công.",
  },
  {
    to: "/nhan-vien/dong-nghiep",
    icon: UsersRound,
    title: () => "Đồng nghiệp",
    body: "Danh bạ đồng nghiệp cùng phòng ban. Vậy là xong — chúc bạn một ngày làm việc hiệu quả!",
  },
];

/** Làm nổi bật mục menu tương ứng bước hiện tại. */
function useHighlight(to) {
  useEffect(() => {
    if (!to) return undefined;
    const el = document.querySelector(`[data-sidebar="menu-button"][href="${to}"], a[href="${to}"]`);
    if (!el) return undefined;
    el.setAttribute("data-tour-active", "");
    return () => el.removeAttribute("data-tour-active");
  }, [to]);
}

/** Hướng dẫn lần đầu đăng nhập cho nhân viên (users.tutorial_completed_at = NULL). */
export function EmployeeTutorial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [hidden, setHidden] = useState(false);
  const active = user?.role === "EMPLOYEE" && !user?.tutorial_completed_at && !hidden;
  const current = STEPS[step];

  const complete = useMutation({
    mutationFn: api.completeTutorial,
    onSettled: () => {
      setHidden(true);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  useEffect(() => {
    if (active) navigate(current.to);
  }, [active, current.to, navigate]);
  useHighlight(active ? current.to : null);

  // Khi người dùng chọn "Xem lại hướng dẫn", tutorial_completed_at về NULL → hiện lại từ đầu.
  useEffect(() => {
    if (user && !user.tutorial_completed_at) {
      setHidden(false);
      setStep(0);
    }
  }, [user?.tutorial_completed_at]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;
  const last = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px]" aria-hidden="true" />
      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          role="dialog"
          aria-modal="false"
          aria-labelledby="tour-title"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } }}
          transition={SPRING}
          className="pointer-events-auto absolute right-4 bottom-4 left-4 mx-auto max-w-md rounded-[22px] border border-border/70 bg-card p-5 shadow-popover sm:left-auto sm:mx-0"
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="text-[12px] text-muted-foreground tabular-nums">
              Bước {step + 1}/{STEPS.length}
            </span>
          </div>
          <h2 id="tour-title" className="text-[17px] font-semibold">
            {current.title(user)}
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{current.body}</p>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={`${s.to}-${i}`} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => complete.mutate()} disabled={complete.isPending}>
              Bỏ qua
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft /> Trước
                </Button>
              )}
              <Button size="sm" onClick={() => (last ? complete.mutate() : setStep((s) => s + 1))} disabled={complete.isPending}>
                {last ? (
                  <>
                    {complete.isPending ? <Loader2 className="animate-spin" /> : <Check />} Hoàn tất
                  </>
                ) : (
                  <>
                    Tiếp <ArrowRight />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
