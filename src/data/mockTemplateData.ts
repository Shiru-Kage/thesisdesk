import {
  Announcement,
  ArchivedQuarterm,
  ChecklistItem,
  DefenseAppointment,
  DefenseGuidelinesData,
  DefenseSlot,
  FacultyChair,
  QuartermPeriod,
  RequiredDocumentSpec,
  StudentFileSubmission,
  UserAccount,
  ZoomRoom,
} from '../types/defense';

export const DEFAULT_STUDENT_USER: UserAccount = {
  id: 'usr-stu-default',
  name: 'Student Candidate',
  email: import.meta.env.VITE_STUDENT_EMAIL || 'imppcabalag@gmail.com',
  role: 'student',
  department: 'Information Technology',
  studentId: '',
  program: 'B.S. Information Technology · Mapúa UOx',
  avatarUrl: '', // Default profile picture removed
};

export const DEFAULT_ADMIN_USER: UserAccount = {
  id: 'usr-adm-default',
  name: 'SOIT Thesis Coordinator',
  email: import.meta.env.VITE_ADMIN_EMAIL || 'pvcabalag@mapua.edu.ph',
  role: 'admin',
  department: 'School of Information Technology · UOx',
  avatarUrl: '', // Default profile picture removed
};

export const DEMO_USERS: Record<'student' | 'admin', UserAccount> = {
  student: DEFAULT_STUDENT_USER,
  admin: DEFAULT_ADMIN_USER,
};

export const INITIAL_ZOOM_ROOMS: ZoomRoom[] = [];

// Demo appointments removed; generated upon student request
export const INITIAL_APPOINTMENTS: DefenseAppointment[] = [];

export const INITIAL_FACULTY: FacultyChair[] = [];

export const INITIAL_CHECKLIST: ChecklistItem[] = [
  {
    id: 'chk-1',
    label: 'Confirm thesis adviser & online panel quorum attendance',
    dueNote: 'At least 5 days prior',
    completed: false,
  },
  {
    id: 'chk-2',
    label: 'Prepare presentation slide deck & live demo for Zoom screen share',
    dueNote: '48 hours prior',
    completed: false,
  },
  {
    id: 'chk-3',
    label: 'Test webcam, microphone, Zoom desktop client & backup internet',
    dueNote: '24 hours prior',
    completed: false,
  },
  {
    id: 'chk-4',
    label: 'Sign in with Mapúa email and join Zoom room 10 minutes early',
    dueNote: 'Defense day',
    completed: false,
  },
];

export const REQUIRED_DOCUMENTS: RequiredDocumentSpec[] = [
  {
    id: 'req-manuscript',
    title: 'Final Thesis Manuscript (Chapters 1–5)',
    description:
      'Complete defense-ready PDF manuscript formatted according to Mapúa SOIT UOx thesis guidelines.',
    acceptedFormats: 'PDF · up to 25 MB',
    sampleFileName: 'Thesis_Manuscript_Final.pdf',
    sampleFileSize: '4.2 MB',
    required: true,
  },
  {
    id: 'req-endorsement',
    title: 'Adviser Endorsement & Routing Form',
    description:
      'Digitally signed SOIT thesis adviser readiness endorsement confirming online panel quorum.',
    acceptedFormats: 'PDF · up to 10 MB',
    sampleFileName: 'SOIT_Adviser_Endorsement_Form.pdf',
    sampleFileSize: '640 KB',
    required: true,
  },
  {
    id: 'req-originality',
    title: 'Turnitin Originality Clearance Report',
    description:
      'Official similarity index certificate verifying compliance at or below the 15% SOIT threshold.',
    acceptedFormats: 'PDF · up to 10 MB',
    sampleFileName: 'Turnitin_Clearance_Report.pdf',
    sampleFileSize: '1.1 MB',
    required: true,
  },
];

// All demo file submissions removed
export const INITIAL_FILE_SUBMISSIONS: StudentFileSubmission[] = [];

export const INITIAL_DEFENSE_GUIDELINES: DefenseGuidelinesData = {
  id: 'defense_guidelines',
  sessionDurationMin: 90,
  presentationMin: 35,
  examinationMin: 30,
  openFloorMin: 10,
  deliberationMin: 15,
  protocols: [
    {
      id: 'proto-clearance',
      stepNumber: '01',
      phase: 'Pre-Requisites',
      title: 'Manuscript Clearance',
      description:
        'Upload Chapters 1–5, Adviser Endorsement, and Turnitin Report (≤15%). All 3 files must be faculty-cleared to unlock slot scheduling.',
    },
    {
      id: 'proto-attendance',
      stepNumber: '02',
      phase: 'Attendance',
      title: 'Mapúa UOx Zoom Check-In',
      description:
        'Join via official @mymail.mapua.edu.ph account 10 minutes prior for host admission and audio check.',
    },
    {
      id: 'proto-hardware',
      stepNumber: '03',
      phase: 'Hardware & Media',
      title: 'Camera & Screen-Share',
      description:
        'Webcam required throughout presentation and Q&A. Format slides in 16:9 widescreen and keep an offline PDF export as backup.',
    },
    {
      id: 'proto-flexibility',
      stepNumber: '04',
      phase: 'Flexibility',
      title: 'Reschedule Window',
      description:
        'Transfer reservations to any open Zoom slot up to 48 hours before session without re-filing committee clearance forms.',
    },
  ],
  earlyCheckInMin: 10,
  backupAdvice:
    'Keep mobile hotspot ready and share slide PDF with your adviser before the call.',
  quorumNote:
    'Sessions are cloud-recorded by the SOIT chair once panel quorum is present.',
};

const QUARTER_ORDINALS: Record<number, string> = {
  1: '1st Quarter',
  2: '2nd Quarter',
  3: '3rd Quarter',
  4: '4th Quarter',
};

export function buildQuartermCode(
  quarterNumber: 1 | 2 | 3 | 4,
  startYear: number
): string {
  const y1 = String(startYear).slice(-2);
  const y2 = String(startYear + 1).slice(-2);
  return `${quarterNumber}Q${y1}${y2}`;
}

export function buildQuartermPeriod(
  quarterNumber: 1 | 2 | 3 | 4,
  startYear: number,
  openedAt: string
): QuartermPeriod {
  const academicYear = `${startYear}–${startYear + 1}`;
  return {
    code: buildQuartermCode(quarterNumber, startYear),
    quarterNumber,
    startYear,
    academicYear,
    label: `${QUARTER_ORDINALS[quarterNumber]} · AY ${academicYear}`,
    status: 'Open',
    openedAt,
  };
}

export function getNextQuartermSuggestion(
  lastQuarter?: QuartermPeriod | null
): { quarterNumber: 1 | 2 | 3 | 4; startYear: number } {
  if (!lastQuarter) {
    return { quarterNumber: 2, startYear: 2026 };
  }
  if (lastQuarter.quarterNumber < 4) {
    return {
      quarterNumber: (lastQuarter.quarterNumber + 1) as 1 | 2 | 3 | 4,
      startYear: lastQuarter.startYear,
    };
  }
  return { quarterNumber: 1, startYear: lastQuarter.startYear + 1 };
}

export function createStarterSlotsForQuarterm(
  quarterCode: string,
  baseDateIso: string,
  zoomRooms: ZoomRoom[] = INITIAL_ZOOM_ROOMS
): DefenseSlot[] {
  const [y, m, d] = baseDateIso.split('-').map(Number);
  const offsetDate = (days: number) => {
    const dt = new Date(y, m - 1, d + days);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  if (zoomRooms.length === 0) return [];

  const rm = (idx: number) => zoomRooms[idx % zoomRooms.length];

  return [
    {
      id: `SLOT-${quarterCode}-01`,
      date: offsetDate(0),
      startTime: '10:00',
      endTime: '11:30',
      zoomRoomName: rm(0).name,
      zoomLink: rm(0).zoomLink,
      zoomMeetingId: rm(0).meetingId,
      zoomPasscode: rm(0).passcode,
      department: 'Information Technology',
      chairName: 'SOIT Faculty Panel',
      isBlocked: false,
    },
    {
      id: `SLOT-${quarterCode}-02`,
      date: offsetDate(0),
      startTime: '14:00',
      endTime: '15:30',
      zoomRoomName: rm(1 % zoomRooms.length).name,
      zoomLink: rm(1 % zoomRooms.length).zoomLink,
      zoomMeetingId: rm(1 % zoomRooms.length).meetingId,
      zoomPasscode: rm(1 % zoomRooms.length).passcode,
      department: 'Information Technology',
      chairName: 'SOIT Faculty Panel',
      isBlocked: false,
    },
    {
      id: `SLOT-${quarterCode}-03`,
      date: offsetDate(1),
      startTime: '09:00',
      endTime: '10:30',
      zoomRoomName: rm(0).name,
      zoomLink: rm(0).zoomLink,
      zoomMeetingId: rm(0).meetingId,
      zoomPasscode: rm(0).passcode,
      department: 'Computer Science',
      chairName: 'SOIT Faculty Panel',
      isBlocked: false,
    },
    {
      id: `SLOT-${quarterCode}-04`,
      date: offsetDate(1),
      startTime: '13:30',
      endTime: '15:00',
      zoomRoomName: rm(2 % zoomRooms.length).name,
      zoomLink: rm(2 % zoomRooms.length).zoomLink,
      zoomMeetingId: rm(2 % zoomRooms.length).meetingId,
      zoomPasscode: rm(2 % zoomRooms.length).passcode,
      department: 'Information Technology',
      chairName: 'SOIT Faculty Panel',
      isBlocked: false,
    },
    {
      id: `SLOT-${quarterCode}-05`,
      date: offsetDate(2),
      startTime: '10:30',
      endTime: '12:00',
      zoomRoomName: rm(1 % zoomRooms.length).name,
      zoomLink: rm(1 % zoomRooms.length).zoomLink,
      zoomMeetingId: rm(1 % zoomRooms.length).meetingId,
      zoomPasscode: rm(1 % zoomRooms.length).passcode,
      department: 'Data Science',
      chairName: 'SOIT Faculty Panel',
      isBlocked: false,
    },
    {
      id: `SLOT-${quarterCode}-06`,
      date: offsetDate(5),
      startTime: '14:00',
      endTime: '15:30',
      zoomRoomName: rm(3 % zoomRooms.length).name,
      zoomLink: rm(3 % zoomRooms.length).zoomLink,
      zoomMeetingId: rm(3 % zoomRooms.length).meetingId,
      zoomPasscode: rm(3 % zoomRooms.length).passcode,
      department: 'Information Systems',
      chairName: 'SOIT Faculty Panel',
      isBlocked: false,
    },
  ];
}

export const INITIAL_ACTIVE_QUARTER: QuartermPeriod = {
  code: '1Q2627',
  quarterNumber: 1,
  startYear: 2026,
  academicYear: '2026–2027',
  label: '1st Quarter · AY 2026–2027',
  status: 'Open',
  openedAt: '2026-08-17',
};

// Starter slots for the open quarter
export const INITIAL_SLOTS: DefenseSlot[] = createStarterSlotsForQuarterm(
  INITIAL_ACTIVE_QUARTER.code,
  '2026-11-25',
  INITIAL_ZOOM_ROOMS
);

// All demo archived quarters removed
export const INITIAL_ARCHIVED_QUARTERS: ArchivedQuarterm[] = [];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: '1Q2627 SOIT UOx Online Defense Scheduling Now Open',
    content:
      'Mapúa UOx online students may reserve 90-minute Zoom oral defense slots once required thesis files are approved by faculty. All defenses are conducted fully online via Zoom. Official Zoom meeting links and passcodes are assigned by the SOIT Coordinator inside your appointment details.',
    category: 'Defense Schedule',
    priority: 'urgent',
    authorName: 'SOIT Thesis Coordinator',
    authorRole: 'SOIT Thesis Coordinator',
    authorEmail: 'pvcabalag@mapua.edu.ph',
    createdAt: '2026-11-15T08:00:00.000Z',
    pinned: true,
  },
  {
    id: 'ann-2',
    title: 'Final Manuscript & Turnitin Clearance Deadline',
    content:
      'Submit your PDF manuscript draft and originality clearance reference inside the portal at least 72 hours prior to committee review. Coordinator approval requires a verified adviser sign-off and complete three-member defense panel roster.',
    category: 'Submission Deadline',
    priority: 'important',
    authorName: 'SOIT Thesis Coordinator',
    authorRole: 'SOIT Thesis Coordinator',
    authorEmail: 'pvcabalag@mapua.edu.ph',
    createdAt: '2026-11-18T10:30:00.000Z',
    pinned: true,
  },
  {
    id: 'ann-3',
    title: 'Panel Quorum & Reschedule Protocol',
    content:
      'Schedule adjustments within 48 hours of an assigned defense time require coordinator approval. Students may submit a single-click reschedule request with a proposed alternative slot directly from My Appointments.',
    category: 'Panel Guidelines',
    priority: 'normal',
    authorName: 'School of Information Technology',
    authorRole: 'SOIT Thesis Coordination Office',
    authorEmail: 'pvcabalag@mapua.edu.ph',
    createdAt: '2026-11-20T14:00:00.000Z',
    pinned: false,
  },
];
