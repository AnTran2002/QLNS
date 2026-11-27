import { beforeEach, describe, expect, it, vi } from "vitest";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("axios", () => ({
  default: {
    create: () => ({ request }),
  },
}));

import { api } from "./api";

describe("api.createLeave", () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ status: 201, data: { success: true, data: { id: 8 } } });
  });

  it("sends the selected Article 115 personal event to the backend", async () => {
    await api.createLeave({
      type: "OTHER",
      personal_event: "FAMILY_DEATH",
      start_date: "2026-11-27",
      end_date: "2026-11-30",
      reason: "Mẹ mất",
    });

    expect(request).toHaveBeenCalledWith({
      url: "/",
      method: "POST",
      data: {
        type: "OTHER",
        personal_event: "FAMILY_DEATH",
        start_date: "2026-11-27",
        end_date: "2026-11-30",
        reason: "Mẹ mất",
      },
      params: { action: "employee/leave" },
    });
  });
});
