/** Transactional email through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email). */
export async function sendEmail({ to, subject, html, from }: { to: string; subject: string; html: string; from?: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: from ?? process.env.REPORT_FROM_EMAIL, to: [to], subject, html }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(`Email not sent: ${body?.message ?? `HTTP ${response.status}`}`);
  }
}
