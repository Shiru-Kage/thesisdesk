export type UserRole = 'student' | 'admin';

export type AppointmentStatus =
  | 'Pending Review'
  | 'Confirmed'
  | 'Reschedule Requested'
  | 'Completed'
  | 'Cancelled';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  studentId?: string;
  program?: string;
  avatarUrl: string;
}

export interface DefenseSlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  zoomRoomName: string;
  zoomLink: string;
  zoomMeetingId?: string;
  zoomPasscode?: string;
  department: string;
  chairName: string;
  isBlocked: boolean;
}

export interface DefenseAppointment {
  id: string;
  slotId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  program: string;
  department: string;
  thesisTitle: string;
  abstract: string;
  advisorName: string;
  committeeMembers: string[];
  status: AppointmentStatus;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  zoomRoomName: string;
  zoomLink: string;
  zoomMeetingId?: string;
  zoomPasscode?: string;
  notes?: string;
  adminFeedback?: string;
  createdAt: string;
}

export interface ZoomRoom {
  id: string;
  name: string;
  hostAccount: string;
  zoomLink: string;
  meetingId: string;
  passcode: string;
  features: string;
  available: boolean;
}

export interface FacultyChair {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  activeDefenses: number;
  available: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  dueNote: string;
  completed: boolean;
}

export type FileReviewStatus =
  | 'Pending Review'
  | 'Approved'
  | 'Revision Requested';

export interface RequiredDocumentSpec {
  id: string;
  title: string;
  description: string;
  acceptedFormats: string;
  sampleFileName: string;
  sampleFileSize: string;
  required: boolean;
}

export interface StudentFileSubmission {
  id: string;
  requirementId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  program: string;
  department: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: FileReviewStatus;
  facultyNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  objectUrl?: string;
}

export type QuartermStatus = 'Open' | 'Closed';

export interface QuartermPeriod {
  code: string; // e.g., '1Q2627'
  quarterNumber: 1 | 2 | 3 | 4;
  startYear: number; // e.g., 2026 for AY 2026-2027
  academicYear: string; // e.g., '2026–2027'
  label: string; // e.g., '1st Quarter · AY 2026–2027'
  status: QuartermStatus;
  openedAt: string; // YYYY-MM-DD
  closedAt?: string;
  closingNote?: string;
}

export interface ArchivedQuarterm {
  id: string;
  quarterm: QuartermPeriod;
  archivedAt: string; // YYYY-MM-DD
  archivedBy: string;
  archiveNote?: string;
  slots: DefenseSlot[];
  appointments: DefenseAppointment[];
  fileSubmissions: StudentFileSubmission[];
}
