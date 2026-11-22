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
  Search,
  Square,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
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
}: StudentPortalProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'files' | 'book' | 'appointments' | 'guidelines'
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
  const [thesisTitle, setThesisTitle] = useState(
    'Adaptive Memory Partitioning for Real-Time Graph Analytics'
  );
  const [abstractText, setAbstractText] = useState(
    'Investigates dynamic NUMA-aware subgraph partitioning to minimize cross-socket latency during concurrent streaming traversals.'
  );
  const [advisorName, setAdvisorName] = useState('Prof. Henrik Lindqvist');
  const [committeeInput, setCommitteeInput] = useState('Dr. Miriam Okafor, Dr. Samuel Vance');
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

  const isQuarterOpen = activeQuarter?.status === 'Open';

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

  const filteredAppointments = useMemo(() => {
    return studentAppointments
      .filter((a) => (statusFilter === 'All' ? true : a.status === statusFilter))
      .filter((a) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          a.thesisTitle.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
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

  const handleAttachSampleFile = (doc: RequiredDocumentSpec) => {
    if (!isQuarterOpen) {
      showToast('File submissions are paused while the current Quarterm is closed.', 'warning');
      return;
    }
    onUploadFile(doc.id, {
      fileName: doc.sampleFileName,
      fileSize: doc.sampleFileSize,
    });
    showToast(`Submitted "${doc.sampleFileName}" for professor approval.`, 'success');
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

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
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
      onResetDemoData={() => {
        onResetDemoData();
        showToast('Restored default Mapúa SOIT 1Q2627 demo data.', 'info');
      }}
    >
      {!isQuarterOpen && (
        <div
          role="status"
          className="mb-6 px-4 py-3.5 bg-white/80 backdrop-blur-md border border-[#A6192E]/30 rounded-xl flex items-start gap-3 text-sm text-zinc-800"
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
        <div className="space-y-8">
          <div className="pb-5 border-b border-stone-300/60">
            <p className="text-xs font-medium text-zinc-600">
              {user.program ?? 'SOIT Candidate'}
              <span className="mx-1.5 text-zinc-400" aria-hidden="true">
                ·
              </span>
              Student No.{' '}
              <span className="font-mono tabular-nums text-zinc-800">
                {user.studentId ?? '2026104819'}
              </span>
              {activeQuarter && (
                <>
                  <span className="mx-1.5 text-zinc-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-[#9A6E00] font-medium">
                    {activeQuarter.code}
                  </span>
                </>
              )}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight mt-1">
              Welcome back, {user.name.split(' ')[0]}
            </h1>
          </div>

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

          {/* Active Defense Summary */}
          <section aria-labelledby="active-defense-heading">
            <h2 id="active-defense-heading" className="text-sm font-semibold text-zinc-900 mb-3">
              Current Defense Schedule
            </h2>
            {activeDefense ? (
              <div className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-500">
                      <span className="font-mono tabular-nums">{activeDefense.id}</span>
                      <span aria-hidden="true">·</span>
                      <StatusLabel status={activeDefense.status} />
                      <span aria-hidden="true">·</span>
                      <span>UOx Fully Online · Zoom</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-zinc-900">
                      {activeDefense.thesisTitle}
                    </h3>
                    <p className="text-sm text-zinc-600">
                      Adviser:{' '}
                      <span className="text-zinc-900 font-medium">{activeDefense.advisorName}</span>
                      <span className="mx-2 text-zinc-300" aria-hidden="true">
                        ·
                      </span>
                      Panel: {activeDefense.committeeMembers.join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100">
                    <div className="sm:text-right">
                      <p className="text-sm font-semibold text-zinc-900">
                        {formatReadableDate(activeDefense.date)}
                      </p>
                      <p className="text-sm font-mono tabular-nums text-[#A6192E] font-medium mt-0.5">
                        {formatTimeRange(activeDefense.startTime, activeDefense.endTime)}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {activeDefense.zoomRoomName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectedAppointmentId(activeDefense.id)}
                        className="py-1.5 px-3 text-xs font-medium text-zinc-700 bg-stone-900/[0.06] hover:bg-stone-900/[0.10] border border-stone-300/60 rounded-md transition-colors whitespace-nowrap"
                      >
                        View Details
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
                        className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                          isClearedToSchedule
                            ? 'text-[#A6192E] bg-[#A6192E]/10 hover:bg-[#A6192E]/15'
                            : 'text-zinc-500 bg-stone-900/[0.05] hover:bg-stone-900/[0.09]'
                        }`}
                      >
                        {!isClearedToSchedule && <Lock className="w-3 h-3 shrink-0" />}
                        <span>Reschedule</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Zoom Link Access Bar */}
                <div className="pt-3.5 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Video className="w-4 h-4 text-[#A6192E] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-900 truncate">
                        {activeDefense.zoomLink
                          ? activeDefense.zoomLink
                          : 'Zoom link pending assignment by SOIT Coordinator'}
                      </p>
                      {activeDefense.zoomLink && (
                        <p className="text-[11px] font-mono tabular-nums text-zinc-500">
                          {activeDefense.zoomPasscode
                            ? `Passcode: ${activeDefense.zoomPasscode}`
                            : 'Join 10 minutes before your defense window'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        downloadDefenseCalendarInvite(activeDefense);
                        showToast('Downloaded calendar invite (.ics) for your UOx defense.', 'success');
                      }}
                      className="py-1.5 px-3 text-xs font-medium text-zinc-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>Add to Calendar</span>
                    </button>
                    {activeDefense.zoomLink && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyZoomLink(activeDefense.id, activeDefense.zoomLink)
                          }
                          className="py-1.5 px-3 text-xs font-medium text-zinc-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {copiedId === activeDefense.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                        <a
                          href={activeDefense.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-3 text-xs font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-md inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Join Zoom</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-8 text-center">
                <p className="text-base font-medium text-zinc-900">
                  No active defense appointment scheduled
                </p>
                <p className="text-sm text-zinc-600 mt-1 max-w-md mx-auto">
                  {isClearedToSchedule
                    ? 'Choose an open committee time window on the SOIT calendar to submit your thesis defense request.'
                    : 'Submit all required pre-defense files and await professor approval to unlock defense slot scheduling.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab(isClearedToSchedule ? 'book' : 'files')}
                  className="mt-4 py-2 px-4 bg-[#A6192E] hover:bg-[#881325] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isClearedToSchedule ? 'Schedule Defense Slot' : 'Go to Files to Submit'}
                </button>
              </div>
            )}
          </section>

          {/* 2-Column Defense-Day UOx Zoom Prep & Context-Aware Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <section className="lg:col-span-7 bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">
                    Defense-Day UOx Zoom Prep
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Personal technical and presentation checks ahead of your online oral defense.
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums font-medium text-[#9A6E00] shrink-0">
                  {completedChecklistCount}/{checklist.length} done
                </span>
              </div>

              <div className="divide-y divide-zinc-100">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggleChecklist(item.id)}
                    className="w-full py-3.5 flex items-start gap-3 text-left hover:bg-stone-900/[0.03] rounded-md px-2 -mx-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
                  >
                    {item.completed ? (
                      <CheckSquare className="w-4 h-4 text-[#A6192E] mt-0.5 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          item.completed ? 'line-through text-zinc-400' : 'text-zinc-800'
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.dueNote}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {activeDefense ? (
              <section className="lg:col-span-5 bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-4 pb-3.5 border-b border-stone-200/80">
                    <div>
                      <h2 className="text-base font-semibold text-zinc-900">
                        Defense Briefing & Files
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {getRelativeDayLabel(activeDefense.date, todayIso)} · 90 min Zoom block
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('files')}
                      className="text-xs font-medium text-[#A6192E] hover:underline whitespace-nowrap shrink-0"
                    >
                      Manage files
                    </button>
                  </div>

                  <div className="divide-y divide-stone-200/70 mt-1">
                    {requiredDocs.map((doc) => {
                      const sub = submissionByReqId[doc.id];
                      return (
                        <div
                          key={doc.id}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-zinc-900 truncate">
                              {doc.title}
                            </p>
                            <div className="mt-0.5">
                              <FileStatusLabel status={sub?.status ?? 'Not Submitted'} />
                            </div>
                          </div>
                          {sub ? (
                            <button
                              type="button"
                              onClick={() => setPreviewSubmissionId(sub.id)}
                              className="py-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-stone-900/[0.05] hover:bg-stone-900/[0.10] border border-stone-300/60 rounded-md inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveTab('files')}
                              className="py-1.5 px-2.5 text-xs font-medium text-[#A6192E] bg-[#A6192E]/10 hover:bg-[#A6192E]/15 rounded-md whitespace-nowrap shrink-0"
                            >
                              Upload
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200/80 flex items-center justify-between gap-2 text-xs text-zinc-500">
                  <span>Need a different time?</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('guidelines')}
                    className="font-medium text-zinc-700 hover:text-[#A6192E] whitespace-nowrap"
                  >
                    Read 48h policy
                  </button>
                </div>
              </section>
            ) : (
              <section className="lg:col-span-5 bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h2 className="text-base font-semibold text-zinc-900">
                      Next Open Windows
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('book')}
                      className="text-xs font-medium text-[#A6192E] hover:underline whitespace-nowrap"
                    >
                      Full calendar
                    </button>
                  </div>

                  <div className="divide-y divide-zinc-100">
                    {slots
                      .filter((s) => !s.isBlocked && !bookedSlotIds.has(s.id))
                      .slice(0, 4)
                      .map((slot) => (
                        <div
                          key={slot.id}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-900">
                              {formatShortDate(slot.date)} ·{' '}
                              <span className="font-mono tabular-nums text-zinc-700">
                                {slot.startTime}
                              </span>
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {slot.zoomRoomName} · Zoom Online
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
                            className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                              isClearedToSchedule
                                ? 'text-[#A6192E] bg-[#A6192E]/10 hover:bg-[#A6192E]/15'
                                : 'text-zinc-500 bg-stone-900/[0.06] hover:bg-stone-900/[0.10]'
                            }`}
                          >
                            {!isClearedToSchedule && <Lock className="w-3 h-3 shrink-0" />}
                            <span>{isClearedToSchedule ? 'Reserve' : 'Locked'}</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 text-xs text-zinc-500">
                  {isClearedToSchedule
                    ? 'All UOx Zoom rooms open 10 minutes prior for audio and screen-share checks.'
                    : 'Required pre-defense files must be submitted and approved by faculty first.'}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FILES TO SUBMIT */}
      {activeTab === 'files' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-stone-300/60">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
                Files to Submit
              </h1>
              <p className="text-sm text-zinc-600 mt-1">
                Upload all required thesis defense documents. Slot scheduling unlocks once every
                required file is submitted and approved by your professor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('book')}
              disabled={!isClearedToSchedule}
              className={`self-start sm:self-auto py-2 px-4 text-xs font-medium rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                isClearedToSchedule
                  ? 'bg-[#A6192E] hover:bg-[#881325] text-white'
                  : 'bg-stone-900/[0.08] text-zinc-500 cursor-not-allowed'
              }`}
            >
              {isClearedToSchedule ? (
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Lock className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {isClearedToSchedule ? 'Proceed to Book Slot' : 'Scheduling Locked'}
              </span>
            </button>
          </div>

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
                    <div className="space-y-1.5 max-w-2xl">
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
                        ref={(el) => {
                          fileInputRefs.current[doc.id] = el;
                        }}
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        onChange={(e) => handleFileInputChange(doc.id, e)}
                        className="sr-only"
                        aria-label={`Upload ${doc.title}`}
                      />

                      {!isApproved && (
                        <>
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[doc.id]?.click()}
                            className="py-2 px-3.5 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
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

                          {!submission && (
                            <button
                              type="button"
                              onClick={() => handleAttachSampleFile(doc)}
                              className="py-2 px-3 bg-white/80 hover:bg-white border border-stone-300/80 text-zinc-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
                            >
                              Attach Sample PDF
                            </button>
                          )}
                        </>
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
                      onClick={() => fileInputRefs.current[doc.id]?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverDocId !== doc.id) setDragOverDocId(doc.id);
                      }}
                      onDragLeave={() => setDragOverDocId(null)}
                      onDrop={(e) => handleFileDrop(doc.id, e)}
                      className={`w-full rounded-lg border border-dashed px-4 py-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E] ${
                        dragOverDocId === doc.id
                          ? 'border-[#A6192E] bg-[#A6192E]/6 text-zinc-900'
                          : 'border-stone-300 bg-stone-900/[0.02] hover:border-stone-400 hover:bg-white/60 text-zinc-600'
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
                          — or use Attach Sample PDF above for template preview.
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
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
                Select an Online Defense Date & Time
              </h1>
              <p className="text-sm text-zinc-600 mt-1">
                Pick a highlighted date to inspect open Mapúa UOx Zoom channels and panel chairs.
              </p>
            </div>
          </div>

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
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
                My Defense Appointments
              </h1>
              <p className="text-sm text-zinc-600 mt-1">
                Review confirmation status, coordinator feedback, and past milestones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab(isClearedToSchedule ? 'book' : 'files')}
              className="self-start sm:self-auto py-2 px-4 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
            >
              {!isClearedToSchedule && <Lock className="w-3.5 h-3.5 shrink-0" />}
              <span>{isClearedToSchedule ? 'Book New Slot' : 'Submit Required Files'}</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg overflow-x-auto">
              {(
                ['All', 'Confirmed', 'Pending Review', 'Reschedule Requested', 'Completed'] as const
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === st
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title or ID..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
              />
            </div>
          </div>

          <div className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl overflow-hidden">
            {filteredAppointments.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-zinc-900">
                  No matching appointments found
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Adjust your status filter or schedule a new thesis defense window.
                </p>
                {(statusFilter !== 'All' || searchQuery.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('All');
                      setSearchQuery('');
                    }}
                    className="mt-4 py-1.5 px-3.5 text-xs font-medium text-zinc-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Clear Filters
                  </button>
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
        <div className="max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
              SOIT UOx Online Defense Guidelines
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Standard academic procedures and 90-minute session flow for Mapúa UOx Zoom thesis
              defenses.
            </p>
          </div>

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
