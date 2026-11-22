import { AlertCircle, CheckCircle2, Clock, Upload } from 'lucide-react';
import { FileReviewStatus } from '../types/defense';

interface FileStatusLabelProps {
  status: FileReviewStatus | 'Not Submitted';
}

export function FileStatusLabel({ status }: FileStatusLabelProps) {
  switch (status) {
    case 'Approved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Approved</span>
        </span>
      );
    case 'Pending Review':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9A6E00] whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Pending Approval</span>
        </span>
      );
    case 'Revision Requested':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A6192E] whitespace-nowrap shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Revision Requested</span>
        </span>
      );
    case 'Not Submitted':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 whitespace-nowrap shrink-0">
          <Upload className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Not Submitted</span>
        </span>
      );
  }
}
