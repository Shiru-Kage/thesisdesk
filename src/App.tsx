/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import {
  buildQuartermPeriod,
  createStarterSlotsForQuarterm,
  DEFAULT_ADMIN_USER,
  DEFAULT_STUDENT_USER,
  INITIAL_ACTIVE_QUARTER,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_CHECKLIST,
  INITIAL_FACULTY,
  INITIAL_SLOTS,
  INITIAL_ZOOM_ROOMS,
  REQUIRED_DOCUMENTS,
} from './data/mockTemplateData';
import {
  Announcement,
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
import { ProfileModal } from './components/ProfileModal';
import {
  getDb,
  subscribeToCollection,
  subscribeToDoc,
  saveDocument,
  removeDocument,
  saveActiveQuarter,
  batchSaveDocuments,
  uploadSubmissionFile,
  retrieveFileFromIdb,
  registerOrUpdateUser,
} from './services/firebase';

const TODAY_ISO = new Date().toISOString().split('T')[0];
const STORAGE_KEY = 'thesisdesk_portal_state_v3';

interface PersistedPortalState {
  slots: DefenseSlot[];
  appointments: DefenseAppointment[];
  zoomRooms: ZoomRoom[];
  faculty: FacultyChair[];
  checklist: ChecklistItem[];
  fileSubmissions: StudentFileSubmission[];
  activeQuarter: QuartermPeriod | null;
  archivedQuarters: ArchivedQuarterm[];
  registeredUsers?: UserAccount[];
  announcements?: Announcement[];
}

function loadPersistedState(): Partial<PersistedPortalState> | null {
  try {
    // Clear out legacy demo state if present
    window.localStorage.removeItem('thesisdesk_soit_state_v1');
    window.localStorage.removeItem('thesisdesk_portal_state_v2');
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [preSelectedSlot, setPreSelectedSlot] = useState<DefenseSlot | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  const lastStudentUserRef = useRef<UserAccount | null>(null);
  const lastAdminUserRef = useRef<UserAccount | null>(null);

  const [slots, setSlots] = useState<DefenseSlot[]>(() => {
    if (persisted?.slots && persisted.slots.length > 0) {
      return persisted.slots;
    }
    return INITIAL_SLOTS;
  });
  const [appointments, setAppointments] = useState<DefenseAppointment[]>(
    () => persisted?.appointments ?? []
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
    () => persisted?.fileSubmissions ?? []
  );
  const [activeQuarter, setActiveQuarter] = useState<QuartermPeriod | null>(() =>
    persisted && 'activeQuarter' in persisted
      ? persisted.activeQuarter ?? null
      : INITIAL_ACTIVE_QUARTER
  );
  const [archivedQuarters, setArchivedQuarters] = useState<ArchivedQuarterm[]>(
    () => persisted?.archivedQuarters ?? []
  );
  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>(
    () => persisted?.registeredUsers ?? [DEFAULT_STUDENT_USER, DEFAULT_ADMIN_USER]
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    () => persisted?.announcements ?? INITIAL_ANNOUNCEMENTS
  );

  const initialSeededRef = useRef(false);

  // Rehydrate local object URLs from IndexedDB on initial mount
  useEffect(() => {
    let active = true;
    const rehydrate = async () => {
      const current = fileSubmissions;
      let hasChanges = false;
      const updated = await Promise.all(
        current.map(async (sub) => {
          if (!sub.objectUrl || sub.objectUrl.startsWith('blob:')) {
            const localUrl = await retrieveFileFromIdb(sub.id);
            if (localUrl && localUrl !== sub.objectUrl) {
              hasChanges = true;
              return { ...sub, objectUrl: localUrl };
            }
          }
          return sub;
        })
      );
      if (active && hasChanges) {
        setFileSubmissions(updated);
      }
    };
    rehydrate();
    return () => {
      active = false;
    };
  }, []);

  // Auto-seed starter defense windows if slots list is empty for the active quarterm
  useEffect(() => {
    if (slots.length === 0 && activeQuarter && activeQuarter.status === 'Open') {
      const seeded = createStarterSlotsForQuarterm(activeQuarter.code, TODAY_ISO, zoomRooms);
      setSlots(seeded);
      seeded.forEach((s) => saveDocument('slots', s).catch(() => { }));
    }
  }, [slots.length, activeQuarter, zoomRooms]);

  // Rehydrate local object URLs from IndexedDB on initial mount
  useEffect(() => {
    let active = true;
    const rehydrate = async () => {
      const current = fileSubmissions;
      let hasChanges = false;
      const updated = await Promise.all(
        current.map(async (sub) => {
          if (!sub.objectUrl || sub.objectUrl.startsWith('blob:')) {
            const localUrl = await retrieveFileFromIdb(sub.id);
            if (localUrl && localUrl !== sub.objectUrl) {
              hasChanges = true;
              return { ...sub, objectUrl: localUrl };
            }
          }
          return sub;
        })
      );
      if (active && hasChanges) {
        setFileSubmissions(updated);
      }
    };
    rehydrate();
    return () => {
      active = false;
    };
  }, []);

  // Auto-seed starter defense windows if slots list is empty for the active quarterm
  useEffect(() => {
    if (slots.length === 0 && activeQuarter && activeQuarter.status === 'Open') {
      const seeded = createStarterSlotsForQuarterm(activeQuarter.code, TODAY_ISO, zoomRooms);
      setSlots(seeded);
      seeded.forEach((s) => saveDocument('slots', s).catch(() => { }));
    }
  }, [slots.length, activeQuarter, zoomRooms]);

  // --------------------------------------------------------------------------
  // Firebase Real-time Subscriptions & Cloud Persistence
  // --------------------------------------------------------------------------
  useEffect(() => {
    const db = getDb();
    if (!db) {
      console.log('Running in local offline mode (Firebase DB not yet initialized).');
      return;
    }

    setIsFirebaseConnected(true);

    // 1. Subscribe to Slots
    const unsubSlots = subscribeToCollection<DefenseSlot>('slots', (records) => {
      if (records) {
        setSlots(records);
      }
    });

    // 2. Subscribe to Appointments (Option 1: Clean purge of cancelled/superseded records)
    const unsubAppointments = subscribeToCollection<DefenseAppointment>('appointments', (records) => {
      if (records) {
        const activeOnly = records.filter((a) => a.status !== 'Cancelled');
        records.forEach((a) => {
          if (a.status === 'Cancelled') {
            removeDocument('appointments', a.id).catch(() => {});
          }
        });
        setAppointments(activeOnly);
      }
    });

    // 3. Subscribe to File Submissions & recover object URLs from IndexedDB if needed
    const unsubFiles = subscribeToCollection<StudentFileSubmission>('fileSubmissions', async (records) => {
      if (records) {
        const enriched = await Promise.all(
          records.map(async (sub) => {
            if (!sub.objectUrl || sub.objectUrl.startsWith('blob:')) {
              const localUrl = await retrieveFileFromIdb(sub.id);
              if (localUrl) return { ...sub, objectUrl: localUrl };
            }
            return sub;
          })
        );
        setFileSubmissions(enriched);
      }
    });

    // 4. Subscribe to Active Quarter
    const unsubQuarter = subscribeToDoc<{ quarter: QuartermPeriod | null }>(
      'settings',
      'active_quarterm',
      (data) => {
        if (data && 'quarter' in data) {
          setActiveQuarter(data.quarter);
        } else if (!initialSeededRef.current) {
          saveActiveQuarter(INITIAL_ACTIVE_QUARTER);
        }
      }
    );

    // 5. Subscribe to Archives
    const unsubArchives = subscribeToCollection<ArchivedQuarterm>('archivedQuarterms', (records) => {
      if (records) {
        setArchivedQuarters(records);
      }
    });

    // 6. Subscribe to Registered Users
    const unsubUsers = subscribeToCollection<UserAccount>('users', (records) => {
      if (records && records.length > 0) {
        setRegisteredUsers(records);
      } else if (!initialSeededRef.current) {
        batchSaveDocuments('users', [DEFAULT_STUDENT_USER, DEFAULT_ADMIN_USER]);
      }
    });

    // 7. Subscribe to Announcements
    const unsubAnnouncements = subscribeToCollection<Announcement>('announcements', (records) => {
      if (records && records.length > 0) {
        setAnnouncements(records);
      } else if (!initialSeededRef.current) {
        batchSaveDocuments('announcements', INITIAL_ANNOUNCEMENTS);
      }
    });

    initialSeededRef.current = true;

    return () => {
      unsubSlots?.();
      unsubAppointments?.();
      unsubFiles?.();
      unsubQuarter?.();
      unsubArchives?.();
      unsubUsers?.();
      unsubAnnouncements?.();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Local Backup Sync
  // --------------------------------------------------------------------------
  useEffect(() => {
    try {
      const payload: PersistedPortalState = {
        slots,
        appointments,
        zoomRooms,
        faculty,
        checklist,
        fileSubmissions,
        activeQuarter,
        archivedQuarters,
        registeredUsers,
        announcements,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
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
    registeredUsers,
    announcements,
  ]);

  const isQuarterOpen = !activeQuarter || activeQuarter.status === 'Open';

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

  // --------------------------------------------------------------------------
  // Real File Upload to Firebase Storage & IndexedDB (Instant Local & Background Sync)
  // --------------------------------------------------------------------------
  const handleUploadStudentFile = (
    requirementId: string,
    fileMeta: { fileName: string; fileSize: string; objectUrl?: string; rawFile?: File }
  ) => {
    if (!currentUser) return;
    const studentId = currentUser.studentId ?? '2026108914';
    const existingSubmission = fileSubmissions.find(
      (sub) =>
        sub.requirementId === requirementId &&
        (sub.studentEmail.toLowerCase() === currentUser.email.toLowerCase() ||
          sub.studentId === studentId)
    );
    const submissionId = existingSubmission?.id ?? `SUB-${Date.now().toString().slice(-6)}`;

    // Generate immediate object URL if missing
    let immediateUrl = fileMeta.objectUrl;
    if (!immediateUrl && fileMeta.rawFile) {
      immediateUrl = URL.createObjectURL(fileMeta.rawFile);
    }

    const nextRecord: StudentFileSubmission = {
      id: submissionId,
      requirementId,
      studentId,
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      program: currentUser.program ?? `B.S. ${currentUser.department} · Mapúa UOx`,
      department: currentUser.department,
      fileName: fileMeta.fileName,
      fileSize: fileMeta.fileSize,
      uploadedAt: TODAY_ISO,
      status: 'Pending Review',
      facultyNote: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      objectUrl: immediateUrl,
    };

    // 1. Instantly update UI and state
    setFileSubmissions((prev) => {
      const existingIndex = prev.findIndex((sub) => sub.id === submissionId);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = nextRecord;
        saveDocument('fileSubmissions', copy[existingIndex]).catch(() => { });
        return copy;
      }
      saveDocument('fileSubmissions', nextRecord).catch(() => { });
      return [nextRecord, ...prev];
    });

    // 2. Persist binary blob to IndexedDB & sync cloud in background
    if (fileMeta.rawFile) {
      uploadSubmissionFile(submissionId, fileMeta.rawFile)
        .then((res) => {
          if (res.downloadUrl && res.downloadUrl !== immediateUrl) {
            setFileSubmissions((prev) =>
              prev.map((sub) =>
                sub.id === submissionId ? { ...sub, objectUrl: res.downloadUrl } : sub
              )
            );
          }
        })
        .catch((err) => {
          console.warn('Background storage sync:', err);
        });
    }
  };

  const handleRemoveStudentFile = (submissionId: string) => {
    setFileSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId));
    removeDocument('fileSubmissions', submissionId);
  };

  const handleReviewStudentFile = (
    submissionId: string,
    status: FileReviewStatus,
    facultyNote?: string
  ) => {
    if (!currentUser) return;
    setFileSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id === submissionId) {
          const updated: StudentFileSubmission = {
            ...sub,
            status,
            facultyNote: facultyNote !== undefined ? facultyNote : sub.facultyNote,
            reviewedBy: currentUser.name,
            reviewedAt: TODAY_ISO,
          };
          saveDocument('fileSubmissions', updated);
          return updated;
        }
        return sub;
      })
    );
  };

  const handleApproveAllStudentFiles = (studentEmail: string) => {
    if (!currentUser) return;
    setFileSubmissions((prev) =>
      prev.map((sub) => {
        if (
          sub.studentEmail.toLowerCase() === studentEmail.toLowerCase() &&
          sub.status !== 'Approved'
        ) {
          const updated: StudentFileSubmission = {
            ...sub,
            status: 'Approved',
            facultyNote: sub.facultyNote || 'Verified and approved by faculty.',
            reviewedBy: currentUser.name,
            reviewedAt: TODAY_ISO,
          };
          saveDocument('fileSubmissions', updated);
          return updated;
        }
        return sub;
      })
    );
  };

  // --------------------------------------------------------------------------
  // Real Defense Appointments & Booking
  // --------------------------------------------------------------------------
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

    // First-Come, First-Served: Prevent student from holding multiple simultaneous active defense requests
    const existingActiveRequest = appointments.find(
      (a) =>
        (a.studentEmail.toLowerCase() === currentUser.email.toLowerCase() ||
          a.studentId === currentUser.studentId) &&
        (a.status === 'Pending Review' || a.status === 'Confirmed') &&
        a.id !== rescheduleFromId
    );
    if (existingActiveRequest) {
      return;
    }

    // First-Come, First-Served: Ensure slot is not already held by another candidate
    const slotAlreadyHeld = appointments.find(
      (a) => a.slotId === slot.id && a.status !== 'Cancelled' && a.id !== rescheduleFromId
    );
    if (slotAlreadyHeld) {
      return;
    }

    const newAppointment: DefenseAppointment = {
      id: `DEF-${Math.floor(2610 + Math.random() * 380)}`,
      slotId: slot.id,
      studentId: currentUser.studentId ?? '2026108914',
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      program: currentUser.program ?? `B.S. ${currentUser.department} · Mapúa UOx`,
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
      createdAt: new Date().toISOString(),
    };

    saveDocument('appointments', newAppointment);

    // Clean purge: permanently remove superseded appointment if rescheduling
    if (rescheduleFromId) {
      removeDocument('appointments', rescheduleFromId).catch(() => {});
    }

    setAppointments((prev) => {
      const updated = rescheduleFromId
        ? prev.filter((a) => a.id !== rescheduleFromId)
        : prev;
      return [newAppointment, ...updated];
    });
    setPreSelectedSlot(null);
  };

  const handleCancelAppointment = (id: string) => {
    // Option 1: Clean purge - permanently delete withdrawn appointment from Firestore & state
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    removeDocument('appointments', id).catch(() => {});
  };

  const handleUpdateAppointmentStatus = (
    id: string,
    status: AppointmentStatus,
    feedback?: string,
    zoomDetails?: { zoomLink: string; zoomPasscode?: string }
  ) => {
    // Option 1: Clean purge - permanently delete cancelled appointments
    if (status === 'Cancelled') {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      removeDocument('appointments', id).catch(() => {});
      return;
    }

    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const updated: DefenseAppointment = {
            ...a,
            status,
            adminFeedback: feedback !== undefined ? feedback : a.adminFeedback,
            zoomLink: zoomDetails !== undefined ? zoomDetails.zoomLink : a.zoomLink,
            zoomPasscode:
              zoomDetails !== undefined ? zoomDetails.zoomPasscode : a.zoomPasscode,
          };
          saveDocument('appointments', updated);
          return updated;
        }
        return a;
      })
    );
  };

  const handleUpdateAppointmentZoom = (
    id: string,
    zoomDetails: { zoomLink: string; zoomPasscode?: string }
  ) => {
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const updated: DefenseAppointment = {
            ...a,
            zoomLink: zoomDetails.zoomLink,
            zoomPasscode: zoomDetails.zoomPasscode,
          };
          saveDocument('appointments', updated);
          return updated;
        }
        return a;
      })
    );
  };

  // --------------------------------------------------------------------------
  // Defense Slot Management
  // --------------------------------------------------------------------------
  const handleAddSlot = (slotData: Omit<DefenseSlot, 'id'>) => {
    const newSlot: DefenseSlot = {
      ...slotData,
      id: `SLOT-${Math.floor(200 + Math.random() * 799)}`,
    };
    saveDocument('slots', newSlot);
    setSlots((prev) => [...prev, newSlot]);
  };

  const handleUpdateSlotZoomLink = (
    slotId: string,
    zoomDetails: { zoomLink: string; zoomPasscode?: string }
  ) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          const updated: DefenseSlot = {
            ...s,
            zoomLink: zoomDetails.zoomLink,
            zoomPasscode: zoomDetails.zoomPasscode,
          };
          saveDocument('slots', updated);
          return updated;
        }
        return s;
      })
    );
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.slotId === slotId && a.status !== 'Cancelled') {
          const updated: DefenseAppointment = {
            ...a,
            zoomLink: zoomDetails.zoomLink,
            zoomPasscode: zoomDetails.zoomPasscode,
          };
          saveDocument('appointments', updated);
          return updated;
        }
        return a;
      })
    );
  };

  const handleGenerateDaySlots = (date: string) => {
    const rm = (idx: number) => zoomRooms[idx % zoomRooms.length] ?? INITIAL_ZOOM_ROOMS[0];
    const facultyMember = (idx: number) =>
      faculty[idx % faculty.length]?.name || 'SOIT Faculty Panel';
    const standardBlocks = [
      {
        startTime: '09:00',
        endTime: '10:30',
        room: rm(0),
        chairName: facultyMember(0),
      },
      {
        startTime: '11:00',
        endTime: '12:30',
        room: rm(1),
        chairName: facultyMember(1),
      },
      {
        startTime: '14:00',
        endTime: '15:30',
        room: rm(2),
        chairName: facultyMember(2),
      },
    ];

    setSlots((prev) => {
      const existingTimes = new Set(
        prev.filter((s) => s.date === date).map((s) => `${s.startTime}-${s.zoomRoomName}`)
      );
      const created: DefenseSlot[] = [];
      standardBlocks.forEach((blk, idx) => {
        if (!existingTimes.has(`${blk.startTime}-${blk.room.name}`)) {
          const newSlot: DefenseSlot = {
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
          };
          created.push(newSlot);
          saveDocument('slots', newSlot);
        }
      });
      return [...prev, ...created];
    });
  };

  const handleToggleBlockSlot = (slotId: string) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          const updated: DefenseSlot = { ...s, isBlocked: !s.isBlocked };
          saveDocument('slots', updated);
          return updated;
        }
        return s;
      })
    );
  };

  const handleDeleteSlot = (slotId: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    removeDocument('slots', slotId);
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, completed: !item.completed };
          saveDocument('checklist', updated);
          return updated;
        }
        return item;
      })
    );
  };

  const handleToggleZoomRoomAvailability = (roomId: string) => {
    setZoomRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          const updated = { ...r, available: !r.available };
          saveDocument('zoomRooms', updated);
          return updated;
        }
        return r;
      })
    );
  };

  const handleUpdateZoomRoomLink = (
    roomId: string,
    payload: { zoomLink: string; meetingId: string; passcode: string }
  ) => {
    const target = zoomRooms.find((r) => r.id === roomId);
    setZoomRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          const updated = {
            ...r,
            zoomLink: payload.zoomLink,
            meetingId: payload.meetingId,
            passcode: payload.passcode,
          };
          saveDocument('zoomRooms', updated);
          return updated;
        }
        return r;
      })
    );
    if (target) {
      setSlots((prev) =>
        prev.map((s) => {
          if (s.zoomRoomName === target.name) {
            const updated = {
              ...s,
              zoomLink: payload.zoomLink,
              zoomMeetingId: payload.meetingId,
              zoomPasscode: payload.passcode,
            };
            saveDocument('slots', updated);
            return updated;
          }
          return s;
        })
      );
      setAppointments((prev) =>
        prev.map((a) => {
          if (
            a.zoomRoomName === target.name &&
            a.status !== 'Completed' &&
            a.status !== 'Cancelled'
          ) {
            const updated = {
              ...a,
              zoomLink: payload.zoomLink,
              zoomMeetingId: payload.meetingId,
              zoomPasscode: payload.passcode,
            };
            saveDocument('appointments', updated);
            return updated;
          }
          return a;
        })
      );
    }
  };

  const handleToggleFacultyAvailability = (facultyId: string) => {
    setFaculty((prev) =>
      prev.map((f) => {
        if (f.id === facultyId) {
          const updated = { ...f, available: !f.available };
          saveDocument('faculty', updated);
          return updated;
        }
        return f;
      })
    );
  };

  // --------------------------------------------------------------------------
  // Quarterm Period Lifecycle
  // --------------------------------------------------------------------------
  const handleCloseQuarterm = (closingNote: string) => {
    setActiveQuarter((prev) => {
      const updated: QuartermPeriod | null = prev
        ? {
          ...prev,
          status: 'Closed',
          closedAt: TODAY_ISO,
          closingNote,
        }
        : null;
      saveActiveQuarter(updated);
      return updated;
    });
  };

  const handleReopenQuarterm = () => {
    setActiveQuarter((prev) => {
      const updated: QuartermPeriod | null = prev
        ? {
          ...prev,
          status: 'Open',
          closedAt: undefined,
          closingNote: undefined,
        }
        : null;
      saveActiveQuarter(updated);
      return updated;
    });
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

    saveDocument('archivedQuarterms', snapshot);
    saveActiveQuarter(null);

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
    saveActiveQuarter(nextQuarter);

    setAppointments([]);
    setFileSubmissions([]);
    const starterSlots = payload.seedStarterSlots
      ? createStarterSlotsForQuarterm(nextQuarter.code, TODAY_ISO, zoomRooms)
      : [];
    setSlots(starterSlots);
    if (starterSlots.length > 0) {
      batchSaveDocuments('slots', starterSlots);
    }
    setPreSelectedSlot(null);
  };

  // --------------------------------------------------------------------------
  // Authentication & Demo State
  // --------------------------------------------------------------------------
  const handleRegisterUser = async (user: UserAccount) => {
    await registerOrUpdateUser(user);
    setRegisteredUsers((prev) => {
      const filtered = prev.filter((u) => u.email.toLowerCase() !== user.email.toLowerCase());
      return [user, ...filtered];
    });
  };

  const handleSwitchRole = () => {
    if (!currentUser) return;
    setPreSelectedSlot(null);
    if (currentUser.role === 'student') {
      lastStudentUserRef.current = currentUser;
      const adminAcc =
        lastAdminUserRef.current ||
        registeredUsers.find((u) => u.role === 'admin' && u.id !== 'usr-adm-default') ||
        registeredUsers.find((u) => u.role === 'admin') ||
        DEFAULT_ADMIN_USER;
      setCurrentUser(adminAcc);
    } else {
      lastAdminUserRef.current = currentUser;
      const studentAcc =
        lastStudentUserRef.current ||
        registeredUsers.find((u) => u.role === 'student' && u.id !== 'usr-stu-default') ||
        registeredUsers.find((u) => u.role === 'student') ||
        DEFAULT_STUDENT_USER;
      setCurrentUser(studentAcc);
    }
  };

  const handleLogin = (user: UserAccount, pendingSlot?: DefenseSlot | null) => {
    setPreSelectedSlot(pendingSlot ?? null);
    setCurrentUser(user);
    if (user.role === 'student') {
      lastStudentUserRef.current = user;
    } else {
      lastAdminUserRef.current = user;
    }
    registerOrUpdateUser(user);
  };

  const handleSignOut = () => {
    setPreSelectedSlot(null);
    setCurrentUser(null);
  };

  const handleUpdateProfile = (updatedData: {
    name: string;
    studentId?: string;
    avatarUrl: string;
    department: string;
    program?: string;
  }) => {
    if (!currentUser) return;
    const updatedUser: UserAccount = {
      ...currentUser,
      ...updatedData,
    };
    setCurrentUser(updatedUser);
    if (updatedUser.role === 'student') {
      lastStudentUserRef.current = updatedUser;
    } else {
      lastAdminUserRef.current = updatedUser;
    }
    setRegisteredUsers((prev) => {
      const exists = prev.some(
        (u) => u.email.toLowerCase() === updatedUser.email.toLowerCase()
      );
      if (exists) {
        return prev.map((u) =>
          u.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : u
        );
      }
      return [...prev, updatedUser];
    });
    registerOrUpdateUser(updatedUser);

    if (updatedUser.role === 'student') {
      setFileSubmissions((prev) =>
        prev.map((f) => {
          if (f.studentEmail.toLowerCase() === updatedUser.email.toLowerCase()) {
            const updated = {
              ...f,
              studentName: updatedUser.name,
              studentId: updatedUser.studentId || f.studentId,
            };
            saveDocument('fileSubmissions', updated);
            return updated;
          }
          return f;
        })
      );
      setAppointments((prev) =>
        prev.map((a) => {
          if (a.studentEmail.toLowerCase() === updatedUser.email.toLowerCase()) {
            const updated = {
              ...a,
              studentName: updatedUser.name,
              studentId: updatedUser.studentId || a.studentId,
            };
            saveDocument('appointments', updated);
            return updated;
          }
          return a;
        })
      );
    }
    setIsProfileModalOpen(false);
  };

  const handleCreateAnnouncement = (
    data: Omit<Announcement, 'id' | 'createdAt'>
  ) => {
    const newAnn: Announcement = {
      ...data,
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    saveDocument('announcements', newAnn);
  };

  const handleUpdateAnnouncement = (updated: Announcement) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    saveDocument('announcements', updated);
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    removeDocument('announcements', id);
  };

  const handleResetDemoData = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem('thesisdesk_portal_state_v2');
      window.localStorage.removeItem('thesisdesk_soit_state_v1');
    } catch {
      // Ignore storage access errors
    }
    lastStudentUserRef.current = null;
    lastAdminUserRef.current = null;
    setSlots([]);
    setAppointments([]);
    setZoomRooms(INITIAL_ZOOM_ROOMS);
    setFaculty(INITIAL_FACULTY);
    setChecklist(INITIAL_CHECKLIST);
    setFileSubmissions([]);
    setActiveQuarter(INITIAL_ACTIVE_QUARTER);
    setArchivedQuarters([]);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setPreSelectedSlot(null);
  };

  if (!currentUser) {
    return (
      <LoginView
        slots={slots}
        appointments={appointments}
        zoomRooms={zoomRooms}
        activeQuarter={activeQuarter}
        announcements={announcements}
        registeredUsers={registeredUsers}
        onLogin={handleLogin}
        onRegister={handleRegisterUser}
      />
    );
  }

  if (currentUser.role === 'student') {
    return (
      <>
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
          announcements={announcements}
          onUploadFile={handleUploadStudentFile}
          onRemoveFile={handleRemoveStudentFile}
          onBookSlot={handleBookSlot}
          onCancelAppointment={handleCancelAppointment}
          onToggleChecklist={handleToggleChecklist}
          onSwitchRole={handleSwitchRole}
          onSignOut={handleSignOut}
          onResetDemoData={handleResetDemoData}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
        />
        <ProfileModal
          isOpen={isProfileModalOpen}
          user={currentUser}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={handleUpdateProfile}
        />
      </>
    );
  }

  return (
    <>
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
        announcements={announcements}
        onCreateAnnouncement={handleCreateAnnouncement}
        onUpdateAnnouncement={handleUpdateAnnouncement}
        onDeleteAnnouncement={handleDeleteAnnouncement}
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
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />
      <ProfileModal
        isOpen={isProfileModalOpen}
        user={currentUser}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleUpdateProfile}
      />
    </>
  );
}
