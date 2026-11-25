import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CalendarCog,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Folder,
  FolderCheck,
  FolderOpen,
  LayoutDashboard,
  Link2,
  Lock,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Unlock,
  Video,
  X,
} from 'lucide-react';
import {
  Announcement,
  AppointmentStatus,
  ArchivedQuarterm,
  DefenseAppointment,
  DefenseSlot,
  FacultyChair,
  FileReviewStatus,
  QuartermPeriod,
  RequiredDocumentSpec,
  StudentFileSubmission,
  UserAccount,
  ZoomRoom,
} from '../types/defense';
import {
  buildQuartermCode,
  getNextQuartermSuggestion,
} from '../data/mockTemplateData';
import { PortalLayout, NavItem, QuartermBannerInfo } from './PortalLayout';
import { CalendarGrid } from './CalendarGrid';
import { StatusLabel } from './StatusLabel';
import { FileStatusLabel } from './FileStatusLabel';
import { AppointmentDetailDrawer } from './AppointmentDetailDrawer';
import { PdfPreviewModal } from './PdfPreviewModal';
import { QuartermArchivesView } from './QuartermArchivesView';
import { AdminAnnouncementsView } from './AdminAnnouncementsView';
import { ToastNotification, ToastState, ToastTone } from './ToastNotification';
import {
  ArchiveQuartermModal,
  CloseQuartermModal,
  OpenQuartermModal,
} from './QuartermModals';
import { formatReadableDate, formatShortDate, formatTimeRange } from '../utils/dateUtils';
import { downloadDefenseScheduleCsv } from '../utils/csvExport';

interface AdminPortalProps {
  user: UserAccount;
  slots: DefenseSlot[];
  appointments: DefenseAppointment[];
  zoomRooms: ZoomRoom[];
  faculty: FacultyChair[];
  requiredDocuments: RequiredDocumentSpec[];
  fileSubmissions: StudentFileSubmission[];
  activeQuarter: QuartermPeriod | null;
  archivedQuarters: ArchivedQuarterm[];
  todayIso: string;
  onCloseQuarterm: (closingNote: string) => void;
  onReopenQuarterm: () => void;
  onArchiveQuarterm: (archiveNote: string) => void;
  onOpenNewQuarterm: (payload: {
    quarterNumber: 1 | 2 | 3 | 4;
    startYear: number;
    seedStarterSlots: boolean;
  }) => void;
  onUpdateAppointmentStatus: (
    id: string,
    status: AppointmentStatus,
    feedback?: string,
    zoomDetails?: { zoomLink: string; zoomPasscode?: string }
  ) => void;
  onUpdateAppointmentZoom: (
    id: string,
    zoomDetails: { zoomLink: string; zoomPasscode?: string }
  ) => void;
  onReviewStudentFile: (
    submissionId: string,
    status: FileReviewStatus,
    facultyNote?: string
  ) => void;
  onApproveAllStudentFiles: (studentEmail: string) => void;
  onAddSlot: (slot: Omit<DefenseSlot, 'id'>) => void;
  onUpdateSlotZoomLink: (
    slotId: string,
    zoomDetails: { zoomLink: string; zoomPasscode?: string }
  ) => void;
  onGenerateDaySlots: (date: string) => void;
  onToggleBlockSlot: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onToggleZoomRoomAvailability: (roomId: string) => void;
  onUpdateZoomRoomLink: (
    roomId: string,
    payload: { zoomLink: string; meetingId: string; passcode: string }
  ) => void;
  onToggleFacultyAvailability: (facultyId: string) => void;
  onSwitchRole: () => void;
  onSignOut: () => void;
  onResetDemoData: () => void;
  onOpenProfileModal?: () => void;
  announcements?: Announcement[];
  onCreateAnnouncement?: (data: Omit<Announcement, 'id' | 'createdAt'>) => void;
  onUpdateAnnouncement?: (announcement: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
}

export function AdminPortal({
  user,
  slots,
  appointments,
  zoomRooms,
  faculty,
  requiredDocuments,
  fileSubmissions,
  activeQuarter,
  archivedQuarters,
  todayIso,
  onCloseQuarterm,
  onReopenQuarterm,
  onArchiveQuarterm,
  onOpenNewQuarterm,
  onUpdateAppointmentStatus,
  onUpdateAppointmentZoom,
  onReviewStudentFile,
  onApproveAllStudentFiles,
  onAddSlot,
  onUpdateSlotZoomLink,
  onGenerateDaySlots,
  onToggleBlockSlot,
  onDeleteSlot,
  onToggleZoomRoomAvailability,
  onUpdateZoomRoomLink,
  onToggleFacultyAvailability,
  onSwitchRole,
  onSignOut,
  onResetDemoData,
  onOpenProfileModal,
  announcements = [],
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'announcements' | 'submissions' | 'slots' | 'requests' | 'directory' | 'archives'
  >('overview');
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(10);
  const prefersReducedMotion = useReducedMotion();
  const [selectedDate, setSelectedDate] = useState('2026-11-18');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Missing Zoom Link' | AppointmentStatus
  >('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [fileStatusFilter, setFileStatusFilter] = useState<
    'All' | 'Pending Review' | 'Approved Students' | 'Cleared' | 'Revision Requested'
  >('All');
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [openFolderKey, setOpenFolderKey] = useState<string | null>(null);

  const [inspectedAppointmentId, setInspectedAppointmentId] = useState<string | null>(null);
  const [inspectedFileId, setInspectedFileId] = useState<string | null>(null);
  const [addSlotModalOpen, setAddSlotModalOpen] = useState(false);
  const [closeQuarterModalOpen, setCloseQuarterModalOpen] = useState(false);
  const [archiveQuarterModalOpen, setArchiveQuarterModalOpen] = useState(false);
  const [openQuarterModalOpen, setOpenQuarterModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    setToast({ id: Date.now() + Math.random(), message, tone });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (!addSlotModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAddSlotModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addSlotModalOpen]);

  // Inline slot Zoom link edit state
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingSlotLink, setEditingSlotLink] = useState('');
  const [editingSlotPasscode, setEditingSlotPasscode] = useState('');

  // Inline Zoom Room edit state
  const [editingZoomRoomId, setEditingZoomRoomId] = useState<string | null>(null);
  const [editingRoomLink, setEditingRoomLink] = useState('');
  const [editingRoomMeetingId, setEditingRoomMeetingId] = useState('');
  const [editingRoomPasscode, setEditingRoomPasscode] = useState('');

  // New slot form state
  const defaultZoomRoom = zoomRooms[0];
  const [newSlotDate, setNewSlotDate] = useState('2026-11-26');
  const [newStartTime, setNewStartTime] = useState('10:00');
  const [newEndTime, setNewEndTime] = useState('11:30');
  const [newZoomRoomName, setNewZoomRoomName] = useState(
    defaultZoomRoom?.name ?? 'UOx Zoom Defense Room 01'
  );
  const [newZoomLink, setNewZoomLink] = useState(defaultZoomRoom?.zoomLink ?? '');
  const [newZoomPasscode, setNewZoomPasscode] = useState(defaultZoomRoom?.passcode ?? '');
  const [newDepartment, setNewDepartment] = useState('Information Technology');
  const [newChair, setNewChair] = useState(faculty[0]?.name ?? '');

  const inspectedAppointment = useMemo(
    () =>
      inspectedAppointmentId
        ? appointments.find((a) => a.id === inspectedAppointmentId) ?? null
        : null,
    [appointments, inspectedAppointmentId]
  );

  const setInspectedAppointment = (appt: DefenseAppointment | null) => {
    setInspectedAppointmentId(appt ? appt.id : null);
  };

  const handleCopyZoomLink = (id: string, link: string) => {
    if (!link) return;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const handleQuickApproveAppointment = (appt: DefenseAppointment) => {
    if (appt.zoomLink.trim()) {
      onUpdateAppointmentStatus(
        appt.id,
        'Confirmed',
        'Approved by SOIT UOx Coordinator.'
      );
      showToast(`Approved defense ${appt.id} for ${appt.studentName}.`, 'success');
      return;
    }

    const matchedRoom = zoomRooms.find(
      (r) => r.name === appt.zoomRoomName && r.zoomLink.trim().length > 0
    );
    if (matchedRoom) {
      onUpdateAppointmentStatus(
        appt.id,
        'Confirmed',
        `Approved by SOIT UOx Coordinator (${matchedRoom.name} Zoom link applied).`,
        {
          zoomLink: matchedRoom.zoomLink,
          zoomPasscode: matchedRoom.passcode,
        }
      );
      showToast(
        `Approved ${appt.id} and applied ${matchedRoom.name} Zoom link.`,
        'success'
      );
      return;
    }

    setInspectedAppointment(appt);
    showToast(
      `Assign a Zoom meeting link for ${appt.id} before confirming.`,
      'warning'
    );
  };

  const appointmentsBySlotId = useMemo(() => {
    const map: Record<string, DefenseAppointment> = {};
    appointments.forEach((a) => {
      if (a.status !== 'Cancelled') {
        map[a.slotId] = a;
      }
    });
    return map;
  }, [appointments]);

  const slotSummaryByDate = useMemo(() => {
    const map: Record<string, { total: number; open: number; booked: number }> = {};
    slots.forEach((slot) => {
      if (!map[slot.date]) {
        map[slot.date] = { total: 0, open: 0, booked: 0 };
      }
      const isBooked = Boolean(appointmentsBySlotId[slot.id]);
      const isBlocked = slot.isBlocked;
      map[slot.date].total += 1;
      if (isBooked) {
        map[slot.date].booked += 1;
      } else if (!isBlocked) {
        map[slot.date].open += 1;
      }
    });
    return map;
  }, [slots, appointmentsBySlotId]);

  const slotsForSelectedDate = useMemo(
    () =>
      slots
        .filter((s) => s.date === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [slots, selectedDate]
  );

  const pendingQueue = useMemo(
    () =>
      appointments.filter(
        (a) => a.status === 'Pending Review' || a.status === 'Reschedule Requested'
      ),
    [appointments]
  );

  const confirmedUpcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.status === 'Confirmed')
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    [appointments]
  );

  const missingZoomLinkCount = useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.status !== 'Cancelled' &&
          a.status !== 'Completed' &&
          !a.zoomLink.trim()
      ).length,
    [appointments]
  );

  const requestStatusCounts = useMemo(() => {
    return {
      All: appointments.length,
      'Missing Zoom Link': missingZoomLinkCount,
      'Pending Review': appointments.filter((a) => a.status === 'Pending Review').length,
      Confirmed: appointments.filter((a) => a.status === 'Confirmed').length,
      'Reschedule Requested': appointments.filter((a) => a.status === 'Reschedule Requested').length,
      Completed: appointments.filter((a) => a.status === 'Completed').length,
      Cancelled: appointments.filter((a) => a.status === 'Cancelled').length,
    };
  }, [appointments, missingZoomLinkCount]);

  const filteredRequests = useMemo(() => {
    return appointments
      .filter((a) => {
        if (statusFilter === 'All') return true;
        if (statusFilter === 'Missing Zoom Link') {
          return (
            a.status !== 'Cancelled' &&
            a.status !== 'Completed' &&
            !a.zoomLink.trim()
          );
        }
        return a.status === statusFilter;
      })
      .filter((a) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          a.studentName.toLowerCase().includes(q) ||
          a.studentId.toLowerCase().includes(q) ||
          a.thesisTitle.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => `${b.date} ${a.startTime}`.localeCompare(`${a.date} ${a.startTime}`));
  }, [appointments, statusFilter, searchQuery]);

  const nextOpenDateIso = useMemo(() => {
    const openDates = Array.from(
      new Set(
        slots
          .filter((s) => !s.isBlocked && !appointmentsBySlotId[s.id] && s.date >= todayIso)
          .map((s) => s.date)
      )
    ).sort();
    return openDates.find((d) => d > selectedDate) ?? openDates[0] ?? null;
  }, [slots, appointmentsBySlotId, todayIso, selectedDate]);

  const openSlotCount = slots.filter(
    (s) => !s.isBlocked && !appointmentsBySlotId[s.id]
  ).length;
  const activeZoomRoomCount = zoomRooms.filter((r) => r.available).length;

  const requiredDocs = useMemo(
    () => requiredDocuments.filter((d) => d.required),
    [requiredDocuments]
  );

  const docById = useMemo(() => {
    const map: Record<string, RequiredDocumentSpec> = {};
    requiredDocuments.forEach((doc) => {
      map[doc.id] = doc;
    });
    return map;
  }, [requiredDocuments]);

  const pendingFilesCount = useMemo(
    () => fileSubmissions.filter((sub) => sub.status === 'Pending Review').length,
    [fileSubmissions]
  );

  const approvedFilesCount = useMemo(
    () => fileSubmissions.filter((sub) => sub.status === 'Approved').length,
    [fileSubmissions]
  );

  const revisionFilesCount = useMemo(
    () => fileSubmissions.filter((sub) => sub.status === 'Revision Requested').length,
    [fileSubmissions]
  );

  const studentFileGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        studentKey: string;
        studentName: string;
        studentId: string;
        studentEmail: string;
        program: string;
        department: string;
        submissionsByReqId: Record<string, StudentFileSubmission>;
        submissions: StudentFileSubmission[];
      }
    >();

    fileSubmissions.forEach((sub) => {
      const key = sub.studentEmail.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          studentKey: key,
          studentName: sub.studentName,
          studentId: sub.studentId,
          studentEmail: sub.studentEmail,
          program: sub.program,
          department: sub.department,
          submissionsByReqId: {},
          submissions: [],
        });
      }
      const group = map.get(key)!;
      group.submissionsByReqId[sub.requirementId] = sub;
      group.submissions.push(sub);
    });

    return Array.from(map.values()).map((group) => {
      const submittedReqCount = requiredDocs.filter((doc) =>
        Boolean(group.submissionsByReqId[doc.id])
      ).length;
      const approvedReqCount = requiredDocs.filter(
        (doc) => group.submissionsByReqId[doc.id]?.status === 'Approved'
      ).length;
      const pendingCount = group.submissions.filter(
        (s) => s.status === 'Pending Review'
      ).length;
      const revisionCount = group.submissions.filter(
        (s) => s.status === 'Revision Requested'
      ).length;
      const latestUpload = group.submissions
        .map((s) => s.uploadedAt)
        .sort()
        .slice(-1)[0];
      const hasPending = pendingCount > 0;
      const hasUnapproved = group.submissions.some((s) => s.status !== 'Approved');
      const isCleared =
        requiredDocs.length > 0 &&
        submittedReqCount === requiredDocs.length &&
        approvedReqCount === requiredDocs.length;

      return {
        ...group,
        submittedReqCount,
        approvedReqCount,
        pendingCount,
        revisionCount,
        latestUpload,
        hasPending,
        hasUnapproved,
        isCleared,
      };
    });
  }, [fileSubmissions, requiredDocs]);

  const clearedStudentsCount = useMemo(
    () => studentFileGroups.filter((g) => g.isCleared).length,
    [studentFileGroups]
  );

  const filteredStudentFileGroups = useMemo(() => {
    const q = fileSearchQuery.trim().toLowerCase();
    return studentFileGroups
      .filter((group) => {
        if (fileStatusFilter === 'All') return true;
        if (fileStatusFilter === 'Approved Students' || fileStatusFilter === 'Cleared') return group.isCleared;
        if (fileStatusFilter === 'Pending Review') return group.pendingCount > 0;
        if (fileStatusFilter === 'Revision Requested') return group.revisionCount > 0;
        return true;
      })
      .filter((group) => {
        if (!q) return true;
        return (
          group.studentName.toLowerCase().includes(q) ||
          group.studentId.toLowerCase().includes(q) ||
          group.program.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
        return a.studentName.localeCompare(b.studentName);
      });
  }, [studentFileGroups, fileStatusFilter, fileSearchQuery]);

  const activeFolder = useMemo(
    () =>
      openFolderKey
        ? studentFileGroups.find((g) => g.studentKey === openFolderKey) ?? null
        : null,
    [studentFileGroups, openFolderKey]
  );

  const inspectedFile = useMemo(
    () =>
      inspectedFileId
        ? fileSubmissions.find((s) => s.id === inspectedFileId) ?? null
        : null,
    [fileSubmissions, inspectedFileId]
  );

  const inspectedFileSiblings = useMemo(() => {
    if (!inspectedFile) return [];
    const key = inspectedFile.studentEmail.toLowerCase();
    const group = studentFileGroups.find((g) => g.studentKey === key);
    if (!group) return [inspectedFile];
    return requiredDocuments
      .map((doc) => group.submissionsByReqId[doc.id])
      .filter((sub): sub is StudentFileSubmission => Boolean(sub));
  }, [inspectedFile, studentFileGroups, requiredDocuments]);

  const inspectedFileAppointment = useMemo(() => {
    if (!inspectedFile) return undefined;
    return appointments.find(
      (a) =>
        a.studentEmail.toLowerCase() === inspectedFile.studentEmail.toLowerCase() ||
        a.studentId === inspectedFile.studentId
    );
  }, [inspectedFile, appointments]);

  const openFilePreview = (sub: StudentFileSubmission) => {
    setInspectedFileId(sub.id);
  };

  const handleChangeMonth = (delta: number) => {
    const next = new Date(calYear, calMonth + delta, 1);
    setCalYear(next.getFullYear());
    setCalMonth(next.getMonth());
  };

  const handleJumpToday = () => {
    setCalYear(2026);
    setCalMonth(10);
    setSelectedDate(todayIso);
  };

  const handleJumpNextOpen = () => {
    if (!nextOpenDateIso) return;
    const [y, m] = nextOpenDateIso.split('-').map(Number);
    setCalYear(y);
    setCalMonth(m - 1);
    setSelectedDate(nextOpenDateIso);
  };

  const handleOpenAddSlotModal = (presetDate?: string) => {
    setNewSlotDate(presetDate ?? selectedDate);
    const matched = zoomRooms.find((r) => r.name === newZoomRoomName) ?? zoomRooms[0];
    if (matched) {
      setNewZoomRoomName(matched.name);
      setNewZoomLink(matched.zoomLink);
      setNewZoomPasscode(matched.passcode);
    }
    setAddSlotModalOpen(true);
  };

  const handleSelectNewSlotZoomRoom = (roomName: string) => {
    setNewZoomRoomName(roomName);
    const matched = zoomRooms.find((r) => r.name === roomName);
    if (matched) {
      setNewZoomLink(matched.zoomLink);
      setNewZoomPasscode(matched.passcode);
    }
  };

  const handleCreateSlot = (e: FormEvent) => {
    e.preventDefault();
    const matchedRoom = zoomRooms.find((r) => r.name === newZoomRoomName);
    onAddSlot({
      date: newSlotDate,
      startTime: newStartTime,
      endTime: newEndTime,
      zoomRoomName: newZoomRoomName,
      zoomLink: newZoomLink.trim(),
      zoomMeetingId: matchedRoom?.meetingId,
      zoomPasscode: newZoomPasscode.trim() || undefined,
      department: newDepartment,
      chairName: newChair,
      isBlocked: false,
    });
    setSelectedDate(newSlotDate);
    setAddSlotModalOpen(false);
    showToast(
      `Created online Zoom defense slot on ${formatShortDate(newSlotDate)} (${newStartTime} – ${newEndTime}).`,
      'success'
    );
  };

  const nextQuarterSuggestion = useMemo(
    () =>
      getNextQuartermSuggestion(
        activeQuarter ?? archivedQuarters[0]?.quarterm ?? null
      ),
    [activeQuarter, archivedQuarters]
  );

  const nextQuarterPreviewCode = buildQuartermCode(
    nextQuarterSuggestion.quarterNumber,
    nextQuarterSuggestion.startYear
  );

  const quartermBannerInfo: QuartermBannerInfo = activeQuarter
    ? {
        code: activeQuarter.code,
        label: activeQuarter.label,
        status: activeQuarter.status,
      }
    : {
        code: 'No Active Term',
        label: `Ready to open ${nextQuarterPreviewCode}`,
        status: 'Unopened',
      };

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Schedule Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: <Megaphone className="w-4 h-4" />,
      badgeCount: announcements.length,
    },
    {
      id: 'submissions',
      label: 'Submitted Files',
      icon: <FolderCheck className="w-4 h-4" />,
      badgeCount: pendingFilesCount,
    },
    { id: 'slots', label: 'Manage Slots', icon: <CalendarCog className="w-4 h-4" /> },
    {
      id: 'requests',
      label: 'Defense Requests',
      icon: <ClipboardList className="w-4 h-4" />,
      badgeCount: pendingQueue.length,
    },
    { id: 'directory', label: 'Zoom Rooms & Faculty', icon: <Video className="w-4 h-4" /> },
    {
      id: 'archives',
      label: 'Quarterm Archives',
      icon: <Archive className="w-4 h-4" />,
      badgeCount: archivedQuarters.length,
    },
  ];

  const tabBackgroundMap: Record<typeof activeTab, string> = {
    overview: '/assets/portal/image_ed324830.png',
    announcements: '/assets/portal/image_ed324830.png',
    submissions: '/assets/portal/image_40c3523c.png',
    slots: '/assets/portal/image_7b399ac3.png',
    requests: '/assets/portal/image_40c3523c.png',
    directory: '/assets/portal/image_7b399ac3.png',
    archives: '/assets/portal/image_ed324830.png',
  };

  return (
    <PortalLayout
      user={user}
      navItems={navItems}
      activeTab={activeTab}
      backgroundUrl={tabBackgroundMap[activeTab]}
      quartermInfo={quartermBannerInfo}
      onSelectTab={(id) => setActiveTab(id as typeof activeTab)}
      primaryActionLabel={activeQuarter ? 'Add Defense Slot' : `Open ${nextQuarterPreviewCode}`}
      onPrimaryAction={() => {
        if (!activeQuarter) {
          setOpenQuarterModalOpen(true);
        } else {
          handleOpenAddSlotModal();
        }
      }}
      onSwitchRole={onSwitchRole}
      onSignOut={onSignOut}
      onResetDemoData={() => {
        onResetDemoData();
        setOpenFolderKey(null);
        setStatusFilter('All');
        setSearchQuery('');
        setFileStatusFilter('All');
        setFileSearchQuery('');
        showToast('Restored default Mapúa SOIT 1Q2627 demo data.', 'info');
      }}
      onOpenProfileModal={onOpenProfileModal}
    >
      {/* TAB 1: SCHEDULE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Mapua Quarterm Open / Close / Archive Lifecycle Card */}
          <section
            aria-label="Mapúa Quarterm lifecycle controls"
            className="bg-white/70 backdrop-blur-md border border-stone-300/80 shadow-[0_4px_24px_rgba(24,24,27,0.05)] rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
          >
            {activeQuarter ? (
              <>
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${
                      activeQuarter.status === 'Open'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-[#A6192E]/10 text-[#A6192E] border-[#A6192E]/20'
                    }`}
                  >
                    {activeQuarter.status === 'Open' ? (
                      <Unlock className="w-5 h-5" />
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="font-semibold text-zinc-500">Mapúa Quarterm</span>
                      <span className="text-zinc-300" aria-hidden="true">
                        ·
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          activeQuarter.status === 'Open'
                            ? 'text-emerald-700'
                            : 'text-[#A6192E]'
                        }`}
                      >
                        {activeQuarter.status === 'Open'
                          ? 'Open for Submissions & Scheduling'
                          : 'Closed — Ready to Store in Archives'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 mt-1">
                      <h2 className="text-xl font-bold font-mono tabular-nums text-zinc-900">
                        {activeQuarter.code}
                      </h2>
                      <span className="text-sm font-medium text-zinc-600">
                        {activeQuarter.label}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 mt-1">
                      Opened{' '}
                      <span className="font-mono tabular-nums">
                        {formatShortDate(activeQuarter.openedAt)}
                      </span>
                      {activeQuarter.closedAt && (
                        <>
                          <span className="mx-1.5 text-zinc-300" aria-hidden="true">
                            ·
                          </span>
                          Closed{' '}
                          <span className="font-mono tabular-nums">
                            {formatShortDate(activeQuarter.closedAt)}
                          </span>
                        </>
                      )}
                      {activeQuarter.closingNote && (
                        <>
                          <span className="mx-1.5 text-zinc-300" aria-hidden="true">
                            ·
                          </span>
                          <span>{activeQuarter.closingNote}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {activeQuarter.status === 'Open' ? (
                    <button
                      type="button"
                      onClick={() => setCloseQuarterModalOpen(true)}
                      className="py-2 px-4 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Close {activeQuarter.code}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onReopenQuarterm();
                          showToast(
                            `Reopened Quarterm ${activeQuarter.code} for student submissions and scheduling.`,
                            'success'
                          );
                        }}
                        className="py-2 px-3.5 bg-white hover:bg-stone-50 border border-stone-300 text-zinc-800 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        <span>Reopen {activeQuarter.code}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchiveQuarterModalOpen(true)}
                        className="py-2 px-4 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Archive className="w-3.5 h-3.5 shrink-0" />
                        <span>Store {activeQuarter.code} in Archives</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-[#C99700]/15 text-[#9A6E00] border border-[#C99700]/30 flex items-center justify-center shrink-0">
                    <CalendarPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#9A6E00]">
                      Previous Quarterm Stored in Archives
                    </p>
                    <h2 className="text-lg font-semibold text-zinc-900 mt-0.5">
                      No Active Quarterm Currently Open
                    </h2>
                    <p className="text-xs text-zinc-600 mt-1">
                      Open a new Mapúa Quarterm (suggested:{' '}
                      <span className="font-mono font-semibold text-zinc-900">
                        {nextQuarterPreviewCode}
                      </span>
                      ) to begin accepting student PDF submissions and defense bookings, or inspect
                      stored records in Quarterm Archives.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('archives')}
                    className="py-2 px-3.5 bg-white hover:bg-stone-50 border border-stone-300 text-zinc-800 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Archive className="w-3.5 h-3.5 shrink-0" />
                    <span>View Archives</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenQuarterModalOpen(true)}
                    className="py-2 px-4 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>Open New Quarterm ({nextQuarterPreviewCode})</span>
                  </button>
                </div>
              </>
            )}
          </section>

          {/* 4-Column Interactive KPI Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('Confirmed');
                setSearchQuery('');
                setActiveTab('requests');
              }}
              className="group bg-white/65 hover:bg-white/92 backdrop-blur-md border border-stone-300/70 hover:border-[#A6192E]/40 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-4 sm:p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-500">Confirmed Defenses</p>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#A6192E] transition-colors shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-zinc-900 mt-1.5">
                {confirmedUpcoming.length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {activeQuarter ? `Active ${activeQuarter.code}` : 'No active quarter'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('Pending Review');
                setSearchQuery('');
                setActiveTab('requests');
              }}
              className="group bg-white/65 hover:bg-white/92 backdrop-blur-md border border-stone-300/70 hover:border-[#A6192E]/40 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-4 sm:p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-500">Pending Approvals</p>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#A6192E] transition-colors shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#9A6E00] mt-1.5">
                {pendingQueue.length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Needs review</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('slots')}
              className="group bg-white/65 hover:bg-white/92 backdrop-blur-md border border-stone-300/70 hover:border-[#A6192E]/40 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-4 sm:p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-500">Open Time Slots</p>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#A6192E] transition-colors shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#A6192E] mt-1.5">
                {openSlotCount}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Available to book</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className="group bg-white/65 hover:bg-white/92 backdrop-blur-md border border-stone-300/70 hover:border-[#A6192E]/40 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-4 sm:p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-500">Active Zoom Rooms</p>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#A6192E] transition-colors shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-zinc-900 mt-1.5">
                {activeZoomRoomCount}/{zoomRooms.length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">UOx online channels</p>
            </button>
          </div>

          {/* Row 1: Operations Queue & Confirmed Defenses */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Pending Queue */}
            <section className="lg:col-span-7 flex flex-col justify-between bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">
                    Pending Approval Queue
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Approve candidate reservations or inspect committee conflicts.
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-zinc-500">
                  {pendingQueue.length} items
                </span>
              </div>

              {pendingQueue.length === 0 ? (
                <div className="py-7 px-4 text-center rounded-lg bg-stone-50/70 border border-stone-200/80 flex-1 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center mb-2.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">All Candidate Requests Reviewed</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    No student defense reservations currently require committee approval.
                  </p>
                  <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('requests')}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-md transition-colors"
                    >
                      View All Requests
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('submissions')}
                      className="px-3 py-1.5 text-xs font-medium text-[#A6192E] bg-[#A6192E]/10 hover:bg-[#A6192E]/15 rounded-md transition-colors"
                    >
                      Inspect Submitted Files ({pendingFilesCount} pending)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 flex-1">
                  {pendingQueue.map((appt) => (
                    <div
                      key={appt.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                          <span className="font-mono tabular-nums">{appt.id}</span>
                          <span aria-hidden="true">·</span>
                          <StatusLabel status={appt.status} />
                          <span aria-hidden="true">·</span>
                          <span>{appt.department}</span>
                        </div>
                        <p className="text-sm font-semibold text-zinc-900 mt-1 truncate">
                          {appt.studentName} — {appt.thesisTitle}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {formatShortDate(appt.date)} ·{' '}
                          <span className="font-mono tabular-nums">
                            {formatTimeRange(appt.startTime, appt.endTime)}
                          </span>{' '}
                          · {appt.zoomRoomName}
                          {!appt.zoomLink && (
                            <span className="text-[#9A6E00] font-medium"> · Needs Zoom link</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setInspectedAppointment(appt)}
                          className="py-1.5 px-3 text-xs font-medium text-zinc-700 bg-stone-900/[0.06] hover:bg-stone-900/[0.10] border border-stone-300/60 rounded-md transition-colors whitespace-nowrap"
                        >
                          {appt.zoomLink ? 'Review' : 'Set Zoom Link'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickApproveAppointment(appt)}
                          className="py-1.5 px-3 text-xs font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-md transition-colors whitespace-nowrap"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Confirmed Upcoming */}
            <section className="lg:col-span-5 flex flex-col justify-between bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-base font-semibold text-zinc-900">
                  Upcoming Confirmed
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('slots')}
                  className="text-xs font-medium text-[#A6192E] hover:underline whitespace-nowrap"
                >
                  Manage slots
                </button>
              </div>

              {confirmedUpcoming.length === 0 ? (
                <div className="py-7 px-4 text-center rounded-lg bg-stone-50/70 border border-stone-200/80 flex-1 flex flex-col items-center justify-center">
                  <CalendarDays className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-zinc-900">No Confirmed Defenses Yet</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                    Confirmed student defense reservations will be listed here with direct Zoom access links.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddSlotModal()}
                    className="mt-3.5 px-3 py-1.5 text-xs font-medium text-[#A6192E] bg-[#A6192E]/10 hover:bg-[#A6192E]/15 rounded-md transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Defense Slot</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 flex-1">
                  {confirmedUpcoming.map((appt) => (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => setInspectedAppointment(appt)}
                      className="w-full py-3 text-left hover:bg-stone-50 px-2 -mx-2 rounded-md transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#A6192E] font-mono tabular-nums">
                          {formatShortDate(appt.date)} · {appt.startTime}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            appt.zoomLink ? 'text-emerald-700' : 'text-[#9A6E00]'
                          }`}
                        >
                          {appt.zoomLink ? 'Zoom Ready' : 'Set Zoom Link'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-900 mt-1 truncate">
                        {appt.studentName}
                      </p>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {appt.zoomRoomName} · Chair: {appt.advisorName}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Row 2: Slots Inventory Snapshot & Virtual Channel Readiness */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Quick Schedule Inventory Preview on Overview */}
            <section className="lg:col-span-7 flex flex-col justify-between bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-200/80">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">
                    Configured Defense Slots Snapshot
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Live snapshot of online oral defense windows open for student reservation in {activeQuarter ? activeQuarter.code : 'this term'}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('slots')}
                  className="self-start sm:self-auto py-1.5 px-3 text-xs font-semibold text-[#881325] hover:text-[#6B0F1D] bg-stone-100 hover:bg-stone-200/70 border border-stone-300/80 rounded-lg whitespace-nowrap transition-colors cursor-pointer"
                >
                  Manage Full Inventory →
                </button>
              </div>

              {slots.length === 0 ? (
                <div className="py-7 px-4 text-center rounded-lg bg-stone-50/70 border border-stone-200/80 flex-1 flex flex-col items-center justify-center">
                  <CalendarPlus className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-zinc-900">No Time Slots Created Yet</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    Click "Add Defense Slot" in the top header or generate standard UOx Zoom blocks.
                  </p>
                  <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAddSlotModal()}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-md transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Defense Slot</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onGenerateDaySlots(selectedDate);
                        showToast(`Generated standard UOx Zoom blocks for ${formatShortDate(selectedDate)}.`, 'success');
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-md transition-colors"
                    >
                      Generate Day Blocks
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                  {slots.slice(0, 6).map((slot) => {
                    const appt = appointmentsBySlotId[slot.id];
                    const isAvailable = !appt && !slot.isBlocked;
                    return (
                      <div
                        key={slot.id}
                        className="p-3.5 rounded-lg bg-stone-50/80 border border-stone-200/90 flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-[#A6192E] font-mono tabular-nums">
                              {formatReadableDate(slot.date)}
                            </p>
                            <p className="text-sm font-semibold text-zinc-900 font-mono tabular-nums mt-0.5">
                              {formatTimeRange(slot.startTime, slot.endTime)}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : slot.isBlocked
                                ? 'bg-stone-200 text-stone-600'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isAvailable ? 'Open' : slot.isBlocked ? 'Blocked' : 'Reserved'}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-600 pt-1 border-t border-stone-200/60 flex items-center justify-between gap-2">
                          <span className="truncate">{slot.zoomRoomName}</span>
                          <span className="font-mono text-[11px] text-zinc-400 shrink-0">{slot.id}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* UOx Defense Operations & Quick Action Center */}
            <section className="lg:col-span-5 flex flex-col justify-between bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200/80">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-[#A6192E]/10 text-[#A6192E]">
                      <Video className="w-4 h-4" />
                    </span>
                    <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                      UOx Channel Readiness
                    </h3>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {activeZoomRoomCount}/{zoomRooms.length} Online
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  {zoomRooms.map((room) => {
                    const shortName = room.name
                      .replace(/Zoom Defense\s*/i, '')
                      .replace(/\s*\(.*?\)/, '')
                      .trim();
                    return (
                      <div
                        key={room.id}
                        title={room.name}
                        className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/70 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-medium text-zinc-800 truncate">{shortName}</span>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            room.available ? 'bg-emerald-500' : 'bg-zinc-300'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200/80 space-y-2">
                <p className="text-xs font-semibold text-zinc-700">Coordinator Fast Shortcuts</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('announcements')}
                    className="p-2 text-left bg-stone-100 hover:bg-stone-200/70 rounded-lg border border-stone-300/60 font-medium text-zinc-800 transition-colors flex items-center justify-between"
                  >
                    <span>Announcements</span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('submissions')}
                    className="p-2 text-left bg-stone-100 hover:bg-stone-200/70 rounded-lg border border-stone-300/60 font-medium text-zinc-800 transition-colors flex items-center justify-between"
                  >
                    <span>Student Files</span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('directory')}
                    className="p-2 text-left bg-stone-100 hover:bg-stone-200/70 rounded-lg border border-stone-300/60 font-medium text-zinc-800 transition-colors flex items-center justify-between"
                  >
                    <span>Zoom Channels</span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('archives')}
                    className="p-2 text-left bg-stone-100 hover:bg-stone-200/70 rounded-lg border border-stone-300/60 font-medium text-zinc-800 transition-colors flex items-center justify-between"
                  >
                    <span>Term Archives</span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <AdminAnnouncementsView
          user={user}
          announcements={announcements}
          onCreateAnnouncement={onCreateAnnouncement ?? (() => {})}
          onUpdateAnnouncement={onUpdateAnnouncement ?? (() => {})}
          onDeleteAnnouncement={onDeleteAnnouncement ?? (() => {})}
          onNotify={showToast}
        />
      )}

      {/* TAB 2: SUBMITTED FILES (STUDENT FOLDERS + PDF PREVIEW) */}
      {activeTab === 'submissions' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Compact 4-Column Interactive Clearance KPI Strip */}
          {!activeFolder && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => {
                  setOpenFolderKey(null);
                  setStatusFilter('All');
                  setFileStatusFilter('All');
                  setFileSearchQuery('');
                }}
                className="group bg-white/65 hover:bg-white/92 backdrop-blur-md border border-stone-300/70 hover:border-[#A6192E]/40 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-4 sm:p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-500">Student Folders</p>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#A6192E] transition-colors shrink-0" />
                </div>
                <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-zinc-900 mt-1.5">
                  {studentFileGroups.length}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Active candidates</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenFolderKey(null);
                  setFileStatusFilter('Pending Review');
                }}
                className="group bg-white/65 hover:bg-white/92 backdrop-blur-md border border-stone-300/70 hover:border-[#A6192E]/40 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-4 sm:p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-500">Pending File Reviews</p>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#A6192E] transition-colors shrink-0" />
                </div>
                <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#9A6E00] mt-1.5">
                  {pendingFilesCount}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Awaiting sign-off</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenFolderKey(null);
                  setFileStatusFilter('Approved Students');
                }}
                className="group bg-white/65 hover:bg-white/92 backdrop-blur-md border border-stone-300/70 hover:border-[#A6192E]/40 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-4 sm:p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-500">Approved Students</p>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#A6192E] transition-colors shrink-0" />
                </div>
                <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-emerald-700 mt-1.5">
                  {clearedStudentsCount}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Complete approval</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenFolderKey(null);
                  setFileStatusFilter(revisionFilesCount > 0 ? 'Revision Requested' : 'Approved Students');
                }}
                className="group bg-white/65 hover:bg-white/92 backdrop-blur-md border border-stone-300/70 hover:border-[#A6192E]/40 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-4 sm:p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-500">Students Cleared</p>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#A6192E] transition-colors shrink-0" />
                </div>
                <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-zinc-900 mt-1.5">
                  {clearedStudentsCount}/{studentFileGroups.length}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {revisionFilesCount > 0
                    ? `${revisionFilesCount} revision requested`
                    : 'Eligible to schedule'}
                </p>
              </button>
            </div>
          )}

          {!activeFolder ? (
            /* FOLDER DIRECTORY VIEW (UNCLUTTERED BY STUDENT NAME) */
            <div className="space-y-4 sm:space-y-5">
              {/* Unified Control Dock */}
              <div className="bg-white/75 backdrop-blur-md border border-stone-300/70 rounded-xl px-4 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-1 p-1 bg-stone-200/70 border border-stone-300/50 rounded-lg overflow-x-auto scrollbar-none">
                  {(
                    [
                      { id: 'All', label: 'All Folders' },
                      { id: 'Pending Review', label: 'Pending Review' },
                      { id: 'Approved Students', label: 'Approved Students' },
                      { id: 'Revision Requested', label: 'Needs Revision' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFileStatusFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                        fileStatusFilter === tab.id
                          ? 'bg-white text-zinc-900 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    placeholder="Filter folders by student name or ID..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs bg-stone-100/80 hover:bg-white focus:bg-white border border-stone-300/70 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E] shadow-2xs transition-colors"
                  />
                  {fileSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setFileSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {filteredStudentFileGroups.length === 0 ? (
                <div className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-10 text-center">
                  <p className="text-sm font-medium text-zinc-900">
                    No student folders match your filter
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Clear the student name search or select All Folders.
                  </p>
                  {(fileStatusFilter !== 'All' || fileSearchQuery.trim() !== '') && (
                    <button
                      type="button"
                      onClick={() => {
                        setFileStatusFilter('All');
                        setFileSearchQuery('');
                      }}
                      className="mt-4 py-1.5 px-3.5 text-xs font-medium text-zinc-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredStudentFileGroups.map((group) => (
                    <button
                      key={group.studentKey}
                      type="button"
                      onClick={() => setOpenFolderKey(group.studentKey)}
                      className="group bg-white/68 hover:bg-white/92 backdrop-blur-md border border-stone-300/75 hover:border-[#A6192E]/45 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 text-left transition-all flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              group.isCleared
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : group.revisionCount > 0
                                ? 'bg-[#A6192E]/10 text-[#A6192E] border border-[#A6192E]/20'
                                : 'bg-[#C99700]/12 text-[#9A6E00] border border-[#C99700]/25'
                            }`}
                          >
                            <Folder className="w-5 h-5 group-hover:hidden" />
                            <FolderOpen className="w-5 h-5 hidden group-hover:block" />
                          </div>

                          <span className="text-xs font-mono tabular-nums text-zinc-500">
                            {group.submittedReqCount}/{requiredDocs.length} PDFs
                          </span>
                        </div>

                        <div>
                          <h2 className="text-base font-semibold text-zinc-900 group-hover:text-[#A6192E] transition-colors truncate">
                            {group.studentName}
                          </h2>
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">
                            <span className="font-mono tabular-nums">{group.studentId}</span>
                            <span className="mx-1.5 text-zinc-300" aria-hidden="true">
                              ·
                            </span>
                            <span>{group.program}</span>
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between gap-2 text-xs">
                        {group.isCleared ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Cleared to Schedule</span>
                          </span>
                        ) : group.pendingCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#9A6E00]">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {group.pendingCount} pending · {group.approvedReqCount}/
                              {requiredDocs.length} approved
                            </span>
                          </span>
                        ) : group.revisionCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#A6192E]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Revision Requested</span>
                          </span>
                        ) : (
                          <span className="text-zinc-500">
                            {group.approvedReqCount}/{requiredDocs.length} approved
                          </span>
                        )}

                        <span className="inline-flex items-center gap-0.5 font-medium text-zinc-600 group-hover:text-[#A6192E] shrink-0">
                          <span>Open</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* INSIDE OPENED STUDENT FOLDER */
            <section className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-300/60 bg-stone-900/[0.03] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#A6192E]/10 text-[#A6192E] border border-[#A6192E]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h2 className="text-lg font-semibold text-zinc-900">
                        {activeFolder.studentName}
                      </h2>
                      <span className="text-zinc-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs font-mono tabular-nums text-zinc-600">
                        {activeFolder.studentId}
                      </span>
                      <span className="text-zinc-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs text-zinc-600">{activeFolder.program}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                      {activeFolder.isCleared ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Cleared to Schedule Defense</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#9A6E00]">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Scheduling Locked · {activeFolder.submittedReqCount}/
                            {requiredDocs.length} submitted · {activeFolder.approvedReqCount}/
                            {requiredDocs.length} approved
                          </span>
                        </span>
                      )}
                      {activeFolder.latestUpload && (
                        <>
                          <span className="text-zinc-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-zinc-500 font-mono tabular-nums">
                            Last upload {formatShortDate(activeFolder.latestUpload)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenFolderKey(null)}
                    className="py-1.5 px-3 bg-white hover:bg-stone-50 border border-stone-300 text-zinc-700 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>All Student Folders</span>
                  </button>
                  {activeFolder.hasUnapproved && (
                    <button
                      type="button"
                      onClick={() => {
                        onApproveAllStudentFiles(activeFolder.studentEmail);
                        showToast(
                          `Approved all submitted files for ${activeFolder.studentName}.`,
                          'success'
                        );
                      }}
                      className="py-2 px-3.5 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Approve All Submitted
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-stone-900/[0.02] text-xs font-medium text-zinc-500">
                      <th className="py-3 px-5">Required Document</th>
                      <th className="py-3 px-4">Submitted PDF</th>
                      <th className="py-3 px-4">Uploaded</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {requiredDocuments.map((doc) => {
                      const sub = activeFolder.submissionsByReqId[doc.id];
                      return (
                        <tr
                          key={doc.id}
                          className="hover:bg-stone-900/[0.03] transition-colors"
                        >
                          <td className="py-4 px-5 min-w-[210px]">
                            <p className="font-medium text-zinc-900">{doc.title}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{doc.acceptedFormats}</p>
                          </td>
                          <td className="py-4 px-4 min-w-[230px]">
                            {sub ? (
                              <div className="flex items-start gap-2.5">
                                <FileText className="w-4 h-4 text-[#A6192E] mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => openFilePreview(sub)}
                                    className="font-medium text-zinc-900 hover:text-[#A6192E] text-left truncate block max-w-[270px]"
                                  >
                                    {sub.fileName}
                                  </button>
                                  <p className="text-xs font-mono tabular-nums text-zinc-500 mt-0.5">
                                    {sub.fileSize}
                                    {sub.facultyNote ? ` · ${sub.facultyNote}` : ''}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400">
                                Awaiting student upload
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs tabular-nums text-zinc-600 whitespace-nowrap">
                            {sub ? formatShortDate(sub.uploadedAt) : '—'}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <FileStatusLabel status={sub?.status ?? 'Not Submitted'} />
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            {sub ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openFilePreview(sub)}
                                  className="py-1.5 px-2.5 text-xs font-medium text-zinc-800 bg-white/85 hover:bg-white border border-stone-300/80 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
                                  <span>Preview PDF</span>
                                </button>
                                {sub.status !== 'Approved' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onReviewStudentFile(
                                        sub.id,
                                        'Approved',
                                        'Verified and approved for defense scheduling.'
                                      );
                                      showToast(
                                        `Approved "${sub.fileName}" for ${sub.studentName}.`,
                                        'success'
                                      );
                                    }}
                                    className="py-1.5 px-2.5 text-xs font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-md transition-colors whitespace-nowrap"
                                  >
                                    Approve
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400">Not Uploaded</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* TAB 3: MANAGE SLOTS */}
      {activeTab === 'slots' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <CalendarGrid
                year={calYear}
                monthIndex={calMonth}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onChangeMonth={handleChangeMonth}
                onJumpToday={handleJumpToday}
                onJumpNextOpen={handleJumpNextOpen}
                hasNextOpen={Boolean(nextOpenDateIso)}
                slotSummaryByDate={slotSummaryByDate}
                todayIso={todayIso}
                showBookedCount
              />
            </div>

            <div className="lg:col-span-5 bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-zinc-100">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Online Slots On</p>
                  <h2 className="text-base font-semibold text-zinc-900 mt-0.5">
                    {formatReadableDate(selectedDate)}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onGenerateDaySlots(selectedDate);
                      showToast(
                        `Added standard UOx Zoom blocks for ${formatShortDate(selectedDate)}.`,
                        'success'
                      );
                    }}
                    className="py-1 px-2.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    Generate Day Blocks
                  </button>
                  <span className="text-xs font-mono tabular-nums text-zinc-500">
                    {slotsForSelectedDate.length} total
                  </span>
                </div>
              </div>

              {slotsForSelectedDate.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-zinc-800">No slots configured</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Add a custom Zoom time block or generate standard slots for this date.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 mt-2">
                  {slotsForSelectedDate.map((slot) => {
                    const bookedAppt = appointmentsBySlotId[slot.id];
                    const isEditingThisSlot = editingSlotId === slot.id;
                    return (
                      <div key={slot.id} className="py-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold font-mono tabular-nums text-zinc-900">
                              {formatTimeRange(slot.startTime, slot.endTime)}
                            </p>
                            <p className="text-xs text-zinc-700 mt-0.5 flex items-center gap-1.5">
                              <Video className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
                              <span className="truncate">{slot.zoomRoomName}</span>
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Chair: {slot.chairName}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            {bookedAppt ? (
                              <button
                                type="button"
                                onClick={() => setInspectedAppointment(bookedAppt)}
                                className="text-xs font-medium text-[#A6192E] hover:underline"
                              >
                                Booked ({bookedAppt.studentName.split(' ')[0]})
                              </button>
                            ) : slot.isBlocked ? (
                              <span className="text-xs font-medium text-rose-700">Blocked</span>
                            ) : (
                              <span className="text-xs font-medium text-emerald-700">Open</span>
                            )}
                          </div>
                        </div>

                        {/* Slot Zoom Link Display / Inline Editor */}
                        {isEditingThisSlot ? (
                          <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
                            <input
                              type="url"
                              value={editingSlotLink}
                              onChange={(e) => setEditingSlotLink(e.target.value)}
                              placeholder="https://mapua-edu-ph.zoom.us/j/..."
                              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingSlotPasscode}
                                onChange={(e) => setEditingSlotPasscode(e.target.value)}
                                placeholder="Passcode (optional)"
                                className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateSlotZoomLink(slot.id, {
                                    zoomLink: editingSlotLink.trim(),
                                    zoomPasscode: editingSlotPasscode.trim() || undefined,
                                  });
                                  setEditingSlotId(null);
                                  showToast(
                                    `Updated Zoom link for ${formatShortDate(slot.date)} (${slot.startTime}).`,
                                    'success'
                                  );
                                }}
                                className="py-1.5 px-3 text-xs font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-md whitespace-nowrap"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSlotId(null)}
                                className="py-1.5 px-2 text-xs text-zinc-600 hover:bg-zinc-200 rounded-md"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-stone-900/[0.03] border border-stone-200/80 rounded-md">
                            <span className="text-[11px] font-mono text-zinc-600 truncate">
                              {slot.zoomLink || 'No Zoom link assigned yet'}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {slot.zoomLink && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyZoomLink(slot.id, slot.zoomLink)}
                                  aria-label="Copy Zoom link"
                                  className="p-1 text-zinc-500 hover:text-zinc-900 rounded"
                                >
                                  {copiedId === slot.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSlotId(slot.id);
                                  setEditingSlotLink(slot.zoomLink);
                                  setEditingSlotPasscode(slot.zoomPasscode ?? '');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-[#A6192E] hover:bg-[#A6192E]/10 rounded whitespace-nowrap"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>{slot.zoomLink ? 'Edit Link' : 'Set Link'}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {!bookedAppt && (
                          <div className="flex items-center justify-end gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => onToggleBlockSlot(slot.id)}
                              className="inline-flex items-center gap-1 py-1 px-2.5 text-xs font-medium text-zinc-700 bg-stone-900/[0.06] hover:bg-stone-900/[0.10] border border-stone-300/60 rounded-md transition-colors"
                            >
                              {slot.isBlocked ? (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  <span>Unblock</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>Block</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteSlot(slot.id);
                                showToast(
                                  `Removed slot ${slot.startTime} – ${slot.endTime}.`,
                                  'info'
                                );
                              }}
                              aria-label="Delete open slot"
                              className="inline-flex items-center gap-1 py-1 px-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEFENSE REQUESTS TABLE */}
      {activeTab === 'requests' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Integrated Data Container with Option A Toolbar */}
          <div className="bg-white/75 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl overflow-hidden">
            {/* Integrated Container Toolbar Header */}
            <div className="px-4 py-3 bg-stone-50/70 border-b border-stone-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-stone-200/80 border border-stone-300/60 rounded-lg overflow-x-auto scrollbar-none">
                {(
                  [
                    'All',
                    'Missing Zoom Link',
                    'Pending Review',
                    'Confirmed',
                    'Reschedule Requested',
                    'Completed',
                    'Cancelled',
                  ] as const
                ).map((st) => {
                  const count = requestStatusCounts[st] ?? 0;
                  const isSelected = statusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-white text-zinc-900 shadow-xs'
                          : st === 'Missing Zoom Link' && missingZoomLinkCount > 0
                          ? 'text-[#9A6E00] hover:text-zinc-900'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <span>{st}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums font-semibold ${
                          isSelected
                            ? 'bg-stone-100 text-zinc-800'
                            : 'bg-stone-300/60 text-zinc-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student, ID, or thesis..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E] shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={filteredRequests.length === 0}
                  onClick={() => {
                    const termCode = activeQuarter?.code ?? 'SOIT';
                    downloadDefenseScheduleCsv(
                      filteredRequests,
                      `ThesisDesk-${termCode}-Defense-Schedule`
                    );
                    showToast(
                      `Exported ${filteredRequests.length} defense request${
                        filteredRequests.length === 1 ? '' : 's'
                      } to CSV.`,
                      'success'
                    );
                  }}
                  className="py-1.5 px-3 bg-white hover:bg-stone-50 disabled:opacity-45 disabled:cursor-not-allowed border border-stone-300 text-zinc-800 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
                  <span>Export CSV ({filteredRequests.length})</span>
                </button>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="py-8 px-6 text-center">
                <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 text-zinc-400 flex items-center justify-center mx-auto mb-2.5">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-zinc-900">
                  {appointments.length === 0
                    ? `No defense reservations booked yet in ${activeQuarter?.code ?? 'SOIT'}`
                    : 'No defense requests match your filter'}
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
                  {appointments.length === 0
                    ? 'Student candidates must upload required pre-defense files and obtain faculty approval to book an open Zoom slot. Once booked, reservations appear here for committee review and Zoom link assignment.'
                    : 'Clear your search query or select another status filter above.'}
                </p>
                {appointments.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('slots')}
                    className="mt-3.5 py-1.5 px-3.5 text-xs font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-lg transition-colors whitespace-nowrap shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Manage Zoom Slots</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  (statusFilter !== 'All' || searchQuery.trim() !== '') && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('All');
                        setSearchQuery('');
                      }}
                      className="mt-3.5 py-1.5 px-4 text-xs font-medium text-zinc-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-100/70 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Thesis Manuscript</th>
                      <th className="py-3 px-4">Defense Window</th>
                      <th className="py-3 px-4">Zoom Channel</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 text-sm">
                    {filteredRequests.map((appt) => (
                      <tr key={appt.id} className="hover:bg-stone-900/[0.03] transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-stone-200/80 border border-stone-300/80 text-zinc-700 flex items-center justify-center font-semibold text-xs shrink-0 font-mono">
                              {appt.studentName
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-900 truncate">
                                {appt.studentName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-500 font-mono">
                                <span>{appt.studentId}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-sans font-medium text-zinc-600">
                                  {appt.department}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 min-w-[220px] max-w-xs">
                          <button
                            type="button"
                            onClick={() => setInspectedAppointment(appt)}
                            className="font-medium text-zinc-900 hover:text-[#A6192E] text-left line-clamp-1 group flex items-center gap-1 cursor-pointer"
                          >
                            <span className="truncate">{appt.thesisTitle}</span>
                          </button>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            Adviser: <span className="text-zinc-700">{appt.advisorName}</span>
                          </p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
                              <span>{formatShortDate(appt.date)}</span>
                            </p>
                            <p className="text-[11px] font-mono tabular-nums text-zinc-500 pl-5">
                              {formatTimeRange(appt.startTime, appt.endTime)}
                            </p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-zinc-800 flex items-center gap-1.5">
                              <Video className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{appt.zoomRoomName}</span>
                            </p>
                            {appt.zoomLink ? (
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={appt.zoomLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded cursor-pointer"
                                >
                                  <Link2 className="w-3 h-3 shrink-0" />
                                  <span>Join Zoom</span>
                                </a>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setInspectedAppointment(appt)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#9A6E00] hover:text-amber-800 bg-[#9A6E00]/10 hover:bg-[#9A6E00]/15 border border-[#9A6E00]/30 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#9A6E00] animate-pulse shrink-0" />
                                <span>+ Assign Zoom</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusLabel status={appt.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {appt.status === 'Pending Review' && (
                              <button
                                type="button"
                                onClick={() => handleQuickApproveAppointment(appt)}
                                className="py-1.5 px-2.5 text-xs font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-lg transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setInspectedAppointment(appt)}
                              className="py-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3 text-zinc-500" />
                              <span>Inspect</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ZOOM ROOMS & FACULTY DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4 sm:space-y-5">
          <section className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  UOx Zoom Defense Channels
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Updating a channel&apos;s Zoom link automatically syncs to open slots and active
                  defenses assigned to that channel.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-stone-900/[0.04] text-xs font-medium text-zinc-500">
                    <th className="py-3 px-4">Zoom Channel</th>
                    <th className="py-3 px-4">Zoom Meeting Link & Passcode</th>
                    <th className="py-3 px-4">Capabilities</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {zoomRooms.map((room) => {
                    const isEditing = editingZoomRoomId === room.id;
                    return (
                      <tr key={room.id}>
                        <td className="py-3.5 px-4 whitespace-nowrap align-top">
                          <p className="font-medium text-zinc-900">{room.name}</p>
                          <p className="text-xs font-mono text-zinc-500 mt-0.5">
                            {room.hostAccount}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 min-w-[290px] align-top">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="url"
                                value={editingRoomLink}
                                onChange={(e) => setEditingRoomLink(e.target.value)}
                                placeholder="https://mapua-edu-ph.zoom.us/j/..."
                                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={editingRoomMeetingId}
                                  onChange={(e) => setEditingRoomMeetingId(e.target.value)}
                                  placeholder="Meeting ID"
                                  className="px-2.5 py-1.5 text-xs font-mono bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                                />
                                <input
                                  type="text"
                                  value={editingRoomPasscode}
                                  onChange={(e) => setEditingRoomPasscode(e.target.value)}
                                  placeholder="Passcode"
                                  className="px-2.5 py-1.5 text-xs font-mono bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-mono text-zinc-900 break-all">
                                {room.zoomLink}
                              </p>
                              <p className="text-xs font-mono tabular-nums text-zinc-500 mt-0.5">
                                ID: {room.meetingId} · Passcode: {room.passcode}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-600 min-w-[210px] align-top">
                          {room.features}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap align-top">
                          <div className="inline-flex items-center gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateZoomRoomLink(room.id, {
                                      zoomLink: editingRoomLink.trim(),
                                      meetingId: editingRoomMeetingId.trim(),
                                      passcode: editingRoomPasscode.trim(),
                                    });
                                    setEditingZoomRoomId(null);
                                    showToast(`Updated Zoom link for ${room.name}.`, 'success');
                                  }}
                                  className="py-1.5 px-3 text-xs font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-md transition-colors"
                                >
                                  Save Link
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingZoomRoomId(null)}
                                  className="py-1.5 px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-md"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingZoomRoomId(room.id);
                                    setEditingRoomLink(room.zoomLink);
                                    setEditingRoomMeetingId(room.meetingId);
                                    setEditingRoomPasscode(room.passcode);
                                  }}
                                  className="py-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-md inline-flex items-center gap-1 transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit Link</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onToggleZoomRoomAvailability(room.id)}
                                  className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
                                    room.available
                                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                  }`}
                                >
                                  {room.available ? 'Active' : 'Offline'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200">
              <h2 className="text-base font-semibold text-zinc-900">
                Faculty Committee Chairs
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-stone-900/[0.04] text-xs font-medium text-zinc-500">
                    <th className="py-3 px-4">Faculty Member</th>
                    <th className="py-3 px-4">Program</th>
                    <th className="py-3 px-4 text-right">Assigned Defenses</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {faculty.map((member) => (
                    <tr key={member.id}>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-medium text-zinc-900">{member.name}</p>
                        <p className="text-xs text-zinc-500">{member.title}</p>
                      </td>
                      <td className="py-3 px-4 text-zinc-600 whitespace-nowrap">
                        {member.department}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-zinc-800">
                        {member.activeDefenses}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleFacultyAvailability(member.id)}
                          className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
                            member.available
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          {member.available ? 'Available' : 'On Leave'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 6: QUARTERM ARCHIVES */}
      {activeTab === 'archives' && (
        <QuartermArchivesView
          archivedQuarters={archivedQuarters}
          activeQuarter={activeQuarter}
          requiredDocuments={requiredDocuments}
          onRequestOpenNewQuarter={() => setOpenQuarterModalOpen(true)}
          onNotify={showToast}
        />
      )}

      {/* ADD SLOT MODAL */}
      <AnimatePresence>
        {addSlotModalOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-slot-title"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.16 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setAddSlotModalOpen(false);
            }}
            className="fixed inset-0 z-50 bg-zinc-950/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.01 }
                  : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
              }
              className="bg-white border border-stone-300 rounded-xl max-w-md w-full p-6 shadow-2xl my-8"
            >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200">
              <div>
                <h2 id="add-slot-title" className="text-xl font-semibold text-zinc-900">
                  Add UOx Zoom Defense Slot
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Publish an online defense window and set its Zoom link for UOx candidates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddSlotModalOpen(false)}
                aria-label="Close modal"
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="mt-5 space-y-4">
              <div>
                <label htmlFor="slot-date" className="block text-xs font-medium text-zinc-700 mb-1">
                  Defense Date
                </label>
                <input
                  id="slot-date"
                  type="date"
                  required
                  value={newSlotDate}
                  onChange={(e) => setNewSlotDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="slot-start" className="block text-xs font-medium text-zinc-700 mb-1">
                    Start Time
                  </label>
                  <input
                    id="slot-start"
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                  />
                </div>
                <div>
                  <label htmlFor="slot-end" className="block text-xs font-medium text-zinc-700 mb-1">
                    End Time
                  </label>
                  <input
                    id="slot-end"
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="slot-zoom-room" className="block text-xs font-medium text-zinc-700 mb-1">
                  UOx Zoom Channel
                </label>
                <select
                  id="slot-zoom-room"
                  value={newZoomRoomName}
                  onChange={(e) => handleSelectNewSlotZoomRoom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                >
                  {zoomRooms.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="slot-zoom-link" className="block text-xs font-medium text-zinc-700 mb-1">
                  Zoom Meeting Link
                </label>
                <input
                  id="slot-zoom-link"
                  type="url"
                  value={newZoomLink}
                  onChange={(e) => setNewZoomLink(e.target.value)}
                  placeholder="https://mapua-edu-ph.zoom.us/j/..."
                  className="w-full px-3 py-2 text-xs font-mono border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="slot-passcode" className="block text-xs font-medium text-zinc-700 mb-1">
                    Passcode (optional)
                  </label>
                  <input
                    id="slot-passcode"
                    type="text"
                    value={newZoomPasscode}
                    onChange={(e) => setNewZoomPasscode(e.target.value)}
                    placeholder="SOIT-UOX1"
                    className="w-full px-3 py-2 text-xs font-mono border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                  />
                </div>
                <div>
                  <label htmlFor="slot-dept" className="block text-xs font-medium text-zinc-700 mb-1">
                    SOIT Program
                  </label>
                  <select
                    id="slot-dept"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                  >
                    <option value="Information Technology">Information Technology</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Information Systems">Information Systems</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="slot-chair" className="block text-xs font-medium text-zinc-700 mb-1">
                  Presiding Chair
                </label>
                <select
                  id="slot-chair"
                  value={newChair}
                  onChange={(e) => setNewChair(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                >
                  {faculty.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddSlotModalOpen(false)}
                  className="py-2 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 text-sm font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-lg transition-colors"
                >
                  Publish Slot
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUARTERM LIFECYCLE MODALS */}
      <CloseQuartermModal
        open={closeQuarterModalOpen}
        quarterm={activeQuarter}
        appointmentsCount={appointments.length}
        pendingAppointmentsCount={pendingQueue.length}
        filesCount={fileSubmissions.length}
        slotsCount={slots.length}
        onConfirmClose={(note) => {
          const code = activeQuarter?.code ?? '';
          onCloseQuarterm(note);
          setCloseQuarterModalOpen(false);
          showToast(
            `Quarterm ${code} is now closed. You may store it in Quarterm Archives whenever ready.`,
            'warning'
          );
        }}
        onCancel={() => setCloseQuarterModalOpen(false)}
      />

      <ArchiveQuartermModal
        open={archiveQuarterModalOpen}
        quarterm={activeQuarter}
        appointmentsCount={appointments.length}
        studentFoldersCount={studentFileGroups.length}
        filesCount={fileSubmissions.length}
        slotsCount={slots.length}
        onConfirmArchive={(note) => {
          const code = activeQuarter?.code ?? '';
          onArchiveQuarterm(note);
          setOpenFolderKey(null);
          setInspectedAppointment(null);
          setInspectedFileId(null);
          setArchiveQuarterModalOpen(false);
          setOpenQuarterModalOpen(true);
          showToast(
            `Stored ${code} in Quarterm Archives. You can now open the next Quarterm.`,
            'info'
          );
        }}
        onCancel={() => setArchiveQuarterModalOpen(false)}
      />

      <OpenQuartermModal
        open={openQuarterModalOpen}
        suggestedQuarter={nextQuarterSuggestion.quarterNumber}
        suggestedStartYear={nextQuarterSuggestion.startYear}
        existingArchivedCodes={archivedQuarters.map((a) => a.quarterm.code)}
        onConfirmOpen={(payload) => {
          const code = buildQuartermCode(payload.quarterNumber, payload.startYear);
          onOpenNewQuarterm(payload);
          setOpenQuarterModalOpen(false);
          setActiveTab('overview');
          showToast(
            `Opened new Mapúa Quarterm ${code}. Student submissions and defense scheduling are now live.`,
            'success'
          );
        }}
        onCancel={() => setOpenQuarterModalOpen(false)}
      />

      {/* INLINE PDF PREVIEW & FACULTY REVIEW MODAL */}
      <PdfPreviewModal
        submission={inspectedFile}
        documentSpec={inspectedFile ? docById[inspectedFile.requirementId] : undefined}
        matchedAppointment={inspectedFileAppointment}
        siblingSubmissions={inspectedFileSiblings}
        onSelectSubmission={(nextSub) => setInspectedFileId(nextSub.id)}
        onReview={(submissionId, status, note) => {
          onReviewStudentFile(submissionId, status, note);
          if (inspectedFile) {
            const verb = status === 'Approved' ? 'Approved' : 'Requested revision on';
            showToast(
              `${verb} "${inspectedFile.fileName}" (${inspectedFile.studentName}).`,
              status === 'Approved' ? 'success' : 'warning'
            );
          }
        }}
        onClose={() => setInspectedFileId(null)}
      />

      {/* REQUEST DETAIL DRAWER */}
      <AppointmentDetailDrawer
        appointment={inspectedAppointment}
        role="admin"
        onClose={() => setInspectedAppointment(null)}
        onAdminSaveZoom={(id, zoomDetails) => {
          onUpdateAppointmentZoom(id, zoomDetails);
          showToast(`Saved Zoom meeting link for defense ${id}.`, 'success');
        }}
        onAdminUpdateStatus={(id, status, feedback, zoomDetails) => {
          onUpdateAppointmentStatus(id, status, feedback, zoomDetails);
          showToast(
            `Updated appointment ${id} to "${status}".`,
            status === 'Cancelled'
              ? 'info'
              : status === 'Reschedule Requested'
              ? 'warning'
              : 'success'
          );
        }}
      />

      <ToastNotification toast={toast} onDismiss={dismissToast} />
    </PortalLayout>
  );
}
