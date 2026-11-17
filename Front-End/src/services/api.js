import axios from 'axios';

/**
 * Cấu hình Axios instance để kết nối Backend PHP.
 *
 * baseURL:
 * - Ưu tiên biến môi trường VITE_API_BASE_URL (nếu được thiết lập trong .env)
 * - Mặc định dùng '/api' để thông qua Vite proxy (chuyển tiếp tới backend PHP tại http://localhost:8000)
 * - Tránh lỗi CORS và tự động gửi nhận cookie phiên (PHPSESSID)
 */
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

export default api;
