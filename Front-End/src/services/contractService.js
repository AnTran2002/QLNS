import api from './api';

/**
 * Service gọi các API cho UC-01 (Quản lý hợp đồng & lương)
 */
export const contractService = {
  /**
   * GET /api/contracts
   * Lấy danh sách toàn bộ hợp đồng kèm thông tin nhân sự
   */
  getAllContracts: () => api.get('/contracts'),

  /**
   * GET /api/contracts/{id}
   * Lấy chi tiết thông tin hợp đồng của 1 nhân viên
   */
  getContractById: (id) => api.get(`/contracts/${id}`),

  /**
   * PUT /api/contracts/{id}
   * Cập nhật thông số lương cơ bản, BHXH, giảm trừ gia cảnh
   */
  updateContract: (id, data) => api.put(`/contracts/${id}`, data),
};

export default contractService;
