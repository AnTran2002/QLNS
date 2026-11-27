import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const EMPTY = Object.freeze([]);

/**
 * Danh mục dùng chung đọc từ CSDL qua `?action=meta` (MetaController):
 * chi nhánh, phòng ban, ENUM trạng thái nhân viên, ngày lễ, tham số luật tính lương, cấu trúc hợp đồng…
 * Không có dữ liệu cứng phía Front-End — khi chưa tải xong, các danh sách là mảng rỗng.
 */
export function useMeta() {
  const query = useQuery({ queryKey: ["meta"], queryFn: api.meta, staleTime: 10 * 60_000, gcTime: 30 * 60_000 });
  const meta = query.data ?? {};
  return {
    ...query,
    meta,
    appName: meta.app_name ?? "PeopleOS",
    company: meta.company ?? null,
    branches: meta.branches ?? EMPTY,
    departments: meta.departments ?? EMPTY,
    employeeStatuses: meta.employee_statuses ?? EMPTY,
    genders: meta.genders ?? EMPTY,
    contractTypes: meta.contract_types ?? {},
    holidays: meta.holidays ?? EMPTY,
    payroll: meta.payroll ?? null,
    contractSchema: meta.contract_schema ?? null,
  };
}
