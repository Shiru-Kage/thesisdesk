import { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CalendarDays,
  Clock,
  Megaphone,
  Pin,
  Search,
  Tag,
  User,
} from 'lucide-react';
import { Announcement } from '../types/defense';

interface StudentAnnouncementsViewProps {
  announcements: Announcement[];
}

export function StudentAnnouncementsView({ announcements }: StudentAnnouncementsViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    announcements.forEach((a) => set.add(a.category));
    return ['All', ...Array.from(set)];
  }, [announcements]);

  const sortedAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return announcements
      .filter((item) => {
        if (selectedCategory !== 'All' && item.category !== selectedCategory) {
          return false;
        }
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.authorName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (Boolean(b.pinned) !== Boolean(a.pinned)) {
          return b.pinned ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [announcements, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="pb-4 border-b border-stone-300/60">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[#A6192E]/10 text-[#A6192E]">
            <Megaphone className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
            Official Announcements & Bulletins
          </h1>
        </div>
        <p className="text-xs text-zinc-600 mt-1">
          Stay informed with important updates regarding defense schedules, manuscript clearances,
          faculty guidelines, and graduation requirements from the School of Information Technology.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/70 backdrop-blur-md p-3 rounded-xl border border-stone-300/70 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bulletins by title, keyword, or faculty..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-100/80 border border-stone-300/70 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#A6192E] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#A6192E] text-white shadow-2xs'
                  : 'bg-stone-200/60 hover:bg-stone-200 text-zinc-700 border border-stone-300/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements Stream */}
      <div className="space-y-4">
        {sortedAnnouncements.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white/50 backdrop-blur-xs border border-stone-300/60 rounded-xl">
            <Megaphone className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-800">No announcements match your filter</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Please check back soon or clear your search to view all bulletins from the faculty.
            </p>
          </div>
        ) : (
          sortedAnnouncements.map((item) => {
            const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = new Date(item.createdAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            return (
              <motion.article
                key={item.id}
                layout
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white/85 backdrop-blur-md rounded-xl border p-5 shadow-xs transition-shadow hover:shadow-md ${
                  item.pinned
                    ? 'border-[#A6192E]/40 ring-1 ring-[#A6192E]/20 bg-gradient-to-r from-white via-white to-rose-50/20'
                    : 'border-stone-300/70'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {item.pinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#A6192E] text-white shadow-2xs">
                      <Pin className="w-3 h-3" /> Pinned Bulletin
                    </span>
                  )}

                  {item.priority === 'urgent' ? (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      Urgent Notice
                    </span>
                  ) : item.priority === 'important' ? (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      Important
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                      General Bulletin
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-zinc-700 border border-stone-200">
                    <Tag className="w-3 h-3 text-zinc-400" />
                    {item.category}
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-semibold text-zinc-950 tracking-tight leading-snug">
                  {item.title}
                </h2>

                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-zinc-600 font-medium">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    {item.authorName} ({item.authorRole})
                  </span>
                  <span className="text-zinc-300" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                    {formattedDate} at {formattedTime}
                  </span>
                </div>

                <div className="mt-3.5 pt-3.5 border-t border-stone-200/80 text-xs sm:text-sm text-zinc-800 leading-relaxed whitespace-pre-line">
                  {item.content}
                </div>
              </motion.article>
            );
          })
        )}
      </div>
    </div>
  );
}
