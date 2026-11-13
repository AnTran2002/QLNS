import { useState } from "react";
import { seedEmployees } from "@/data/workspace";
import { toast } from "sonner";
const STORAGE_KEY = "qlns-workspace-v1";
function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (e) =>
          e &&
          Number.isFinite(e.id) &&
          typeof e.full_name === "string" &&
          typeof e.email === "string" &&
          typeof e.department === "string" &&
          typeof e.joined_at === "string" &&
          ["Đang làm việc", "Thử việc", "Nghỉ phép"].includes(e.status) &&
          [
            "base_salary",
            "insurance_salary",
            "allowance",
            "dependents_count",
          ].every((k) => Number.isFinite(e[k])),
      )
    )
      return parsed;
  } catch {
    /* Recover with demo data when storage is unavailable or invalid. */
  }
  return seedEmployees;
}
export function useWorkspace() {
  const [employees, setEmployees] = useState(load);
  function save(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      toast.error(
        "Không thể lưu trên trình duyệt. Thay đổi chỉ được giữ trong phiên hiện tại.",
      );
    }
    setEmployees(next);
  }
  return { employees, save, reset: () => save(seedEmployees) };
}
