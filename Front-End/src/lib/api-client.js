import axios from "axios";

/**
 * Client axios dùng chung cho mọi lời gọi backend PHP.
 *
 * Backend định tuyến bằng query `?action=...` và luôn trả JSON dạng
 *   { success: boolean, data: any, message: string }
 * Hàm `callApi` trả về phần `data`, hoặc ném `ApiError` kèm `message` của backend.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // gửi cookie phiên PHPSESSID
  headers: { Accept: "application/json" },
  timeout: 15000,
});

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function callApi(action, { method = "GET", data, params } = {}) {
  try {
    const res = await http.request({
      url: "/",
      method,
      data,
      params: { action, ...params },
    });
    const body = res.data;
    if (!body || typeof body !== "object" || !("success" in body)) {
      throw new ApiError(
        "Phản hồi từ backend không đúng định dạng JSON. Kiểm tra BACKEND_URL.",
        res.status,
      );
    }
    if (!body.success) throw new ApiError(body.message, res.status);
    return body.data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.response) {
      const message =
        err.response.data?.message ||
        `Yêu cầu thất bại (HTTP ${err.response.status}).`;
      throw new ApiError(message, err.response.status);
    }
    throw new ApiError(
      "Không thể kết nối máy chủ. Kiểm tra backend PHP đang chạy.",
      0,
    );
  }
}
