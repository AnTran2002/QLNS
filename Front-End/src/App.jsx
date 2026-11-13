import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  Command,
  FileChartColumnIncreasing,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Scan,
  Search,
  Settings2,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, EmptyState } from "@/components/shared";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/hooks/use-auth";
import { LoginPage } from "@/features/login-page";
import { EmployeeDashboard } from "@/features/employee-dashboard";
import { FaceAttendanceModal } from "@/features/face-attendance-modal";
const Dashboard = lazy(() =>
  import("@/features/dashboard").then((module) => ({
    default: module.Dashboard,
  })),
);
import { EmployeeList } from "@/features/employee-list";
import { EmployeeEditor } from "@/features/employee-editor";
import {
  DepartmentsPage,
  PayrollPage,
  ReportsPage,
  SettingsPage,
} from "@/features/workspace-pages";
import "./App.css";
const navItems = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "employees", label: "Nhân viên", icon: Users },
  { id: "departments", label: "Phòng ban", icon: Building2 },
  { id: "contracts", label: "Hợp đồng", icon: FileText },
  { id: "payroll", label: "Bảng lương", icon: Wallet },
  {
    id: "reports",
    label: "Báo cáo & phân tích",
    icon: FileChartColumnIncreasing,
  },
];
function initialCompany() {
  try {
    return localStorage.getItem("qlns-company-v1") || "Acme Studio";
  } catch {
    return "Acme Studio";
  }
}
function Sidebar({ page, count, company, navigate, showHelp, onOpenFaceModal, onLogout, user }) {
  return (
    <div className="sidebar-inner">
      <a
        className="brand"
        href="#overview"
        onClick={(e) => {
          e.preventDefault();
          navigate("overview");
        }}
        aria-label="PeopleOS — Tổng quan"
      >
        <span className="brand-mark">
          <span />
          <span />
          <span />
          <span />
        </span>
        <span>
          people<span className="brand-os">os</span>
          <sup>®</sup>
        </span>
      </a>
      <button className="workspace-switch" onClick={() => navigate("settings")}>
        <span className="workspace-logo">
          a<span>✳</span>
        </span>
        <span>
          <strong>{company}</strong>
          <small>Không gian làm việc</small>
        </span>
        <ChevronDown size={14} />
      </button>
      <div className="sidebar-section-label">QUẢN LÝ TỔ CHỨC</div>
      <nav aria-label="Điều hướng chính">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`nav-item ${page === item.id ? "active" : ""}`}
            aria-current={page === item.id ? "page" : undefined}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.id === "employees" && (
              <span className="nav-count">{count}</span>
            )}
            {page === item.id && item.id !== "employees" && (
              <span className="nav-active-dot" />
            )}
          </button>
        ))}

        {/* Nút Chấm công khuôn mặt AI trong Sidebar Admin */}
        <button
          onClick={onOpenFaceModal}
          className="nav-item text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-200/80 font-medium mt-1"
        >
          <Scan size={18} className="text-emerald-700" />
          <span>Chấm công khuôn mặt</span>
        </button>
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-tip">
        <span className="tip-icon">
          <Sparkles size={17} />
        </span>
        <h3>Đội ngũ tốt, khởi đầu tốt.</h3>
        <p>
          Mọi thông tin nhân sự,
          <br />
          gọn trong một không gian.
        </p>
        <button onClick={showHelp}>
          Khám phá PeopleOS
          <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="sidebar-bottom">
        <button
          className={`nav-item ${page === "settings" ? "active" : ""}`}
          onClick={() => navigate("settings")}
        >
          <Settings2 size={18} />
          <span>Cài đặt</span>
        </button>
        <button className="nav-item" onClick={showHelp}>
          <HelpCircle size={18} />
          <span>Trung tâm trợ giúp</span>
          <ArrowUpRight size={14} />
        </button>
        {onLogout && (
          <button
            className="nav-item text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onLogout}
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        )}
      </div>
      <button className="sidebar-profile" onClick={() => navigate("settings")}>
        <Avatar name={user?.full_name || "Quản trị viên"} small />
        <span>
          <strong>{user?.full_name || "Quản trị viên"}</strong>
          <small>{user?.role === "ADMIN" ? "Quản trị hệ thống (Admin)" : "Nhân viên"}</small>
        </span>
        <ChevronDown size={14} />
      </button>
    </div>
  );
}
export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const { employees, save, reset } = useWorkspace();
  const [pageKey, setPageKey] = useState(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    return [...navItems.map((n) => n.id), "settings"].includes(
      hash.split(":")[0],
    )
      ? hash
      : "overview";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [company, setCompany] = useState(initialCompany);
  const [editor, setEditor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const page = pageKey.split(":")[0];
  const label = navItems.find((n) => n.id === page)?.label ?? "Cài đặt";
  function navigate(next) {
    window.location.hash = encodeURIComponent(next);
    setPageKey(next);
    setSidebarOpen(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    const hashChange = () => {
      const next = decodeURIComponent(window.location.hash.slice(1));
      setPageKey(
        [...navItems.map((n) => n.id), "settings"].includes(next.split(":")[0])
          ? next
          : "overview",
      );
    };
    const keyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("hashchange", hashChange);
    window.addEventListener("keydown", keyDown);
    return () => {
      window.removeEventListener("hashchange", hashChange);
      window.removeEventListener("keydown", keyDown);
    };
  }, []);
  const editEmployee = (employee) =>
    setEditor({
      employee,
      mode: page === "contracts" ? "contract" : "employee",
    });
  const addEmployee = () => setEditor({ employee: null, mode: "employee" });
  const searchResults = employees
    .filter((e) =>
      `${e.full_name} ${e.email} ${e.employee_code}`
        .toLocaleLowerCase("vi")
        .includes(query.trim().toLocaleLowerCase("vi")),
    )
    .slice(0, 6);
  function saveEmployee(value) {
    save(
      editor?.employee
        ? employees.map((e) => (e.id === value.id ? value : e))
        : [...employees, value],
    );
    toast.success(
      editor?.employee
        ? "Đã cập nhật thông tin mẫu."
        : "Đã thêm thành viên mới vào đội ngũ.",
    );
    setEditor(null);
  }
  function updateCompany(name) {
    setCompany(name);
    try {
      localStorage.setItem("qlns-company-v1", name);
    } catch {
      toast.info("Tên tổ chức chỉ được giữ trong phiên hiện tại.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-[#777] text-[13px]">
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 border-2 border-[#242424] border-t-transparent rounded-full animate-spin" />
          <span>Đang mở không gian làm việc…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage onLogin={login} />
        <Toaster theme="light" position="bottom-right" richColors closeButton />
      </>
    );
  }

  if (user.role === "EMPLOYEE") {
    return (
      <>
        <EmployeeDashboard user={user} onLogout={logout} />
        <Toaster theme="light" position="bottom-right" richColors closeButton />
      </>
    );
  }

  return (
    <TooltipProvider>
      <div className="app-shell">
        <a
          href="#main-content"
          className="skip-link"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("main-content")?.focus();
            document.getElementById("main-content")?.scrollIntoView();
          }}
        >
          Đến nội dung chính
        </a>
        <aside className="sidebar">
          <Sidebar
            page={page}
            count={employees.length}
            company={company}
            navigate={navigate}
            showHelp={() => setHelpOpen(true)}
            onOpenFaceModal={() => setFaceModalOpen(true)}
            onLogout={logout}
            user={user}
          />
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <Button
                className="mobile-menu"
                size="icon"
                variant="ghost"
                aria-label="Mở menu"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </Button>
              <span className="breadcrumb-home">
                <Building2 size={15} />
                {company}
              </span>
              <ChevronRight size={13} />
              <strong>{label}</strong>
            </div>
            <div className="topbar-actions">
              <button
                className="global-search"
                onClick={() => {
                  setQuery("");
                  setSearchOpen(true);
                }}
              >
                <Search size={16} />
                <span>Tìm kiếm nhanh...</span>
                <kbd>
                  <Command size={10} />K
                </kbd>
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFaceModalOpen(true)}
                className="h-8 text-[12px] gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100"
              >
                <Scan size={14} className="text-emerald-700" />
                <span className="hidden sm:inline">Chấm công khuôn mặt</span>
              </Button>
              <span className="topbar-divider" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="demo-badge"
                    onClick={() => navigate("settings")}
                  >
                    <span />
                    Dữ liệu mẫu
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Dữ liệu minh họa, chưa kết nối backend
                </TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Thông báo"
                    className="notification-button"
                  >
                    <Bell size={18} />
                    <i />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="notification-dropdown"
                >
                  <DropdownMenuLabel>Ghi chú không gian mẫu</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("payroll")}>
                    <Wallet size={17} />
                    <div>
                      <strong>Chuẩn bị bảng lương</strong>
                      <small>Kiểm tra thông số hợp đồng trước kỳ lương.</small>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("settings")}>
                    <FileText size={17} />
                    <div>
                      <strong>Đang sử dụng dữ liệu mẫu</strong>
                      <small>Xem thông tin nguồn dữ liệu tại Cài đặt.</small>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="header-avatar"
                    aria-label="Tài khoản quản trị"
                  >
                    <Avatar name={user?.full_name || "Quản trị viên"} small />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user?.full_name || "Quản trị viên"} · {user?.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFaceModalOpen(true)}>
                    <Scan size={14} className="text-emerald-600" />
                    Chấm công khuôn mặt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("settings")}>
                    <Settings2 size={14} />
                    Cài đặt không gian
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHelpOpen(true)}>
                    <HelpCircle size={14} />
                    Hướng dẫn sử dụng
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                    <LogOut size={14} />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            className="main-content"
            key={pageKey}
          >
            {page === "overview" ? (
              <Suspense
                fallback={
                  <div className="dashboard-loading" role="status">
                    Đang mở không gian làm việc…
                  </div>
                }
              >
                <Dashboard
                  employees={employees}
                  navigate={navigate}
                  onAdd={addEmployee}
                  onEdit={editEmployee}
                />
              </Suspense>
            ) : page === "employees" || page === "contracts" ? (
              <EmployeeList
                key={pageKey}
                employees={employees}
                initialDepartment={pageKey.split(":")[1] || "all"}
                onAdd={addEmployee}
                onEdit={editEmployee}
                onRemove={(employee) =>
                  setConfirm({ type: "delete", employee })
                }
                contract={page === "contracts"}
              />
            ) : page === "departments" ? (
              <DepartmentsPage employees={employees} navigate={navigate} />
            ) : page === "payroll" ? (
              <PayrollPage employees={employees} />
            ) : page === "reports" ? (
              <ReportsPage employees={employees} />
            ) : (
              <SettingsPage
                company={company}
                onCompanyChange={updateCompany}
                onReset={() => setConfirm({ type: "reset" })}
              />
            )}
          </main>
        </div>
      </div>
      {editor && (
        <EmployeeEditor
          key={`${editor.employee?.id ?? "new"}-${editor.mode}`}
          employee={editor.employee}
          employees={employees}
          mode={editor.mode}
          onClose={() => setEditor(null)}
          onSave={saveEmployee}
        />
      )}
      <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DialogContent
          className="mobile-sidebar-dialog"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Menu điều hướng</DialogTitle>
            <DialogDescription>Chọn màn hình quản lý nhân sự</DialogDescription>
          </DialogHeader>
          <button
            className="mobile-sidebar-close"
            aria-label="Đóng menu"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
          <Sidebar
            page={page}
            count={employees.length}
            company={company}
            navigate={navigate}
            showHelp={() => {
              setSidebarOpen(false);
              setHelpOpen(true);
            }}
            onOpenFaceModal={() => {
              setSidebarOpen(false);
              setFaceModalOpen(true);
            }}
            onLogout={logout}
            user={user}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent
          className="search-dialog"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Tìm kiếm trong không gian</DialogTitle>
            <DialogDescription>
              Tìm nhân viên hoặc chuyển nhanh đến một trang.
            </DialogDescription>
          </DialogHeader>
          <div className="command-search">
            <Search size={18} />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tên, mã nhân viên, email..."
              aria-label="Từ khóa tìm kiếm"
            />
          </div>
          <div className="command-results">
            {query.trim() ? (
              <>
                <span className="command-label">NHÂN VIÊN</span>
                {searchResults.length ? (
                  searchResults.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setSearchOpen(false);
                        setEditor({ employee: e, mode: "employee" });
                      }}
                    >
                      <Avatar name={e.full_name} small />
                      <span>
                        <strong>{e.full_name}</strong>
                        <small>
                          {e.employee_code} · {e.department}
                        </small>
                      </span>
                      <ArrowUpRight size={15} />
                    </button>
                  ))
                ) : (
                  <EmptyState />
                )}
              </>
            ) : (
              <>
                <span className="command-label">ĐI ĐẾN</span>
                {navItems.map((n) => (
                  <button key={n.id} onClick={() => navigate(n.id)}>
                    <n.icon size={17} />
                    <span>{n.label}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.type === "reset"
                ? "Khôi phục dữ liệu mẫu?"
                : "Xóa nhân viên mẫu?"}
            </DialogTitle>
            <DialogDescription>
              {confirm?.type === "reset"
                ? "Các thay đổi nhân viên và hợp đồng trên trình duyệt này sẽ được thay thế bằng 24 hồ sơ mẫu ban đầu."
                : `Hồ sơ và thông số hợp đồng mẫu của ${confirm?.employee?.full_name} sẽ bị xóa trên trình duyệt này.`}
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm?.type === "reset") reset();
                else
                  save(employees.filter((e) => e.id !== confirm?.employee?.id));
                toast.success(
                  confirm?.type === "reset"
                    ? "Đã khôi phục dữ liệu mẫu."
                    : "Đã xóa nhân viên mẫu.",
                );
                setConfirm(null);
              }}
            >
              Xác nhận {confirm?.type === "reset" ? "khôi phục" : "xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="help-dialog">
          <DialogHeader>
            <span className="dialog-icon">
              <Sparkles size={22} />
            </span>
            <DialogTitle>Xin chào từ PeopleOS.</DialogTitle>
            <DialogDescription>
              Mọi thông tin nhân sự, gọn trong một không gian.
            </DialogDescription>
          </DialogHeader>
          <div className="help-items">
            <div>
              <Users size={20} />
              <p>
                <strong>Quản lý đội ngũ</strong>Thêm, sửa, tìm kiếm và lọc nhân
                viên theo phòng ban hoặc trạng thái.
              </p>
            </div>
            <div>
              <FileText size={20} />
              <p>
                <strong>Hợp đồng rõ ràng</strong>Cập nhật lương cơ bản, lương
                BHXH, phụ cấp và người phụ thuộc.
              </p>
            </div>
            <div>
              <ArrowDownToLine size={20} />
              <p>
                <strong>Mang dữ liệu theo bạn</strong>Xuất CSV từ danh sách hoặc
                màn hình Báo cáo, hỗ trợ tiếng Việt trong Excel.
              </p>
            </div>
            <div>
              <Search size={20} />
              <p>
                <strong>Tìm mọi thứ nhanh hơn</strong>Nhấn ⌘K hoặc Ctrl+K để tìm
                nhân viên và chuyển trang.
              </p>
            </div>
          </div>
          <div className="form-note">
            Bản mẫu giao diện. Dữ liệu được lưu trong trình duyệt; không yêu cầu
            tài khoản và chưa kết nối API.
          </div>
          <Button onClick={() => setHelpOpen(false)}>
            Bắt đầu khám phá
            <ArrowUpRight size={15} />
          </Button>
        </DialogContent>
      </Dialog>
      <FaceAttendanceModal
        open={faceModalOpen}
        onOpenChange={setFaceModalOpen}
        employees={employees}
      />
      <Toaster
        theme="light"
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ style: { fontFamily: "inherit" } }}
      />
    </TooltipProvider>
  );
}
