import { useEffect, useState } from "react";
import { CircleDollarSign, Edit, Eye, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ContractsUc01() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchContracts = () => {
    setLoading(true);
    setError(null);
    api.get("/contracts")
      .then((res) => {
        if (res.data.status === "success" || res.data.success === true) {
          setContracts(res.data.data || []);
        } else {
          setError(res.data.message || "Không thể tải danh sách hợp đồng");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi khi tải hợp đồng:", err);
        setError("Không thể kết nối đến API Backend PHP (localhost:8000).");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        base_salary: Number(editing.base_salary),
        insurance_salary: Number(editing.insurance_salary),
        allowance: Number(editing.allowance),
        dependents_count: Number(editing.dependents_count),
      };
      const res = await api.put(`/contracts/${editing.id}`, payload);
      if (res.data.status === "success" || res.data.success === true) {
        toast.success(`Đã cập nhật hợp đồng của ${editing.full_name}!`);
        setEditing(null);
        fetchContracts();
      } else {
        toast.error(res.data.message || "Cập nhật thất bại");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Lỗi khi cập nhật");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="text-xs font-semibold tracking-wider text-blue-600 uppercase mb-0.5">
            UC-01 · Quản lý Hợp đồng & Lương nhân sự (API Realtime)
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Dữ liệu Hợp đồng từ MySQL Backend PHP
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Kết nối API <code className="bg-gray-100 text-blue-700 px-1 py-0.5 rounded font-mono text-[11px]">GET /api/contracts</code> & <code className="bg-gray-100 text-blue-700 px-1 py-0.5 rounded font-mono text-[11px]">PUT /api/contracts/:id</code>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchContracts}
          disabled={loading}
          className="gap-2 shrink-0 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Làm mới</span>
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Lỗi kết nối API: </strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Mã NV</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Họ và tên</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Phòng ban</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider">Chức vụ</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">Lương cơ bản</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">Lương BHXH</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wider">Phụ cấp</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider">NPT</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang tải danh sách hợp đồng từ server...</span>
                    </div>
                  </td>
                </tr>
              ) : contracts.length > 0 ? (
                contracts.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-blue-600 font-mono">
                      {item.employee_code}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.full_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px]">
                        {item.department || "Chưa phân bổ"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.position || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {Number(item.base_salary).toLocaleString("vi-VN")} đ
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {Number(item.insurance_salary || 0).toLocaleString("vi-VN")} đ
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {Number(item.allowance || 0).toLocaleString("vi-VN")} đ
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 font-medium">
                      {item.dependents_count || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                          title="Xem chi tiết"
                          onClick={() => setViewing(item)}
                        >
                          <Eye size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          title="Sửa thông số hợp đồng"
                          onClick={() => setEditing({ ...item })}
                        >
                          <Edit size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    Chưa có hợp đồng nào trong CSDL.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
          <span>Tổng số: <strong className="text-gray-900">{contracts.length}</strong> hợp đồng</span>
          <span>Hệ thống phân quyền Role-based: <span className="font-semibold text-blue-700">ADMIN</span></span>
        </div>
      </div>

      {/* Modal Xem chi tiết (GET /api/contracts/:id) */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chi tiết Hợp đồng</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết hợp đồng của {viewing?.full_name} ({viewing?.employee_code})
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div>
                  <span className="text-gray-500 block">Mã nhân viên</span>
                  <strong className="text-blue-700 font-mono text-sm">{viewing.employee_code}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Họ và tên</span>
                  <strong className="text-gray-900 text-sm">{viewing.full_name}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Phòng ban</span>
                  <span className="text-gray-800 font-medium">{viewing.department}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Chức vụ</span>
                  <span className="text-gray-800 font-medium">{viewing.position}</span>
                </div>
              </div>

              <div className="space-y-2 border-t pt-2">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Mức lương cơ bản thỏa thuận:</span>
                  <strong className="text-emerald-700">{Number(viewing.base_salary).toLocaleString("vi-VN")} đ</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Mức lương làm căn cứ đóng BHXH:</span>
                  <strong className="text-gray-900">{Number(viewing.insurance_salary).toLocaleString("vi-VN")} đ</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Phụ cấp cố định hàng tháng:</span>
                  <strong className="text-gray-900">{Number(viewing.allowance).toLocaleString("vi-VN")} đ</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Số người phụ thuộc (giảm trừ gia cảnh):</span>
                  <strong className="text-gray-900">{viewing.dependents_count || 0} người</strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setViewing(null)}>Đóng</Button>
                <Button size="sm" onClick={() => { setEditing({ ...viewing }); setViewing(null); }}>
                  Chỉnh sửa thông số
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Chỉnh sửa thông số hợp đồng (PUT /api/contracts/:id) */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cập nhật thông số hợp đồng</DialogTitle>
            <DialogDescription>
              Cập nhật lương cơ bản, BHXH, phụ cấp cho {editing?.full_name} ({editing?.employee_code})
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="base_salary" className="text-xs">Lương cơ bản (VNĐ)</Label>
                <Input
                  id="base_salary"
                  type="number"
                  value={editing.base_salary}
                  onChange={(e) => setEditing({ ...editing, base_salary: e.target.value })}
                  required
                  min="0"
                  step="100000"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="insurance_salary" className="text-xs">Lương đóng BHXH (VNĐ)</Label>
                <Input
                  id="insurance_salary"
                  type="number"
                  value={editing.insurance_salary}
                  onChange={(e) => setEditing({ ...editing, insurance_salary: e.target.value })}
                  required
                  min="0"
                  step="100000"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="allowance" className="text-xs">Phụ cấp (VNĐ)</Label>
                <Input
                  id="allowance"
                  type="number"
                  value={editing.allowance}
                  onChange={(e) => setEditing({ ...editing, allowance: e.target.value })}
                  required
                  min="0"
                  step="50000"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="dependents_count" className="text-xs">Số người phụ thuộc</Label>
                <Input
                  id="dependents_count"
                  type="number"
                  value={editing.dependents_count}
                  onChange={(e) => setEditing({ ...editing, dependents_count: e.target.value })}
                  required
                  min="0"
                  max="20"
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
