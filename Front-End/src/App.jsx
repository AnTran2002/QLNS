import { useEffect, useState } from "react";
import api from "./services/api";
import "./App.css";

export default function App() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContracts = () => {
    setLoading(true);
    setError(null);
    // Gọi API lấy danh sách hợp đồng (UC-01)
    api.get('/contracts') // Tương ứng với router API bên PHP
      .then(response => {
        if (response.data.status === 'success' || response.data.success === true) {
          setContracts(response.data.data || []);
        } else {
          setError(response.data.message || 'Không thể lấy dữ liệu từ máy chủ.');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi khi kết nối đến PHP API:", err);
        setError("Không thể kết nối đến PHP API. Vui lòng kiểm tra Backend PHP đang chạy tại http://localhost:8000.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-200">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-700 font-medium text-sm">Đang tải dữ liệu từ Server Backend PHP...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <div>
            <div className="text-xs font-semibold tracking-wider text-blue-600 uppercase mb-1">
              UC-01 · Dữ liệu Kết Nối API Backend & Frontend
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Danh sách Hợp đồng & Lương Nhân sự
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Dữ liệu được lấy trực tiếp từ CSDL MySQL <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-700 font-mono text-xs">qlns</code> qua API Backend PHP.
            </p>
          </div>
          <button
            onClick={fetchContracts}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Tải lại dữ liệu
          </button>
        </div>

        {/* Thông báo lỗi nếu không kết nối được */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <strong className="font-semibold">Lỗi kết nối: </strong>
              <span>{error}</span>
              <div className="mt-1 text-xs text-red-600">
                Gợi ý: Mở terminal chạy lệnh <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono">cd Back-End; php -S localhost:8000 index.php</code>
              </div>
            </div>
          </div>
        )}

        {/* Bảng dữ liệu hợp đồng */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/75">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã NV</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Họ tên</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phòng ban</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Chức danh</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Lương cơ bản</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Lương BHXH</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Phụ cấp</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Người phụ thuộc</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {contracts.length > 0 ? (
                  contracts.map(item => (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 font-mono">
                        {item.employee_code}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.full_name}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item.department || "Chưa phân bổ"}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.position || "—"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-right font-semibold text-emerald-600">
                        {Number(item.base_salary).toLocaleString("vi-VN")} đ
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                        {Number(item.insurance_salary || 0).toLocaleString("vi-VN")} đ
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                        {Number(item.allowance || 0).toLocaleString("vi-VN")} đ
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                        {item.dependents_count || 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-sm text-gray-500">
                      {error ? "Không thể tải dữ liệu hợp đồng do lỗi kết nối." : "Chưa có hợp đồng nào trong hệ thống."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
            <span>Tổng cộng: <strong className="text-gray-900 font-semibold">{contracts.length}</strong> hợp đồng</span>
            <span>API Endpoint: <code className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-blue-600">GET /api/contracts</code></span>
          </div>
        </div>
      </div>
    </div>
  );
}
