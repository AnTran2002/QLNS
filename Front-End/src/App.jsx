import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import {
  Building2,
  CalendarCheck,
  ClipboardList,
  FileSignature,
  FileStack,
  FileText,
  LayoutDashboard,
  Plane,
  UserRound,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { ShimmeringText } from "@/components/animate-ui/primitives/texts/shimmering";
import { AdminShell } from "@/components/admin/admin-shell";
import { BrandMark } from "@/components/app/brand";
import { ErrorState } from "@/components/app/kit";
import { Toaster } from "@/components/app/toaster";
import { AuthProvider, homeFor, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import LoginPage from "@/pages/login";

// Mỗi trang tách thành chunk riêng — admin không tải mã của cổng nhân viên và ngược lại.
const AdminOverview = lazy(() => import("@/pages/admin/overview"));
const EmployeesPage = lazy(() => import("@/pages/admin/employees"));
const DepartmentsPage = lazy(() => import("@/pages/admin/departments"));
const ContractsPage = lazy(() => import("@/pages/admin/contracts"));
const PayrollPage = lazy(() => import("@/pages/admin/payroll"));
const AttendancePage = lazy(() => import("@/pages/admin/attendance"));
const LeaveRequestsPage = lazy(() => import("@/pages/admin/leave"));
const EmployeeOverview = lazy(() => import("@/pages/employee/overview"));
const EmployeeProfile = lazy(() => import("@/pages/employee/profile"));
const EmployeePayslips = lazy(() => import("@/pages/employee/payslips"));
const EmployeeAttendance = lazy(() => import("@/pages/employee/attendance"));
const EmployeeTeam = lazy(() => import("@/pages/employee/team"));
const EmployeeLeave = lazy(() => import("@/pages/employee/leave"));
const ContractDocumentsPage = lazy(() => import("@/pages/admin/contract-documents"));

const ADMIN_NAV = [
  {
    label: "Tổng quan",
    items: [{ to: "/admin", label: "Tổng quan", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Nhân sự",
    items: [
      { to: "/admin/ho-so-hop-dong", label: "Hồ sơ hợp đồng", icon: FileStack },
      { to: "/admin/nhan-vien", label: "Nhân viên", icon: Users },
      { to: "/admin/phong-ban", label: "Phòng ban", icon: Building2 },
      { to: "/admin/nghi-phep", label: "Nghỉ phép", icon: Plane },
    ],
  },
  {
    label: "Tiền lương",
    items: [
      { to: "/admin/cham-cong", label: "Chấm công & OT", icon: ClipboardList },
      { to: "/admin/hop-dong", label: "Hợp đồng", icon: FileSignature },
      { to: "/admin/bang-luong", label: "Bảng lương", icon: Wallet },
    ],
  },
];

const EMPLOYEE_NAV = [
  {
    label: "Cá nhân",
    items: [
      { to: "/nhan-vien", label: "Tổng quan", icon: LayoutDashboard, end: true },
      { to: "/nhan-vien/ho-so", label: "Hồ sơ", icon: UserRound },
    ],
  },
  {
    label: "Công việc",
    items: [
      { to: "/nhan-vien/phieu-luong", label: "Phiếu lương", icon: FileText },
      { to: "/nhan-vien/cham-cong", label: "Chấm công", icon: CalendarCheck },
      { to: "/nhan-vien/nghi-phep", label: "Nghỉ phép", icon: Plane },
      { to: "/nhan-vien/dong-nghiep", label: "Đồng nghiệp", icon: UsersRound },
    ],
  },
];

function FullScreenLoader() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-5" aria-busy="true">
      <BrandMark className="size-12" playing />
      <ShimmeringText
        text="Đang kiểm tra phiên đăng nhập…"
        className="text-[14px]"
        color="var(--color-muted-foreground)"
        shimmeringColor="var(--color-foreground)"
      />
    </div>
  );
}

/** Chặn truy cập theo vai trò (users.role). */
function RequireRole({ role, children }) {
  const { user, isLoading, error, retry } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;
  if (error) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md items-center px-4">
        <ErrorState error={error} onRetry={retry} className="w-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  return <Navigate to={user ? homeFor(user.role) : "/login"} replace />;
}

function GuestOnly({ children }) {
  const { isLoading } = useAuth();
  return isLoading ? <FullScreenLoader /> : children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />

      <Route path="/admin" element={<RequireRole role="ADMIN"><AdminShell groups={ADMIN_NAV} title="Quản trị" /></RequireRole>}>
        <Route index element={<AdminOverview />} />
        <Route path="ho-so-hop-dong" element={<ContractDocumentsPage />} />
        <Route path="nhan-vien" element={<EmployeesPage />} />
        <Route path="phong-ban" element={<DepartmentsPage />} />
        <Route path="nghi-phep" element={<LeaveRequestsPage />} />
        <Route path="cham-cong" element={<AttendancePage />} />
        <Route path="hop-dong" element={<ContractsPage />} />
        <Route path="bang-luong" element={<PayrollPage />} />
      </Route>

      <Route path="/nhan-vien" element={<RequireRole role="EMPLOYEE"><AdminShell groups={EMPLOYEE_NAV} title="Cổng nhân viên" subtitle="Cổng nhân viên" searchLabel="Tìm trang…" /></RequireRole>}>
        <Route index element={<EmployeeOverview />} />
        <Route path="ho-so" element={<EmployeeProfile />} />
        <Route path="phieu-luong" element={<EmployeePayslips />} />
        <Route path="cham-cong" element={<EmployeeAttendance />} />
        <Route path="nghi-phep" element={<EmployeeLeave />} />
        <Route path="dong-nghiep" element={<EmployeeTeam />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: (count, err) => err?.status !== 401 && err?.status !== 403 && count < 1 },
    },
  });
}

const queryClient = createQueryClient();

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {/* useTransitions: điều hướng chạy trong startTransition → hiệu ứng chuyển trang (View Transitions) */}
            <BrowserRouter useTransitions>
              <AppRoutes />
            </BrowserRouter>
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
