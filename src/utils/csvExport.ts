import { DefenseAppointment } from '../types/defense';
import { formatTimeRange } from './dateUtils';

function escapeCsvCell(value: string | undefined): string {
  const str = (value ?? '').replace(/\r?\n/g, ' ');
  if (/[",]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates and downloads a UTF-8 CSV schedule roster for SOIT coordinators.
 */
export function downloadDefenseScheduleCsv(
  appointments: DefenseAppointment[],
  fileBaseName: string
): void {
  const headers = [
    'Appointment ID',
    'Status',
    'Date',
    'Time Window',
    'Student Name',
    'Student ID',
    'Program',
    'Thesis Title',
    'Adviser',
    'Committee Panel',
    'Zoom Room',
    'Zoom Link',
    'Zoom Passcode',
    'Coordinator Notes',
  ];

  const rows = appointments.map((appt) =>
    [
      appt.id,
      appt.status,
      appt.date,
      formatTimeRange(appt.startTime, appt.endTime),
      appt.studentName,
      appt.studentId,
      appt.program,
      appt.thesisTitle,
      appt.advisorName,
      appt.committeeMembers.join('; '),
      appt.zoomRoomName,
      appt.zoomLink || 'Unassigned',
      appt.zoomPasscode || '',
      appt.adminFeedback || appt.notes || '',
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  // Prefix UTF-8 BOM so Excel preserves accented characters like "Mapúa"
  const csvContent = `\uFEFF${[headers.map(escapeCsvCell).join(','), ...rows].join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileBaseName.replace(/[^a-zA-Z0-9_-]/g, '-')}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
