import { useState, useMemo, FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { Announcement, AnnouncementPriority, UserAccount } from '../types/defense';
import { ToastTone } from './ToastNotification';

interface AdminAnnouncementsViewProps {
  user: UserAccount;
  announcements: Announcement[];
  onCreateAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt'>) => void;
  onUpdateAnnouncement: (announcement: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onNotify: (message: string, tone?: ToastTone) => void;
}

const CATEGORY_PRESETS = [
  'General',
  'Defense Schedule',
  'Submission Deadline',
  'Panel Guidelines',
  'Graduation Clearance',
];

export function AdminAnnouncementsView({
  user,
  announcements,
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onNotify,
}: AdminAnnouncementsViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const set = new Set<string>(CATEGORY_PRESETS);
    announcements.forEach((a) => {
      if (a.category && a.category.trim()) {
        set.add(a.category.trim());
      }
    });
    return Array.from(set);
  }, [announcements]);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Defense Schedule');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('normal');
  const [formPinned, setFormPinned] = useState(false);
  const [formContent, setFormContent] = useState('');

  const openCreateModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormCategory('Defense Schedule');
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setFormPriority('normal');
    setFormPinned(false);
    setFormContent('');
    setModalOpen(true);
  };

  const openEditModal = (item: Announcement) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setFormPriority(item.priority);
    setFormPinned(Boolean(item.pinned));
    setFormContent(item.content);
    setModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      onNotify('Please enter an announcement title.', 'warning');
      return;
    }
    if (!formContent.trim()) {
      onNotify('Please enter the announcement content.', 'warning');
      return;
    }

    const finalCategory = (
      isCustomCategory ? customCategoryInput.trim() : formCategory.trim()
    ) || 'General';

    if (isCustomCategory && !customCategoryInput.trim()) {
      onNotify('Please enter a name for the new category tag.', 'warning');
      return;
    }

    if (editingItem) {
      const updated: Announcement = {
        ...editingItem,
        title: formTitle.trim(),
        category: finalCategory,
        priority: formPriority,
        pinned: formPinned,
        content: formContent.trim(),
      };
      onUpdateAnnouncement(updated);
      onNotify(`Updated announcement: "${updated.title}"`, 'success');
    } else {
      onCreateAnnouncement({
        title: formTitle.trim(),
        category: finalCategory,
        priority: formPriority,
        pinned: formPinned,
        content: formContent.trim(),
        authorName: user.name,
        authorRole: 'SOIT Thesis Coordinator',
        authorEmail: user.email,
      });
      onNotify(`Posted announcement: "${formTitle.trim()}"`, 'success');
    }

    setModalOpen(false);
  };

  const handleTogglePin = (item: Announcement) => {
    const updated: Announcement = { ...item, pinned: !item.pinned };
    onUpdateAnnouncement(updated);
    onNotify(
      item.pinned
        ? `Unpinned "${item.title}"`
        : `Pinned "${item.title}" to top of bulletins.`,
      'info'
    );
  };

  const handleDelete = (id: string, title: string) => {
    onDeleteAnnouncement(id);
    setDeleteConfirmId(null);
    onNotify(`Deleted announcement: "${title}"`, 'info');
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    announcements.forEach((a) => set.add(a.category));
    return ['All', ...Array.from(set)];
  }, [announcements]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: announcements.length };
    announcements.forEach((a) => {
      if (a.category) {
        counts[a.category] = (counts[a.category] || 0) + 1;
      }
    });
    return counts;
  }, [announcements]);

  const pinnedCount = useMemo(
    () => announcements.filter((a) => a.pinned).length,
    [announcements]
  );

  const urgentCount = useMemo(
    () => announcements.filter((a) => a.priority === 'urgent').length,
    [announcements]
  );

  const filteredAnnouncements = useMemo(() => {
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
          return b.pinned ? 1 : -1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [announcements, searchQuery, selectedCategory]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Main Grid: Responsive 8:4 layout on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Primary Column (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/70 backdrop-blur-md p-3 rounded-xl border border-stone-300/70 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search announcements by title, keyword, or faculty..."
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

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#A6192E] hover:bg-[#881325] text-white text-xs font-medium rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Bulletin</span>
            </button>
          </div>

          {/* Announcements List */}
          <div className="space-y-4">
            {filteredAnnouncements.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white/50 backdrop-blur-xs border border-stone-300/60 rounded-xl">
                <Megaphone className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-zinc-800">No announcements found</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || selectedCategory !== 'All'
                    ? 'Try adjusting your search terms or filter selection.'
                    : 'Click "Post New Announcement" to publish your first notice for students.'}
                </p>
                {(searchQuery || selectedCategory !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold text-[#A6192E] hover:underline cursor-pointer"
                  >
                    Clear active search & filters
                  </button>
                )}
              </div>
            ) : (
              filteredAnnouncements.map((item) => {
                const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                });

                return (
                  <motion.article
                    key={item.id}
                    layout
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`bg-white/85 backdrop-blur-md rounded-xl border p-5 shadow-xs transition-shadow hover:shadow-md ${
                      item.pinned
                        ? 'border-[#A6192E]/40 ring-1 ring-[#A6192E]/15'
                        : 'border-stone-300/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {/* Header Badges */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {item.pinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#A6192E] text-white">
                              <Pin className="w-3 h-3" /> Pinned
                            </span>
                          )}

                          {item.priority === 'urgent' ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Urgent
                            </span>
                          ) : item.priority === 'important' ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              Important
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                              Notice
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-zinc-700 border border-stone-200">
                            <Tag className="w-3 h-3 text-zinc-400" />
                            {item.category}
                          </span>
                        </div>

                        <h2 className="text-base sm:text-lg font-semibold text-zinc-950 tracking-tight">
                          {item.title}
                        </h2>

                        <p className="text-xs text-zinc-500 mt-1">
                          Posted by <span className="font-medium text-zinc-700">{item.authorName}</span>{' '}
                          ({item.authorRole}) · {formattedDate}
                        </p>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(item)}
                          title={item.pinned ? 'Unpin from top' : 'Pin to top'}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            item.pinned
                              ? 'bg-[#A6192E]/10 border-[#A6192E]/30 text-[#A6192E]'
                              : 'bg-white hover:bg-stone-100 border-stone-300 text-zinc-600'
                          }`}
                        >
                          {item.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="Edit announcement"
                          className="p-1.5 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-zinc-600 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {deleteConfirmId === item.id ? (
                          <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.title)}
                              className="px-2 py-1 text-[11px] font-semibold bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1 text-zinc-500 hover:text-zinc-700 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            title="Delete announcement"
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-stone-300 hover:border-rose-300 text-zinc-600 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Announcement Content */}
                    <div className="mt-3 pt-3 border-t border-stone-200/80 text-xs sm:text-sm text-zinc-800 leading-relaxed whitespace-pre-line">
                      {item.content}
                    </div>
                  </motion.article>
                );
              })
            )}
          </div>
        </div>

        {/* Right / Context Rail (4 cols on desktop, stacks below on mobile) */}
        <aside className="lg:col-span-4 space-y-5">
          {/* 1. Announcements Overview Stats Card */}
          <div className="bg-white/80 backdrop-blur-md border border-stone-300/70 rounded-xl p-5 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center justify-between">
              <span>Bulletin Overview</span>
              <span className="text-[11px] font-mono font-medium text-[#A6192E]">
                {announcements.length} Published
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-stone-50 border border-stone-200/70 rounded-lg p-2.5">
                <p className="text-xs font-medium text-zinc-500">Pinned</p>
                <p className="text-lg font-semibold font-mono text-zinc-900 mt-0.5">
                  {pinnedCount}
                </p>
              </div>
              <div className="bg-rose-50/50 border border-rose-200/60 rounded-lg p-2.5">
                <p className="text-xs font-medium text-rose-700">Urgent</p>
                <p className="text-lg font-semibold font-mono text-rose-900 mt-0.5">
                  {urgentCount}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Pinned notices are anchored at the top of candidate feeds and highlighted in the student pre-login bulletin ticker.
            </p>
          </div>

          {/* 2. Publishing Protocol & Faculty Standards */}
          <div className="bg-white/80 backdrop-blur-md border border-stone-300/70 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-stone-200/80">
              <span className="p-1 rounded-md bg-[#9A6E00]/10 text-[#9A6E00]">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                Publishing Protocol
              </h3>
            </div>
            <ul className="text-xs text-zinc-600 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#A6192E] font-bold">·</span>
                <span>All announcements are automatically published to both student dashboards and the institutional login gateway.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#A6192E] font-bold">·</span>
                <span>Schedule amendments within 48 hours of an assigned oral defense time require coordinator notice.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#A6192E] font-bold">·</span>
                <span>Turnitin similarity clearances require at least 72 hours advance verification before panel review.</span>
              </li>
            </ul>
          </div>

          {/* 3. Category Distribution */}
          <div className="bg-white/80 backdrop-blur-md border border-stone-300/70 rounded-xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center justify-between">
              <span>Category Distribution</span>
              <span className="text-[11px] font-normal text-zinc-500 font-mono">
                {categories.length - 1} categories
              </span>
            </h3>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categories.map((cat) => {
                const count = categoryCounts[cat] || 0;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#A6192E] text-white shadow-2xs'
                        : 'bg-stone-100 hover:bg-stone-200/70 text-zinc-700 border border-stone-300/60'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] font-mono px-1 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-zinc-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false);
            }}
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.18 }}
              className="bg-white border border-stone-300 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8 relative"
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-200">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">
                    {editingItem ? 'Edit Announcement' : 'Post New Announcement'}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {editingItem
                      ? 'Update notice information and publish revised details.'
                      : 'Create an official notice displayed to students and on the login page.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Announcement Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., 1Q2627 Final Defense Scheduling Window Now Open"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#A6192E] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-zinc-700">
                        Category / Topic
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory((prev) => !prev);
                          if (!isCustomCategory) {
                            setCustomCategoryInput('');
                          }
                        }}
                        className="text-[11px] font-medium text-[#881325] hover:text-[#6B0F1D] hover:underline cursor-pointer"
                      >
                        {isCustomCategory ? '← Choose Existing Tag' : '+ New Custom Tag'}
                      </button>
                    </div>

                    {!isCustomCategory ? (
                      <select
                        value={formCategory}
                        onChange={(e) => {
                          if (e.target.value === '__CUSTOM__') {
                            setIsCustomCategory(true);
                            setCustomCategoryInput('');
                          } else {
                            setFormCategory(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#A6192E] focus:bg-white cursor-pointer"
                      >
                        <optgroup label="Select Existing Tag">
                          {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </optgroup>
                        <option value="__CUSTOM__" className="font-semibold text-[#A6192E]">
                          + Add new custom topic / tag...
                        </option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        autoFocus
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        placeholder="Type new topic or tag name..."
                        className="w-full px-3 py-2 text-xs bg-stone-50 border border-[#A6192E] rounded-lg text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#A6192E] focus:bg-white"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Urgency / Priority
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                      className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#A6192E] focus:bg-white"
                    >
                      <option value="normal">Normal (Standard Bulletin)</option>
                      <option value="important">Important (Mapúa Gold)</option>
                      <option value="urgent">Urgent (Cardinal Red Alert)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Bulletin Content *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Provide full instructions, guidelines, deadlines, or requirements for candidates..."
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#A6192E] focus:bg-white leading-relaxed resize-y"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="pin-checkbox"
                    checked={formPinned}
                    onChange={(e) => setFormPinned(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-[#A6192E] focus:ring-[#A6192E]"
                  />
                  <label htmlFor="pin-checkbox" className="text-xs text-zinc-800 select-none">
                    Pin this notice to the top of all bulletins
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-medium text-zinc-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#A6192E] hover:bg-[#881325] rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    {editingItem ? 'Save Changes' : 'Publish Announcement'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
