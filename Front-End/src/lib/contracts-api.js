// Contract endpoints documented in Hướng dẫn API Data/API Data UC-01.jpg.
// These endpoints are planned; the current PHP backend only implements Home.
export function createContractsApi(baseUrl) {
  async function request(path, init) {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/contracts${path}`,
      {
        ...init,
        headers: {
          Accept: "application/json",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
      },
    );
    if (!response.ok)
      throw new Error(`Yêu cầu hợp đồng thất bại (HTTP ${response.status}).`);
    if (response.status === 204) return null;
    return response.json();
  }
  return {
    list: (signal) => request("", { signal }),
    get: (id, signal) => request(`/${id}`, { signal }),
    update: (id, data) =>
      request(`/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  };
}
