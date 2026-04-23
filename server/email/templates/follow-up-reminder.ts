type FollowUpReminderInput = {
  agentName: string;
  landlordName: string;
  landlordPhone: string;
  scheduledAt: Date;
  minutesUntil: number;
  potentialLandlordId: string;
};

export function buildFollowUpReminderTemplate(input: FollowUpReminderInput) {
  const timeStr = input.scheduledAt.toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const subject =
    input.minutesUntil <= 5
      ? `⏰ Follow-up in 5 minutes – ${input.landlordName}`
      : `🔔 Follow-up reminder in 1 hour – ${input.landlordName}`;

  const text = [
    `Hi ${input.agentName},`,
    ``,
    `This is a reminder that you have a follow-up scheduled ${input.minutesUntil <= 5 ? "in 5 minutes" : "in 1 hour"} with:`,
    ``,
    `Name: ${input.landlordName}`,
    `Phone: ${input.landlordPhone}`,
    `Scheduled: ${timeStr}`,
    ``,
    `Log in to the MHG Portal to manage this follow-up.`,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#080810;color:#f0ead8;padding:2rem;">
<div style="max-width:520px;margin:0 auto;background:#111118;border:1px solid #2a2a35;border-radius:12px;padding:2rem;">
  <h2 style="color:#c9a84c;margin-top:0;">${input.minutesUntil <= 5 ? "⏰ Follow-up in 5 minutes" : "🔔 Follow-up Reminder"}</h2>
  <p>Hi <strong>${input.agentName}</strong>,</p>
  <p>You have a follow-up scheduled <strong>${input.minutesUntil <= 5 ? "in 5 minutes" : "in 1 hour"}</strong>:</p>
  <table style="width:100%;border-collapse:collapse;margin:1rem 0;">
    <tr><td style="padding:0.5rem;color:#8a7e68;">Name</td><td style="padding:0.5rem;font-weight:600;">${input.landlordName}</td></tr>
    <tr><td style="padding:0.5rem;color:#8a7e68;">Phone</td><td style="padding:0.5rem;">${input.landlordPhone}</td></tr>
    <tr><td style="padding:0.5rem;color:#8a7e68;">Scheduled</td><td style="padding:0.5rem;color:#c9a84c;font-weight:600;">${timeStr}</td></tr>
  </table>
  <p style="font-size:0.85rem;color:#8a7e68;">Log in to your MHG Portal to manage this follow-up.</p>
</div>
</body>
</html>`;

  return { subject, text, html };
}
