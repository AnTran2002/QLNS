import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { EmployeeEditor } from "../src/features/employee-editor";
import { exportCsv } from "../src/data/workspace";
import { authApi } from "../src/lib/auth-api";
import { employeesApi } from "../src/lib/employees-api";
import { callApi, http } from "../src/lib/api-client";
import { adminUser, employeeRows } from "./fixtures";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart: () => <div aria-label="Biểu đồ mẫu" />,
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

/** Giả lập backend: bảng users trong bộ nhớ. */
let db;
beforeEach(() => {
  db = employeeRows();
  vi.spyOn(authApi, "me").mockResolvedValue({ user: adminUser });
  vi.spyOn(authApi, "logout").mockResolvedValue(null);
  vi.spyOn(employeesApi, "list").mockImplementation(async () => [...db]);
  vi.spyOn(employeesApi, "create").mockImplementation(async (e) => {
    const saved = { ...e, id: Math.max(...db.map((r) => r.id)) + 1, role: "EMPLOYEE" };
    db.push(saved);
    return saved;
  });
  vi.spyOn(employeesApi, "update").mockImplementation(async (id, e) => {
    const saved = { ...db.find((r) => r.id === id), ...e, id };
    db = db.map((r) => (r.id === id ? saved : r));
    return saved;
  });
  vi.spyOn(employeesApi, "remove").mockImplementation(async (id) => {
    db = db.filter((r) => r.id !== id);
    return null;
  });
});

async function renderApp() {
  const view = render(<App />);
  await screen.findByRole("heading", { level: 1 });
  return view;
}

describe("PeopleOS workspace flows (API)", () => {
  it("shows the login page when the backend session is empty", async () => {
    authApi.me.mockRejectedValueOnce(new Error("Chưa đăng nhập"));
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Đăng nhập hệ thống" }),
    ).toBeInTheDocument();
    expect(employeesApi.list).not.toHaveBeenCalled();
  });

  it("loads employees from the API and searches without accents", async () => {
    const user = userEvent.setup();
    await renderApp();
    expect(await screen.findByRole("table")).toHaveTextContent("Trần Thị Bình");
    expect(employeesApi.list).toHaveBeenCalledOnce();
    const input = screen.getByRole("textbox", { name: "Tìm nhân viên" });
    await user.type(input, "le van cuong");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await user.clear(input);
    await user.type(input, "no-such-person");
    expect(screen.getByText("Không tìm thấy kết quả")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(screen.getAllByRole("row")).toHaveLength(db.length + 1);
  });

  it("shows an error state with retry when the API fails", async () => {
    employeesApi.list.mockRejectedValueOnce(
      new Error("Không thể kết nối máy chủ. Kiểm tra backend PHP đang chạy."),
    );
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể kết nối máy chủ",
    );
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("table")).toHaveTextContent("Trần Thị Bình");
  });

  it("creates an employee through the API", async () => {
    const user = userEvent.setup();
    await renderApp();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Thêm nhân viên" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Mã nhân viên")).toHaveValue("NV004");
    await user.type(within(dialog).getByLabelText("Họ và tên"), "Nhân Viên Mới");
    await user.type(within(dialog).getByLabelText("Email công việc"), "new@company.vn");
    await user.type(within(dialog).getByLabelText("Chức danh"), "QA Engineer");
    await user.click(within(dialog).getByRole("button", { name: "Thêm nhân viên" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(employeesApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        employee_code: "NV004",
        full_name: "Nhân Viên Mới",
        email: "new@company.vn",
      }),
    );
    expect(employeesApi.create.mock.calls[0][0].id).toBeUndefined();
    expect(screen.getByRole("table")).toHaveTextContent("Nhân Viên Mới");
  });

  it("keeps the editor open and shows the backend message when saving fails", async () => {
    employeesApi.create.mockRejectedValueOnce(new Error("Mã nhân viên hoặc email đã tồn tại"));
    const user = userEvent.setup();
    await renderApp();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Thêm nhân viên" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Họ và tên"), "Trùng Mã");
    await user.type(within(dialog).getByLabelText("Email công việc"), "dup@company.vn");
    await user.type(within(dialog).getByLabelText("Chức danh"), "Tester");
    await user.click(within(dialog).getByRole("button", { name: "Thêm nhân viên" }));
    expect(await screen.findByText("Mã nhân viên hoặc email đã tồn tại")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("rejects duplicate email before calling the API", async () => {
    const rows = employeeRows();
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <EmployeeEditor
        employee={rows[1]}
        employees={rows}
        mode="employee"
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    const email = screen.getByLabelText("Email công việc");
    await user.clear(email);
    await user.type(email, rows[2].email);
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("saves contract fields through the update API", async () => {
    window.location.hash = "#contracts";
    const user = userEvent.setup();
    await renderApp();
    await user.click(
      await screen.findByRole("button", { name: /Lê Văn Cường\s*NV003/ }),
    );
    const input = screen.getByLabelText("Lương cơ bản (VNĐ)");
    await user.clear(input);
    await user.type(input, "42000000");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(employeesApi.update).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ base_salary: 42000000 }),
    );
    expect(screen.getByRole("table")).toHaveTextContent("42.000.000");
  });

  it("navigates to a department and applies its filter", async () => {
    window.location.hash = "#departments";
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getAllByRole("button", { name: "Xem đội ngũ" })[0]);
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Đội ngũ của chúng ta",
      ),
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Kỹ thuật");
    expect(screen.getAllByRole("row")).toHaveLength(
      db.filter((e) => e.department === "Kỹ thuật").length + 1,
    );
  });

  it("opens quick search with Ctrl+K and selects an employee", async () => {
    const user = userEvent.setup();
    await renderApp();
    await screen.findByRole("table");
    await user.keyboard("{Control>}k{/Control}");
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByRole("textbox", { name: "Từ khóa tìm kiếm" }),
      "NV002",
    );
    await user.click(within(dialog).getByRole("button", { name: /Trần Thị Bình/ }));
    expect(await screen.findByDisplayValue("Trần Thị Bình")).toBeInTheDocument();
  });

  it("exports a CSV with BOM, quoting and spreadsheet formula protection", async () => {
    const createUrl = vi.fn(() => "blob:test");
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: createUrl,
        revokeObjectURL: vi.fn(),
      }),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    exportCsv(
      [{ Name: '=HYPERLINK("evil")', Note: 'Tiếng Việt, "quoted"' }],
      "report.csv",
    );
    const blob = createUrl.mock.calls[0][0];
    const text = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(blob);
    });
    expect(text).toContain(`"'=HYPERLINK(""evil"")"`);
    expect(text).toContain('"Tiếng Việt, ""quoted"""');
    expect(click).toHaveBeenCalledOnce();
  });
});

describe("api-client", () => {
  it("unwraps { success, data } and sends the action as a query param", async () => {
    const request = vi
      .spyOn(http, "request")
      .mockResolvedValue({ data: { success: true, data: [{ id: 7 }], message: "ok" } });
    expect(await callApi("employees", { params: { page: 2 } })).toEqual([{ id: 7 }]);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        params: { action: "employees", page: 2 },
      }),
    );
  });

  it("throws the backend message on HTTP errors", async () => {
    vi.spyOn(http, "request").mockRejectedValue({
      response: { status: 401, data: { success: false, message: "Chưa đăng nhập" } },
    });
    await expect(callApi("me")).rejects.toMatchObject({
      message: "Chưa đăng nhập",
      status: 401,
    });
  });
});
