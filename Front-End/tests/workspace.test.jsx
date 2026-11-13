import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { useWorkspace } from "../src/hooks/use-workspace";
import { createContractsApi } from "../src/lib/contracts-api";
import { EmployeeEditor } from "../src/features/employee-editor";
import { seedEmployees, exportCsv } from "../src/data/workspace";
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart: () => <div aria-label="Biểu đồ mẫu" />,
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));
describe("PeopleOS workspace flows", () => {
  it("loads, persists, restores and resets the demo workspace", () => {
    const first = renderHook(() => useWorkspace());
    expect(first.result.current.employees).toHaveLength(24);
    act(() => first.result.current.save(seedEmployees.slice(0, 2)));
    first.unmount();
    const restored = renderHook(() => useWorkspace());
    expect(restored.result.current.employees).toHaveLength(2);
    act(() => restored.result.current.reset());
    expect(restored.result.current.employees).toHaveLength(24);
  });
  it("recovers from corrupt persisted data", () => {
    localStorage.setItem("qlns-workspace-v1", '[{"id":1}]');
    expect(
      renderHook(() => useWorkspace()).result.current.employees,
    ).toHaveLength(24);
  });
  it("searches without Vietnamese accents and clears an empty result", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByRole("textbox", { name: "Tìm nhân viên" });
    await user.type(input, "nguyen minh anh");
    expect(screen.getByRole("table")).toHaveTextContent("Nguyễn Minh Anh");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await user.clear(input);
    await user.type(input, "no-such-person");
    expect(screen.getByText("Không tìm thấy kết quả")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(screen.getAllByRole("row")).toHaveLength(9);
  });
  it("creates an employee and keeps the new record after reload", async () => {
    const user = userEvent.setup();
    const app = render(<App />);
    await user.click(screen.getByRole("button", { name: "Thêm nhân viên" }));
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("Họ và tên"),
      "Nhân Viên Mới",
    );
    await user.type(
      within(dialog).getByLabelText("Email công việc"),
      "new@acme.vn",
    );
    await user.type(within(dialog).getByLabelText("Chức danh"), "QA Engineer");
    await user.click(
      within(dialog).getByRole("button", { name: "Thêm nhân viên" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("table")).toHaveTextContent("Nhân Viên Mới");
    expect(JSON.parse(localStorage.getItem("qlns-workspace-v1"))).toHaveLength(
      25,
    );
    app.unmount();
    render(<App />);
    expect(screen.getByRole("table")).toHaveTextContent("Nhân Viên Mới");
  });
  it("rejects duplicate email before saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <EmployeeEditor
        employee={seedEmployees[0]}
        employees={seedEmployees}
        mode="employee"
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    const email = screen.getByLabelText("Email công việc");
    await user.clear(email);
    await user.type(email, seedEmployees[1].email);
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  it("saves contract fields through the contract editor", async () => {
    window.location.hash = "#contracts";
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: /Đặng Yến Nhi\s*NV024/ }),
    );
    const input = screen.getByLabelText("Lương cơ bản (VNĐ)");
    await user.clear(input);
    await user.type(input, "42000000");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      JSON.parse(localStorage.getItem("qlns-workspace-v1")).find(
        (e) => e.id === 24,
      ).base_salary,
    ).toBe(42000000);
    expect(screen.getByRole("table")).toHaveTextContent("42.000.000");
  });
  it("navigates to a department and applies its filter", async () => {
    window.location.hash = "#departments";
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: "Xem đội ngũ" })[0]);
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Đội ngũ của chúng ta",
      ),
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Kỹ thuật");
    expect(screen.getAllByRole("row")).toHaveLength(
      seedEmployees.filter((e) => e.department === "Kỹ thuật").length + 1,
    );
  });
  it("opens quick search with Ctrl+K and selects an employee", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("{Control>}k{/Control}");
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByRole("textbox", { name: "Từ khóa tìm kiếm" }),
      "NV001",
    );
    await user.click(
      within(dialog).getByRole("button", { name: /Nguyễn Minh Anh/ }),
    );
    expect(
      await screen.findByDisplayValue("Nguyễn Minh Anh"),
    ).toBeInTheDocument();
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
describe("documented contract API adapter", () => {
  it("uses GET and PUT endpoints, JSON bodies and handles 204", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 7 }]), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const api = createContractsApi("https://api.example.test/");
    expect(await api.list()).toEqual([{ id: 7 }]);
    const data = {
      base_salary: 20000000,
      insurance_salary: 12000000,
      dependents_count: 1,
      allowance: 1000000,
    };
    expect(await api.update(7, data)).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/api/contracts",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.example.test/api/contracts/7",
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify(data),
    });
  });
  it("surfaces a non-success response instead of returning sample data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Not found", { status: 404 })),
    );
    await expect(createContractsApi("").get(1)).rejects.toThrow("HTTP 404");
  });
});
