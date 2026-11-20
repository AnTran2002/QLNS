import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Camera, ImageUp, Loader2, Trash2 } from "lucide-react";
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
import { PersonAvatar } from "@/components/app/kit";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const OUTPUT_SIZE = 320; // px — đủ nét cho avatar 128px trên màn Retina 2.5×
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

/** Cắt hình vuông ở giữa, thu về 320×320, nén JPEG → data URL (~20–40 KB). */
async function toSquareDataUrl(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Không đọc được ảnh"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#fff"; // PNG trong suốt → nền trắng khi chuyển JPEG
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Cập nhật avatar trong cache để thanh bên, hồ sơ, đồng nghiệp đổi ngay không cần tải lại. */
function patchCaches(queryClient, userId, avatar) {
  queryClient.setQueryData(["employee-dashboard"], (d) =>
    d
      ? {
          ...d,
          user_info: { ...d.user_info, avatar },
          team_members: d.team_members?.map((m) => (m.id === userId ? { ...m, avatar } : m)),
        }
      : d,
  );
  queryClient.setQueryData(["me"], (d) => (d?.user ? { ...d, user: { ...d.user, avatar } } : d));
}

/**
 * Avatar lớn ở giữa hồ sơ + nút máy ảnh. Bấm vào → hộp thoại chọn ảnh, xem trước, lưu / xoá.
 */
export function AvatarEditor({ user }) {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null); // data URL đang chờ lưu
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setDragging(false);
    }
  }, [open]);

  const save = useMutation({
    mutationFn: (avatar) => api.updateAvatar(avatar),
    onSuccess: (_, avatar) => {
      patchCaches(queryClient, user.id, avatar);
      toast.success(avatar ? "Đã cập nhật ảnh đại diện" : "Đã xoá ảnh đại diện");
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const pick = async (file) => {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) return toast.error("Chỉ nhận ảnh JPEG, PNG hoặc WebP.");
    if (file.size > MAX_INPUT_BYTES) return toast.error("Ảnh tối đa 10 MB.");
    setReading(true);
    try {
      setPreview(await toSquareDataUrl(file));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReading(false);
    }
  };

  const shown = preview ?? user.avatar;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group/avatar relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card"
        aria-label="Đổi ảnh đại diện"
      >
        <PersonAvatar
          name={user.full_name}
          seed={user.employee_code}
          src={user.avatar}
          size="2xl"
          className="ring-1 ring-border/70 transition-[filter] duration-300 group-hover/avatar:brightness-90"
        />
        <span className="absolute right-0.5 bottom-0.5 flex size-9 items-center justify-center rounded-full border-[3px] border-card bg-foreground text-background shadow-sm transition-transform duration-300 ease-out group-hover/avatar:scale-110">
          <Camera className="size-4" aria-hidden="true" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={(o) => !save.isPending && setOpen(o)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Ảnh đại diện</DialogTitle>
            <DialogDescription>Ảnh được cắt vuông ở giữa và hiển thị dạng tròn trên toàn hệ thống.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-5 py-2">
            <div className="relative size-36">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={shown ?? "initials"}
                  initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  <PersonAvatar
                    name={user.full_name}
                    seed={user.employee_code}
                    src={shown}
                    className="size-36 text-[44px] ring-1 ring-border/70"
                  />
                </motion.div>
              </AnimatePresence>
              {reading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
                </span>
              )}
            </div>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center transition-colors duration-300",
                "hover:border-foreground/30 hover:bg-muted/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                dragging && "border-primary bg-primary/5",
              )}
            >
              <ImageUp className="size-5 text-muted-foreground" aria-hidden="true" />
              <span className="text-[13.5px] font-medium">Chọn ảnh hoặc kéo thả vào đây</span>
              <span className="text-[12px] text-muted-foreground">JPEG, PNG, WebP · tối đa 10 MB</span>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {user.avatar && !preview ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={save.isPending}
                onClick={() => save.mutate(null)}
              >
                <Trash2 /> Xoá ảnh
              </Button>
            ) : (
              <span className="max-sm:hidden" />
            )}
            <div className="flex gap-2 max-sm:flex-col-reverse">
              <Button variant="outline" disabled={save.isPending} onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button disabled={!preview || save.isPending} onClick={() => save.mutate(preview)}>
                {save.isPending && <Loader2 className="animate-spin" />}
                Lưu ảnh
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
