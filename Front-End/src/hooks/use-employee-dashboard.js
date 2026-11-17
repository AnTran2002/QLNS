import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Dữ liệu cổng nhân viên — GET ?action=employee/dashboard (EmployeeController::dashboard) */
export function useEmployeeDashboard() {
  return useQuery({ queryKey: ["employee-dashboard"], queryFn: api.employeeDashboard, staleTime: 60_000 });
}
