import { useCallback, useEffect, useState } from "react";
import { employeesApi } from "@/lib/employees-api";

/**
 * Danh sách nhân viên + hợp đồng lấy từ backend (database qlns).
 * Truyền enabled=false để không gọi API (ví dụ khi chưa đăng nhập admin).
 */
const INITIAL = { employees: [], error: null, loaded: false };

export function useWorkspace(enabled = true) {
  const [state, setState] = useState(INITIAL);

  const fetchList = useCallback(
    () =>
      employeesApi
        .list()
        .then((rows) => ({ employees: rows, error: null, loaded: true }))
        .catch((err) => ({ employees: [], error: err.message, loaded: true })),
    [],
  );

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    fetchList().then((next) => !cancelled && setState(next));
    return () => {
      cancelled = true;
      setState(INITIAL); // đăng xuất → xóa dữ liệu cũ khỏi bộ nhớ
    };
  }, [enabled, fetchList]);

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, error: null, loaded: false }));
    setState(await fetchList());
  }, [fetchList]);

  const setEmployees = useCallback(
    (update) => setState((s) => ({ ...s, employees: update(s.employees) })),
    [],
  );

  /** Thêm mới (không có id) hoặc cập nhật (có id). Trả về bản ghi backend trả về. */
  const saveEmployee = useCallback(async (employee) => {
    const saved = employee.id
      ? await employeesApi.update(employee.id, employee)
      : await employeesApi.create(employee);
    setEmployees((list) =>
      employee.id
        ? list.map((e) => (e.id === saved.id ? saved : e))
        : [...list, saved],
    );
    return saved;
  }, [setEmployees]);

  const removeEmployee = useCallback(async (id) => {
    await employeesApi.remove(id);
    setEmployees((list) => list.filter((e) => e.id !== id));
  }, [setEmployees]);

  return {
    employees: enabled ? state.employees : [],
    loading: enabled && !state.loaded,
    error: enabled ? state.error : null,
    reload,
    saveEmployee,
    removeEmployee,
  };
}
