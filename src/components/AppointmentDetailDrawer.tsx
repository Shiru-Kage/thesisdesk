import { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  Users,
  Video,
  X,
} from 'lucide-react';
import { AppointmentStatus, DefenseAppointment, UserRole } from '../types/defense';
import { StatusLabel } from './StatusLabel';
import { formatReadableDate, formatTimeRange } from '../utils/dateUtils';
import { downloadDefenseCalendarInvite } from '../utils/calendarExport';

interface AppointmentDetailDrawerProps {
  appointment: DefenseAppointment | null;
  role: UserRole;
  onClose: () => void;
  hasPendingDocumentReview?: boolean;
  onAdminUpdateStatus?: (
    id: string,
    status: AppointmentStatus,
    feedback?: string,
    zoomDetails?: { zoomLink: string; zoomPasscode?: string }
  ) => void;
  onAdminSaveZoom?: (
    id: string,
    zoomDetails: { zoomLink: string; zoomPasscode?: string }
  ) => void;
  onStudentReschedule?: (appointment: DefenseAppointment) => void;
  onStudentCancel?: (id: string) => void;
  readOnly?: boolean;
  archiveLabel?: string;
}

export function AppointmentDetailDrawer({
  appointment,
  role,
  onClose,
  hasPendingDocumentReview = false,
  onAdminUpdateStatus,
  onAdminSaveZoom,
  onStudentReschedule,
  onStudentCancel,
  readOnly = false,
  archiveLabel,
}: AppointmentDetailDrawerProps) {
  const prefersReducedMotion = useReducedMotion();
  const [feedbackNote, setFeedbackNote] = useState('');
  const [zoomLinkInput, setZoomLinkInput] = useState('');
  const [zoomPasscodeInput, setZoomPasscodeInput] = useState('');
  const [zoomValidationError, setZoomValidationError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (appointment) {
      setFeedbackNote(appointment.adminFeedback ?? '');
      setZoomLinkInput(appointment.zoomLink ?? '');
      setZoomPasscodeInput(appointment.zoomPasscode ?? '');
      setZoomValidationError(null);
      setConfirmCancel(false);
      setCopied(false);
    }
  }, [appointment]);

  useEffect(() => {
    if (!appointment) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appointment, onClose]);

  const currentZoomDetails = {
    zoomLink: zoomLinkInput.trim(),
    zoomPasscode: zoomPasscodeInput.trim() || undefined,
  };

  const handleCopyLink = (link: string) => {
    if (!link) return;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <AnimatePresence>
      {appointment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-thesis-title"
          className="fixed inset-0 z-50 flex justify-end"
        >
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.18 }}
            className="fixed inset-0 bg-zinc-950/50 backdrop-blur-[1px]"
            aria-hidden="true"
            onClick={onClose}
          />

          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { x: '100%' }}
            animate={{ x: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
            transition={
              prefersReducedMotion
                ? { duration: 0.01 }
                : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }
            }
            className="relative z-10 w-full max-w-lg bg-white h-full border-l border-zinc-200 flex flex-col shadow-xl"
          >
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono tabular-nums text-zinc-500">
                  {appointment.id}
                </span>
                <span className="text-zinc-300" aria-hidden="true">
                  ·
                </span>
                <StatusLabel status={appointment.status} />
              </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close defense details"
            className="p-2 -mr-2 text-zinc-400 hover:text-zinc-700 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1">
              {appointment.program} · {appointment.department}
            </p>
            <h2
              id="drawer-thesis-title"
              className="text-xl font-semibold text-zinc-900 leading-snug"
            >
              {appointment.thesisTitle}
            </h2>
          </div>

          {/* Schedule & Zoom Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-zinc-200">
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Defense Date</p>
                <p className="text-sm font-medium text-zinc-900">
                  {formatReadableDate(appointment.date)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Time Window</p>
                <p className="text-sm font-medium font-mono tabular-nums text-zinc-900">
                  {formatTimeRange(appointment.startTime, appointment.endTime)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Video className="w-4 h-4 text-[#A6192E] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Virtual Venue</p>
                <p className="text-sm font-medium text-zinc-900">
                  {appointment.zoomRoomName}
                </p>
                <p className="text-xs text-zinc-500">UOx Fully Online · Zoom</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Users className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Candidate</p>
                <p className="text-sm font-medium text-zinc-900">
                  {appointment.studentName}
                </p>
                <p className="text-xs font-mono tabular-nums text-zinc-500">
                  {appointment.studentId}
                </p>
              </div>
            </div>
          </div>

          {/* Zoom Meeting Link Box */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#A6192E] shrink-0" />
                <h3 className="text-xs font-semibold text-zinc-900">
                  Zoom Meeting Link
                </h3>
              </div>
              {appointment.zoomLink ? (
                <span className="text-[11px] font-medium text-emerald-700">Assigned</span>
              ) : (
                <span className="text-[11px] font-medium text-[#9A6E00]">
                  Not Set Yet
                </span>
              )}
            </div>

            {role === 'admin' && !readOnly ? (
              <div className="space-y-2.5">
                <div>
                  <label
                    htmlFor="drawer-zoom-link"
                    className="block text-[11px] font-medium text-zinc-600 mb-1"
                  >
                    Zoom Meeting Link
                  </label>
                  <input
                    id="drawer-zoom-link"
                    type="url"
                    value={zoomLinkInput}
                    onChange={(e) => {
                      setZoomLinkInput(e.target.value);
                      if (zoomValidationError) setZoomValidationError(null);
                    }}
                    placeholder="https://mapua-edu-ph.zoom.us/j/..."
                    className={`w-full px-3 py-2 text-xs font-mono bg-white border rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E] ${
                      zoomValidationError
                        ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20'
                        : 'border-zinc-300'
                    }`}
                  />
                  {zoomValidationError && (
                    <p className="text-[11px] font-medium text-red-600 mt-1 flex items-center gap-1">
                      <span>⚠</span>
                      <span>{zoomValidationError}</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                  <div className="flex-1">
                    <label
                      htmlFor="drawer-zoom-passcode"
                      className="block text-[11px] font-medium text-zinc-600 mb-1"
                    >
                      Passcode (optional)
                    </label>
                    <input
                      id="drawer-zoom-passcode"
                      type="text"
                      value={zoomPasscodeInput}
                      onChange={(e) => setZoomPasscodeInput(e.target.value)}
                      placeholder="e.g., SOIT-UOX1"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                    />
                  </div>
                  {onAdminSaveZoom && (
                    <button
                      type="button"
                      onClick={() => onAdminSaveZoom(appointment.id, currentZoomDetails)}
                      className="py-1.5 px-3 text-xs font-medium text-zinc-800 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Save Zoom Link
                    </button>
                  )}
                </div>
              </div>
            ) : appointment.zoomLink ? (
              <div className="space-y-2.5">
                <p className="text-xs font-mono text-zinc-800 break-all bg-white border border-stone-200 rounded-lg px-3 py-2">
                  {appointment.zoomLink}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-zinc-500 font-mono tabular-nums">
                    {appointment.zoomPasscode
                      ? `Passcode: ${appointment.zoomPasscode}`
                      : 'Waiting room enabled'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadDefenseCalendarInvite(appointment)}
                      className="py-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>Add to Calendar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(appointment.zoomLink)}
                      className="py-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {copied ? (
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
                      href={appointment.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-2.5 text-xs font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-md inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Join Zoom</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-zinc-500 flex-1 min-w-[200px]">
                  The SOIT UOx Coordinator has not attached a Zoom meeting link for this defense
                  yet. Check back once confirmed.
                </p>
                {appointment.status !== 'Cancelled' && (
                  <button
                    type="button"
                    onClick={() => downloadDefenseCalendarInvite(appointment)}
                    className="py-1.5 px-2.5 text-xs font-medium text-zinc-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Add to Calendar</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-medium text-zinc-500 mb-1.5">Abstract</h3>
            <p className="text-sm text-zinc-700 leading-relaxed">{appointment.abstract}</p>
          </div>

          <div>
            <h3 className="text-xs font-medium text-zinc-500 mb-2">Defense Committee</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-zinc-500">Primary Adviser</dt>
                <dd className="font-medium text-zinc-900">{appointment.advisorName}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-zinc-500">Panel Members</dt>
                <dd className="text-zinc-800 text-right">
                  {appointment.committeeMembers.join(', ')}
                </dd>
              </div>
            </dl>
          </div>

          {appointment.notes && (
            <div>
              <h3 className="text-xs font-medium text-zinc-500 mb-1.5">
                Special Candidate Notes
              </h3>
              <p className="text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                {appointment.notes}
              </p>
            </div>
          )}

          {/* Candidate Resubmission Notice for Admin */}
          {hasPendingDocumentReview && role === 'admin' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Resubmitted Files Awaiting Clearance</p>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  Candidate has resubmitted files. Approve files in Submitted Files first to unlock defense confirmation.
                </p>
              </div>
            </div>
          )}

          {/* Coordinator Feedback Section */}
          {role === 'admin' && !readOnly ? (
            <div>
              <label
                htmlFor="admin-feedback-input"
                className="block text-xs font-medium text-zinc-600 mb-1.5"
              >
                Coordinator Decision Note
              </label>
              <textarea
                id="admin-feedback-input"
                rows={3}
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="Panel feedback or revision instructions for candidate..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
              />
            </div>
          ) : (
            appointment.adminFeedback && (
              <div>
                <h3 className="text-xs font-medium text-zinc-500 mb-1.5">
                  Coordinator Note
                </h3>
                <p className="text-sm text-zinc-800 bg-amber-50/70 border border-amber-200 rounded-lg p-3">
                  {appointment.adminFeedback}
                </p>
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 shrink-0">
          {readOnly && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">
                Archived read-only defense record{archiveLabel ? ` · ${archiveLabel}` : ''}.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="py-1.5 px-3.5 text-xs font-medium text-zinc-800 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg transition-colors whitespace-nowrap"
              >
                Close
              </button>
            </div>
          )}

          {!readOnly && role === 'admin' && onAdminUpdateStatus && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {appointment.status !== 'Confirmed' && appointment.status !== 'Completed' && (
                  <button
                    type="button"
                    disabled={hasPendingDocumentReview}
                    onClick={() => {
                      if (hasPendingDocumentReview) return;
                      if (!currentZoomDetails.zoomLink.trim()) {
                        setZoomValidationError('Please enter or assign a valid Zoom link before approving the defense.');
                        const el = document.getElementById('drawer-zoom-link');
                        el?.focus();
                        return;
                      }
                      onAdminUpdateStatus(
                        appointment.id,
                        'Confirmed',
                        feedbackNote,
                        currentZoomDetails
                      );
                      onClose();
                    }}
                    title={
                      hasPendingDocumentReview
                        ? 'Verify and approve candidate resubmitted files in Submitted Files first'
                        : undefined
                    }
                    className="py-2 px-4 bg-[#A6192E] hover:bg-[#881325] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shadow-xs"
                  >
                    Approve Defense
                  </button>
                )}
                {appointment.status === 'Confirmed' && (
                  <button
                    type="button"
                    onClick={() => {
                      onAdminUpdateStatus(
                        appointment.id,
                        'Completed',
                        feedbackNote,
                        currentZoomDetails
                      );
                      onClose();
                    }}
                    className="py-2 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    Mark Completed
                  </button>
                )}
                {appointment.status !== 'Reschedule Requested' &&
                  appointment.status !== 'Completed' &&
                  appointment.status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() => {
                        onAdminUpdateStatus(
                          appointment.id,
                          'Reschedule Requested',
                          feedbackNote || 'Please select an alternate open Zoom slot.',
                          currentZoomDetails
                        );
                        onClose();
                      }}
                      className="py-2 px-3.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      Request Reschedule
                    </button>
                  )}
              </div>

              {appointment.status !== 'Cancelled' && appointment.status !== 'Completed' && (
                <button
                  type="button"
                  onClick={() => {
                    onAdminUpdateStatus(
                      appointment.id,
                      'Cancelled',
                      feedbackNote,
                      currentZoomDetails
                    );
                    onClose();
                  }}
                  className="py-2 px-3 text-rose-700 hover:bg-rose-50 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  Cancel Slot
                </button>
              )}
            </div>
          )}

          {!readOnly && role === 'student' && (
            <>
              {confirmCancel ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-rose-800">
                    Withdraw this defense appointment?
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                      className="py-1.5 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-200 rounded-md"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onStudentCancel?.(appointment.id);
                        onClose();
                      }}
                      className="py-1.5 px-3 text-xs font-medium text-white bg-rose-700 hover:bg-rose-800 rounded-md"
                    >
                      Confirm Withdraw
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  {appointment.status !== 'Completed' && appointment.status !== 'Cancelled' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onStudentReschedule?.(appointment);
                          onClose();
                        }}
                        className="py-2 px-4 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                      >
                        Reschedule Slot
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(true)}
                        className="py-2 px-3 text-rose-700 hover:bg-rose-50 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                      >
                        Withdraw Request
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      This record is archived for your academic transcript.
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
