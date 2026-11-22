import { DefenseAppointment } from '../types/defense';

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function formatIcsLocalDateTime(isoDate: string, hhmm: string): string {
  const datePart = isoDate.replace(/-/g, '');
  const timePart = hhmm.replace(/:/g, '').padEnd(4, '0');
  return `${datePart}T${timePart}00`;
}

export function downloadDefenseCalendarInvite(appointment: DefenseAppointment): void {
  const dtStart = formatIcsLocalDateTime(appointment.date, appointment.startTime);
  const dtEnd = formatIcsLocalDateTime(appointment.date, appointment.endTime);
  const dtStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

  const descriptionLines = [
    `Mapua University SOIT UOx Online Thesis Defense (${appointment.id})`,
    `Thesis Title: ${appointment.thesisTitle}`,
    `Candidate: ${appointment.studentName} (${appointment.studentId})`,
    `Primary Adviser: ${appointment.advisorName}`,
    `Panel Members: ${appointment.committeeMembers.join(', ')}`,
    `Virtual Channel: ${appointment.zoomRoomName}`,
    appointment.zoomLink
      ? `Zoom Link: ${appointment.zoomLink}`
      : 'Zoom Link: Pending assignment by SOIT Coordinator',
    appointment.zoomPasscode ? `Zoom Passcode: ${appointment.zoomPasscode}` : '',
    'Please join 10 minutes early using your official Mapua email.',
  ].filter(Boolean);

  const locationValue = appointment.zoomLink
    ? `${appointment.zoomRoomName} — ${appointment.zoomLink}`
    : `${appointment.zoomRoomName} (Mapua UOx Zoom)`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ThesisDesk//Mapua SOIT UOx Defense Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${appointment.id.toLowerCase()}@thesisdesk.mapua.edu.ph`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(`Thesis Defense: ${appointment.thesisTitle}`)}`,
    `LOCATION:${escapeIcsText(locationValue)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`,
    appointment.zoomLink ? `URL:${appointment.zoomLink}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Mapua_UOx_Defense_${appointment.id}_${appointment.date}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
