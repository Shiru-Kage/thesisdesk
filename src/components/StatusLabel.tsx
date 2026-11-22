import { AlertCircle, CheckCircle2, Clock, FileCheck2, XCircle } from 'lucide-react';
import { AppointmentStatus } from '../types/defense';

interface StatusLabelProps {
  status: AppointmentStatus;
}

export function StatusLabel({ status }: StatusLabelProps) {
  switch (status) {
    case 'Confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Confirmed</span>
        </span>
      );
    case 'Pending Review':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9A6E00] whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Pending Review</span>
        </span>
      );
    case 'Reschedule Requested':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A6192E] whitespace-nowrap shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Reschedule Requested</span>
        </span>
      );
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 whitespace-nowrap shrink-0">
          <FileCheck2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Completed</span>
        </span>
      );
    case 'Cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 whitespace-nowrap shrink-0">
          <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Cancelled</span>
        </span>
      );
  }
}
