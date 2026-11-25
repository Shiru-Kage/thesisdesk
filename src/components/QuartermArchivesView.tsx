import { useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  Search,
  Video,
  X,
} from 'lucide-react';
import {
  ArchivedQuarterm,
  DefenseAppointment,
  QuartermPeriod,
  RequiredDocumentSpec,
  StudentFileSubmission,
} from '../types/defense';
import { StatusLabel } from './StatusLabel';
import { FileStatusLabel } from './FileStatusLabel';
import { AppointmentDetailDrawer } from './AppointmentDetailDrawer';
import { PdfPreviewModal } from './PdfPreviewModal';
import { ToastTone } from './ToastNotification';
import { formatShortDate, formatTimeRange } from '../utils/dateUtils';
import { downloadDefenseScheduleCsv } from '../utils/csvExport';

interface QuartermArchivesViewProps {
  archivedQuarters: ArchivedQuarterm[];
  activeQuarter: QuartermPeriod | null;
  requiredDocuments: RequiredDocumentSpec[];
  onRequestOpenNewQuarter: () => void;
  onNotify?: (message: string, tone?: ToastTone) => void;
}

export function QuartermArchivesView({
  archivedQuarters,
  activeQuarter,
  requiredDocuments,
  onRequestOpenNewQuarter,
  onNotify,
}: QuartermArchivesViewProps) {
  const [archiveSearch, setArchiveSearch] = useState('');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'defenses' | 'files' | 'slots'>('defenses');
  const [recordSearch, setRecordSearch] = useState('');
  const [openFolderKey, setOpenFolderKey] = useState<string | null>(null);
  const [inspectedAppointment, setInspectedAppointment] =
    useState<DefenseAppointment | null>(null);
  const [inspectedFileId, setInspectedFileId] = useState<string | null>(null);

  const selectedArchive = useMemo(
    () => archivedQuarters.find((a) => a.id === selectedArchiveId) ?? null,
    [archivedQuarters, selectedArchiveId]
  );

  const docById = useMemo(() => {
    const map: Record<string, RequiredDocumentSpec> = {};
    requiredDocuments.forEach((doc) => {
      map[doc.id] = doc;
    });
    return map;
  }, [requiredDocuments]);

  const totalArchivedDefenses = useMemo(
    () => archivedQuarters.reduce((sum, q) => sum + q.appointments.length, 0),
    [archivedQuarters]
  );
  const totalArchivedFiles = useMemo(
    () => archivedQuarters.reduce((sum, q) => sum + q.fileSubmissions.length, 0),
    [archivedQuarters]
  );
  const totalArchivedSlots = useMemo(
    () => archivedQuarters.reduce((sum, q) => sum + q.slots.length, 0),
    [archivedQuarters]
  );

  const filteredArchives = useMemo(() => {
    const q = archiveSearch.trim().toLowerCase();
    if (!q) return archivedQuarters;
    return archivedQuarters.filter((arc) => {
      if (
        arc.quarterm.code.toLowerCase().includes(q) ||
        arc.quarterm.label.toLowerCase().includes(q) ||
        arc.quarterm.academicYear.toLowerCase().includes(q) ||
        (arc.archiveNote ?? '').toLowerCase().includes(q)
      ) {
        return true;
      }
      const inAppt = arc.appointments.some(
        (a) =>
          a.studentName.toLowerCase().includes(q) ||
          a.thesisTitle.toLowerCase().includes(q) ||
          a.studentId.toLowerCase().includes(q)
      );
      const inFiles = arc.fileSubmissions.some(
        (f) =>
          f.studentName.toLowerCase().includes(q) ||
          f.fileName.toLowerCase().includes(q)
      );
      return inAppt || inFiles;
    });
  }, [archivedQuarters, archiveSearch]);

  const archiveAppointmentsBySlotId = useMemo(() => {
    const map: Record<string, DefenseAppointment> = {};
    if (!selectedArchive) return map;
    selectedArchive.appointments.forEach((a) => {
      if (a.status !== 'Cancelled') {
        map[a.slotId] = a;
      }
    });
    return map;
  }, [selectedArchive]);

  const filteredArchiveAppointments = useMemo(() => {
    if (!selectedArchive) return [];
    const q = recordSearch.trim().toLowerCase();
    return selectedArchive.appointments.filter((a) => {
      if (!q) return true;
      return (
        a.studentName.toLowerCase().includes(q) ||
        a.studentId.toLowerCase().includes(q) ||
        a.thesisTitle.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    });
  }, [selectedArchive, recordSearch]);

  const archiveFileFolders = useMemo(() => {
    if (!selectedArchive) return [];
    const map = new Map<
      string,
      {
        studentKey: string;
        studentName: string;
        studentId: string;
        studentEmail: string;
        program: string;
        submissionsByReqId: Record<string, StudentFileSubmission>;
        submissions: StudentFileSubmission[];
      }
    >();

    selectedArchive.fileSubmissions.forEach((sub) => {
      const key = sub.studentEmail.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          studentKey: key,
          studentName: sub.studentName,
          studentId: sub.studentId,
          studentEmail: sub.studentEmail,
          program: sub.program,
          submissionsByReqId: {},
          submissions: [],
        });
      }
      const group = map.get(key)!;
      group.submissionsByReqId[sub.requirementId] = sub;
      group.submissions.push(sub);
    });

    const q = recordSearch.trim().toLowerCase();
    return Array.from(map.values())
      .filter((group) => {
        if (!q) return true;
        return (
          group.studentName.toLowerCase().includes(q) ||
          group.studentId.toLowerCase().includes(q) ||
          group.program.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [selectedArchive, recordSearch]);

  const activeArchiveFolder = useMemo(
    () =>
      openFolderKey
        ? archiveFileFolders.find((f) => f.studentKey === openFolderKey) ?? null
        : null,
    [archiveFileFolders, openFolderKey]
  );

  const inspectedFile = useMemo(
    () =>
      selectedArchive && inspectedFileId
        ? selectedArchive.fileSubmissions.find((f) => f.id === inspectedFileId) ?? null
        : null,
    [selectedArchive, inspectedFileId]
  );

  const inspectedFileSiblings = useMemo(() => {
    if (!inspectedFile || !selectedArchive) return [];
    const key = inspectedFile.studentEmail.toLowerCase();
    return selectedArchive.fileSubmissions.filter(
      (s) => s.studentEmail.toLowerCase() === key
    );
  }, [inspectedFile, selectedArchive]);

  const inspectedFileAppointment = useMemo(() => {
    if (!inspectedFile || !selectedArchive) return undefined;
    return selectedArchive.appointments.find(
      (a) =>
        a.studentEmail.toLowerCase() === inspectedFile.studentEmail.toLowerCase() ||
        a.studentId === inspectedFile.studentId
    );
  }, [inspectedFile, selectedArchive]);

  const handleOpenArchive = (archiveId: string) => {
    setSelectedArchiveId(archiveId);
    setDetailTab('defenses');
    setRecordSearch('');
    setOpenFolderKey(null);
    setInspectedAppointment(null);
    setInspectedFileId(null);
  };

  if (!selectedArchive) {
    return (
      <div className="space-y-4 sm:space-y-5">
        {/* Top Overall Archive KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-xs rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">Concluded Quarterms</span>
              <Archive className="w-4 h-4 text-[#A6192E]" />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-zinc-900 mt-1.5">
              {archivedQuarters.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Historical terms archived & sealed
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-xs rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">Archived Defenses</span>
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-zinc-900 mt-1.5">
              {totalArchivedDefenses}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Total oral examinations recorded
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-xs rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">Verified Manuscripts</span>
              <FolderOpen className="w-4 h-4 text-[#9A6E00]" />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-zinc-900 mt-1.5">
              {totalArchivedFiles}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Preserved student PDF documents
            </p>
          </div>
        </div>

        {/* Unified Control Dock */}
        <div className="bg-white/75 backdrop-blur-md border border-stone-300/70 rounded-xl px-4 py-2.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p className="text-xs text-zinc-600">
            <span className="font-mono tabular-nums font-semibold text-zinc-900">
              {filteredArchives.length}
            </span>{' '}
            quarterm{filteredArchives.length === 1 ? '' : 's'} displayed
            {activeQuarter && (
              <>
                <span className="mx-1.5 text-zinc-400" aria-hidden="true">
                  ·
                </span>
                Active Term:{' '}
                <span className="font-mono font-semibold text-zinc-900">
                  {activeQuarter.code}
                </span>{' '}
                ({activeQuarter.status})
              </>
            )}
          </p>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                placeholder="Search quarterm (e.g. 1Q2627), student, thesis..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-stone-300/80 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E] shadow-2xs"
              />
              {archiveSearch && (
                <button
                  type="button"
                  onClick={() => setArchiveSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {!activeQuarter && (
              <button
                type="button"
                onClick={onRequestOpenNewQuarter}
                className="py-1.5 px-3.5 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5 shrink-0" />
                <span>Open New Quarterm</span>
              </button>
            )}
          </div>
        </div>

        {filteredArchives.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-xs rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 text-zinc-400 flex items-center justify-center mx-auto mb-3">
              <Archive className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-zinc-900">
              No archived Quarterms match your search
            </p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Clear your search filter or archive a concluded Quarterm from Schedule Overview.
            </p>
            {archiveSearch.trim() && (
              <button
                type="button"
                onClick={() => setArchiveSearch('')}
                className="mt-4 py-1.5 px-4 text-xs font-medium text-zinc-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredArchives.map((arc) => {
              const completedCount = arc.appointments.filter(
                (a) => a.status === 'Completed'
              ).length;
              const uniqueStudentCount = new Set(
                arc.fileSubmissions.map((s) => s.studentEmail.toLowerCase())
              ).size;
              const completionPercent =
                arc.appointments.length > 0
                  ? Math.round((completedCount / arc.appointments.length) * 100)
                  : 100;

              return (
                <button
                  key={arc.id}
                  type="button"
                  onClick={() => handleOpenArchive(arc.id)}
                  className="group bg-white/75 hover:bg-white backdrop-blur-md border border-stone-300/80 hover:border-[#A6192E]/50 shadow-[0_4px_24px_rgba(24,24,27,0.04)] hover:shadow-md rounded-2xl p-5 text-left transition-all flex flex-col justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="inline-flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-[#A6192E]/10 text-[#A6192E] font-mono font-bold text-sm rounded-lg border border-[#A6192E]/20">
                          {arc.quarterm.code}
                        </span>
                        <span className="px-2 py-0.5 bg-stone-100 text-zinc-600 font-medium text-[11px] rounded-md border border-stone-200">
                          Archived
                        </span>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-zinc-500">
                        {formatShortDate(arc.archivedAt)}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-zinc-900 group-hover:text-[#A6192E] transition-colors">
                        {arc.quarterm.label}
                      </h2>
                      <p className="text-xs font-mono text-zinc-500 mt-0.5">
                        AY {arc.quarterm.academicYear}
                      </p>
                    </div>

                    {arc.archiveNote && (
                      <div className="p-2.5 rounded-lg bg-stone-100/70 border border-stone-200/60 text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                        {arc.archiveNote}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-stone-200/80">
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <CalendarCheck className="w-3 h-3 text-zinc-400" />
                          <span>Defenses</span>
                        </p>
                        <p className="text-sm font-semibold font-mono tabular-nums text-zinc-900">
                          {arc.appointments.length}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-zinc-400" />
                          <span>PDFs</span>
                        </p>
                        <p className="text-sm font-semibold font-mono tabular-nums text-zinc-900">
                          {arc.fileSubmissions.length}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Video className="w-3 h-3 text-zinc-400" />
                          <span>Zoom</span>
                        </p>
                        <p className="text-sm font-semibold font-mono tabular-nums text-zinc-900">
                          {arc.slots.length}
                        </p>
                      </div>
                    </div>

                    {/* Completion rate bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                        <span>{completedCount}/{arc.appointments.length} Defenses Completed</span>
                        <span>{completionPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#A6192E] rounded-full transition-all"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-stone-200/70 flex items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-500 text-[11px]">
                        {uniqueStudentCount} candidate folder{uniqueStudentCount === 1 ? '' : 's'}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-xs text-[#A6192E] group-hover:translate-x-0.5 transition-transform shrink-0">
                        <span>Inspect Archive</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // INSIDE SELECTED ARCHIVED QUARTERM
  const completedCount = selectedArchive.appointments.filter(
    (a) => a.status === 'Completed'
  ).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-xs rounded-xl px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-700">
          <span className="px-2 py-0.5 bg-[#9A6E00]/10 text-[#9A6E00] font-semibold rounded text-[11px]">
            Archived Quarterm
          </span>
          <span className="font-mono font-bold text-zinc-900 text-sm">
            {selectedArchive.quarterm.code}
          </span>
          <span className="text-zinc-400" aria-hidden="true">·</span>
          <span>{selectedArchive.quarterm.label}</span>
          <span className="text-zinc-400" aria-hidden="true">·</span>
          <span className="font-mono text-zinc-500 tabular-nums">
            Stored {formatShortDate(selectedArchive.archivedAt)} by {selectedArchive.archivedBy}
          </span>
          {selectedArchive.archiveNote && (
            <>
              <span className="text-zinc-400" aria-hidden="true">·</span>
              <span className="text-zinc-500 max-w-md truncate" title={selectedArchive.archiveNote}>
                {selectedArchive.archiveNote}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={selectedArchive.appointments.length === 0}
            onClick={() => {
              downloadDefenseScheduleCsv(
                selectedArchive.appointments,
                `ThesisDesk-${selectedArchive.quarterm.code}-Archive`
              );
              onNotify?.(
                `Exported ${selectedArchive.appointments.length} archived defense record${
                  selectedArchive.appointments.length === 1 ? '' : 's'
                } from ${selectedArchive.quarterm.code}.`,
                'success'
              );
            }}
            className="py-1 px-2.5 bg-white hover:bg-stone-50 disabled:opacity-45 disabled:cursor-not-allowed border border-stone-300/80 text-zinc-800 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedArchiveId(null)}
            className="py-1 px-2.5 bg-white hover:bg-stone-50 border border-stone-300/80 text-zinc-800 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>All Quarterms</span>
          </button>
        </div>
      </div>

      {/* 4-Column Archive Snapshot KPI Strip */}
      {!activeArchiveFolder && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-xs rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">Total Defenses</span>
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-zinc-900 mt-1.5">
              {selectedArchive.appointments.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{completedCount} completed oral exams</p>
          </div>

          <div className="bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-xs rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">Student Folders</span>
              <FolderOpen className="w-4 h-4 text-[#9A6E00]" />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-zinc-900 mt-1.5">
              {archiveFileFolders.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {selectedArchive.fileSubmissions.length} archived PDF manuscripts
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-xs rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">Defense Slots</span>
              <Video className="w-4 h-4 text-[#A6192E]" />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#A6192E] mt-1.5">
              {selectedArchive.slots.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Configured term windows</p>
          </div>

          <div className="bg-white/70 backdrop-blur-md border border-stone-300/70 shadow-xs rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">Quarterm Window</span>
              <Clock className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-sm font-semibold font-mono tabular-nums text-zinc-900 mt-2">
              {formatShortDate(selectedArchive.quarterm.openedAt)} –{' '}
              {formatShortDate(
                selectedArchive.quarterm.closedAt ?? selectedArchive.archivedAt
              )}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Read-only historical snapshot</p>
          </div>
        </div>
      )}

      {/* Unified Sub-tab Control Dock */}
      <div className="bg-white/75 backdrop-blur-md border border-stone-300/70 rounded-xl px-4 py-2.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-stone-200/80 border border-stone-300/60 rounded-lg overflow-x-auto scrollbar-none">
          {(
            [
              {
                id: 'defenses',
                label: 'Defenses',
                count: selectedArchive.appointments.length,
                icon: CalendarCheck,
              },
              {
                id: 'files',
                label: 'Submitted Files',
                count: selectedArchive.fileSubmissions.length,
                icon: Folder,
              },
              {
                id: 'slots',
                label: 'Defense Slots',
                count: selectedArchive.slots.length,
                icon: Video,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isSelected = detailTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setDetailTab(tab.id);
                  setOpenFolderKey(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#A6192E]' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums font-semibold ${
                    isSelected
                      ? 'bg-stone-100 text-zinc-800'
                      : 'bg-stone-300/60 text-zinc-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {detailTab !== 'slots' && (
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
              placeholder={
                detailTab === 'defenses'
                  ? 'Filter archived defenses by student or thesis...'
                  : 'Filter archived student folders by name or ID...'
              }
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-stone-300/80 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E] shadow-2xs"
            />
            {recordSearch && (
              <button
                type="button"
                onClick={() => setRecordSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* SUB-TAB 1: ARCHIVED DEFENSES */}
      {detailTab === 'defenses' && (
        <section className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl overflow-hidden">
          {filteredArchiveAppointments.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-zinc-900">
                {recordSearch.trim()
                  ? 'No archived defenses match your search'
                  : 'No defense appointments recorded in this archive'}
              </p>
              {recordSearch.trim() && (
                <button
                  type="button"
                  onClick={() => setRecordSearch('')}
                  className="mt-4 py-1.5 px-3.5 text-xs font-medium text-zinc-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/70 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Thesis Manuscript</th>
                    <th className="py-3 px-4">Defense Schedule</th>
                    <th className="py-3 px-4">Zoom Channel</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/70 text-sm">
                  {filteredArchiveAppointments.map((appt) => (
                    <tr
                      key={appt.id}
                      className="hover:bg-stone-900/[0.03] transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
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
                                {appt.program}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 min-w-[220px] max-w-xs">
                        <button
                          type="button"
                          onClick={() => setInspectedAppointment(appt)}
                          className="font-medium text-zinc-900 hover:text-[#A6192E] text-left line-clamp-1 cursor-pointer"
                        >
                          {appt.thesisTitle}
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
                        <p className="text-xs font-medium text-zinc-800">{appt.zoomRoomName}</p>
                        <p className="text-[11px] font-mono text-zinc-500 truncate max-w-[210px] mt-0.5">
                          {appt.zoomLink || 'No Zoom link stored'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusLabel status={appt.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectedAppointment(appt)}
                          className="py-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-zinc-500" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* SUB-TAB 2: ARCHIVED STUDENT FILE FOLDERS + PDF PREVIEW */}
      {detailTab === 'files' && (
        <>
          {!activeArchiveFolder ? (
            archiveFileFolders.length === 0 ? (
              <div className="bg-white/65 backdrop-blur-md border border-stone-300/70 rounded-xl p-10 text-center">
                <p className="text-sm font-medium text-zinc-900">
                  {recordSearch.trim()
                    ? `No student folders in ${selectedArchive.quarterm.code} match your search`
                    : `No student files recorded in ${selectedArchive.quarterm.code}`}
                </p>
                {recordSearch.trim() && (
                  <button
                    type="button"
                    onClick={() => setRecordSearch('')}
                    className="mt-4 py-1.5 px-3.5 text-xs font-medium text-zinc-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {archiveFileFolders.map((group) => (
                  <button
                    key={group.studentKey}
                    type="button"
                    onClick={() => setOpenFolderKey(group.studentKey)}
                    className="group bg-white/68 hover:bg-white/92 backdrop-blur-md border border-stone-300/75 hover:border-[#A6192E]/45 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl p-5 text-left transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-lg bg-stone-100 text-zinc-700 border border-stone-200 flex items-center justify-center shrink-0">
                          <Folder className="w-5 h-5 group-hover:hidden" />
                          <FolderOpen className="w-5 h-5 hidden group-hover:block text-[#A6192E]" />
                        </div>
                        <span className="text-xs font-mono tabular-nums text-zinc-500">
                          {group.submissions.length} PDF
                          {group.submissions.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900 group-hover:text-[#A6192E] transition-colors truncate">
                          {group.studentName}
                        </h3>
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
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Archived Snapshot</span>
                      </span>
                      <span className="inline-flex items-center gap-0.5 font-medium text-zinc-600 group-hover:text-[#A6192E]">
                        <span>Open</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            <section className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-300/60 bg-stone-900/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#A6192E]/10 text-[#A6192E] border border-[#A6192E]/20 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">
                      {activeArchiveFolder.studentName}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      <span className="font-mono tabular-nums">
                        {activeArchiveFolder.studentId}
                      </span>{' '}
                      · {activeArchiveFolder.program}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenFolderKey(null)}
                  className="self-start sm:self-auto py-1.5 px-3 bg-white hover:bg-stone-50 border border-stone-300 text-zinc-700 text-xs font-medium rounded-md inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>All {selectedArchive.quarterm.code} Folders</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-stone-900/[0.02] text-xs font-medium text-zinc-500">
                      <th className="py-3 px-5">Document Requirement</th>
                      <th className="py-3 px-4">Archived PDF</th>
                      <th className="py-3 px-4">Uploaded</th>
                      <th className="py-3 px-4">Final Status</th>
                      <th className="py-3 px-5 text-right">Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {activeArchiveFolder.submissions.map((sub) => (
                      <tr
                        key={sub.id}
                        className="hover:bg-stone-900/[0.03] transition-colors"
                      >
                        <td className="py-3.5 px-5 font-medium text-zinc-900">
                          {docById[sub.requirementId]?.title ?? 'Submitted Document'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-[#A6192E] mt-0.5 shrink-0" />
                            <div>
                              <button
                                type="button"
                                onClick={() => setInspectedFileId(sub.id)}
                                className="font-medium text-zinc-900 hover:text-[#A6192E] text-left"
                              >
                                {sub.fileName}
                              </button>
                              <p className="text-xs font-mono tabular-nums text-zinc-500">
                                {sub.fileSize}
                                {sub.facultyNote ? ` · ${sub.facultyNote}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-zinc-600 whitespace-nowrap">
                          {formatShortDate(sub.uploadedAt)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <FileStatusLabel status={sub.status} />
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setInspectedFileId(sub.id)}
                            className="py-1.5 px-2.5 text-xs font-medium text-zinc-800 bg-white hover:bg-stone-50 border border-stone-300 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
                            <span>Preview PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* SUB-TAB 3: ARCHIVED DEFENSE SLOTS */}
      {detailTab === 'slots' && (
        <section className="bg-white/65 backdrop-blur-md border border-stone-300/70 shadow-[0_4px_24px_rgba(24,24,27,0.04)] rounded-xl overflow-hidden">
          {selectedArchive.slots.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-zinc-900">
                No defense slots were recorded in this archive
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-stone-900/[0.04] text-xs font-medium text-zinc-500">
                    <th className="py-3 px-4">Date & Window</th>
                    <th className="py-3 px-4">Zoom Room & Link</th>
                    <th className="py-3 px-4">Program</th>
                    <th className="py-3 px-4">Presiding Chair</th>
                    <th className="py-3 px-4 text-right">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {selectedArchive.slots.map((slot) => {
                    const bookedAppt = archiveAppointmentsBySlotId[slot.id];
                    return (
                      <tr key={slot.id} className="hover:bg-stone-900/[0.03]">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-medium text-zinc-900">
                            {formatShortDate(slot.date)}
                          </p>
                          <p className="text-xs font-mono tabular-nums text-zinc-500">
                            {formatTimeRange(slot.startTime, slot.endTime)}
                          </p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="text-zinc-900">{slot.zoomRoomName}</p>
                          <p className="text-xs font-mono text-zinc-500 truncate max-w-[230px]">
                            {slot.zoomLink || 'Zoom link unassigned'}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-zinc-700 whitespace-nowrap">
                          {slot.department}
                        </td>
                        <td className="py-3 px-4 text-zinc-700 whitespace-nowrap">
                          {slot.chairName}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {bookedAppt ? (
                            <button
                              type="button"
                              onClick={() => setInspectedAppointment(bookedAppt)}
                              className="text-xs font-medium text-[#A6192E] hover:underline"
                            >
                              {bookedAppt.studentName} ({bookedAppt.status})
                            </button>
                          ) : slot.isBlocked ? (
                            <span className="text-xs font-medium text-rose-700">Locked</span>
                          ) : (
                            <span className="text-xs text-zinc-500">Unused Window</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* READ-ONLY ARCHIVED PDF PREVIEW */}
      <PdfPreviewModal
        submission={inspectedFile}
        documentSpec={inspectedFile ? docById[inspectedFile.requirementId] : undefined}
        matchedAppointment={inspectedFileAppointment}
        siblingSubmissions={inspectedFileSiblings}
        onSelectSubmission={(nextSub) => setInspectedFileId(nextSub.id)}
        onClose={() => setInspectedFileId(null)}
        readOnly
        archiveLabel={selectedArchive.quarterm.code}
      />

      {/* READ-ONLY ARCHIVED DEFENSE DETAIL DRAWER */}
      <AppointmentDetailDrawer
        appointment={inspectedAppointment}
        role="admin"
        onClose={() => setInspectedAppointment(null)}
        readOnly
        archiveLabel={selectedArchive.quarterm.code}
      />
    </div>
  );
}
