import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Scan,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Video,
  VideoOff,
  X,
  History,
  Check,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/shared";

const attendanceHistoryKey = "qlns-admin-attendance-history";

function getInitialHistoryEvents(attendanceLogs) {
  try {
    const saved = localStorage.getItem(attendanceHistoryKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    return [];
  }

  const today = new Date();
  return attendanceLogs.flatMap((log) =>
    ["in", "out"]
      .filter((type) => log[type])
      .map((type) => {
        const [hours, minutes] = log[type].split(":").map(Number);
        const timestamp = new Date(today);
        timestamp.setHours(hours, minutes, 0, 0);
        return {
          id: `seed-${log.id}-${type}`,
          emp_id: log.emp_id,
          code: log.code,
          name: log.name,
          department: log.department,
          action: type === "in" ? "CHECK-IN" : "CHECK-OUT",
          timestamp: timestamp.toISOString(),
          method: log.method,
          confidence: log.confidence,
          image: null,
        };
      }),
  );
}

export function FaceAttendanceModal({ open, onOpenChange, employees }) {
  const [tab, setTab] = useState("camera");
  const [todayLabel] = useState(() =>
    new Intl.DateTimeFormat("vi-VN").format(new Date()),
  );
  const [simulatedTime, setSimulatedTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [isSimulatedMorning, setIsSimulatedMorning] = useState(() => {
    const hours = new Date().getHours();
    return hours < 12;
  });

  const [scanning, setScanning] = useState(false);
  const [recognizedEmployee, setRecognizedEmployee] = useState(null);
  const [selectedScanEmpId, setSelectedScanEmpId] = useState(2); // NV002 mặc định
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraUnsupported =
    typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia;
  const cameraUnavailable = cameraError || cameraUnsupported;

  // Nhật ký điểm danh hôm nay
  const [attendanceLogs, setAttendanceLogs] = useState(() => {
    try {
      const saved = localStorage.getItem("qlns-admin-face-attendance-logs");
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 1,
              emp_id: 1,
              code: "NV001",
              name: "Nguyễn Văn An",
              department: "Ban Điều Hành",
              in: "08:15",
              out: null,
              method: "Khuôn mặt AI",
              confidence: "99.8%",
              status: "Đúng giờ",
            },
            {
              id: 2,
              emp_id: 2,
              code: "NV002",
              name: "Trần Thị Bình",
              department: "Thiết kế & Trải nghiệm",
              in: "08:24",
              out: null,
              method: "Khuôn mặt AI",
              confidence: "99.4%",
              status: "Đúng giờ",
            },
          ];
    } catch {
      return [];
    }
  });
  const [historyEvents, setHistoryEvents] = useState(() =>
    getInitialHistoryEvents(attendanceLogs),
  );
  const historyEventsRef = useRef(historyEvents);

  useEffect(() => {
    if (!open || tab !== "camera" || cameraError) return undefined;

    let active = true;
    const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(
      navigator.mediaDevices,
    );
    if (!getUserMedia) return undefined;

    getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);
      })
      .catch(() => {
        if (active) setCameraError(true);
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraReady(false);
    };
  }, [open, tab, cameraError]);

  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      toast.error("Camera chưa sẵn sàng. Vui lòng thử kết nối lại.");
      return null;
    }

    const scale = Math.min(1, 480 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Không thể chụp ảnh từ camera.");
      return null;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.65);
  };

  const recordHistoryEvent = (emp, action, method, confidence, image) => {
    const event = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      emp_id: emp.id,
      code: emp.employee_code,
      name: emp.full_name,
      department: emp.department,
      action,
      timestamp: new Date().toISOString(),
      method,
      confidence,
      image,
    };
    const updated = [event, ...historyEventsRef.current];
    historyEventsRef.current = updated;
    setHistoryEvents(updated);
    try {
      localStorage.setItem(attendanceHistoryKey, JSON.stringify(updated));
    } catch {
      toast.error("Không thể lưu lịch sử chấm công trên trình duyệt này.");
    }
  };

  const saveLogs = (logs) => {
    setAttendanceLogs(logs);
    try {
      localStorage.setItem("qlns-admin-face-attendance-logs", JSON.stringify(logs));
    } catch {
      // ignore
    }
  };

  // Xác định tự động Check-in hay Check-out theo giờ
  const currentAction = isSimulatedMorning ? "CHECK-IN" : "CHECK-OUT";

  const handleScanFace = () => {
    if (cameraUnavailable) {
      toast.error("Camera đang báo lỗi! Vui lòng chuyển sang tab Chấm công thủ công.");
      return;
    }

    const image = captureSnapshot();
    if (!image) return;

    setScanning(true);
    setRecognizedEmployee(null);

    // Giả lập quét AI nhận diện khuôn mặt
    setTimeout(() => {
      setScanning(false);
      const emp = employees.find((e) => e.id === Number(selectedScanEmpId)) || employees[0];
      const confidence = (98 + Math.random() * 1.9).toFixed(1) + "%";
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      setRecognizedEmployee({
        emp,
        confidence,
        time: timeStr,
        action: currentAction,
        image,
      });
      recordHistoryEvent(emp, currentAction, "Khuôn mặt AI", confidence, image);

      // Cập nhật vào bảng nhật ký
      setAttendanceLogs((prev) => {
        const existingIdx = prev.findIndex((item) => item.emp_id === emp.id);
        let updated;
        if (existingIdx >= 0) {
          updated = [...prev];
          if (currentAction === "CHECK-IN") {
            updated[existingIdx].in = timeStr;
          } else {
            updated[existingIdx].out = timeStr;
          }
          updated[existingIdx].method = "Khuôn mặt AI";
          updated[existingIdx].confidence = confidence;
        } else {
          updated = [
            {
              id: Date.now(),
              emp_id: emp.id,
              code: emp.employee_code,
              name: emp.full_name,
              department: emp.department,
              in: currentAction === "CHECK-IN" ? timeStr : null,
              out: currentAction === "CHECK-OUT" ? timeStr : null,
              method: "Khuôn mặt AI",
              confidence,
              status: "Đúng giờ",
            },
            ...prev,
          ];
        }
        try {
          localStorage.setItem("qlns-admin-face-attendance-logs", JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      toast.success(
        `Khuôn mặt nhận diện: ${emp.full_name} (${emp.employee_code}) - Tự động ${currentAction} lúc ${timeStr}!`,
      );
    }, 1200);
  };

  // Chấm công thủ công (khi camera lỗi)
  const handleManualRecord = (emp, type) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    recordHistoryEvent(
      emp,
      type === "in" ? "CHECK-IN" : "CHECK-OUT",
      "Thủ công (Admin)",
      null,
      null,
    );

    setAttendanceLogs((prev) => {
      const existingIdx = prev.findIndex((item) => item.emp_id === emp.id);
      let updated;
      if (existingIdx >= 0) {
        updated = [...prev];
        if (type === "in") updated[existingIdx].in = timeStr;
        else updated[existingIdx].out = timeStr;
        updated[existingIdx].method = "Thủ công (Admin)";
      } else {
        updated = [
          {
            id: Date.now(),
            emp_id: emp.id,
            code: emp.employee_code,
            name: emp.full_name,
            department: emp.department,
            in: type === "in" ? timeStr : null,
            out: type === "out" ? timeStr : null,
            method: "Thủ công (Admin)",
            confidence: "100%",
            status: "Đúng giờ",
          },
          ...prev,
        ];
      }
      try {
        localStorage.setItem("qlns-admin-face-attendance-logs", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    toast.success(
      `Đã ghi nhận ${type === "in" ? "Check-in" : "Check-out"} thủ công cho ${emp.full_name} lúc ${timeStr}.`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-[850px] flex-col p-0 overflow-hidden border-[#e5e5e5] rounded-2xl">
        <DialogHeader className="shrink-0 p-6 pb-4 border-b border-[#f0f0f0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#242424] text-white flex items-center justify-center">
                <Scan size={20} />
              </div>
              <div>
                <DialogTitle className="text-[17px] font-bold text-[#242424] flex items-center gap-2">
                  <span>Hệ Thống Chấm Công Khuôn Mặt AI</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-normal">
                    Live Kiosk v2.4
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[12px] text-[#888] mt-0.5">
                  Tự động Check-in / Check-out theo thời gian thực bằng camera & nhận diện khuôn mặt
                </DialogDescription>
              </div>
            </div>

            {/* Toggle ca sáng / ca chiều */}
            <div className="flex items-center gap-1.5 bg-[#f4f4f4] p-1 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setIsSimulatedMorning(true)}
                className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                  isSimulatedMorning ? "bg-white text-[#242424] shadow-xs" : "text-[#777]"
                }`}
              >
                ☀️ Sáng (Check-in)
              </button>
              <button
                type="button"
                onClick={() => setIsSimulatedMorning(false)}
                className={`px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                  !isSimulatedMorning ? "bg-white text-[#242424] shadow-xs" : "text-[#777]"
                }`}
              >
                🌙 Chiều (Check-out)
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <button
              onClick={() => setTab("camera")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                tab === "camera"
                  ? "bg-[#242424] text-white"
                  : "bg-[#f5f5f5] text-[#666] hover:bg-[#eaeaea]"
              }`}
            >
              <Camera size={14} />
              Camera AI Face ID
            </button>

            <button
              onClick={() => setTab("manual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                tab === "manual"
                  ? "bg-[#242424] text-white"
                  : "bg-[#f5f5f5] text-[#666] hover:bg-[#eaeaea]"
              }`}
            >
              <AlertTriangle size={14} className={cameraUnavailable ? "text-amber-500" : ""} />
              Chấm công thủ công
            </button>

            <button
              onClick={() => setTab("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                tab === "history"
                  ? "bg-[#242424] text-white"
                  : "bg-[#f5f5f5] text-[#666] hover:bg-[#eaeaea]"
              }`}
            >
              <History size={14} />
              Lịch sử
            </button>
          </div>
        </DialogHeader>

        {/* CONTENT */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
          {tab === "camera" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Cột trái: Khung Camera Viewfinder */}
              <div className="min-w-0 space-y-3">
                <div className="relative aspect-4/3 bg-[#181818] rounded-xl overflow-hidden border border-[#333] shadow-inner flex flex-col items-center justify-center text-white">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-cover"
                    aria-label="Hình ảnh camera chấm công"
                  />
                  {cameraUnavailable ? (
                    <div className="text-center p-6 space-y-2">
                      <VideoOff size={42} className="text-red-400 mx-auto" />
                      <div className="font-semibold text-[14px] text-red-200">Camera gặp sự cố</div>
                      <p className="text-[11px] text-[#aaa] max-w-[240px] leading-relaxed">
                        {cameraUnsupported
                          ? "Trình duyệt không hỗ trợ truy cập camera."
                          : "Không thể kết nối camera. Vui lòng cấp quyền truy cập hoặc chuyển sang chấm công thủ công."}
                      </p>
                      {!cameraUnsupported && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCameraError(false)}
                          className="text-[11px] h-7 bg-white/10 text-white border-white/20 hover:bg-white/20"
                        >
                          Thử kết nối lại
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Bounding box nhận diện khuôn mặt */}
                      <div className="relative w-52 h-52 border-2 border-emerald-400/80 rounded-2xl flex items-center justify-center overflow-hidden">
                        {/* 4 góc target */}
                        <span className="absolute top-0 left-0 w-4 h-4 border-t-3 border-l-3 border-emerald-400" />
                        <span className="absolute top-0 right-0 w-4 h-4 border-t-3 border-r-3 border-emerald-400" />
                        <span className="absolute bottom-0 left-0 w-4 h-4 border-b-3 border-l-3 border-emerald-400" />
                        <span className="absolute bottom-0 right-0 w-4 h-4 border-b-3 border-r-3 border-emerald-400" />

                        {/* Scanline laser */}
                        <div
                          className={`absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent ${
                            scanning ? "animate-bounce" : "opacity-40"
                          }`}
                        />

                        {/* Silhouette khuôn mặt */}
                        <div className="opacity-25 flex flex-col items-center">
                          <User size={80} strokeWidth={1} />
                        </div>

                        {scanning && (
                          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                            <span className="text-[11px] font-mono text-emerald-300 font-semibold bg-black/60 px-2 py-1 rounded">
                              Đang nhận diện AI…
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Header trạng thái camera */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono">
                        <span className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          CAMERA ĐANG HOẠT ĐỘNG
                        </span>

                        <Badge
                          variant="outline"
                          className={`text-[9px] border-none font-bold uppercase ${
                            isSimulatedMorning ? "bg-amber-500 text-black" : "bg-blue-600 text-white"
                          }`}
                        >
                          Tự động {currentAction}
                        </Badge>
                      </div>

                      <div className="absolute bottom-3 text-[10px] text-[#aaa] font-mono bg-black/50 px-3 py-1 rounded">
                        Đưa khuôn mặt vào khung nhận diện
                      </div>
                    </>
                  )}
                </div>

                {/* Giả lập chọn nhân viên & quét */}
                <div className="bg-[#f9f9f9] border border-[#eee] rounded-xl p-3.5 space-y-2.5">
                  <div className="text-[11px] font-semibold text-[#444] flex items-center justify-between">
                    <span>Chọn nhân viên trước camera (Demo):</span>
                    {!cameraUnsupported && (
                     <button
                       type="button"
                       onClick={() => setCameraError(!cameraError)}
                       className="text-[10px] text-amber-700 underline cursor-pointer"
                     >
                       {cameraError ? "Hủy lỗi camera" : "Giả lập lỗi camera"}
                     </button>
                    )}
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    <select
                      value={selectedScanEmpId}
                      onChange={(e) => setSelectedScanEmpId(e.target.value)}
                      className="h-9 min-w-0 flex-1 text-[12px] rounded-lg border border-[#ddd] bg-white px-2.5 text-[#333]"
                      disabled={scanning || cameraUnavailable}
                    >
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.employee_code} - {e.full_name} ({e.department})
                        </option>
                      ))}
                    </select>

                    <Button
                      onClick={handleScanFace}
                      disabled={scanning || cameraUnavailable || !cameraReady}
                      className="h-9 shrink-0 whitespace-nowrap text-[12px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-none px-4"
                    >
                      {scanning ? "Đang quét…" : "Quét Face ID"}
                    </Button>
                  </div>

                  {recognizedEmployee && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 animate-in fade-in">
                      <Avatar name={recognizedEmployee.emp.full_name} small />
                      <div className="flex-1 text-[11px]">
                        <div className="font-semibold text-emerald-900 flex items-center gap-1">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          {recognizedEmployee.emp.full_name} ({recognizedEmployee.emp.employee_code})
                        </div>
                        <div className="text-emerald-700 mt-0.5">
                          Độ khớp: <strong>{recognizedEmployee.confidence}</strong> · Đã{" "}
                          <strong>{recognizedEmployee.action}</strong> lúc {recognizedEmployee.time}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cột phải: Live Attendance Feed hôm nay */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-bold text-[#242424] flex items-center gap-1.5">
                    <History size={14} className="text-[#666]" />
                    Nhật ký chấm công hôm nay ({attendanceLogs.length})
                  </div>
                  <Badge variant="outline" className="text-[10px] text-[#888] bg-[#f9f9f9]">
                    {todayLabel}
                  </Badge>
                </div>

                <div className="max-h-[380px] overflow-y-auto divide-y divide-[#f2f2f2] border border-[#eee] rounded-xl bg-white">
                  {attendanceLogs.length === 0 ? (
                    <div className="p-6 text-center text-[12px] text-[#999]">
                      Chưa có lượt chấm công nào hôm nay.
                    </div>
                  ) : (
                    attendanceLogs.map((log) => (
                      <div key={log.id} className="p-3 text-[12px] flex items-center justify-between hover:bg-[#fafafa]">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={log.name} small />
                          <div>
                            <strong className="text-[#333] block leading-tight">{log.name}</strong>
                            <span className="text-[10px] text-[#888]">
                              {log.code} · {log.department}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2 text-[11px]">
                            {log.in && (
                              <span className="text-emerald-700 font-medium">
                                Vào: {log.in}
                              </span>
                            )}
                            {log.out && (
                              <span className="text-blue-700 font-medium">
                                Ra: {log.out}
                              </span>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[9px] mt-0.5 ${
                              log.method.includes("Khuôn mặt")
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {log.method}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : tab === "manual" ? (
            /* TAB 2: CHẤM CÔNG THỦ CÔNG (FALLBACK) */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-800 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Chế độ dự phòng khi lỗi camera:</strong>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                    Nếu thiết bị camera AI gặp sự cố, Quản trị viên có thể trực tiếp ghi nhận Check-in hoặc Check-out cho nhân viên bằng danh sách dưới đây.
                  </p>
                </div>
              </div>

              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                <Input
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  placeholder="Tìm nhân viên theo tên hoặc mã NV (VD: NV001, NV002)..."
                  className="pl-8 h-9 text-[12px]"
                />
              </div>

              <div className="max-h-[350px] overflow-y-auto divide-y divide-[#f2f2f2] border border-[#eee] rounded-xl bg-white">
                {employees
                  .filter((e) =>
                    `${e.full_name} ${e.employee_code} ${e.department}`
                      .toLowerCase()
                      .includes(manualSearch.trim().toLowerCase()),
                  )
                  .map((emp) => {
                    const log = attendanceLogs.find((item) => item.emp_id === emp.id) || {};
                    return (
                      <div key={emp.id} className="p-3 px-4 flex items-center justify-between text-[12px] hover:bg-[#fafafa]">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={emp.full_name} small />
                          <div>
                            <strong className="text-[#333] block">{emp.full_name}</strong>
                            <span className="text-[10px] text-[#888]">
                              {emp.employee_code} · {emp.department}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right text-[11px]">
                            <div>
                              Vào: <strong className={log.in ? "text-emerald-700" : "text-[#aaa]"}>{log.in || "--:--"}</strong>
                            </div>
                            <div>
                              Ra: <strong className={log.out ? "text-blue-700" : "text-[#aaa]"}>{log.out || "--:--"}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleManualRecord(emp, "in")}
                              className="h-7 text-[11px] px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                            >
                              Check-in
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleManualRecord(emp, "out")}
                              className="h-7 text-[11px] px-2 text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                            >
                              Check-out
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <section className="space-y-4">
              <div>
                <h3 className="text-[14px] font-semibold text-[#242424]">
                  Lịch sử Check-in / Check-out ({historyEvents.length})
                </h3>
                <p className="mt-1 text-[11px] text-[#888]">
                  Ảnh chụp được lưu trên trình duyệt này; các lượt chấm công thủ công không có ảnh camera.
                </p>
              </div>

              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Tìm theo tên, mã nhân viên hoặc phòng ban..."
                  className="pl-8 h-9 text-[12px]"
                />
              </div>

              <div className="max-h-[55vh] overflow-y-auto divide-y divide-[#f2f2f2] border border-[#eee] rounded-xl bg-white">
                {historyEvents
                  .filter((event) =>
                    `${event.name} ${event.code} ${event.department}`
                      .toLowerCase()
                      .includes(historySearch.trim().toLowerCase()),
                  )
                  .map((event) => (
                    <article
                      key={event.id}
                      className="flex items-center gap-3 p-3 sm:p-4"
                    >
                      {event.image ? (
                        <img
                          src={event.image}
                          alt={`Ảnh ${event.action === "CHECK-IN" ? "check-in" : "check-out"} của ${event.name}`}
                          className="h-16 w-16 shrink-0 rounded-lg border border-[#eee] object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-[#ddd] bg-[#f9f9f9] text-[#888]">
                          <Avatar name={event.name} small />
                          <span className="mt-1 text-[9px]">Không có ảnh</span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-[12px] text-[#333]">{event.name}</strong>
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${
                              event.action === "CHECK-IN"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-blue-200 bg-blue-50 text-blue-700"
                            }`}
                          >
                            {event.action === "CHECK-IN" ? "Check-in" : "Check-out"}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-[10px] text-[#777]">
                          {event.code} · {event.department}
                        </p>
                        <p className="mt-1 text-[10px] text-[#555]">
                          {new Intl.DateTimeFormat("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "medium",
                          }).format(new Date(event.timestamp))}
                          {" · "}{event.method}
                          {event.confidence ? ` · Độ khớp ${event.confidence}` : ""}
                        </p>
                      </div>
                    </article>
                  ))}
                {historyEvents.length === 0 && (
                  <p className="p-6 text-center text-[12px] text-[#999]">
                    Chưa có lịch sử chấm công.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 px-6 bg-[#fafafa] border-t border-[#f0f0f0] flex items-center justify-between">
          <div className="text-[11px] text-[#888]">
            Hệ thống nhận diện Face ID kết nối cơ sở dữ liệu chấm công trung tâm.
          </div>
          <Button size="sm" variant="outline" className="text-[12px] h-8" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

