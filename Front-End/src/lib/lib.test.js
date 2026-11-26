import { describe, expect, it } from "vitest";
import { buildMonth, summarizeMonth } from "@/components/employee/month-calendar";
import { formatDate, formatNumber, givenName } from "@/lib/format";
import { groupByDepartment, monthToDateEarnings } from "@/lib/hr";
import { countWorkdays, formatRange } from "@/lib/leave";

describe("lib/leave", () => {
  it("đếm ngày làm việc T2–T6 (khớp LeavePolicy::workdays)", () => {
    expect(countWorkdays("2026-12-07", "2026-12-08")).toBe(2); // T2–T3
    expect(countWorkdays("2026-12-05", "2026-12-06")).toBe(0); // T7–CN
    expect(countWorkdays("2026-12-04", "2026-12-14")).toBe(7);
    expect(countWorkdays("2026-12-08", "2026-12-07")).toBe(0); // ngược
    expect(countWorkdays("", "2026-12-07")).toBe(0);
  });

  it("định dạng khoảng ngày", () => {
    expect(formatRange("2026-12-07", "2026-12-08")).toBe("07/12 – 08/12/2026");
    expect(formatRange("2026-12-07", "2026-12-07")).toBe("07/12/2026");
    expect(formatRange("2026-12-30", "2027-01-02")).toBe("30/12/2026 – 02/01/2027");
  });
});

describe("lịch tháng", () => {
  const records = [
    { work_date: "2026-11-02", status: "PRESENT", work_hours: 8, ot_hours: 0, check_in: "08:25", shift_start: "08:30" },
    { work_date: "2026-11-03", status: "LATE", work_hours: 7.75, ot_hours: 1.5, check_in: "08:45", shift_start: "08:30" },
    { work_date: "2026-11-04", status: "LEAVE", work_hours: 0, ot_hours: 0 },
  ];

  it("lưới bắt đầu từ Thứ Hai, đủ bội số 7", () => {
    const cells = buildMonth("2026-11", records);
    expect(cells.length % 7).toBe(0);
    // 01/11/2026 là Chủ nhật → 6 ô trống phía trước
    expect(cells.slice(0, 6).every((c) => c === null)).toBe(true);
    expect(cells[6]).toMatchObject({ day: 1, weekend: true });
    expect(cells.filter(Boolean)).toHaveLength(30);
  });

  it("tổng hợp buổi làm, nghỉ, giờ, phút muộn", () => {
    const s = summarizeMonth(buildMonth("2026-11", records));
    expect(s.worked).toBe(2);
    expect(s.off).toBe(1);
    expect(s.hours).toBe(15.75);
    expect(s.ot).toBe(1.5);
    expect(s.lateMinutes).toBe(15);
    expect(s.standard).toBe(21); // T2–T6 của 11/2026
  });
});

describe("lib/hr", () => {
  it("gom phòng ban, sắp theo số người", () => {
    const emp = (department, status = "Đang làm việc") => ({ department, status, base_salary: 10, allowance: 1 });
    const groups = groupByDepartment([emp("A"), emp("B"), emp("B", "Thử việc"), emp(null)]);
    expect(groups.map((g) => g.name)).toEqual(["B", "A", "Chưa phân phòng"]);
    expect(groups[0]).toMatchObject({ payroll: 22, byStatus: { "Đang làm việc": 1, "Thử việc": 1 } });
  });

  it("lương tạm tính theo ngày đã làm", () => {
    const schedule = { monday: "08:30 - 17:30", tuesday: "08:30 - 17:30", wednesday: "08:30 - 17:30", thursday: "08:30 - 17:30", friday: "08:30 - 17:30" };
    const r = monthToDateEarnings({
      contract: { base_salary: 20_000_000, allowance: 2_000_000 },
      schedule,
      period: { month_year: "2026-11", standard_days: 22 },
      attendanceRecords: [
        { work_date: "2026-11-02", status: "PRESENT" },
        { work_date: "2026-11-03", status: "LATE" },
        { work_date: "2026-11-04", status: "REMOTE" },
      ],
      now: new Date(2026, 10, 4, 18, 0), // T4 04/11 sau giờ tan ca
    });
    expect(r).toMatchObject({ monthYear: "2026-11", workedDays: 3, standardDays: 22, dailyRate: 1_000_000, earned: 3_000_000 });
  });

  it("ước tính lương theo ngày chấm công thực tế, bỏ ngày nghỉ/vắng và ngày chưa kết thúc ca", () => {
    const schedule = { monday: "08:30 - 17:30", tuesday: "08:30 - 17:30", wednesday: "08:30 - 17:30", thursday: "08:30 - 17:30", friday: "08:30 - 17:30" };
    const workedDates = ["02", "03", "04", "05", "06", "09", "10", "11", "12", "13", "16", "17", "18"];
    const attendanceRecords = [
      ...workedDates.map((day) => ({ work_date: `2026-11-${day}`, status: "PRESENT" })),
      { work_date: "2026-11-19", status: "LEAVE" },
      { work_date: "2026-11-20", status: "ABSENT" },
      { work_date: "2026-11-26", status: "PRESENT" },
    ];
    const r = monthToDateEarnings({
      contract: { base_salary: 20_000_000, allowance: 2_000_000 },
      schedule,
      period: { month_year: "2026-11", standard_days: 22 },
      attendanceRecords,
      now: new Date(2026, 10, 26, 12, 0),
    });
    expect(r).toMatchObject({ workedDays: 13, standardDays: 22, dailyRate: 1_000_000, earned: 13_000_000 });
  });
});

describe("lib/format", () => {
  it("số, ngày, tên gọi", () => {
    expect(formatNumber(1234.5)).toBe("1.234,5");
    expect(formatDate("2026-01-02")).toMatch(/02\/01\/2026/);
    expect(givenName("Trần Thị Bình")).toBe("Bình");
  });
});
