import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Camera, Trash2, User, X, Check } from 'lucide-react';
import { UserAccount } from '../types/defense';

interface ProfileModalProps {
  isOpen: boolean;
  user: UserAccount;
  onClose: () => void;
  onSave: (updatedData: {
    name: string;
    studentId?: string;
    avatarUrl: string;
    department: string;
    program?: string;
  }) => void;
}

export function ProfileModal({
  isOpen,
  user,
  onClose,
  onSave,
}: ProfileModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [studentId, setStudentId] = useState(user.studentId ?? '');
  const [department, setDepartment] = useState(user.department);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setStudentId(user.studentId ?? '');
      setDepartment(user.department);
      setAvatarUrl(user.avatarUrl ?? '');
      setErrorMsg('');
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const initials = (name.trim() || user.name)
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 5 MB.');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Please enter a valid full name.');
      return;
    }

    const trimmedStudentId = studentId.trim();
    const updatedProgram =
      user.role === 'student'
        ? `B.S. ${department} · Mapúa UOx`
        : undefined;

    onSave({
      name: trimmedName,
      studentId: user.role === 'student' ? trimmedStudentId : undefined,
      avatarUrl: avatarUrl.trim(),
      department,
      program: updatedProgram,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.16 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
            className="w-full max-w-md bg-white text-zinc-900 rounded-2xl shadow-2xl border border-stone-300 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#A6192E]/10 flex items-center justify-center text-[#A6192E]">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 id="profile-modal-title" className="text-base font-semibold text-zinc-900 leading-tight">
                    Edit Profile
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {user.role === 'student' ? 'Student Account' : 'Coordinator Account'} · {user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile modal"
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-stone-200/60 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800">
                  {errorMsg}
                </div>
              )}

              {/* Profile Picture Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-stone-50/75 border border-stone-200/80">
                <div className="relative group shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#A6192E] text-white text-xl font-bold flex items-center justify-center shadow-md">
                      {initials}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    aria-label="Upload profile image"
                  />
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">Profile Picture</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {avatarUrl
                        ? 'Custom photo active'
                        : 'Default removed · Displaying official initials avatar'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1.5 px-3 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-zinc-800 inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#A6192E]" />
                      <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200/80 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="profile-name" className="block text-xs font-semibold text-zinc-800 mb-1">
                    Full Name <span className="text-[#A6192E]">*</span>
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                    required
                  />
                </div>

                {user.role === 'student' && (
                  <div>
                    <label htmlFor="profile-student-id" className="block text-xs font-semibold text-zinc-800 mb-1">
                      Student Number
                    </label>
                    <input
                      id="profile-student-id"
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. 2026100001"
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border border-stone-300 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="profile-dept" className="block text-xs font-semibold text-zinc-800 mb-1">
                    Department / Academic Track
                  </label>
                  <select
                    id="profile-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#A6192E]"
                  >
                    <option value="Information Technology">Information Technology</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Information Systems">Information Systems</option>
                    {user.role === 'admin' && (
                      <option value="School of Information Technology · UOx">
                        School of Information Technology · UOx
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-stone-200/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4.5 bg-[#A6192E] hover:bg-[#881325] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
