import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Archive, CalendarPlus, CheckCircle2, Lock, X } from 'lucide-react';
import { QuartermPeriod } from '../types/defense';
import { buildQuartermCode } from '../data/mockTemplateData';

function AnimatedModalShell({
  open,
  titleId,
  maxWidthClass,
  onClose,
  children,
}: {
  open: boolean;
  titleId: string;
  maxWidthClass: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.16 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
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
            className={`bg-white border border-stone-300 rounded-xl ${maxWidthClass} w-full p-6 shadow-2xl my-8`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface CloseQuartermModalProps {
  open: boolean;
  quarterm: QuartermPeriod | null;
  appointmentsCount: number;
  pendingAppointmentsCount: number;
  filesCount: number;
  slotsCount: number;
  onConfirmClose: (closingNote: string) => void;
  onCancel: () => void;
}

export function CloseQuartermModal({
  open,
  quarterm,
  appointmentsCount,
  pendingAppointmentsCount,
  filesCount,
  slotsCount,
  onConfirmClose,
  onCancel,
}: CloseQuartermModalProps) {
  const [closingNote, setClosingNote] = useState('');

  useEffect(() => {
    if (open) {
      setClosingNote('');
    }
  }, [open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!quarterm) return;
    onConfirmClose(
      closingNote.trim() ||
        `SOIT defense scheduling and file submissions closed for ${quarterm.code}.`
    );
  };

  return (
    <AnimatedModalShell
      open={open && Boolean(quarterm)}
      titleId="close-quarterm-title"
      maxWidthClass="max-w-lg"
      onClose={onCancel}
    >
      {quarterm && (
        <>
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#A6192E]/10 text-[#A6192E] border border-[#A6192E]/20 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-mono tabular-nums font-semibold text-[#A6192E]">
                {quarterm.code} · {quarterm.label}
              </p>
              <h2
                id="close-quarterm-title"
                className="text-xl font-semibold text-zinc-900 mt-0.5"
              >
                Close Quarterm
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <p className="text-sm text-zinc-600 leading-relaxed">
            Closing <span className="font-mono font-semibold text-zinc-900">{quarterm.code}</span>{' '}
            immediately pauses new student file uploads and defense slot bookings. Once closed, you
            can store all <span className="font-mono font-medium text-zinc-900">{quarterm.code}</span>{' '}
            records into the <span className="font-medium text-zinc-900">Quarterm Archives</span>{' '}
            tab and open the next Quarterm.
          </p>

          <div className="grid grid-cols-3 gap-3 p-3.5 bg-stone-50 border border-stone-200 rounded-lg">
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Defenses</p>
              <p className="text-lg font-semibold font-mono tabular-nums text-zinc-900 mt-0.5">
                {appointmentsCount}
              </p>
              {pendingAppointmentsCount > 0 && (
                <p className="text-[11px] text-[#9A6E00] mt-0.5">
                  {pendingAppointmentsCount} pending
                </p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Submitted PDFs</p>
              <p className="text-lg font-semibold font-mono tabular-nums text-zinc-900 mt-0.5">
                {filesCount}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Defense Slots</p>
              <p className="text-lg font-semibold font-mono tabular-nums text-zinc-900 mt-0.5">
                {slotsCount}
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="quarterm-closing-note"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Closing Remark (Optional)
            </label>
            <textarea
              id="quarterm-closing-note"
              rows={3}
              value={closingNote}
              onChange={(e) => setClosingNote(e.target.value)}
              placeholder={`e.g., Final SOIT oral defenses concluded for ${quarterm.code}.`}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="py-2 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 text-sm font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-lg transition-colors whitespace-nowrap"
            >
              Close {quarterm.code}
            </button>
          </div>
        </form>
        </>
      )}
    </AnimatedModalShell>
  );
}

interface ArchiveQuartermModalProps {
  open: boolean;
  quarterm: QuartermPeriod | null;
  appointmentsCount: number;
  studentFoldersCount: number;
  filesCount: number;
  slotsCount: number;
  onConfirmArchive: (archiveNote: string) => void;
  onCancel: () => void;
}

export function ArchiveQuartermModal({
  open,
  quarterm,
  appointmentsCount,
  studentFoldersCount,
  filesCount,
  slotsCount,
  onConfirmArchive,
  onCancel,
}: ArchiveQuartermModalProps) {
  const [archiveNote, setArchiveNote] = useState('');

  useEffect(() => {
    if (open && quarterm) {
      setArchiveNote(quarterm.closingNote ?? '');
    }
  }, [open, quarterm]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!quarterm) return;
    onConfirmArchive(
      archiveNote.trim() ||
        `Complete SOIT defense schedule, student file folders, and slot inventory archived for ${quarterm.code}.`
    );
  };

  return (
    <AnimatedModalShell
      open={open && Boolean(quarterm)}
      titleId="archive-quarterm-title"
      maxWidthClass="max-w-lg"
      onClose={onCancel}
    >
      {quarterm && (
        <>
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#C99700]/15 text-[#9A6E00] border border-[#C99700]/30 flex items-center justify-center shrink-0 mt-0.5">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-mono tabular-nums font-semibold text-[#9A6E00]">
                {quarterm.code} · Ready for Archival
              </p>
              <h2
                id="archive-quarterm-title"
                className="text-xl font-semibold text-zinc-900 mt-0.5"
              >
                Store {quarterm.code} in Archives
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <p className="text-sm text-zinc-600 leading-relaxed">
            This saves a permanent read-only snapshot of every defense appointment, student PDF
            folder, and Zoom defense slot from{' '}
            <span className="font-mono font-semibold text-zinc-900">{quarterm.code}</span> inside{' '}
            <span className="font-medium text-zinc-900">Quarterm Archives</span>, then clears the
            active board so you can open a new Quarterm.
          </p>

          <div className="grid grid-cols-3 gap-3 p-3.5 bg-stone-50 border border-stone-200 rounded-lg">
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Defenses</p>
              <p className="text-lg font-semibold font-mono tabular-nums text-zinc-900 mt-0.5">
                {appointmentsCount}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Student Folders</p>
              <p className="text-lg font-semibold font-mono tabular-nums text-zinc-900 mt-0.5">
                {studentFoldersCount}
              </p>
              <p className="text-[11px] font-mono tabular-nums text-zinc-500 mt-0.5">
                {filesCount} PDFs
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Zoom Slots</p>
              <p className="text-lg font-semibold font-mono tabular-nums text-zinc-900 mt-0.5">
                {slotsCount}
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="quarterm-archive-note"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Archival Summary Note
            </label>
            <textarea
              id="quarterm-archive-note"
              rows={3}
              value={archiveNote}
              onChange={(e) => setArchiveNote(e.target.value)}
              placeholder={`Add audit or graduation clearance notes for ${quarterm.code}...`}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="py-2 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 text-sm font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Archive className="w-4 h-4 shrink-0" />
              <span>Store in Archives</span>
            </button>
          </div>
        </form>
        </>
      )}
    </AnimatedModalShell>
  );
}

interface OpenQuartermModalProps {
  open: boolean;
  suggestedQuarter: 1 | 2 | 3 | 4;
  suggestedStartYear: number;
  existingArchivedCodes: string[];
  onConfirmOpen: (payload: {
    quarterNumber: 1 | 2 | 3 | 4;
    startYear: number;
    seedStarterSlots: boolean;
  }) => void;
  onCancel: () => void;
}

export function OpenQuartermModal({
  open,
  suggestedQuarter,
  suggestedStartYear,
  existingArchivedCodes,
  onConfirmOpen,
  onCancel,
}: OpenQuartermModalProps) {
  const [quarterNumber, setQuarterNumber] = useState<1 | 2 | 3 | 4>(suggestedQuarter);
  const [startYear, setStartYear] = useState<number>(suggestedStartYear);
  const [seedStarterSlots, setSeedStarterSlots] = useState(true);

  useEffect(() => {
    if (open) {
      setQuarterNumber(suggestedQuarter);
      setStartYear(suggestedStartYear);
      setSeedStarterSlots(true);
    }
  }, [open, suggestedQuarter, suggestedStartYear]);

  const previewCode = buildQuartermCode(quarterNumber, startYear);
  const alreadyArchived = existingArchivedCodes.includes(previewCode);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (alreadyArchived) return;
    onConfirmOpen({ quarterNumber, startYear, seedStarterSlots });
  };

  return (
    <AnimatedModalShell
      open={open}
      titleId="open-quarterm-title"
      maxWidthClass="max-w-md"
      onClose={onCancel}
    >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">Mapúa University · SOIT</p>
              <h2
                id="open-quarterm-title"
                className="text-xl font-semibold text-zinc-900 mt-0.5"
              >
                Open New Quarterm
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Quarterm Code Preview</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-zinc-900 mt-0.5">
                {previewCode}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>AY {startYear}–{startYear + 1}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="new-quarter-num"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                Quarter
              </label>
              <select
                id="new-quarter-num"
                value={quarterNumber}
                onChange={(e) =>
                  setQuarterNumber(Number(e.target.value) as 1 | 2 | 3 | 4)
                }
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
              >
                <option value={1}>1Q · 1st Quarter</option>
                <option value={2}>2Q · 2nd Quarter</option>
                <option value={3}>3Q · 3rd Quarter</option>
                <option value={4}>4Q · 4th Quarter</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="new-quarter-ay"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                Academic Year
              </label>
              <select
                id="new-quarter-ay"
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
              >
                <option value={2026}>AY 2026–2027</option>
                <option value={2027}>AY 2027–2028</option>
                <option value={2028}>AY 2028–2029</option>
              </select>
            </div>
          </div>

          {alreadyArchived && (
            <p className="text-xs text-[#A6192E] bg-[#A6192E]/8 border border-[#A6192E]/20 rounded-lg px-3 py-2">
              Quarterm <span className="font-mono font-semibold">{previewCode}</span> already exists
              in Archives. Select a newer Quarterm period.
            </p>
          )}

          <label className="flex items-start gap-2.5 p-3 bg-stone-50/80 border border-stone-200 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={seedStarterSlots}
              onChange={(e) => setSeedStarterSlots(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 text-[#A6192E] focus:ring-[#A6192E]"
            />
            <span className="text-xs text-zinc-700 leading-relaxed">
              <span className="font-medium text-zinc-900 block">
                Publish initial UOx Zoom defense slots
              </span>
              Automatically add 4 starter online Zoom slots across SOIT UOx channels so cleared
              candidates can schedule right away.
            </span>
          </label>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="py-2 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={alreadyArchived}
              className="py-2 px-4 text-sm font-medium text-white bg-[#A6192E] hover:bg-[#881325] disabled:bg-zinc-300 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
            >
              Open {previewCode}
            </button>
          </div>
        </form>
    </AnimatedModalShell>
  );
}
