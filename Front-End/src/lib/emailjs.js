/**
 * Gửi email qua EmailJS (https://www.emailjs.com) — gọi REST API trực tiếp, không cần thư viện.
 *
 * Cấu hình trong Front-End/.env:
 *   VITE_EMAILJS_SERVICE_ID=service_xxx
 *   VITE_EMAILJS_TEMPLATE_ID=template_xxx
 *   VITE_EMAILJS_PUBLIC_KEY=xxxxxxxx
 *
 * Template EmailJS nên dùng các biến: {{to_email}}, {{to_name}}, {{position}}, {{branch}},
 * {{start_date}}, {{base_salary}}, {{contract_link}}, {{expires_at}}, {{company}}.
 * Trường "To Email" của template đặt là {{to_email}}.
 */
const ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

const env = import.meta.env;
export const emailjsConfig = {
  serviceId: env.VITE_EMAILJS_SERVICE_ID || "",
  templateId: env.VITE_EMAILJS_TEMPLATE_ID || "",
  publicKey: env.VITE_EMAILJS_PUBLIC_KEY || "",
};

export const emailjsReady = () => Boolean(emailjsConfig.serviceId && emailjsConfig.templateId && emailjsConfig.publicKey);

/** Link hợp đồng ứng viên mở để tải mẫu + nộp hợp đồng. */
export const contractLink = (token) => `${window.location.origin}/hop-dong/${token}`;

export async function sendEmail(params) {
  if (!emailjsReady()) {
    throw new Error("Chưa cấu hình EmailJS (VITE_EMAILJS_SERVICE_ID / TEMPLATE_ID / PUBLIC_KEY trong Front-End/.env)");
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: emailjsConfig.serviceId,
      template_id: emailjsConfig.templateId,
      user_id: emailjsConfig.publicKey,
      template_params: params,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`EmailJS từ chối gửi (HTTP ${res.status})${text ? `: ${text}` : ""}`);
  }
  return true;
}
