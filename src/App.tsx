/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import {
  buildQuartermPeriod,
  createStarterSlotsForQuarterm,
  DEMO_USERS,
  INITIAL_ACTIVE_QUARTER,
  INITIAL_APPOINTMENTS,
  INITIAL_ARCHIVED_QUARTERS,
  INITIAL_CHECKLIST,
  INITIAL_FACULTY,
  INITIAL_FILE_SUBMISSIONS,
  INITIAL_SLOTS,
  INITIAL_ZOOM_ROOMS,
  REQUIRED_DOCUMENTS,
} from './data/mockTemplateData';
import {
  AppointmentStatus,
  ArchivedQuarterm,
  ChecklistItem,
  DefenseAppointment,
  DefenseSlot,
  FacultyChair,
  FileReviewStatus,
  QuartermPeriod,
  StudentFileSubmission,
  UserAccount,
  ZoomRoom,
} from './types/defense';
import { LoginView } from './components/LoginView';
import { StudentPortal } from './components/StudentPortal';
import { AdminPortal } from './components/AdminPortal';

const TODAY_ISO = '2026-11-16';
const STORAGE_KEY = 'thesisdesk_soit_state_v1';

interface PersistedPortalState {
  slots: DefenseSlot[];
  appointments: DefenseAppointment[];
  zoomRooms: ZoomRoom[];
  faculty: FacultyChair[];
  checklist: ChecklistItem[];
  fileSubmissions: StudentFileSubmission[];
  activeQuarter: QuartermPeriod | null;
  archivedQuarters: ArchivedQuarterm[];
}

function loadPersistedState(): Partial<PersistedPortalState> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedPortalState>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [persisted] = useState<Partial<PersistedPortalState> | null>(() =>
    loadPersistedState()
  );
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [preSelectedSlot, setPreSelectedSlot] = useState<DefenseSlot | null>(null);
  const [slots, setSlots] = useState<DefenseSlot[]>(
    () => persisted?.slots ?? INITIAL_SLOTS
  );
  const [appointments, setAppointments] = useState<DefenseAppointment[]>(
    () => persisted?.appointments ?? INITIAL_APPOINTMENTS
  );
  const [zoomRooms, setZoomRooms] = useState<ZoomRoom[]>(
    () => persisted?.zoomRooms ?? INITIAL_ZOOM_ROOMS
  );
  const [faculty, setFaculty] = useState<FacultyChair[]>(
    () => persisted?.faculty ?? INITIAL_FACULTY
  );
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    () => persisted?.checklist ?? INITIAL_CHECKLIST
  );
  const [fileSubmissions, setFileSubmissions] = useState<StudentFileSubmission[]>(
    () => persisted?.fileSubmissions ?? INITIAL_FILE_SUBMISSIONS
  );
  const [activeQuarter, setActiveQuarter] = useState<QuartermPeriod | null>(() =>
    persisted && 'activeQuarter' in persisted
      ? persisted.activeQuarter ?? null
      : INITIAL_ACTIVE_QUARTER
  );
  const [archivedQuarters, setArchivedQuarters] = useState<ArchivedQuarterm[]>(
    () => persisted?.archivedQuarters ?? INITIAL_ARCHIVED_QUARTERS
  );

  useEffect(() => {
    try {
      const serializableFiles = fileSubmissions.map(({ objectUrl: _omit, ...rest }) => rest);
      const serializableArchives = archivedQuarters.map((arc) => ({
        ...arc,
        fileSubmissions: arc.fileSubmissions.map(({ objectUrl: _omit, ...rest }) => rest),
      }));
      const payload: PersistedPortalState = {
        slots,
        appointments,
        zoomRooms,
        faculty,
        checklist,
        fileSubmissions: serializableFiles,
        activeQuarter,
        archivedQuarters: serializableArchives,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota or private-browsing errors
    }
  }, [
    slots,
    appointments,
    zoomRooms,
    faculty,
    checklist,
    fileSubmissions,
    activeQuarter,
    archivedQuarters,
  ]);

  const isQuarterOpen = activeQuarter?.status === 'Open';

  const isStudentClearedToSchedule = (user: UserAccount) => {
    const requiredIds = REQUIRED_DOCUMENTS.filter((d) => d.required).map((d) => d.id);
    const matching = fileSubmissions.filter(
      (sub) =>
        sub.studentEmail.toLowerCase() === user.email.toLowerCase() ||
        (user.studentId && sub.studentId === user.studentId)
    );
    return requiredIds.every((reqId) =>
      matching.some((sub) => sub.requirementId === reqId && sub.status === 'Approved')
    );
  };

  const handleUploadStudentFile = (
    requirementId: string,
    fileMeta: { fileName: string; fileSize: string; objectUrl?: string }
  ) => {
    if (!currentUser || !isQuarterOpen) return;
    const studentId = currentUser.studentId ?? '2026108914';
    setFileSubmissions((prev) => {
      const existingIndex = prev.findIndex(
        (sub) =>
          sub.requirementId === requirementId &&
          (sub.studentEmail.toLowerCase() === currentUser.email.toLowerCase() ||
            sub.studentId === studentId)
      );

      const nextRecord: StudentFileSubmission = {
        id:
          existingIndex >= 0
            ? prev[existingIndex].id
            : `SUB-${Math.floor(910 + Math.random() * 880)}`,
        requirementId,
        studentId,
        studentName: currentUser.name,
        studentEmail: currentUser.email,
        program: currentUser.program ?? `B.S. ${currentUser.department} · UOx`,
        department: currentUser.department,
        fileName: fileMeta.fileName,
        fileSize: fileMeta.fileSize,
        uploadedAt: TODAY_ISO,
        status: 'Pending Review',
        facultyNote: undefined,
        reviewedBy: undefined,
        reviewedAt: undefined,
        objectUrl: fileMeta.objectUrl,
      };

      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = nextRecord;
        return copy;
      }
      return [nextRecord, ...prev];
    });
  };

  const handleRemoveStudentFile = (submissionId: string) => {
    setFileSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId));
  };

  const handleReviewStudentFile = (
    submissionId: string,
    status: FileReviewStatus,
    facultyNote?: string
  ) => {
    if (!currentUser) return;
    setFileSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === submissionId
          ? {
              ...sub,
              status,
              facultyNote: facultyNote !== undefined ? facultyNote : sub.facultyNote,
              reviewedBy: currentUser.name,
              reviewedAt: TODAY_ISO,
            }
          : sub
      )
    );
  };

  const handleApproveAllStudentFiles = (studentEmail: string) => {
    if (!currentUser) return;
    setFileSubmissions((prev) =>
      prev.map((sub) =>
        sub.studentEmail.toLowerCase() === studentEmail.toLowerCase() &&
        sub.status !== 'Approved'
          ? {
              ...sub,
              status: 'Approved',
              facultyNote: sub.facultyNote || 'Verified and approved by faculty.',
              reviewedBy: currentUser.name,
              reviewedAt: TODAY_ISO,
            }
          : sub
      )
    );
  };

  const handleBookSlot = (
    slot: DefenseSlot,
    payload: {
      thesisTitle: string;
      abstract: string;
      advisorName: string;
      committeeMembers: string[];
      notes: string;
    },
    rescheduleFromId?: string
  ) => {
    if (!currentUser || !isQuarterOpen || !isStudentClearedToSchedule(currentUser)) return;

    const newAppointment: DefenseAppointment = {
      id: `DEF-${Math.floor(2610 + Math.random() * 380)}`,
      slotId: slot.id,
      studentId: currentUser.studentId ?? '2026108914',
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      program: currentUser.program ?? `B.S. ${currentUser.department} · UOx`,
      department: slot.department,
      thesisTitle: payload.thesisTitle,
      abstract: payload.abstract,
      advisorName: payload.advisorName,
      committeeMembers: payload.committeeMembers,
      status: 'Pending Review',
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      zoomRoomName: slot.zoomRoomName,
      zoomLink: slot.zoomLink,
      zoomMeetingId: slot.zoomMeetingId,
      zoomPasscode: slot.zoomPasscode,
      notes: payload.notes || undefined,
      createdAt: TODAY_ISO,
    };

    setAppointments((prev) => {
      const updated = rescheduleFromId
        ? prev.map((a) =>
            a.id === rescheduleFromId
              ? {
                  ...a,
                  status: 'Cancelled' as AppointmentStatus,
                  adminFeedback: 'Superseded by student reschedule request.',
                }
              : a
          )
        : prev;
      return [newAppointment, ...updated];
    });
    setPreSelectedSlot(null);
  };

  const handleCancelAppointment = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'Cancelled',
              adminFeedback: 'Withdrawn by candidate.',
            }
          : a
      )
    );
  };

  const handleUpdateAppointmentStatus = (
    id: string,
    status: AppointmentStatus,
    feedback?: string,
    zoomDetails?: { zoomLink: string; zoomPasscode?: string }
  ) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              adminFeedback: feedback !== undefined ? feedback : a.adminFeedback,
              zoomLink: zoomDetails !== undefined ? zoomDetails.zoomLink : a.zoomLink,
              zoomPasscode:
                zoomDetails !== undefined ? zoomDetails.zoomPasscode : a.zoomPasscode,
            }
          : a
      )
    );
  };

  const handleUpdateAppointmentZoom = (
    id: string,
    zoomDetails: { zoomLink: string; zoomPasscode?: string }
  ) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              zoomLink: zoomDetails.zoomLink,
              zoomPasscode: zoomDetails.zoomPasscode,
            }
          : a
      )
    );
  };

  const handleAddSlot = (slotData: Omit<DefenseSlot, 'id'>) => {
    const newSlot: DefenseSlot = {
      ...slotData,
      id: `SLOT-${Math.floor(200 + Math.random() * 799)}`,
    };
    setSlots((prev) => [...prev, newSlot]);
  };

  const handleUpdateSlotZoomLink = (
    slotId: string,
    zoomDetails: { zoomLink: string; zoomPasscode?: string }
  ) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              zoomLink: zoomDetails.zoomLink,
              zoomPasscode: zoomDetails.zoomPasscode,
            }
          : s
      )
    );
    // Keep any active non-cancelled appointment tied to this slot synchronized
    setAppointments((prev) =>
      prev.map((a) =>
        a.slotId === slotId && a.status !== 'Cancelled'
          ? {
              ...a,
              zoomLink: zoomDetails.zoomLink,
              zoomPasscode: zoomDetails.zoomPasscode,
            }
          : a
      )
    );
  };

  const handleGenerateDaySlots = (date: string) => {
    const rm = (idx: number) => zoomRooms[idx % zoomRooms.length] ?? INITIAL_ZOOM_ROOMS[0];
    const standardBlocks = [
      {
        startTime: '09:00',
        endTime: '10:30',
        room: rm(0),
        chairName: 'Prof. Henrik Lindqvist',
      },
      {
        startTime: '11:00',
        endTime: '12:30',
        room: rm(1),
        chairName: 'Dr. Miriam Okafor',
      },
      {
        startTime: '14:00',
        endTime: '15:30',
        room: rm(2),
        chairName: 'Dr. Samuel Vance',
      },
    ];

    setSlots((prev) => {
      const existingTimes = new Set(
        prev.filter((s) => s.date === date).map((s) => `${s.startTime}-${s.zoomRoomName}`)
      );
      const created: DefenseSlot[] = [];
      standardBlocks.forEach((blk, idx) => {
        if (!existingTimes.has(`${blk.startTime}-${blk.room.name}`)) {
          created.push({
            id: `SLOT-${Date.now().toString().slice(-4)}-${idx}`,
            date,
            startTime: blk.startTime,
            endTime: blk.endTime,
            zoomRoomName: blk.room.name,
            zoomLink: blk.room.zoomLink,
            zoomMeetingId: blk.room.meetingId,
            zoomPasscode: blk.room.passcode,
            department: 'Information Technology',
            chairName: blk.chairName,
            isBlocked: false,
          });
        }
      });
      return [...prev, ...created];
    });
  };

  const handleToggleBlockSlot = (slotId: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, isBlocked: !s.isBlocked } : s))
    );
  };

  const handleDeleteSlot = (slotId: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleToggleZoomRoomAvailability = (roomId: string) => {
    setZoomRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, available: !r.available } : r))
    );
  };

  const handleUpdateZoomRoomLink = (
    roomId: string,
    payload: { zoomLink: string; meetingId: string; passcode: string }
  ) => {
    const target = zoomRooms.find((r) => r.id === roomId);
    setZoomRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              zoomLink: payload.zoomLink,
              meetingId: payload.meetingId,
              passcode: payload.passcode,
            }
          : r
      )
    );
    if (target) {
      setSlots((prev) =>
        prev.map((s) =>
          s.zoomRoomName === target.name
            ? {
                ...s,
                zoomLink: payload.zoomLink,
                zoomMeetingId: payload.meetingId,
                zoomPasscode: payload.passcode,
              }
            : s
        )
      );
      setAppointments((prev) =>
        prev.map((a) =>
          a.zoomRoomName === target.name &&
          a.status !== 'Completed' &&
          a.status !== 'Cancelled'
            ? {
                ...a,
                zoomLink: payload.zoomLink,
                zoomMeetingId: payload.meetingId,
                zoomPasscode: payload.passcode,
              }
            : a
        )
      );
    }
  };

  const handleToggleFacultyAvailability = (facultyId: string) => {
    setFaculty((prev) =>
      prev.map((f) => (f.id === facultyId ? { ...f, available: !f.available } : f))
    );
  };

  const handleCloseQuarterm = (closingNote: string) => {
    setActiveQuarter((prev) =>
      prev
        ? {
            ...prev,
            status: 'Closed',
            closedAt: TODAY_ISO,
            closingNote,
          }
        : prev
    );
  };

  const handleReopenQuarterm = () => {
    setActiveQuarter((prev) =>
      prev
        ? {
            ...prev,
            status: 'Open',
            closedAt: undefined,
            closingNote: undefined,
          }
        : prev
    );
  };

  const handleArchiveQuarterm = (archiveNote: string) => {
    if (!activeQuarter || !currentUser) return;
    const closedQuarter: QuartermPeriod = {
      ...activeQuarter,
      status: 'Closed',
      closedAt: activeQuarter.closedAt ?? TODAY_ISO,
    };
    const snapshot: ArchivedQuarterm = {
      id: `ARC-${closedQuarter.code}-${Date.now().toString().slice(-4)}`,
      quarterm: closedQuarter,
      archivedAt: TODAY_ISO,
      archivedBy: currentUser.name,
      archiveNote,
      slots: [...slots],
      appointments: [...appointments],
      fileSubmissions: [...fileSubmissions],
    };

    setArchivedQuarters((prev) => [snapshot, ...prev]);
    setSlots([]);
    setAppointments([]);
    setFileSubmissions([]);
    setPreSelectedSlot(null);
    setActiveQuarter(null);
  };

  const handleOpenNewQuarterm = (payload: {
    quarterNumber: 1 | 2 | 3 | 4;
    startYear: number;
    seedStarterSlots: boolean;
  }) => {
    const nextQuarter = buildQuartermPeriod(
      payload.quarterNumber,
      payload.startYear,
      TODAY_ISO
    );
    setActiveQuarter(nextQuarter);
    setAppointments([]);
    setFileSubmissions([]);
    setSlots(
      payload.seedStarterSlots
        ? createStarterSlotsForQuarterm(nextQuarter.code, TODAY_ISO, zoomRooms)
        : []
    );
    setPreSelectedSlot(null);
  };

  const handleSwitchRole = () => {
    if (!currentUser) return;
    setPreSelectedSlot(null);
    setCurrentUser(
      currentUser.role === 'student' ? DEMO_USERS.admin : DEMO_USERS.student
    );
  };

  const handleLogin = (user: UserAccount, pendingSlot?: DefenseSlot | null) => {
    setPreSelectedSlot(pendingSlot ?? null);
    setCurrentUser(user);
  };

  const handleSignOut = () => {
    setPreSelectedSlot(null);
    setCurrentUser(null);
  };

  const handleResetDemoData = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage access errors
    }
    setSlots(INITIAL_SLOTS);
    setAppointments(INITIAL_APPOINTMENTS);
    setZoomRooms(INITIAL_ZOOM_ROOMS);
    setFaculty(INITIAL_FACULTY);
    setChecklist(INITIAL_CHECKLIST);
    setFileSubmissions(INITIAL_FILE_SUBMISSIONS);
    setActiveQuarter(INITIAL_ACTIVE_QUARTER);
    setArchivedQuarters(INITIAL_ARCHIVED_QUARTERS);
    setPreSelectedSlot(null);
  };

  if (!currentUser) {
    return (
      <LoginView
        slots={slots}
        appointments={appointments}
        zoomRooms={zoomRooms}
        activeQuarter={activeQuarter}
        onLogin={handleLogin}
      />
    );
  }

  if (currentUser.role === 'student') {
    return (
      <StudentPortal
        user={currentUser}
        slots={slots}
        appointments={appointments}
        checklist={checklist}
        requiredDocuments={REQUIRED_DOCUMENTS}
        fileSubmissions={fileSubmissions}
        activeQuarter={activeQuarter}
        todayIso={TODAY_ISO}
        initialSlot={preSelectedSlot}
        onUploadFile={handleUploadStudentFile}
        onRemoveFile={handleRemoveStudentFile}
        onBookSlot={handleBookSlot}
        onCancelAppointment={handleCancelAppointment}
        onToggleChecklist={handleToggleChecklist}
        onSwitchRole={handleSwitchRole}
        onSignOut={handleSignOut}
        onResetDemoData={handleResetDemoData}
      />
    );
  }

  return (
    <AdminPortal
      user={currentUser}
      slots={slots}
      appointments={appointments}
      zoomRooms={zoomRooms}
      faculty={faculty}
      requiredDocuments={REQUIRED_DOCUMENTS}
      fileSubmissions={fileSubmissions}
      activeQuarter={activeQuarter}
      archivedQuarters={archivedQuarters}
      todayIso={TODAY_ISO}
      onCloseQuarterm={handleCloseQuarterm}
      onReopenQuarterm={handleReopenQuarterm}
      onArchiveQuarterm={handleArchiveQuarterm}
      onOpenNewQuarterm={handleOpenNewQuarterm}
      onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
      onUpdateAppointmentZoom={handleUpdateAppointmentZoom}
      onReviewStudentFile={handleReviewStudentFile}
      onApproveAllStudentFiles={handleApproveAllStudentFiles}
      onAddSlot={handleAddSlot}
      onUpdateSlotZoomLink={handleUpdateSlotZoomLink}
      onGenerateDaySlots={handleGenerateDaySlots}
      onToggleBlockSlot={handleToggleBlockSlot}
      onDeleteSlot={handleDeleteSlot}
      onToggleZoomRoomAvailability={handleToggleZoomRoomAvailability}
      onUpdateZoomRoomLink={handleUpdateZoomRoomLink}
      onToggleFacultyAvailability={handleToggleFacultyAvailability}
      onSwitchRole={handleSwitchRole}
      onSignOut={handleSignOut}
      onResetDemoData={handleResetDemoData}
    />
  );
}
