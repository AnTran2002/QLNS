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

function Sidebar({ page, count, company, navigate, showHelp, onLogout, user }) {
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
  const {
    employees,
    loading: employeesLoading,
    error: employeesError,
    reload,
    saveEmployee: persistEmployee,
    removeEmployee,
  } = useWorkspace(user?.role === "ADMIN");

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

  async function saveEmployee(value) {
    try {
      await persistEmployee(value);
      toast.success(
        value.id
          ? "Đã cập nhật thông tin nhân viên."
          : "Đã thêm thành viên mới vào đội ngũ.",
      );
      setEditor(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDelete() {
    try {
      await removeEmployee(confirm.employee.id);
      toast.success("Đã xóa nhân viên.");
      setConfirm(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  function updateCompany(name) {
    setCompany(name);
    try {
      localStorage.setItem("qlns-company-v1", name);
    } catch {
      toast.info("Tên tổ chức chỉ được giữ trong phiên hiện tại.");
    }
  }

  // 1. Kiểm tra session phiên làm việc
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-[#777] text-[13px] font-sans">
        <div className="flex items-center gap-2.5 bg-white px-5 py-3 rounded-xl border border-gray-200 shadow-xs">
          <span className="w-4 h-4 border-2 border-[#242424] border-t-transparent rounded-full animate-spin" />
          <span>Đang mở không gian làm việc…</span>
        </div>
      </div>
    );
  }

  // 2. Chưa đăng nhập -> Render Giao diện Đăng nhập
  if (!user) {
    return (
      <>
        <LoginPage onLogin={login} />
        <Toaster theme="light" position="bottom-right" richColors closeButton />
      </>
    );
  }

  // 3. Phân quyền: Role EMPLOYEE -> Giao diện Cổng thông tin nhân viên
  if (user.role === "EMPLOYEE") {
    return (
      <>
        <EmployeeDashboard user={user} onLogout={logout} />
        <Toaster theme="light" position="bottom-right" richColors closeButton />
      </>
    );
  }

  // 4. Phân quyền: Role ADMIN -> Toàn bộ không gian làm việc Quản trị viên
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
            onLogout={logout}
            user={user}
          />
        </aside>

        {/* Mobile sidebar drawer: chỉ render vào DOM khi sidebarOpen là true */}
        {sidebarOpen && (
          <>
            <div
              className="sidebar-backdrop"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div
              className="sidebar-drawer open"
              role="dialog"
              aria-modal="true"
              aria-label="Menu điều hướng"
            >
              <div className="sidebar-drawer-header">
                <span className="brand-mobile">peopleos</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="drawer-close"
                  aria-label="Đóng menu điều hướng"
                >
                  <X size={18} />
                </button>
              </div>
              <Sidebar
                page={page}
                count={employees.length}
                company={company}
                navigate={navigate}
                showHelp={() => {
                  setSidebarOpen(false);
                  setHelpOpen(true);
                }}
                onLogout={logout}
                user={user}
              />
            </div>
          </>
        )}

        <div className="main-layout">
          <header className="app-header">
            <div className="header-left">
              <button
                className="menu-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Mở menu điều hướng"
              >
                <Menu size={18} />
              </button>
              <nav aria-label="Đường dẫn trang" className="breadcrumb">
                <span>{company}</span>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">{label}</span>
              </nav>
            </div>
            <div className="header-right">
              <button
                className="search-trigger"
                onClick={() => setSearchOpen(true)}
                aria-label="Tìm kiếm nhân viên (nhấn ⌘K hoặc Ctrl+K)"
              >
                <Search size={14} />
                <span>Tìm kiếm…</span>
                <kbd>
                  <Command size={10} />K
                </kbd>
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="icon-btn" aria-label="Thông báo">
                    <Bell size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Chưa có thông báo mới</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="profile-btn" aria-label="Menu cá nhân">
                    <Avatar name={user?.full_name || "Quản trị viên"} small />
                    <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-medium">{user?.full_name || "Quản trị viên"}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {user?.email || "admin@company.vn"}
                    </div>
                    <div className="mt-1">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-100 text-blue-800">
                        {user?.role} · Quản trị viên
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("settings")}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    <span>Cài đặt hệ thống</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHelpOpen(true)}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Trợ giúp & Phím tắt</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main id="main-content" className="app-main" tabIndex={-1}>
            {employeesError && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50/70 text-red-800 text-sm flex items-center justify-between gap-3"
              >
                <div>
                  <strong>Không thể đồng bộ dữ liệu:</strong> {employeesError}
                </div>
                <Button variant="outline" size="sm" onClick={reload}>
                  Thử lại
                </Button>
              </div>
            )}
            <Suspense
              fallback={
                <div className="page-loading">Đang tải giao diện…</div>
              }
            >
              {page === "overview" ? (
                <Dashboard employees={employees} navigate={navigate} />
              ) : page === "employees" || page === "contracts" ? (
                <EmployeeList
                  key={pageKey}
                  employees={employees}
                  initialDepartment={pageKey.split(":")[1] || "all"}
                  onAdd={addEmployee}
                  onEdit={editEmployee}
                  onRemove={(employee) => setConfirm({ employee })}
                  contract={page === "contracts"}
                  loading={employeesLoading}
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
                  onUpdateCompany={updateCompany}
                />
              )}
            </Suspense>
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

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="command-dialog">
          <DialogHeader>
            <DialogTitle>Tìm kiếm nhanh</DialogTitle>
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
            <DialogTitle>Xóa nhân viên?</DialogTitle>
            <DialogDescription>
              {`Hồ sơ, hợp đồng và bảng lương của ${confirm?.employee?.full_name} sẽ bị xóa vĩnh viễn khỏi database.`}
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Xác nhận xóa
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
            Dữ liệu nhân viên, hợp đồng và bảng lương được đọc/ghi trực tiếp
            vào database qlns qua API backend PHP.
          </div>
          <Button onClick={() => setHelpOpen(false)}>
            Bắt đầu khám phá
            <ArrowUpRight size={15} />
          </Button>
        </DialogContent>
      </Dialog>

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
