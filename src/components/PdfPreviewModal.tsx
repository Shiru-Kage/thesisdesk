import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import mammoth from 'mammoth';
import {
  DefenseAppointment,
  FileReviewStatus,
  RequiredDocumentSpec,
  StudentFileSubmission,
} from '../types/defense';
import { FileStatusLabel } from './FileStatusLabel';
import { formatShortDate } from '../utils/dateUtils';
import { retrieveFileFromIdb } from '../services/firebase';

interface PdfPreviewModalProps {
  submission: StudentFileSubmission | null;
  documentSpec?: RequiredDocumentSpec;
  matchedAppointment?: DefenseAppointment;
  siblingSubmissions: StudentFileSubmission[];
  onSelectSubmission: (sub: StudentFileSubmission) => void;
  onReview?: (
    submissionId: string,
    status: FileReviewStatus,
    facultyNote?: string
  ) => void;
  onClose: () => void;
  readOnly?: boolean;
  archiveLabel?: string;
  readOnlyHint?: string;
  onResubmit?: (requirementId: string, file: File) => void;
}

const ZOOM_STEPS = [85, 100, 115];

export function PdfPreviewModal({
  submission,
  documentSpec,
  matchedAppointment,
  siblingSubmissions,
  onSelectSubmission,
  onReview,
  onClose,
  readOnly = false,
  archiveLabel,
  readOnlyHint,
  onResubmit,
}: PdfPreviewModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const resubmitInputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const [page, setPage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(1);

  // Live file resolution & multi-format rendering state
  const [liveUrl, setLiveUrl] = useState<string | null>(submission?.objectUrl ?? null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (submission) {
      setNote(submission.facultyNote ?? '');
      setPage(1);
      setZoomIndex(1);
    }
  }, [submission]);

  // Resolve live URL with IndexedDB fallback for page reloads / role switches
  useEffect(() => {
    let active = true;
    if (!submission) {
      setLiveUrl(null);
      setDocxHtml(null);
      setTextContent(null);
      return;
    }

    const resolveUrl = async () => {
      // 1. If submission has an objectUrl, check if it is alive (if it is a blob: URL)
      if (submission.objectUrl) {
        if (!submission.objectUrl.startsWith('blob:')) {
          if (active) setLiveUrl(submission.objectUrl);
          return;
        }
        try {
          const res = await fetch(submission.objectUrl, { method: 'HEAD' });
          if (res.ok) {
            if (active) setLiveUrl(submission.objectUrl);
            return;
          }
        } catch {
          // Stale / revoked blob URL from previous session
        }
      }

      // 2. Recover live blob from persistent IndexedDB
      try {
        const localUrl = await retrieveFileFromIdb(submission.id);
        if (active && localUrl) {
          setLiveUrl(localUrl);
          return;
        }
      } catch {
        // IDB retrieval error
      }

      if (active) setLiveUrl(submission.objectUrl ?? null);
    };

    resolveUrl();
    return () => {
      active = false;
    };
  }, [submission]);

  const currentIdx = submission
    ? siblingSubmissions.findIndex((s) => s.id === submission.id)
    : -1;

  useEffect(() => {
    if (!submission) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'INPUT' ||
          target.isContentEditable);
      if (isTyping || siblingSubmissions.length <= 1 || currentIdx < 0) return;

      if (event.key === 'ArrowLeft' && currentIdx > 0) {
        event.preventDefault();
        onSelectSubmission(siblingSubmissions[currentIdx - 1]);
      } else if (
        event.key === 'ArrowRight' &&
        currentIdx < siblingSubmissions.length - 1
      ) {
        event.preventDefault();
        onSelectSubmission(siblingSubmissions[currentIdx + 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submission, siblingSubmissions, currentIdx, onSelectSubmission, onClose]);

  // Format and file-type analysis
  const fileName = (submission?.fileName ?? '').trim();
  const lowerName = fileName.toLowerCase();
  const isPdf = lowerName.endsWith('.pdf');
  const isDocx = lowerName.endsWith('.docx') || lowerName.endsWith('.doc');
  const isImage = /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(lowerName);
  const isText = /\.(txt|md|cpp|c|java|py|json|csv|log|sql)$/i.test(lowerName);
  const hasLiveDocument = Boolean(liveUrl);

  // Process DOCX conversion to rich HTML using Mammoth
  useEffect(() => {
    let active = true;
    if (!liveUrl) {
      setDocxHtml(null);
      setTextContent(null);
      setDocxLoading(false);
      return;
    }

    if (isDocx) {
      setDocxLoading(true);
      setDocxError(null);
      fetch(liveUrl)
        .then((res) => res.arrayBuffer())
        .then((buf) => mammoth.convertToHtml({ arrayBuffer: buf }))
        .then((res) => {
          if (active) {
            setDocxHtml(res.value);
            setDocxLoading(false);
          }
        })
        .catch((err) => {
          console.warn('Mammoth docx parse error:', err);
          if (active) {
            setDocxError('Unable to extract live Word document formatting.');
            setDocxLoading(false);
          }
        });
    } else if (isText) {
      fetch(liveUrl)
        .then((res) => res.text())
        .then((txt) => {
          if (active) setTextContent(txt);
        })
        .catch(() => {
          if (active) setTextContent(null);
        });
    } else {
      setDocxHtml(null);
      setTextContent(null);
      setDocxLoading(false);
    }

    return () => {
      active = false;
    };
  }, [liveUrl, isDocx, isText]);

  const totalPages = submission?.requirementId === 'req-manuscript' ? 2 : 1;
  const zoomPercent = ZOOM_STEPS[zoomIndex];

  const thesisTitle =
    matchedAppointment?.thesisTitle ??
    'Manuscript Under Review';
  const advisorName = matchedAppointment?.advisorName ?? 'Assigned Adviser';
  const thesisAbstract =
    matchedAppointment?.abstract ??
    'Candidate submission document filed for School of Information Technology defense review.';
  const committeeList = matchedAppointment?.committeeMembers ?? [
    'SOIT Defense Committee',
  ];

  const similarityPct =
    submission?.fileName.match(/(\d+)pct/i)?.[1] ??
    (submission?.studentId.endsWith('32') ? '6' : '8');

  return (
    <AnimatePresence>
      {submission && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-preview-title"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.16 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
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
            className="bg-white border border-stone-300 rounded-xl w-[96vw] max-w-7xl h-[92vh] shadow-2xl overflow-hidden flex flex-col"
          >
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 border-b border-stone-200 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
              <span className="font-semibold text-[#A6192E]">
                {submission.studentName}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{submission.studentId}</span>
              <span aria-hidden="true">·</span>
              <span>{submission.program}</span>
            </div>
            <h2
              id="pdf-preview-title"
              className="text-base sm:text-lg font-semibold text-zinc-900 truncate mt-0.5"
            >
              {documentSpec?.title ?? 'Submitted PDF Document'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {siblingSubmissions.length > 1 && (
              <div className="flex items-center gap-1 mr-1">
                <button
                  type="button"
                  disabled={currentIdx <= 0}
                  onClick={() => {
                    if (currentIdx > 0) {
                      onSelectSubmission(siblingSubmissions[currentIdx - 1]);
                    }
                  }}
                  title="Previous file (←)"
                  aria-label="Previous file in student folder"
                  className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 rounded-md transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono tabular-nums text-zinc-500 px-1 whitespace-nowrap">
                  {currentIdx + 1}/{siblingSubmissions.length}
                </span>
                <button
                  type="button"
                  disabled={currentIdx < 0 || currentIdx >= siblingSubmissions.length - 1}
                  onClick={() => {
                    if (currentIdx >= 0 && currentIdx < siblingSubmissions.length - 1) {
                      onSelectSubmission(siblingSubmissions[currentIdx + 1]);
                    }
                  }}
                  title="Next file (→)"
                  aria-label="Next file in student folder"
                  className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 rounded-md transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close document preview"
              className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split Body: PDF Document Preview + Faculty Review Controls */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Pane: PDF Viewer */}
          <div className="lg:col-span-8 xl:col-span-9 bg-zinc-900 flex flex-col min-h-0 h-full overflow-hidden">
            {/* Viewer Toolbar */}
            <div className="px-4 py-2 bg-zinc-950 text-zinc-200 border-b border-zinc-800 flex items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-[#E5B53B] shrink-0" />
                <span className="font-mono truncate">{submission.fileName}</span>
                <span className="text-zinc-500 hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono tabular-nums text-zinc-400 hidden sm:inline shrink-0">
                  {submission.fileSize}
                </span>
                <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/80">
                  {isDocx
                    ? 'Word Document (.docx)'
                    : isPdf
                    ? 'PDF Interactive View'
                    : isImage
                    ? 'Image Preview'
                    : isText
                    ? 'Text Document'
                    : 'Document'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(!isPdf || !hasLiveDocument) && (
                  <div className="flex items-center gap-1 border-r border-zinc-700 pr-2">
                    <button
                      type="button"
                      disabled={zoomIndex === 0}
                      onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
                      aria-label="Zoom out"
                      className="p-1 text-zinc-300 hover:text-white disabled:opacity-40 rounded"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono tabular-nums text-[11px] w-9 text-center">
                      {zoomPercent}%
                    </span>
                    <button
                      type="button"
                      disabled={zoomIndex === ZOOM_STEPS.length - 1}
                      onClick={() =>
                        setZoomIndex((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))
                      }
                      aria-label="Zoom in"
                      className="p-1 text-zinc-300 hover:text-white disabled:opacity-40 rounded"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {!hasLiveDocument && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous page"
                      className="p-1 text-zinc-300 hover:text-white disabled:opacity-40 rounded"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono tabular-nums text-[11px] whitespace-nowrap">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Next page"
                      className="p-1 text-zinc-300 hover:text-white disabled:opacity-40 rounded"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {liveUrl && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-zinc-100 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded transition-colors whitespace-nowrap"
                    >
                      <span>Open in Tab</span>
                    </a>
                    <a
                      href={liveUrl}
                      download={submission.fileName}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded transition-colors whitespace-nowrap shadow-xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Viewer Viewport: Actual Document Contents */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start">
              {/* 1. Live PDF Viewer */}
              {isPdf && liveUrl ? (
                <iframe
                  src={`${liveUrl}#toolbar=1&navpanes=0&zoom=100`}
                  title={`PDF Preview of ${submission.fileName}`}
                  className="w-full h-full min-h-[600px] bg-white rounded shadow-md border border-zinc-700"
                />
              ) : isDocx && hasLiveDocument ? (
                /* 2. Live Word Document (.docx) Online Viewer */
                docxLoading ? (
                  <div className="flex flex-col items-center justify-center p-12 text-zinc-400 gap-3 my-auto">
                    <Loader2 className="w-8 h-8 animate-spin text-[#E5B53B]" />
                    <p className="text-xs font-medium text-zinc-300">
                      Reading and rendering live Word document preview...
                    </p>
                  </div>
                ) : docxHtml ? (
                  <div
                    style={{
                      transform: `scale(${zoomPercent / 100})`,
                      transformOrigin: 'top center',
                    }}
                    className="w-full max-w-[816px] min-h-[1056px] bg-white text-zinc-900 rounded-sm shadow-2xl border border-stone-300 p-10 sm:p-14 docx-rendered-content transition-transform space-y-4"
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: docxHtml }}
                      className="prose prose-sm max-w-none text-zinc-800"
                    />
                  </div>
                ) : docxError ? (
                  <div className="p-8 text-center text-zinc-300 space-y-3 my-auto">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-sm font-semibold text-white">Word Document Uploaded</p>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto">{docxError}</p>
                    {liveUrl && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <a
                          href={liveUrl}
                          download={submission.fileName}
                          className="px-3 py-1.5 bg-[#A6192E] text-white rounded text-xs font-medium hover:bg-[#881325]"
                        >
                          Download Document
                        </a>
                      </div>
                    )}
                  </div>
                ) : null
              ) : isImage && liveUrl ? (
                /* 3. Live Image Document Viewer */
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src={liveUrl}
                    alt={submission.fileName}
                    style={{
                      transform: `scale(${zoomPercent / 100})`,
                      transformOrigin: 'center center',
                    }}
                    className="max-w-full max-h-[75vh] object-contain rounded shadow-xl transition-transform"
                  />
                </div>
              ) : isText && textContent !== null ? (
                /* 4. Live Text Document Viewer */
                <div
                  style={{
                    transform: `scale(${zoomPercent / 100})`,
                    transformOrigin: 'top center',
                  }}
                  className="w-full max-w-[816px] min-h-[1056px] bg-white text-zinc-900 rounded-sm shadow-2xl border border-stone-300 p-10 sm:p-14 font-mono text-xs whitespace-pre-wrap transition-transform"
                >
                  {textContent}
                </div>
              ) : (
                /* 5. Fallback Simulated Letterhead for Unuploaded Sample Entries */
                <div
                  style={{
                    transform: `scale(${zoomPercent / 100})`,
                    transformOrigin: 'top center',
                  }}
                  className="w-full max-w-[816px] min-h-[1056px] bg-white text-zinc-900 rounded-sm shadow-xl border border-stone-300 p-10 sm:p-14 space-y-6 flex flex-col justify-between transition-transform"
                >
                  {/* Document Letterhead */}
                  <div className="border-b border-stone-300 pb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold tracking-wide text-[#A6192E]">
                        MAPÚA UNIVERSITY
                      </p>
                      <p className="text-xs font-medium text-zinc-700">
                        School of Information Technology (SOIT)
                      </p>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                      {submission.id} · {formatShortDate(submission.uploadedAt)}
                    </span>
                  </div>

                  {/* Template PDF Content by Document Type */}
                  {submission.requirementId === 'req-manuscript' && page === 1 && (
                    <div className="space-y-5">
                      <div className="text-center py-3 space-y-2 border-b border-stone-200">
                        <p className="text-[11px] font-medium text-zinc-500">
                          Final Thesis Manuscript Submission
                        </p>
                        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 leading-snug text-balance">
                          {thesisTitle}
                        </h3>
                        <p className="text-xs text-zinc-700 pt-1">
                          Submitted by{' '}
                          <span className="font-semibold text-zinc-900">
                            {submission.studentName}
                          </span>{' '}
                          (<span className="font-mono tabular-nums">{submission.studentId}</span>)
                        </p>
                        <p className="text-xs text-zinc-500">
                          {submission.program} · Primary Adviser: {advisorName}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-zinc-900">Abstract</p>
                        <p className="text-xs text-zinc-700 leading-relaxed">
                          {thesisAbstract}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-stone-200 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[11px] text-zinc-500">Defense Committee</p>
                          <p className="font-medium text-zinc-800 mt-0.5">
                            {committeeList.join(', ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-zinc-500">Program Modality</p>
                          <p className="font-medium text-zinc-800 mt-0.5">
                            Mapúa UOx · Fully Online
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {submission.requirementId === 'req-manuscript' && page === 2 && (
                    <div className="space-y-4 text-xs">
                      <div>
                        <p className="font-semibold text-zinc-900 text-sm">
                          Table of Contents & Chapter Verification
                        </p>
                        <p className="text-zinc-500 mt-0.5">
                          Formatted manuscript preview ({submission.fileSize})
                        </p>
                      </div>

                      <div className="divide-y divide-stone-200 border-y border-stone-200">
                        {[
                          ['Chapter 1', 'Introduction, Problem Statement & Objectives', 'pp. 1–14'],
                          ['Chapter 2', 'Review of Related Literature & Systems', 'pp. 15–32'],
                          ['Chapter 3', 'System Architecture & Research Methodology', 'pp. 33–54'],
                          ['Chapter 4', 'Experimental Results & Latency Benchmarks', 'pp. 55–79'],
                          ['Chapter 5', 'Conclusions, Limitations & Future Work', 'pp. 80–91'],
                        ].map(([ch, label, pages]) => (
                          <div
                            key={ch}
                            className="py-2 flex items-center justify-between gap-3"
                          >
                            <div>
                              <span className="font-semibold text-zinc-900">{ch}:</span>{' '}
                              <span className="text-zinc-700">{label}</span>
                            </div>
                            <span className="font-mono tabular-nums text-zinc-500 shrink-0">
                              {pages}
                            </span>
                          </div>
                        ))}
                      </div>

                      <p className="text-zinc-600 leading-relaxed">
                        Appendices include benchmark configuration scripts, dataset schema
                        validation logs, and signed ethics clearance records required for SOIT
                        committee evaluation.
                      </p>
                    </div>
                  )}

                  {submission.requirementId === 'req-endorsement' && (
                    <div className="space-y-4 text-xs">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          Adviser Endorsement & Pre-Defense Routing Form
                        </p>
                        <p className="text-zinc-500 mt-0.5">
                          Official readiness certification for oral defense scheduling
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-stone-50 border border-stone-200 rounded-md p-3.5">
                        <div>
                          <p className="text-[11px] text-zinc-500">Candidate</p>
                          <p className="font-semibold text-zinc-900 mt-0.5">
                            {submission.studentName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-zinc-500">Student Number</p>
                          <p className="font-mono tabular-nums font-medium text-zinc-900 mt-0.5">
                            {submission.studentId}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] text-zinc-500">Approved Thesis Title</p>
                          <p className="font-medium text-zinc-900 mt-0.5">{thesisTitle}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="font-semibold text-zinc-900">Endorsement Checklist</p>
                        <ul className="space-y-1.5 text-zinc-700">
                          <li>✓ All Chapters 1–5 reviewed and cleared by Primary Adviser</li>
                          <li>✓ Prototype / empirical evaluation verified reproducible</li>
                          <li>✓ Three-member SOIT defense panel roster confirmed</li>
                        </ul>
                      </div>

                      <div className="pt-4 border-t border-stone-200 grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-zinc-900">{advisorName}</p>
                          <p className="text-[11px] text-zinc-500">
                            Primary Thesis Adviser · Endorsed {formatShortDate(submission.uploadedAt)}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">
                            {submission.reviewedBy ?? 'Pending Coordinator Sign-off'}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            SOIT Thesis Coordinator
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {submission.requirementId === 'req-originality' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">
                            Originality & Similarity Clearance Report
                          </p>
                          <p className="text-zinc-500 mt-0.5">
                            Turnitin Institutional Repository Check · SOIT Policy (≤ 15%)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
                            {similarityPct}%
                          </p>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            Within Threshold
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 bg-stone-50 border border-stone-200 rounded-md p-3.5 text-center">
                        <div>
                          <p className="font-mono tabular-nums text-base font-semibold text-zinc-900">
                            {Math.max(2, Number(similarityPct) - 4)}%
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Internet Sources</p>
                        </div>
                        <div>
                          <p className="font-mono tabular-nums text-base font-semibold text-zinc-900">
                            3%
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Publications</p>
                        </div>
                        <div>
                          <p className="font-mono tabular-nums text-base font-semibold text-zinc-900">
                            1%
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Student Papers</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-zinc-700">
                        <p>
                          <span className="font-semibold text-zinc-900">Manuscript:</span>{' '}
                          {thesisTitle}
                        </p>
                        <p>
                          <span className="font-semibold text-zinc-900">Candidate:</span>{' '}
                          {submission.studentName} ({submission.studentId})
                        </p>
                        <p className="text-zinc-500">
                          Bibliography, quoted equations, and standard SOIT template headers
                          excluded per university guidelines.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Page Footer */}
                  <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[11px] text-zinc-400 font-mono tabular-nums">
                    <span>ThesisDesk · SOIT Document Preview</span>
                    <span>
                      Page {page} of {totalPages}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Review Metadata & Approval Controls */}
          <div className="lg:col-span-4 xl:col-span-3 bg-white border-t lg:border-t-0 lg:border-l border-stone-200 p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-200">
                <span className="text-xs font-medium text-zinc-500">Review Status</span>
                <FileStatusLabel status={submission.status} />
              </div>

              <dl className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">Uploaded</dt>
                  <dd className="font-mono tabular-nums text-zinc-900">
                    {formatShortDate(submission.uploadedAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">File Size</dt>
                  <dd className="font-mono tabular-nums text-zinc-900">
                    {submission.fileSize}
                  </dd>
                </div>
                {submission.reviewedBy && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-zinc-500">Last Reviewed</dt>
                    <dd className="text-zinc-900 text-right">
                      {submission.reviewedBy}
                      {submission.reviewedAt
                        ? ` · ${formatShortDate(submission.reviewedAt)}`
                        : ''}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="pt-2">
                <label
                  htmlFor="faculty-pdf-note"
                  className="block text-xs font-medium text-zinc-700 mb-1.5"
                >
                  Professor Remarks / Feedback
                </label>
                {readOnly ? (
                  <p className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-lg text-zinc-700 min-h-[84px]">
                    {submission.facultyNote ||
                      (archiveLabel
                        ? 'No remarks recorded for this archived document.'
                        : 'No faculty remarks recorded yet.')}
                  </p>
                ) : (
                  <textarea
                    id="faculty-pdf-note"
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Enter verification notes or revision instructions for the student..."
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                  />
                )}
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-stone-200 space-y-2">
              {readOnly ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-zinc-500">
                    {readOnlyHint ??
                      `Archived read-only record${archiveLabel ? ` (${archiveLabel})` : ''}.`}
                  </p>
                  {onResubmit && (
                    <>
                      <input
                        ref={resubmitInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && submission) {
                            const isPdf =
                              file.type === 'application/pdf' ||
                              file.name.toLowerCase().endsWith('.pdf');
                            if (!isPdf) {
                              alert('Only PDF documents (.pdf) are accepted for thesis defense submissions.');
                              e.target.value = '';
                              return;
                            }
                            onResubmit(submission.requirementId, file);
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                        aria-label="Upload document revision"
                      />
                      <button
                        type="button"
                        onClick={() => resubmitInputRef.current?.click()}
                        className="w-full py-2.5 px-4 text-xs sm:text-sm font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-lg transition-colors whitespace-nowrap inline-flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        <span>Resubmit Document</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 px-4 text-xs sm:text-sm font-medium text-zinc-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Close Preview
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onReview?.(
                        submission.id,
                        'Approved',
                        note.trim() || 'Verified and approved by faculty.'
                      );
                      onClose();
                    }}
                    className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#A6192E] hover:bg-[#881325] rounded-lg transition-colors whitespace-nowrap"
                  >
                    Approve Document
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onReview?.(
                        submission.id,
                        'Revision Requested',
                        note.trim() ||
                          'Please review SOIT formatting requirements and re-upload.'
                      );
                      onClose();
                    }}
                    className="w-full py-2 px-4 text-xs sm:text-sm font-medium text-[#A6192E] bg-[#A6192E]/10 hover:bg-[#A6192E]/15 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Request Revision
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
