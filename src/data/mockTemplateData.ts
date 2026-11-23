import {
  ArchivedQuarterm,
  ChecklistItem,
  DefenseAppointment,
  DefenseSlot,
  FacultyChair,
  QuartermPeriod,
  RequiredDocumentSpec,
  StudentFileSubmission,
  UserAccount,
  ZoomRoom,
} from '../types/defense';

export const DEFAULT_STUDENT_USER: UserAccount = {
  id: 'usr-stu-cabalag',
  name: 'Ian Cabalag',
  email: import.meta.env.VITE_STUDENT_EMAIL || 'imppcabalag@gmail.com',
  role: 'student',
  department: 'Information Technology',
  studentId: '2026104819',
  program: 'B.S. Information Technology · Mapúa UOx',
  avatarUrl: '', // Default profile picture removed
};

export const DEFAULT_ADMIN_USER: UserAccount = {
  id: 'usr-adm-cabalag',
  name: 'Prof. P. Cabalag',
  email: import.meta.env.VITE_ADMIN_EMAIL || 'pvcabalag@mapua.edu.ph',
  role: 'admin',
  department: 'School of Information Technology · UOx',
  avatarUrl: '', // Default profile picture removed
};

export const DEMO_USERS: Record<'student' | 'admin', UserAccount> = {
  student: DEFAULT_STUDENT_USER,
  admin: DEFAULT_ADMIN_USER,
};

export const INITIAL_ZOOM_ROOMS: ZoomRoom[] = [
  {
    id: 'ZM-01',
    name: 'UOx Zoom Defense Room 01',
    hostAccount: 'soit-uox-host01@mapua.edu.ph',
    zoomLink: 'https://mapua-edu-ph.zoom.us/j/94281740211',
    meetingId: '942 8174 0211',
    passcode: 'SOIT-UOX1',
    features: 'Waiting Room · Cloud Recording · Panel Breakout Deliberation',
    available: true,
  },
  {
    id: 'ZM-02',
    name: 'UOx Zoom Defense Room 02',
    hostAccount: 'soit-uox-host02@mapua.edu.ph',
    zoomLink: 'https://mapua-edu-ph.zoom.us/j/98144205934',
    meetingId: '981 4420 5934',
    passcode: 'SOIT-UOX2',
    features: 'Waiting Room · HD Screen Share · Automated Transcript',
    available: true,
  },
  {
    id: 'ZM-03',
    name: 'UOx Zoom Defense Room 03',
    hostAccount: 'soit-uox-host03@mapua.edu.ph',
    zoomLink: 'https://mapua-edu-ph.zoom.us/j/96530187420',
    meetingId: '965 3018 7420',
    passcode: 'SOIT-UOX3',
    features: 'Waiting Room · Co-Host Panel Controls · Cloud Recording',
    available: true,
  },
  {
    id: 'ZM-04',
    name: 'UOx Zoom Defense Room 04',
    hostAccount: 'soit-uox-host04@mapua.edu.ph',
    zoomLink: 'https://mapua-edu-ph.zoom.us/j/91377624088',
    meetingId: '913 7762 4088',
    passcode: 'SOIT-UOX4',
    features: 'Waiting Room · External Panelist Access · Breakout Room',
    available: true,
  },
];

// All demo slots removed
export const INITIAL_SLOTS: DefenseSlot[] = [];

// All demo appointments removed
export const INITIAL_APPOINTMENTS: DefenseAppointment[] = [];

export const INITIAL_FACULTY: FacultyChair[] = [
  {
    id: 'FAC-01',
    name: 'Prof. Henrik Lindqvist',
    title: 'Chair of Distributed Computing',
    department: 'Information Technology',
    email: 'h.lindqvist@mapua.edu.ph',
    activeDefenses: 0,
    available: true,
  },
  {
    id: 'FAC-02',
    name: 'Dr. Miriam Okafor',
    title: 'Associate Professor of Data Science',
    department: 'Data Science',
    email: 'm.okafor@mapua.edu.ph',
    activeDefenses: 0,
    available: true,
  },
  {
    id: 'FAC-03',
    name: 'Prof. Arthur Chen',
    title: 'Lead of Software & Cloud Systems',
    department: 'Computer Science',
    email: 'a.chen@mapua.edu.ph',
    activeDefenses: 0,
    available: true,
  },
  {
    id: 'FAC-04',
    name: 'Dr. Samuel Vance',
    title: 'Senior Lecturer in Cybersecurity',
    department: 'Information Systems',
    email: 's.vance@mapua.edu.ph',
    activeDefenses: 0,
    available: true,
  },
];

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

  const rm = (idx: number) => zoomRooms[idx % zoomRooms.length] ?? INITIAL_ZOOM_ROOMS[0];

  return [
    {
      id: `SLOT-${quarterCode}-01`,
      date: offsetDate(4),
      startTime: '09:00',
      endTime: '10:30',
      zoomRoomName: rm(0).name,
      zoomLink: rm(0).zoomLink,
      zoomMeetingId: rm(0).meetingId,
      zoomPasscode: rm(0).passcode,
      department: 'Information Technology',
      chairName: 'Prof. Henrik Lindqvist',
      isBlocked: false,
    },
    {
      id: `SLOT-${quarterCode}-02`,
      date: offsetDate(4),
      startTime: '13:30',
      endTime: '15:00',
      zoomRoomName: rm(1).name,
      zoomLink: rm(1).zoomLink,
      zoomMeetingId: rm(1).meetingId,
      zoomPasscode: rm(1).passcode,
      department: 'Computer Science',
      chairName: 'Dr. Miriam Okafor',
      isBlocked: false,
    },
    {
      id: `SLOT-${quarterCode}-03`,
      date: offsetDate(6),
      startTime: '10:00',
      endTime: '11:30',
      zoomRoomName: rm(2).name,
      zoomLink: rm(2).zoomLink,
      zoomMeetingId: rm(2).meetingId,
      zoomPasscode: rm(2).passcode,
      department: 'Data Science',
      chairName: 'Prof. Arthur Chen',
      isBlocked: false,
    },
    {
      id: `SLOT-${quarterCode}-04`,
      date: offsetDate(7),
      startTime: '14:00',
      endTime: '15:30',
      zoomRoomName: rm(3).name,
      zoomLink: rm(3).zoomLink,
      zoomMeetingId: rm(3).meetingId,
      zoomPasscode: rm(3).passcode,
      department: 'Information Systems',
      chairName: 'Dr. Samuel Vance',
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

// All demo archived quarters removed
export const INITIAL_ARCHIVED_QUARTERS: ArchivedQuarterm[] = [];
