import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Dữ liệu cổng nhân viên — GET ?action=employee/dashboard (EmployeeController::dashboard) */
export function useEmployeeDashboard() {
  return useQuery({ queryKey: ["employee-dashboard"], queryFn: api.employeeDashboard, staleTime: 60_000 });
}

/** Chấm công theo ngày — GET ?action=employee/attendance&month=YYYY-MM */
export function useEmployeeAttendance(month) {
  return useQuery({
    queryKey: ["employee-attendance", month ?? "latest"],
    queryFn: () => api.employeeAttendance(month),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
