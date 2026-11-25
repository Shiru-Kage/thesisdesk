import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
  DragEvent,
  FormEvent,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  FileUp,
  LayoutDashboard,
  Lock,
  Megaphone,
  Pin,
  Search,
  Square,
  Trash2,
  Upload,
  UserCog,
  Video,
  X,
} from 'lucide-react';
import {
  Announcement,
  AppointmentStatus,
  ChecklistItem,
  DefenseAppointment,
  DefenseSlot,
  QuartermPeriod,
  RequiredDocumentSpec,
  StudentFileSubmission,
  UserAccount,
} from '../types/defense';
import { PortalLayout, NavItem, QuartermBannerInfo } from './PortalLayout';
import { CalendarGrid } from './CalendarGrid';
import { StatusLabel } from './StatusLabel';
import { FileStatusLabel } from './FileStatusLabel';
import { AppointmentDetailDrawer } from './AppointmentDetailDrawer';
import { PdfPreviewModal } from './PdfPreviewModal';
import { StudentAnnouncementsView } from './StudentAnnouncementsView';
import { ToastNotification, ToastState, ToastTone } from './ToastNotification';
import { formatReadableDate, formatShortDate, formatTimeRange } from '../utils/dateUtils';
import { downloadDefenseCalendarInvite } from '../utils/calendarExport';

interface StudentPortalProps {
  user: UserAccount;
  slots: DefenseSlot[];
  appointments: DefenseAppointment[];
  checklist: ChecklistItem[];
  requiredDocuments: RequiredDocumentSpec[];
  fileSubmissions: StudentFileSubmission[];
  activeQuarter: QuartermPeriod | null;
  todayIso: string;
  initialSlot?: DefenseSlot | null;
  onUploadFile: (
    requirementId: string,
    fileMeta: { fileName: string; fileSize: string; objectUrl?: string; rawFile?: File }
  ) => void;
  onRemoveFile: (submissionId: string) => void;
  onBookSlot: (
    slot: DefenseSlot,
    payload: {
      thesisTitle: string;
      abstract: string;
      advisorName: string;
      committeeMembers: string[];
      notes: string;
    },
    rescheduleFromId?: string
  ) => void;
  onCancelAppointment: (id: string) => void;
  onToggleChecklist: (id: string) => void;
  onSwitchRole: () => void;
  onSignOut: () => void;
  onResetDemoData: () => void;
  onOpenProfileModal?: () => void;
  announcements?: Announcement[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getRelativeDayLabel(targetIso: string, todayIso: string): string {
  const [ty, tm, td] = targetIso.split('-').map(Number);
  const [cy, cm, cd] = todayIso.split('-').map(Number);
  const targetMs = Date.UTC(ty, tm - 1, td);
  const currentMs = Date.UTC(cy, cm - 1, cd);
  const diffDays = Math.round((targetMs - currentMs) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return 'Yesterday';
  return `${Math.abs(diffDays)} days ago`;
}

export function StudentPortal({
  user,
  slots,
  appointments,
  checklist,
  requiredDocuments,
  fileSubmissions,
  activeQuarter,
  todayIso,
  initialSlot = null,
  onUploadFile,
  onRemoveFile,
  onBookSlot,
  onCancelAppointment,
  onToggleChecklist,
  onSwitchRole,
  onSignOut,
  onResetDemoData,
  onOpenProfileModal,
  announcements = [],
}: StudentPortalProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'announcements' | 'files' | 'book' | 'appointments' | 'guidelines'
  >(initialSlot ? 'book' : 'overview');
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(10); // November (0-indexed)
  const [selectedDate, setSelectedDate] = useState(initialSlot?.date ?? '2026-11-18');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | AppointmentStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragOverDocId, setDragOverDocId] = useState<string | null>(null);

  const [bookingSlot, setBookingSlot] = useState<DefenseSlot | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<DefenseAppointment | null>(null);
  const [inspectedAppointmentId, setInspectedAppointmentId] = useState<string | null>(null);
  const [previewSubmissionId, setPreviewSubmissionId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Booking form fields
  const [thesisTitle, setThesisTitle] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [advisorName, setAdvisorName] = useState('');
  const [committeeInput, setCommitteeInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    setToast({ id: Date.now() + Math.random(), message, tone });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (!bookingSlot) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBookingSlot(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bookingSlot]);

  const studentSubmissions = useMemo(
    () =>
      fileSubmissions.filter(
        (sub) =>
          sub.studentEmail.toLowerCase() === user.email.toLowerCase() ||
          (user.studentId && sub.studentId === user.studentId)
      ),
    [fileSubmissions, user.email, user.studentId]
  );

  const submissionByReqId = useMemo(() => {
    const map: Record<string, StudentFileSubmission> = {};
    studentSubmissions.forEach((sub) => {
      map[sub.requirementId] = sub;
    });
    return map;
  }, [studentSubmissions]);

  const requiredDocs = useMemo(
    () => requiredDocuments.filter((doc) => doc.required),
    [requiredDocuments]
  );

  const submittedRequiredCount = useMemo(
    () => requiredDocs.filter((doc) => Boolean(submissionByReqId[doc.id])).length,
    [requiredDocs, submissionByReqId]
  );

  const approvedRequiredCount = useMemo(
    () =>
      requiredDocs.filter((doc) => submissionByReqId[doc.id]?.status === 'Approved')
        .length,
    [requiredDocs, submissionByReqId]
  );

  const revisionRequestedCount = useMemo(
    () =>
      requiredDocs.filter(
        (doc) => submissionByReqId[doc.id]?.status === 'Revision Requested'
      ).length,
    [requiredDocs, submissionByReqId]
  );

  const isQuarterOpen = !activeQuarter || activeQuarter.status === 'Open';

  const isClearedToSchedule =
    isQuarterOpen &&
    requiredDocs.length > 0 &&
    submittedRequiredCount === requiredDocs.length &&
    approvedRequiredCount === requiredDocs.length;

  const unapprovedRequiredCount = requiredDocs.length - approvedRequiredCount;

  const studentAppointments = useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.studentEmail.toLowerCase() === user.email.toLowerCase() ||
          a.studentId === user.studentId
      ),
    [appointments, user.email, user.studentId]
  );

  const activeDefense = useMemo(
    () =>
      studentAppointments.find(
        (a) =>
          a.status === 'Confirmed' ||
          a.status === 'Pending Review' ||
          a.status === 'Reschedule Requested'
      ) ?? null,
    [studentAppointments]
  );

  const inspectedAppointment = useMemo(
    () =>
      inspectedAppointmentId
        ? appointments.find((a) => a.id === inspectedAppointmentId) ?? null
        : null,
    [appointments, inspectedAppointmentId]
  );

  const previewSubmission = useMemo(
    () =>
      previewSubmissionId
        ? studentSubmissions.find((s) => s.id === previewSubmissionId) ?? null
        : null,
    [studentSubmissions, previewSubmissionId]
  );

  const requiredDocsById = useMemo(() => {
    const map: Record<string, RequiredDocumentSpec> = {};
    requiredDocuments.forEach((doc) => {
      map[doc.id] = doc;
    });
    return map;
  }, [requiredDocuments]);

  const bookedSlotIds = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((a) => {
      if (a.status !== 'Cancelled') {
        set.add(a.slotId);
      }
    });
    return set;
  }, [appointments]);

  const slotSummaryByDate = useMemo(() => {
    const map: Record<string, { total: number; open: number; booked: number }> = {};
    slots.forEach((slot) => {
      if (!map[slot.date]) {
        map[slot.date] = { total: 0, open: 0, booked: 0 };
      }
      const isTaken = slot.isBlocked || bookedSlotIds.has(slot.id);
      map[slot.date].total += 1;
      if (isTaken) {
        map[slot.date].booked += 1;
      } else {
        map[slot.date].open += 1;
      }
    });
    return map;
  }, [slots, bookedSlotIds]);

  const availableSlotsForSelectedDate = useMemo(() => {
    return slots
      .filter((s) => s.date === selectedDate && !s.isBlocked && !bookedSlotIds.has(s.id))
      .filter((s) => (deptFilter === 'All' ? true : s.department === deptFilter))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [slots, selectedDate, bookedSlotIds, deptFilter]);

  const nextOpenDateIso = useMemo(() => {
    const openDates = Array.from(
      new Set(
        slots
          .filter(
            (s) =>
              !s.isBlocked &&
              !bookedSlotIds.has(s.id) &&
              s.date >= todayIso &&
              (deptFilter === 'All' ? true : s.department === deptFilter)
          )
          .map((s) => s.date)
      )
    ).sort();
    return openDates.find((d) => d > selectedDate) ?? openDates[0] ?? null;
  }, [slots, bookedSlotIds, todayIso, deptFilter, selectedDate]);

  const studentBookedDates = useMemo(() => {
    const set = new Set<string>();
    studentAppointments.forEach((a) => {
      if (a.status !== 'Cancelled') {
        set.add(a.date);
      }
    });
    return set;
  }, [studentAppointments]);

  const appointmentStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: studentAppointments.length };
    studentAppointments.forEach((a) => {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    });
    return counts;
  }, [studentAppointments]);

  const filteredAppointments = useMemo(() => {
    return studentAppointments
      .filter((a) => (statusFilter === 'All' ? true : a.status === statusFilter))
      .filter((a) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          a.thesisTitle.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.advisorName.toLowerCase().includes(q) ||
          a.zoomRoomName.toLowerCase().includes(q)
        );
      });
  }, [studentAppointments, statusFilter, searchQuery]);

  const handleCopyZoomLink = (id: string, link: string) => {
    if (!link) return;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const completedChecklistCount = checklist.filter((c) => c.completed).length;

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

  const openBookingModal = (slot: DefenseSlot) => {
    if (!isQuarterOpen) {
      showToast(
        activeQuarter
          ? `Quarterm ${activeQuarter.code} is currently closed. Wait for the SOIT Coordinator to open the next Quarterm.`
          : 'No Quarterm is currently open for defense scheduling.',
        'warning'
      );
      return;
    }
    if (!isClearedToSchedule) {
      setActiveTab('files');
      showToast(
        'Scheduling is locked until all required files are submitted and approved by your professor.',
        'warning'
      );
      return;
    }
    if (rescheduleTarget) {
      setThesisTitle(rescheduleTarget.thesisTitle);
      setAbstractText(rescheduleTarget.abstract);
      setAdvisorName(rescheduleTarget.advisorName);
      setCommitteeInput(rescheduleTarget.committeeMembers.join(', '));
      setNotesInput(rescheduleTarget.notes ?? '');
    }
    setBookingSlot(slot);
  };

  const handleUploadedFile = (requirementId: string, file: File) => {
    if (!isQuarterOpen) {
      showToast('File uploads are paused while the current Quarterm is closed.', 'warning');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    onUploadFile(requirementId, {
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      objectUrl,
      rawFile: file,
    });
    showToast(`Uploaded "${file.name}" for faculty review.`, 'success');
  };

  const handleFileInputChange = (
    requirementId: string,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadedFile(requirementId, file);
    }
    e.target.value = '';
  };

  const handleFileDrop = (requirementId: string, e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOverDocId(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadedFile(requirementId, file);
    }
  };

  const handleBookingSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!bookingSlot || !isClearedToSchedule) return;

    const committeeMembers = committeeInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onBookSlot(
      bookingSlot,
      {
        thesisTitle: thesisTitle.trim(),
        abstract: abstractText.trim(),
        advisorName: advisorName.trim(),
        committeeMembers: committeeMembers.length > 0 ? committeeMembers : ['Assigned by SOIT'],
        notes: notesInput.trim(),
      },
      rescheduleTarget?.id
    );

    const actionWord = rescheduleTarget ? 'rescheduled' : 'submitted for review';
    showToast(
      `Defense slot on ${formatShortDate(bookingSlot.date)} (${formatTimeRange(
        bookingSlot.startTime,
        bookingSlot.endTime
      )}) ${actionWord}.`,
      'success'
    );
    setBookingSlot(null);
    setRescheduleTarget(null);
    setActiveTab('appointments');
  };

  const latestAnnouncement = useMemo(() => {
    if (!announcements || announcements.length === 0) return null;
    return [...announcements].sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) {
        return b.pinned ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
  }, [announcements]);

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: <Megaphone className="w-4 h-4" />,
      badgeCount: announcements.length,
    },
    {
      id: 'files',
      label: 'Files to Submit',
      icon: <FileUp className="w-4 h-4" />,
      badgeCount: unapprovedRequiredCount,
    },
    { id: 'book', label: 'Book Defense Slot', icon: <CalendarDays className="w-4 h-4" /> },
    {
      id: 'appointments',
      label: 'My Appointments',
      icon: <Clock className="w-4 h-4" />,
      badgeCount: studentAppointments.filter((a) => a.status !== 'Cancelled').length,
    },
    { id: 'guidelines', label: 'Defense Guidelines', icon: <BookOpen className="w-4 h-4" /> },
  ];

  const tabBackgroundMap: Record<typeof activeTab, string> = {
    overview: '/assets/portal/image_ed324830.png',
    announcements: '/assets/portal/image_ed324830.png',
    files: '/assets/portal/image_40c3523c.png',
    book: '/assets/portal/image_7b399ac3.png',
    appointments: '/assets/portal/image_40c3523c.png',
    guidelines: '/assets/portal/image_ed324830.png',
  };

  const quartermBannerInfo: QuartermBannerInfo = activeQuarter
    ? {
        code: activeQuarter.code,
        label: activeQuarter.label,
        status: activeQuarter.status,
      }
    : {
        code: 'Between Terms',
        label: 'Awaiting next Mapúa Quarterm',
        status: 'Unopened',
      };

  return (
    <PortalLayout
      user={user}
      navItems={navItems}
      activeTab={activeTab}
      backgroundUrl={tabBackgroundMap[activeTab]}
      quartermInfo={quartermBannerInfo}
      onSelectTab={(id) => setActiveTab(id as typeof activeTab)}
      primaryActionLabel={isClearedToSchedule ? 'Request Defense Slot' : 'Files to Submit'}
      onPrimaryAction={() => setActiveTab(isClearedToSchedule ? 'book' : 'files')}
      onSwitchRole={onSwitchRole}
      onSignOut={onSignOut}
      onOpenProfileModal={onOpenProfileModal}
      onResetDemoData={() => {
        onResetDemoData();
        showToast('Restored default Mapúa SOIT 1Q2627 demo data.', 'info');
      }}
    >
      {!isQuarterOpen && (
        <div
          role="status"
          className="mb-3 px-3.5 py-2.5 bg-white/80 backdrop-blur-md border border-[#A6192E]/30 rounded-xl flex items-start gap-3 text-sm text-zinc-800"
        >
          <Lock className="w-4 h-4 text-[#A6192E] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-zinc-900">
              {activeQuarter
                ? `Mapúa Quarterm ${activeQuarter.code} is Currently Closed`
                : 'No Active Quarterm Open Yet'}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {activeQuarter
                ? 'New thesis file uploads and defense bookings are paused while the SOIT Coordinator concludes and archives this Quarterm.'
                : 'The previous Quarterm has been archived. Scheduling and file uploads will resume once the SOIT Coordinator opens the next Quarterm.'}
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Latest Announcement Banner */}
          {latestAnnouncement && (
            <div className="rounded-xl border border-stone-300/80 bg-white/80 backdrop-blur-md p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="p-2 rounded-lg bg-[#A6192E]/10 text-[#A6192E] shrink-0 mt-0.5">
                  <Megaphone className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-[#A6192E] uppercase tracking-wide">
                      Latest SOIT Bulletin
                    </span>
                    {latestAnnouncement.pinned && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#A6192E] text-white">
                        <Pin className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}
                    <span className="text-zinc-400 text-xs">·</span>
                    <span className="text-xs text-zinc-500 font-medium">
                      {new Date(latestAnnouncement.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 truncate mt-0.5">
                    {latestAnnouncement.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('announcements')}
                className="px-3 py-1.5 text-xs font-semibold text-[#881325] hover:text-[#6B0F1D] bg-stone-100 hover:bg-stone-200/70 border border-stone-300/80 rounded-lg whitespace-nowrap transition-colors shrink-0 cursor-pointer"
              >
                View All Bulletins →
              </button>
            </div>
          )}

          {/* 4-Step Defense Journey Tracker */}
          {(() => {
            const step1Done =
              requiredDocs.length > 0 && submittedRequiredCount === requiredDocs.length;
            const step2Done =
              requiredDocs.length > 0 && approvedRequiredCount === requiredDocs.length;
            const step3Done = Boolean(activeDefense);
            const step4Done = activeDefense?.status === 'Confirmed';

            const journeySteps = [
              {
                num: '01',
                title: 'Upload Required Files',
                detail: `${submittedRequiredCount}/${requiredDocs.length} uploaded`,
                done: step1Done,
                active: !step1Done,
                alert: false,
              },
              {
                num: '02',
                title: 'Faculty Approval',
                detail:
                  revisionRequestedCount > 0
                    ? `${revisionRequestedCount} revision needed`
                    : `${approvedRequiredCount}/${requiredDocs.length} approved`,
                done: step2Done,
                active: step1Done && !step2Done,
                alert: revisionRequestedCount > 0,
              },
              {
                num: '03',
                title: 'Reserve Zoom Slot',
                detail: activeDefense
                  ? formatShortDate(activeDefense.date)
                  : isClearedToSchedule
                  ? 'Ready to book'
                  : 'Unlocks after approval',
                done: step3Done,
                active: step2Done && !step3Done,
                alert: false,
              },
              {
                num: '04',
                title: 'Defense Confirmed',
                detail: step4Done
                  ? activeDefense?.zoomLink
                    ? 'Zoom link ready'
                    : 'Link pending'
                  : activeDefense
                  ? activeDefense.status
                  : 'Pending slot',
                done: step4Done,
                active: step3Done && !step4Done,
                alert: false,
              },
            ];

            const nextStepAction = !step1Done
              ? { label: 'Upload Required Files', onClick: () => setActiveTab('files') }
              : !step2Done
              ? { label: 'View File Review', onClick: () => setActiveTab('files') }
              : !step3Done
              ? { label: 'Reserve Zoom Slot', onClick: () => setActiveTab('book') }
              : {
                  label: 'Inspect Defense',
                  onClick: () => activeDefense && setInspectedAppointmentId(activeDefense.id),
                };

            return (
              <section
                aria-label="Thesis defense progress"
                className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    {step4Done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : isClearedToSchedule ? (
                      <CheckCircle2 className="w-4 h-4 text-[#9A6E00] shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-[#A6192E] shrink-0" />
                    )}
                    <span className="font-semibold text-zinc-900">
                      {step4Done
                        ? 'UOx Defense Confirmed'
                        : step3Done
                        ? 'Defense Request Awaiting Coordinator Confirmation'
                        : isClearedToSchedule
                        ? 'Cleared to Reserve a UOx Zoom Defense Window'
                        : 'Defense Scheduling Locked — Complete Required Files & Faculty Approval'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={nextStepAction.onClick}
                    className="self-start sm:self-auto text-xs font-medium text-[#A6192E] hover:underline whitespace-nowrap shrink-0"
                  >
                    {nextStepAction.label}
                  </button>
                </div>

                <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-200/80">
                  {journeySteps.map((step) => (
                    <li
                      key={step.num}
                      className={`px-5 py-4 ${
                        step.active ? 'bg-white/60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-mono tabular-nums font-semibold ${
                            step.done
                              ? 'text-emerald-700'
                              : step.alert
                              ? 'text-[#A6192E]'
                              : step.active
                              ? 'text-[#A6192E]'
                              : 'text-zinc-400'
                          }`}
                        >
                          {step.num}
                        </span>
                        <span
                          className={`text-[11px] font-medium whitespace-nowrap ${
                            step.done
                              ? 'text-emerald-700'
                              : step.alert
                              ? 'text-[#A6192E]'
                              : step.active
                              ? 'text-[#9A6E00]'
                              : 'text-zinc-400'
                          }`}
                        >
                          {step.done
                            ? 'Complete'
                            : step.alert
                            ? 'Action needed'
                            : step.active
                            ? 'Current step'
                            : 'Upcoming'}
                        </span>
                      </div>
                      <p
                        className={`text-sm font-semibold mt-1.5 ${
                          step.done || step.active ? 'text-zinc-900' : 'text-zinc-500'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-zinc-600 mt-0.5">
                        {step.detail}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })()}

          {/* Main Dashboard Grid: Row 1 - Schedule Status (Left 7) & Next Open Windows (Right 5) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Active Defense or Current Scheduling Status */}
            <section aria-labelledby="active-defense-heading" className="lg:col-span-7 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 id="active-defense-heading" className="text-sm font-semibold text-zinc-900">
                  Current Defense Schedule
                </h2>
                {activeDefense && (
                  <span className="text-xs font-mono tabular-nums text-zinc-500">
                    {activeDefense.id}
                  </span>
                )}
              </div>

              {activeDefense ? (
                <div className="bg-white/75 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-500">
                        <StatusLabel status={activeDefense.status} />
                        <span aria-hidden="true">·</span>
                        <span>UOx Fully Online · Zoom</span>
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-900">
                        {activeDefense.thesisTitle}
                      </h3>
                      <p className="text-xs text-zinc-600">
                        Adviser:{' '}
                        <span className="text-zinc-900 font-medium">{activeDefense.advisorName}</span>
                        <span className="mx-1.5 text-zinc-300" aria-hidden="true">
                          ·
                        </span>
                        Panel: {activeDefense.committeeMembers.join(', ')}
                      </p>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <p className="text-sm font-semibold text-zinc-900">
                        {formatReadableDate(activeDefense.date)}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-[#A6192E] font-medium mt-0.5">
                        {formatTimeRange(activeDefense.startTime, activeDefense.endTime)}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {activeDefense.zoomRoomName}
                      </p>
                    </div>
                  </div>

                  {/* Zoom Link Bar */}
                  <div className="pt-3 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Video className="w-4 h-4 text-[#A6192E] shrink-0" />
                      <span className="truncate text-zinc-800">
                        {activeDefense.zoomLink || 'Zoom link pending coordinator assignment'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setInspectedAppointmentId(activeDefense.id)}
                        className="py-1.5 px-3 text-xs font-medium text-zinc-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-md transition-colors"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isClearedToSchedule) {
                            setActiveTab('files');
                            showToast(
                              'Submit and get professor approval for all required files before rescheduling.',
                              'warning'
                            );
                            return;
                          }
                          setRescheduleTarget(activeDefense);
                          setActiveTab('book');
                        }}
                        className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 ${
                          isClearedToSchedule
                            ? 'text-[#A6192E] bg-[#A6192E]/10 hover:bg-[#A6192E]/15'
                            : 'text-zinc-500 bg-stone-100'
                        }`}
                      >
                        {!isClearedToSchedule && <Lock className="w-3 h-3 shrink-0" />}
                        <span>Reschedule</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/75 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-zinc-700 border border-stone-200">
                      <Lock className="w-3 h-3 text-[#A6192E]" />
                      {isClearedToSchedule ? 'Cleared to Book Slot' : 'Defense Scheduling Locked'}
                    </span>
                    <h3 className="text-base font-semibold text-zinc-900 mt-2">
                      {isClearedToSchedule
                        ? 'Ready to Reserve a UOx Defense Slot'
                        : 'Awaiting Faculty File Clearances'}
                    </h3>
                    <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                      {isClearedToSchedule
                        ? 'All required thesis documents are approved by faculty. Select an open committee window from the panel on the right.'
                        : `${submittedRequiredCount}/${requiredDocs.length} files submitted (${approvedRequiredCount}/${requiredDocs.length} approved). Upload all required documents and await faculty approval to unlock booking.`}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab(isClearedToSchedule ? 'book' : 'files')}
                      className="py-2 px-4 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      {isClearedToSchedule ? (
                        <>
                          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                          <span>Select Defense Slot</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>Go to Files to Submit</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('guidelines')}
                      className="py-2 px-3 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                      Read Guidelines →
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Next Open Committee Windows */}
            <section className="lg:col-span-5 flex flex-col justify-between bg-white/75 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6">
              <div>
                <div className="flex items-center justify-between gap-4 pb-3 border-b border-stone-200/80 mb-2">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">
                      Next Open Windows
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      Upcoming Mapúa Zoom defense slots
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('book')}
                    className="text-xs font-medium text-[#A6192E] hover:underline whitespace-nowrap"
                  >
                    Calendar →
                  </button>
                </div>

                <div className="divide-y divide-stone-200/70">
                  {slots
                    .filter((s) => !s.isBlocked && !bookedSlotIds.has(s.id))
                    .slice(0, 4)
                    .map((slot) => (
                      <div
                        key={slot.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900">
                            {formatShortDate(slot.date)} ·{' '}
                            <span className="font-mono tabular-nums text-zinc-700">
                              {slot.startTime}
                            </span>
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {slot.zoomRoomName}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isClearedToSchedule) {
                              setActiveTab('files');
                              showToast(
                                'Complete required file submissions and await professor approval to reserve a slot.',
                                'warning'
                              );
                              return;
                            }
                            setSelectedDate(slot.date);
                            openBookingModal(slot);
                          }}
                          className={`py-1 px-2.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${
                            isClearedToSchedule
                              ? 'text-[#A6192E] bg-[#A6192E]/10 hover:bg-[#A6192E]/15'
                              : 'text-zinc-500 bg-stone-100 hover:bg-stone-200'
                          }`}
                        >
                          {!isClearedToSchedule && <Lock className="w-2.5 h-2.5 shrink-0" />}
                          <span>{isClearedToSchedule ? 'Reserve' : 'Locked'}</span>
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200/70 text-[11px] text-zinc-500 flex items-center justify-between">
                <span>Rooms open 10m prior</span>
                <span className="font-mono text-zinc-400">AY 2026-2027</span>
              </div>
            </section>
          </div>

          {/* Main Dashboard Grid: Row 2 - Zoom Prep Checklist (Left 7) & Document Clearance (Right 5) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Defense-Day UOx Zoom Prep Checklist */}
            <section className="lg:col-span-7 flex flex-col justify-between bg-white/75 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6">
              <div>
                <div className="flex items-center justify-between gap-4 mb-3 pb-3 border-b border-stone-200/80">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">
                      Defense-Day UOx Zoom Prep
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Technical and presentation checks ahead of your oral examination.
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums font-semibold text-[#9A6E00] shrink-0">
                    {completedChecklistCount}/{checklist.length} done
                  </span>
                </div>

                <div className="divide-y divide-zinc-100">
                  {checklist.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onToggleChecklist(item.id)}
                      className="w-full py-2.5 flex items-start gap-3 text-left hover:bg-stone-900/[0.03] rounded-md px-2 -mx-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
                    >
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4 text-[#A6192E] mt-0.5 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-medium ${
                            item.completed ? 'line-through text-zinc-400' : 'text-zinc-800'
                          }`}
                        >
                          {item.label}
                        </p>
                        <p className="text-[11px] text-zinc-500">{item.dueNote}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200/70 text-[11px] text-zinc-500">
                Click any checklist item to track your oral presentation preparations.
              </div>
            </section>

            {/* Required Pre-Defense Documents Snapshot */}
            <section className="lg:col-span-5 flex flex-col justify-between bg-white/75 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6">
              <div>
                <div className="flex items-center justify-between gap-4 pb-3 border-b border-stone-200/80 mb-2">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">
                      Required Documents
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      {approvedRequiredCount}/{requiredDocs.length} approved by faculty
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('files')}
                    className="text-xs font-medium text-[#A6192E] hover:underline whitespace-nowrap"
                  >
                    View All →
                  </button>
                </div>

                <div className="divide-y divide-stone-200/70">
                  {requiredDocs.map((doc) => {
                    const sub = submissionByReqId[doc.id];
                    return (
                      <div
                        key={doc.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-900 truncate">{doc.title}</p>
                          <div className="mt-0.5">
                            <FileStatusLabel status={sub?.status ?? 'Not Submitted'} />
                          </div>
                        </div>
                        {sub ? (
                          <button
                            type="button"
                            onClick={() => setPreviewSubmissionId(sub.id)}
                            className="py-1 px-2 text-[11px] font-medium text-zinc-700 bg-stone-100 hover:bg-stone-200 rounded border border-stone-300 inline-flex items-center gap-1 shrink-0"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveTab('files')}
                            className="py-1 px-2 text-[11px] font-medium text-[#A6192E] bg-[#A6192E]/10 hover:bg-[#A6192E]/15 rounded shrink-0"
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200/70 text-[11px] text-zinc-500">
                {isClearedToSchedule
                  ? 'All files approved by faculty reviewer.'
                  : 'Faculty sign-off unlocks defense scheduling.'}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <StudentAnnouncementsView announcements={announcements} />
      )}

      {/* TAB 2: FILES TO SUBMIT */}
      {activeTab === 'files' && (
        <div className="space-y-4 sm:space-y-5">
          {/* 2-Step Gate Readiness Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5">
              <p className="text-xs font-medium text-zinc-500">1. Required Files Submitted</p>
              <p className="text-2xl font-semibold font-mono tabular-nums text-zinc-900 mt-1.5">
                {submittedRequiredCount}/{requiredDocs.length}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                {submittedRequiredCount === requiredDocs.length
                  ? 'All required files uploaded'
                  : `${requiredDocs.length - submittedRequiredCount} document${
                      requiredDocs.length - submittedRequiredCount === 1 ? '' : 's'
                    } still required`}
              </p>
            </div>

            <div className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5">
              <p className="text-xs font-medium text-zinc-500">2. Professor Approval</p>
              <p
                className={`text-2xl font-semibold font-mono tabular-nums mt-1.5 ${
                  approvedRequiredCount === requiredDocs.length
                    ? 'text-emerald-700'
                    : 'text-[#9A6E00]'
                }`}
              >
                {approvedRequiredCount}/{requiredDocs.length}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                {approvedRequiredCount === requiredDocs.length
                  ? 'Approved by faculty reviewer'
                  : revisionRequestedCount > 0
                  ? `${revisionRequestedCount} file requires revision`
                  : 'Awaiting review on faculty side'}
              </p>
            </div>

            <div className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Scheduling Eligibility</p>
                <p
                  className={`text-sm font-semibold mt-1.5 flex items-center gap-1.5 ${
                    isClearedToSchedule ? 'text-emerald-700' : 'text-[#A6192E]'
                  }`}
                >
                  {isClearedToSchedule ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Cleared to Schedule</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>Locked Until Approved</span>
                    </>
                  )}
                </p>
              </div>
              <p className="text-xs text-zinc-600 mt-2">
                {isClearedToSchedule
                  ? 'You can now reserve an open defense window.'
                  : submittedRequiredCount === requiredDocs.length
                  ? 'All files submitted. Switch to Admin View to review & approve as faculty.'
                  : 'Upload every required document below to submit for faculty sign-off.'}
              </p>
            </div>
          </div>

          {/* Required Document Submission Rows */}
          <div className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl divide-y divide-stone-300/60 overflow-hidden">
            {requiredDocuments.map((doc, index) => {
              const submission = submissionByReqId[doc.id];
              const isApproved = submission?.status === 'Approved';
              const isRevision = submission?.status === 'Revision Requested';

              return (
                <div key={doc.id} className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                        <span className="font-mono tabular-nums">
                          0{index + 1}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-zinc-700">
                          {doc.required ? 'Required' : 'Optional'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{doc.acceptedFormats}</span>
                        <span aria-hidden="true">·</span>
                        <FileStatusLabel status={submission?.status ?? 'Not Submitted'} />
                      </div>

                      <h2 className="text-base font-semibold text-zinc-900">
                        {doc.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                        {doc.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <input
                        id={`file-input-${doc.id}`}
                        ref={(el) => {
                          fileInputRefs.current[doc.id] = el;
                        }}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileInputChange(doc.id, e)}
                        className="hidden"
                        aria-label={`Upload ${doc.title}`}
                      />

                      {!isApproved && (
                        <button
                          type="button"
                          onClick={() => {
                            const inputEl = fileInputRefs.current[doc.id] || document.getElementById(`file-input-${doc.id}`) as HTMLInputElement;
                            inputEl?.click();
                          }}
                          className="py-2 px-3.5 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isRevision
                              ? 'Upload Revision'
                              : submission
                              ? 'Replace File'
                              : 'Upload File'}
                          </span>
                        </button>
                      )}

                      {submission && !isApproved && (
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveFile(submission.id);
                            showToast(`Removed "${submission.fileName}".`, 'info');
                          }}
                          className="py-2 px-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50/80 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Attached File Details & Faculty Review Feedback */}
                  {submission ? (
                    <div className="rounded-lg bg-white/75 border border-stone-300/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-[#A6192E] mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {submission.fileName}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5 font-mono tabular-nums">
                            {submission.fileSize} · Uploaded {formatShortDate(submission.uploadedAt)}
                            {submission.reviewedBy && submission.reviewedAt
                              ? ` · Reviewed by ${submission.reviewedBy} (${formatShortDate(
                                  submission.reviewedAt
                                )})`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewSubmissionId(submission.id)}
                          className="py-1.5 px-3 text-xs font-medium text-zinc-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
                          <span>Preview PDF</span>
                        </button>
                        {submission.objectUrl && (
                          <a
                            href={submission.objectUrl}
                            download={submission.fileName}
                            className="py-1.5 px-2.5 text-xs font-medium text-[#A6192E] hover:underline whitespace-nowrap shrink-0"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const inputEl = fileInputRefs.current[doc.id] || document.getElementById(`file-input-${doc.id}`) as HTMLInputElement;
                        inputEl?.click();
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverDocId !== doc.id) setDragOverDocId(doc.id);
                      }}
                      onDragLeave={() => setDragOverDocId(null)}
                      onDrop={(e) => handleFileDrop(doc.id, e)}
                      className={`w-full rounded-lg border border-dashed px-4 py-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E] ${
                        dragOverDocId === doc.id
                          ? 'border-[#A6192E] bg-[#A6192E]/6 text-zinc-900'
                          : 'border-stone-300 bg-stone-900/[0.02] hover:border-[#A6192E] hover:bg-white/80 text-zinc-600'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 text-xs">
                        <Upload
                          className={`w-4 h-4 shrink-0 ${
                            dragOverDocId === doc.id ? 'text-[#A6192E]' : 'text-zinc-400'
                          }`}
                        />
                        <span>
                          <strong className="font-medium text-zinc-800">
                            Drop PDF here or click to browse
                          </strong>{' '}
                          (PDF, DOC, DOCX up to 25 MB)
                        </span>
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap shrink-0">
                        {doc.acceptedFormats}
                      </span>
                    </button>
                  )}

                  {submission?.facultyNote && (
                    <div
                      className={`rounded-lg px-4 py-3 text-xs leading-relaxed border ${
                        isRevision
                          ? 'bg-rose-50/85 border-rose-200 text-rose-900'
                          : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      <span className="font-semibold">
                        Professor Note ({submission.reviewedBy ?? 'SOIT Faculty'}):
                      </span>{' '}
                      {submission.facultyNote}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BOOK DEFENSE SLOT */}
      {activeTab === 'book' && (
        <div className="space-y-4 sm:space-y-5">
          {!isClearedToSchedule && (
            <div
              role="alert"
              className="bg-white/75 backdrop-blur-md border border-[#A6192E]/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#A6192E] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    Scheduling is locked until your required files are approved
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-700 mt-0.5">
                    You have submitted{' '}
                    <strong className="font-mono tabular-nums">
                      {submittedRequiredCount}/{requiredDocs.length}
                    </strong>{' '}
                    required files and received professor approval for{' '}
                    <strong className="font-mono tabular-nums">
                      {approvedRequiredCount}/{requiredDocs.length}
                    </strong>
                    . You may browse available Zoom slots below, and reservation unlocks once all
                    files are approved on the faculty side.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className="self-start sm:self-auto py-2 px-4 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Go to Files to Submit
              </button>
            </div>
          )}

          {rescheduleTarget && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-900">
              <span>
                Rescheduling appointment{' '}
                <strong className="font-mono tabular-nums">{rescheduleTarget.id}</strong> (
                {formatShortDate(rescheduleTarget.date)} · {rescheduleTarget.startTime}). Select a
                new open Zoom window below.
              </span>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="text-xs font-medium text-[#A6192E] hover:underline whitespace-nowrap"
              >
                Cancel reschedule
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Video className="w-4 h-4 text-[#A6192E] shrink-0" />
              <span className="font-medium text-zinc-900">UOx Fully Online Defenses</span>
              <span className="text-zinc-400" aria-hidden="true">
                ·
              </span>
              <span>Zoom link provided by coordinator</span>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="dept-filter" className="text-xs font-medium text-zinc-600">
                Program
              </label>
              <select
                id="dept-filter"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
              >
                <option value="All">All SOIT Programs</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Data Science">Data Science</option>
                <option value="Information Systems">Information Systems</option>
              </select>
            </div>
          </div>

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
                disablePastDates
                highlightedDates={studentBookedDates}
              />
            </div>

            <div className="lg:col-span-5 bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5">
              <div className="pb-4 border-b border-zinc-100">
                <p className="text-xs font-medium text-zinc-500">Available Zoom Windows For</p>
                <h2 className="text-base font-semibold text-zinc-900 mt-0.5">
                  {formatReadableDate(selectedDate)}
                </h2>
              </div>

              {availableSlotsForSelectedDate.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium text-zinc-800">
                    No open Zoom slots on this date
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Try selecting All SOIT Programs or jumping to the next open date.
                  </p>
                  {(deptFilter !== 'All' || nextOpenDateIso) && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      {deptFilter !== 'All' && (
                        <button
                          type="button"
                          onClick={() => setDeptFilter('All')}
                          className="py-1.5 px-3 text-xs font-medium text-zinc-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Show All Programs
                        </button>
                      )}
                      {nextOpenDateIso && nextOpenDateIso !== selectedDate && (
                        <button
                          type="button"
                          onClick={handleJumpNextOpen}
                          className="py-1.5 px-3 text-xs font-medium text-[#A6192E] bg-[#A6192E]/10 hover:bg-[#A6192E]/15 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Jump to Next Open
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 mt-2">
                  {availableSlotsForSelectedDate.map((slot) => (
                    <div key={slot.id} className="py-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold font-mono tabular-nums text-zinc-900">
                            {formatTimeRange(slot.startTime, slot.endTime)}
                          </p>
                          <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
                            <span>{slot.zoomRoomName}</span>
                          </p>
                        </div>
                        <span className="text-xs font-medium text-zinc-600 whitespace-nowrap">
                          Online · Zoom
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-zinc-500 truncate">
                          Chair: {slot.chairName}
                        </span>
                        <button
                          type="button"
                          disabled={!isClearedToSchedule}
                          onClick={() => openBookingModal(slot)}
                          className={`py-1.5 px-3.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                            isClearedToSchedule
                              ? 'bg-[#A6192E] hover:bg-[#881325] text-white'
                              : 'bg-stone-900/[0.08] text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          {!isClearedToSchedule && <Lock className="w-3.5 h-3.5 shrink-0" />}
                          <span>
                            {!isClearedToSchedule
                              ? 'Approval Required'
                              : rescheduleTarget
                              ? 'Move to Slot'
                              : 'Reserve Slot'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="bg-white/75 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl overflow-hidden">
            {/* Integrated Container Toolbar */}
            <div className="px-4 py-3 bg-stone-50/70 border-b border-stone-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-stone-200/70 border border-stone-300/50 rounded-lg overflow-x-auto scrollbar-none">
                {(
                  ['All', 'Confirmed', 'Pending Review', 'Reschedule Requested', 'Completed'] as const
                ).map((st) => {
                  const count = appointmentStatusCounts[st] ?? 0;
                  const isSelected = statusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-white text-zinc-900 shadow-xs'
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

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, ID, or adviser..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-stone-300/80 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E] shadow-2xs"
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
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="py-8 px-6 text-center">
                <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 text-zinc-400 flex items-center justify-center mx-auto mb-2.5">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-zinc-900">
                  {studentAppointments.length === 0
                    ? 'No defense reservations booked yet'
                    : 'No defense reservations match your criteria'}
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  {studentAppointments.length === 0
                    ? 'Once you upload the required pre-defense files and gain faculty approval, reserve an open Zoom slot to track your defense here.'
                    : 'Try clearing your search terms or choosing another status tab to view your booked appointments.'}
                </p>
                {studentAppointments.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('book')}
                    className="mt-4 py-1.5 px-3.5 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Book Defense Slot</span>
                  </button>
                ) : (
                  (statusFilter !== 'All' || searchQuery.trim() !== '') && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('All');
                        setSearchQuery('');
                      }}
                      className="mt-4 py-1.5 px-3.5 text-xs font-medium text-zinc-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
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
                    <tr className="border-b border-zinc-200 bg-stone-900/[0.04] text-xs font-medium text-zinc-500">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Thesis Title</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Zoom Channel</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {filteredAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-stone-900/[0.04] transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-zinc-500 whitespace-nowrap">
                          {appt.id}
                        </td>
                        <td className="py-3.5 px-4 min-w-[240px]">
                          <button
                            type="button"
                            onClick={() => setInspectedAppointmentId(appt.id)}
                            className="font-medium text-zinc-900 hover:text-[#A6192E] text-left line-clamp-1"
                          >
                            {appt.thesisTitle}
                          </button>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Adviser: {appt.advisorName}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="text-zinc-900 font-medium">
                            {formatShortDate(appt.date)}
                          </p>
                          <p className="text-xs font-mono tabular-nums text-zinc-500">
                            {formatTimeRange(appt.startTime, appt.endTime)}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="text-zinc-800">{appt.zoomRoomName}</p>
                          {appt.zoomLink ? (
                            <a
                              href={appt.zoomLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-[#A6192E] hover:underline inline-flex items-center gap-1"
                            >
                              <span>Join Zoom</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <p className="text-xs text-zinc-500">Pending Zoom link</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusLabel status={appt.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setInspectedAppointmentId(appt.id)}
                            className="py-1.5 px-3 text-xs font-medium text-zinc-700 bg-stone-900/[0.06] hover:bg-stone-900/[0.10] border border-stone-300/60 rounded-md transition-colors"
                          >
                            Inspect
                          </button>
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

      {/* TAB 4: DEFENSE GUIDELINES */}
      {activeTab === 'guidelines' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Primary Left Column (8 cols on desktop) */}
            <div className="lg:col-span-8 space-y-6">
              {/* 90-Minute Session Timeline Breakdown */}
              <section
                aria-label="90-minute defense session breakdown"
                className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-zinc-900">
                    90-Minute Zoom Session Breakdown
                  </h2>
                  <span className="text-xs font-mono tabular-nums text-zinc-600">
                    Total duration · 90 min
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-md overflow-hidden flex gap-0.5 bg-stone-200/70">
                  <div
                    className="bg-[#A6192E] h-full"
                    style={{ width: '38.9%' }}
                    title="Candidate Presentation: 35 min"
                  />
                  <div
                    className="bg-[#C99700] h-full"
                    style={{ width: '33.3%' }}
                    title="Panel Examination: 30 min"
                  />
                  <div
                    className="bg-zinc-700 h-full"
                    style={{ width: '11.1%' }}
                    title="Open Floor Q&A: 10 min"
                  />
                  <div
                    className="bg-stone-400 h-full"
                    style={{ width: '16.7%' }}
                    title="Closed Deliberation: 15 min"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div>
                    <p className="text-xs font-mono tabular-nums font-semibold text-[#A6192E]">
                      35 min
                    </p>
                    <p className="text-xs font-semibold text-zinc-900 mt-0.5">Presentation</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Slide deck & live demo</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono tabular-nums font-semibold text-[#9A6E00]">
                      30 min
                    </p>
                    <p className="text-xs font-semibold text-zinc-900 mt-0.5">Panel Examination</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Committee questioning</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono tabular-nums font-semibold text-zinc-800">
                      10 min
                    </p>
                    <p className="text-xs font-semibold text-zinc-900 mt-0.5">Open Floor</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Adviser & guest remarks</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono tabular-nums font-semibold text-zinc-600">
                      15 min
                    </p>
                    <p className="text-xs font-semibold text-zinc-900 mt-0.5">Deliberation</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Zoom breakout room</p>
                  </div>
                </div>
              </section>

              {/* Numbered Procedures */}
              <div className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl divide-y divide-stone-200/80">
                <div className="p-5 sm:p-6">
                  <h2 className="text-base font-semibold text-zinc-900">
                    01. Manuscript Filing & Faculty Clearance
                  </h2>
                  <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed">
                    Final defense-ready drafts (Chapters 1–5), signed adviser endorsement, and Turnitin
                    similarity report must be uploaded under Files to Submit and approved by faculty
                    before Zoom slot scheduling unlocks.
                  </p>
                </div>
                <div className="p-5 sm:p-6">
                  <h2 className="text-base font-semibold text-zinc-900">
                    02. Official Mapúa UOx Zoom Attendance
                  </h2>
                  <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed">
                    All UOx oral defenses are conducted fully online via coordinator-managed Mapúa Zoom
                    channels. Sign in with your official <span className="font-mono text-xs">@mymail.mapua.edu.ph</span>{' '}
                    account and enter the waiting room 10 minutes before your scheduled start time.
                  </p>
                </div>
                <div className="p-5 sm:p-6">
                  <h2 className="text-base font-semibold text-zinc-900">
                    03. Camera, Audio & Screen-Share Standards
                  </h2>
                  <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed">
                    Keep your webcam enabled throughout presentation and panel Q&A. Close non-essential
                    tabs before screen-sharing, and keep an offline PDF export of your slides ready in
                    case of bandwidth drops.
                  </p>
                </div>
                <div className="p-5 sm:p-6">
                  <h2 className="text-base font-semibold text-zinc-900">
                    04. Rescheduling & Withdrawals
                  </h2>
                  <p className="text-sm text-zinc-600 mt-1.5 leading-relaxed">
                    Candidates may transfer an active reservation to another open Zoom slot up to 48
                    hours before the scheduled start time without re-filing committee approvals.
                  </p>
                </div>
              </div>

              {/* Quick UOx Technical Reference */}
              <section
                aria-label="UOx technical readiness standards"
                className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b border-stone-200/80">
                  <h2 className="text-sm font-semibold text-zinc-900">
                    UOx Technical Readiness Standards
                  </h2>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-200/80 text-xs">
                  <div className="p-4 sm:p-5">
                    <dt className="font-semibold text-zinc-900">Early Check-In</dt>
                    <dd className="text-zinc-600 mt-1 leading-relaxed">
                      Join <span className="font-mono tabular-nums text-zinc-900">10 min</span> prior
                      for host admission and microphone verification.
                    </dd>
                  </div>
                  <div className="p-4 sm:p-5">
                    <dt className="font-semibold text-zinc-900">Backup Connectivity</dt>
                    <dd className="text-zinc-600 mt-1 leading-relaxed">
                      Keep mobile hotspot ready and share slide PDF with your adviser before the call.
                    </dd>
                  </div>
                  <div className="p-4 sm:p-5">
                    <dt className="font-semibold text-zinc-900">Recording & Quorum</dt>
                    <dd className="text-zinc-600 mt-1 leading-relaxed">
                      Sessions are cloud-recorded by the SOIT chair once panel quorum is present.
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            {/* Right / Context Rail (4 cols on desktop, stacks below on mobile) */}
            <aside className="lg:col-span-4 space-y-5">
              {/* 1. Candidate Defense Readiness Checklist */}
              <div className="bg-white/80 backdrop-blur-md border border-stone-300/70 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-stone-200/80">
                  <span className="p-1.5 rounded-lg bg-[#A6192E]/10 text-[#A6192E]">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                      Candidate Defense Checklist
                    </h3>
                    <p className="text-[11px] text-zinc-500">Pre-Session Checklist</p>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-zinc-700">
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                    <span>All required manuscript PDFs approved by professor</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                    <span>Presentation deck formatted in 16:9 widescreen layout</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                    <span>Webcam and microphone verified on Zoom desktop app</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                    <span>Quiet indoor testing space free of background noise</span>
                  </li>
                </ul>
              </div>

              {/* 2. Evaluation Criteria Snapshot */}
              <div className="bg-white/80 backdrop-blur-md border border-stone-300/70 rounded-xl p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-3 border-b border-stone-200/80">
                  <span className="p-1.5 rounded-lg bg-[#9A6E00]/10 text-[#9A6E00]">
                    <Clock className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                      Scoring Rubric Weight
                    </h3>
                    <p className="text-[11px] text-zinc-500">SOIT Defense Evaluation</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700">Research & Methodology</span>
                    <span className="font-mono font-semibold text-zinc-900">35%</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#A6192E] h-1.5 rounded-full" style={{ width: '35%' }} />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-zinc-700">Implementation & Prototype</span>
                    <span className="font-mono font-semibold text-zinc-900">35%</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#C99700] h-1.5 rounded-full" style={{ width: '35%' }} />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-zinc-700">Oral Defense & Q&A Response</span>
                    <span className="font-mono font-semibold text-zinc-900">20%</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-zinc-700 h-1.5 rounded-full" style={{ width: '20%' }} />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-zinc-700">Manuscript Quality</span>
                    <span className="font-mono font-semibold text-zinc-900">10%</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-stone-500 h-1.5 rounded-full" style={{ width: '10%' }} />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      <AnimatePresence>
        {bookingSlot && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-modal-title"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.16 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setBookingSlot(null);
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
              className="bg-white border border-stone-300 rounded-xl max-w-lg w-full p-6 shadow-2xl my-8"
            >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200">
              <div>
                <p className="text-xs font-medium text-[#A6192E]">
                  {formatReadableDate(bookingSlot.date)} ·{' '}
                  <span className="font-mono tabular-nums">
                    {formatTimeRange(bookingSlot.startTime, bookingSlot.endTime)}
                  </span>
                </p>
                <h2
                  id="booking-modal-title"
                  className="text-xl font-semibold text-zinc-900 mt-1"
                >
                  {rescheduleTarget ? 'Confirm Defense Reschedule' : 'Submit Defense Request'}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {bookingSlot.zoomRoomName} · UOx Fully Online (Zoom)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingSlot(null)}
                aria-label="Close booking dialog"
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="book-title"
                  className="block text-xs font-medium text-zinc-700 mb-1"
                >
                  Thesis Title
                </label>
                <input
                  id="book-title"
                  type="text"
                  required
                  value={thesisTitle}
                  onChange={(e) => setThesisTitle(e.target.value)}
                  placeholder="e.g., Adaptive Memory Partitioning for Real-Time Graph Analytics"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                />
              </div>

              <div>
                <label
                  htmlFor="book-abstract"
                  className="block text-xs font-medium text-zinc-700 mb-1"
                >
                  Brief Abstract
                </label>
                <textarea
                  id="book-abstract"
                  rows={3}
                  required
                  value={abstractText}
                  onChange={(e) => setAbstractText(e.target.value)}
                  placeholder="Brief summary of research objectives, methodologies, and candidate findings..."
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="book-advisor"
                    className="block text-xs font-medium text-zinc-700 mb-1"
                  >
                    Primary Adviser
                  </label>
                  <input
                    id="book-advisor"
                    type="text"
                    required
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    placeholder="e.g., Prof. Juan Dela Cruz"
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="book-committee"
                    className="block text-xs font-medium text-zinc-700 mb-1"
                  >
                    Panel Members (comma-separated)
                  </label>
                  <input
                    id="book-committee"
                    type="text"
                    value={committeeInput}
                    onChange={(e) => setCommitteeInput(e.target.value)}
                    placeholder="e.g., Dr. Maria Santos, Engr. Alex Reyes"
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="book-notes"
                  className="block text-xs font-medium text-zinc-700 mb-1"
                >
                  Online Presentation & Zoom Notes (optional)
                </label>
                <input
                  id="book-notes"
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g., Live demo screen share, external panelist timezone"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                />
              </div>

              <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBookingSlot(null)}
                  className="py-2 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 text-sm font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-lg transition-colors whitespace-nowrap"
                >
                  {rescheduleTarget ? 'Confirm New Slot' : 'Submit Request'}
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAIL DRAWER */}
      <AppointmentDetailDrawer
        appointment={inspectedAppointment}
        role="student"
        onClose={() => setInspectedAppointmentId(null)}
        onStudentReschedule={(appt) => {
          if (!isClearedToSchedule) {
            setInspectedAppointmentId(null);
            setActiveTab('files');
            showToast(
              'All required files must be submitted and approved by your professor before rescheduling.',
              'warning'
            );
            return;
          }
          setRescheduleTarget(appt);
          setActiveTab('book');
        }}
        onStudentCancel={(id) => {
          onCancelAppointment(id);
          showToast(`Appointment ${id} has been withdrawn.`, 'info');
        }}
      />

      {/* STUDENT INLINE PDF PREVIEW MODAL */}
      <PdfPreviewModal
        submission={previewSubmission}
        documentSpec={
          previewSubmission ? requiredDocsById[previewSubmission.requirementId] : undefined
        }
        matchedAppointment={activeDefense ?? studentAppointments[0]}
        siblingSubmissions={studentSubmissions}
        onSelectSubmission={(sub) => setPreviewSubmissionId(sub.id)}
        onClose={() => setPreviewSubmissionId(null)}
        readOnly
        readOnlyHint="Student document preview · Faculty verification and approval are handled on the Admin/Faculty side."
      />

      <ToastNotification toast={toast} onDismiss={dismissToast} />
    </PortalLayout>
  );
}
