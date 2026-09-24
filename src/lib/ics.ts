function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
}

export function buildAppointmentIcs(params: {
  uid: string;
  startAt: Date;
  endAt: Date;
  summary: string;
  description?: string;
  location?: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agendamento SaaS//PT-BR",
    "BEGIN:VEVENT",
    `UID:${params.uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(params.startAt)}`,
    `DTEND:${toIcsUtc(params.endAt)}`,
    `SUMMARY:${escapeIcsText(params.summary)}`,
    params.description ? `DESCRIPTION:${escapeIcsText(params.description)}` : null,
    params.location ? `LOCATION:${escapeIcsText(params.location)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  return lines.join("\r\n");
}
