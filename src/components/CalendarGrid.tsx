import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthYear, toIsoDate } from '../utils/dateUtils';

interface DaySlotSummary {
  total: number;
  open: number;
  booked: number;
}

interface CalendarGridProps {
  year: number;
  monthIndex: number;
  selectedDate: string;
  onSelectDate: (isoDate: string) => void;
  onChangeMonth: (delta: number) => void;
  onJumpToday: () => void;
  onJumpNextOpen?: () => void;
  hasNextOpen?: boolean;
  slotSummaryByDate: Record<string, DaySlotSummary>;
  todayIso: string;
  showBookedCount?: boolean;
  disablePastDates?: boolean;
  highlightedDates?: Set<string>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarGrid({
  year,
  monthIndex,
  selectedDate,
  onSelectDate,
  onChangeMonth,
  onJumpToday,
  onJumpNextOpen,
  hasNextOpen = false,
  slotSummaryByDate,
  todayIso,
  showBookedCount = false,
  disablePastDates = false,
  highlightedDates,
}: CalendarGridProps) {
  const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: Array<{ day: number | null; iso: string | null; isWeekend: boolean }> = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ day: null, iso: null, isWeekend: i === 0 || i === 6 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const col = (firstDayOfMonth + d - 1) % 7;
    cells.push({ day: d, iso: toIsoDate(year, monthIndex, d), isWeekend: col === 0 || col === 6 });
  }
  while (cells.length % 7 !== 0) {
    const col = cells.length % 7;
    cells.push({ day: null, iso: null, isWeekend: col === 0 || col === 6 });
  }

  return (
    <div className="bg-white/65 backdrop-blur-md border border-stone-300/70 rounded-xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(24,24,27,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold text-zinc-900 tracking-tight">
          {formatMonthYear(year, monthIndex)}
        </h3>
        <div className="flex items-center gap-1.5">
          {onJumpNextOpen && (
            <button
              type="button"
              disabled={!hasNextOpen}
              onClick={onJumpNextOpen}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E] ${
                hasNextOpen
                  ? 'text-[#A6192E] bg-[#A6192E]/8 hover:bg-[#A6192E]/14 border-[#A6192E]/25'
                  : 'text-zinc-400 bg-stone-900/[0.03] border-stone-200 cursor-not-allowed'
              }`}
            >
              Next Open
            </button>
          )}
          <button
            type="button"
            onClick={onJumpToday}
            className="px-2.5 py-1.5 text-xs font-medium text-zinc-800 bg-stone-900/[0.05] hover:bg-stone-900/[0.09] border border-stone-300/60 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onChangeMonth(-1)}
            aria-label="Previous month"
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-stone-900/[0.06] rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onChangeMonth(1)}
            aria-label="Next month"
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-stone-900/[0.06] rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-1.5 text-center text-xs font-medium text-zinc-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell.day || !cell.iso) {
            return <div key={`empty-${idx}`} className="min-h-[52px] sm:min-h-[64px]" />;
          }

          const summary = slotSummaryByDate[cell.iso];
          const isSelected = cell.iso === selectedDate;
          const isToday = cell.iso === todayIso;
          const isPast = cell.iso < todayIso;
          const isHighlighted = Boolean(highlightedDates?.has(cell.iso));
          const isDisabled = disablePastDates && isPast && !isHighlighted;
          const hasOpen = summary && summary.open > 0;
          const hasAny = summary && summary.total > 0;

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectDate(cell.iso!)}
              className={`min-h-[52px] sm:min-h-[64px] p-1.5 sm:p-2 rounded-lg border text-left flex flex-col justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E] ${
                isSelected
                  ? 'border-[#A6192E] bg-[#A6192E]/10 text-zinc-900'
                  : isDisabled
                  ? 'border-transparent bg-stone-900/[0.025] text-zinc-300 cursor-not-allowed'
                  : isHighlighted
                  ? 'border-[#C99700]/75 bg-[#E5A91A]/12 text-zinc-900 hover:bg-[#E5A91A]/18'
                  : isPast
                  ? 'border-transparent bg-stone-900/[0.03] text-zinc-400 hover:bg-stone-900/[0.06]'
                  : cell.isWeekend
                  ? 'border-stone-300/35 bg-stone-900/[0.02] text-zinc-600 hover:border-stone-400/60 hover:bg-white/75'
                  : 'border-stone-300/50 bg-white/55 text-zinc-800 hover:border-stone-400/70 hover:bg-white/85'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs sm:text-sm font-mono tabular-nums ${
                    isSelected
                      ? 'font-semibold text-[#A6192E]'
                      : isToday
                      ? 'font-semibold text-[#9A6E00] underline underline-offset-4 decoration-[#C99700]'
                      : isHighlighted
                      ? 'font-semibold text-[#9A6E00]'
                      : 'font-medium'
                  }`}
                >
                  {cell.day}
                </span>
              </div>

              <div className="mt-1">
                {isHighlighted ? (
                  <span className="block text-[11px] font-semibold text-[#9A6E00] leading-tight truncate">
                    Your slot
                  </span>
                ) : hasOpen && !isDisabled ? (
                  <span className="block text-[11px] font-medium text-[#A6192E] tabular-nums leading-tight truncate">
                    {summary.open} open
                  </span>
                ) : showBookedCount && hasAny ? (
                  <span className="block text-[11px] font-medium text-zinc-500 tabular-nums leading-tight truncate">
                    {summary.booked} booked
                  </span>
                ) : hasAny && !isDisabled ? (
                  <span className="block text-[11px] text-zinc-400 leading-tight truncate">
                    Full
                  </span>
                ) : (
                  <span className="block text-[11px] text-transparent select-none" aria-hidden="true">
                    0
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-stone-300/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
        <span>Cardinal count marks open windows</span>
        <span aria-hidden="true">·</span>
        <span>Gold underline marks today</span>
        {highlightedDates && highlightedDates.size > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-[#9A6E00] font-medium">Gold border marks your booked date</span>
          </>
        )}
      </div>
    </div>
  );
}
