import { useMemo, useState, FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  UserCheck,
} from 'lucide-react';
import {
  DefenseAppointment,
  DefenseSlot,
  QuartermPeriod,
  UserAccount,
  UserRole,
  ZoomRoom,
} from '../types/defense';
import { DEMO_USERS } from '../data/mockTemplateData';

interface LoginViewProps {
  slots: DefenseSlot[];
  appointments: DefenseAppointment[];
  zoomRooms: ZoomRoom[];
  activeQuarter: QuartermPeriod | null;
  registeredUsers?: UserAccount[];
  onLogin: (user: UserAccount, pendingSlot?: DefenseSlot | null) => void;
  onRegister?: (user: UserAccount) => void;
}

export function LoginView({
  slots,
  appointments,
  zoomRooms,
  activeQuarter,
  registeredUsers = [],
  onLogin,
  onRegister,
}: LoginViewProps) {
  const prefersReducedMotion = useReducedMotion();

  const [role, setRole] = useState<UserRole>('student');
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'forgot'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(DEMO_USERS.student.email);
  const [password, setPassword] = useState('••••••••••••');
  const [department, setDepartment] = useState('Information Technology');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [expandedNoticeId, setExpandedNoticeId] = useState<string>('notice-window');

  const quarterCodeLabel = activeQuarter ? activeQuarter.code : 'Upcoming Quarterm';

  const announcements = [
    {
      id: 'notice-window',
      title: `${quarterCodeLabel} SOIT UOx Online Defense Scheduling`,
      date: activeQuarter
        ? `${activeQuarter.label} · ${activeQuarter.status}`
        : 'Awaiting Quarterm Opening',
      summary:
        'Mapúa UOx online students may reserve 90-minute Zoom oral defense slots once required thesis files are approved by faculty.',
      detail:
        'All defenses are conducted fully online via Zoom. Official Zoom meeting links and passcodes are assigned by the SOIT Coordinator inside your appointment details.',
    },
    {
      id: 'notice-manuscript',
      title: 'Final Manuscript & Turnitin Clearance Deadline',
      date: 'Due 72 hours prior to defense',
      summary:
        'Submit your PDF manuscript draft and originality clearance reference inside the portal prior to committee review.',
      detail:
        'Coordinator approval requires a verified adviser sign-off and complete three-member defense panel roster.',
    },
    {
      id: 'notice-policy',
      title: 'Panel Quorum & Reschedule Protocol',
      date: 'SOIT Thesis Coordination Office',
      summary:
        'Schedule adjustments within 48 hours of an assigned defense time require coordinator approval.',
      detail:
        'Students may submit a single-click reschedule request with a proposed alternative slot directly from My Appointments.',
    },
  ];

  const openSlotCount = useMemo(() => {
    const booked = new Set(
      appointments.filter((a) => a.status !== 'Cancelled').map((a) => a.slotId)
    );
    return slots.filter((s) => !s.isBlocked && !booked.has(s.id)).length;
  }, [slots, appointments]);

  const pendingReviewCount = useMemo(
    () =>
      appointments.filter(
        (a) => a.status === 'Pending Review' || a.status === 'Reschedule Requested'
      ).length,
    [appointments]
  );

  const handleRoleSwitch = (nextRole: UserRole) => {
    setRole(nextRole);
    setErrorMsg('');
    if (authMode === 'signin') {
      setEmail(nextRole === 'student' ? DEMO_USERS.student.email : DEMO_USERS.admin.email);
      setPassword('••••••••••••');
    }
  };

  const handleModeChange = (nextMode: 'signin' | 'register' | 'forgot') => {
    setAuthMode(nextMode);
    setErrorMsg('');
    setResetSent(false);
    if (nextMode === 'signin') {
      setEmail(role === 'student' ? DEMO_USERS.student.email : DEMO_USERS.admin.email);
      setPassword('••••••••••••');
    } else if (nextMode === 'register') {
      setEmail('');
      setPassword('');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid institutional email address.');
      return;
    }

    if (authMode === 'forgot') {
      setResetSent(true);
      return;
    }

    if (password.trim().length < 6) {
      setErrorMsg('Password must contain at least 6 characters.');
      return;
    }

    if (authMode === 'register' && name.trim().length < 2) {
      setErrorMsg('Please enter your full name to create an account.');
      return;
    }

    if (authMode === 'register') {
      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        name: name.trim(),
        email: trimmedEmail,
        role,
        department,
        studentId: role === 'student' ? `2026${Math.floor(100000 + Math.random() * 900000)}` : undefined,
        program: role === 'student' ? `B.S. ${department} · Mapúa UOx` : undefined,
        avatarUrl:
          role === 'student'
            ? DEMO_USERS.student.avatarUrl
            : DEMO_USERS.admin.avatarUrl,
      };
      if (onRegister) {
        onRegister(newUser);
      }
      onLogin(newUser, null);
      return;
    }

    // Match registered users first
    const existing = registeredUsers.find(
      (u) => u.email.toLowerCase() === trimmedEmail.toLowerCase()
    );
    if (existing) {
      onLogin(existing, null);
      return;
    }

    const baseUser = DEMO_USERS[role];
    const loggedUser: UserAccount = {
      ...baseUser,
      email: trimmedEmail,
      name: baseUser.email.toLowerCase() === trimmedEmail.toLowerCase() ? baseUser.name : trimmedEmail.split('@')[0],
    };
    onLogin(loggedUser, null);
  };

  const transitionFast = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#F4F0F0] via-[#EFECEB] to-[#DDD8D7] text-zinc-900 flex flex-col justify-center overflow-x-hidden">
      {/* Full-Screen Edge-to-Edge Architectural Backdrop */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {!imageError ? (
          <>
            <img
              src="/assets/portal/image_4b104492.png"
              alt="Mapua University architectural campus sketch backdrop"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-[50%_88%] sm:object-[50%_84%] md:object-bottom [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.45)_20%,black_38%,black_100%)]"
            />
            {/* Subtle top sky wash so upper corner logos breathe cleanly */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#F4F0F0] via-[#F2EEEE]/75 to-transparent"
            />
          </>
        ) : (
          <div
            aria-hidden="true"
            className="w-full h-full bg-gradient-to-b from-[#F4F0F0] via-[#EAE7E6] to-[#D4CECE] flex items-center justify-center"
          >
            <Building2 className="w-28 h-28 text-zinc-300" />
          </div>
        )}
      </div>

      {/* Responsive Corner Brand Marks (Clear & Unclipped on All Screen Sizes) */}
      <header className="absolute top-0 inset-x-0 z-10 pointer-events-none flex items-start justify-between px-4 pt-4 sm:px-8 sm:pt-6 md:px-10 md:pt-7">
        {!imageError ? (
          <>
            <div className="relative overflow-hidden aspect-[152/166] w-[86px] sm:w-[116px] md:w-[132px] shrink-0 [mask-image:radial-gradient(ellipse_94%_94%_at_50%_50%,black_78%,transparent_100%)]">
              <img
                src="/assets/portal/image_4b104492.png"
                alt="Mapua University"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="absolute max-w-none w-[673.684%] h-[616.867%] -left-[35.526%] -top-[22.289%] mix-blend-multiply brightness-[1.08] contrast-[1.10] select-none"
              />
            </div>

            <div className="relative overflow-hidden aspect-[207/160] w-[114px] sm:w-[152px] md:w-[172px] shrink-0 [mask-image:radial-gradient(ellipse_94%_94%_at_50%_50%,black_78%,transparent_100%)]">
              <img
                src="/assets/portal/image_4b104492.png"
                alt="School of Information Technology"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="absolute max-w-none w-[494.686%] h-[640%] -left-[376.329%] -top-[26.875%] mix-blend-multiply brightness-[1.08] contrast-[1.10] select-none"
              />
            </div>
          </>
        ) : (
          <>
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-[#A6192E]">
              MAPÚA UNIVERSITY
            </span>
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-800 text-right">
              School of Information Technology
            </span>
          </>
        )}
      </header>

      {/* Centered Two-Column Translucent Hero Card (Card-Only Soft Blur so Building Shows Through) */}
      <main className="relative z-20 flex items-center justify-center px-4 pt-24 pb-10 sm:pt-28 md:px-8 md:pt-24 md:pb-12">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitionFast}
          className="w-full max-w-[920px] grid grid-cols-1 lg:grid-cols-12 rounded-xl overflow-hidden border border-white/75 ring-1 ring-stone-900/12 shadow-[0_22px_60px_rgba(24,24,27,0.12)]"
        >
          {/* Left Column: Translucent Auth Panel */}
          <section className="lg:col-span-6 bg-white/46 backdrop-blur-[3px] p-6 sm:p-8 flex flex-col justify-center">
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#881325]">
                    ThesisDesk
                  </span>
                  <span className="text-[11px] font-medium text-zinc-800">
                    SOIT Defense Portal
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950">
                  {authMode === 'signin'
                    ? 'Sign in to continue'
                    : authMode === 'register'
                    ? 'Create portal account'
                    : 'Reset password'}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-zinc-800">
                  {authMode === 'signin'
                    ? role === 'student'
                      ? `${openSlotCount} open defense windows available this term.`
                      : `${pendingReviewCount} defense requests awaiting review.`
                    : authMode === 'register'
                    ? 'Register your SOIT profile to schedule defenses.'
                    : 'Enter your institutional email for reset instructions.'}
                </p>
              </div>

              {/* Animated Role Switcher */}
              {authMode !== 'forgot' && (
                <div className="mb-4">
                  <div
                    role="tablist"
                    aria-label="Select account role"
                    className="relative grid grid-cols-2 p-1 bg-white/45 backdrop-blur-xs border border-stone-900/12 rounded-lg"
                  >
                    {(['student', 'admin'] as const).map((tabRole) => {
                      const isActive = role === tabRole;
                      return (
                        <button
                          key={tabRole}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => handleRoleSwitch(tabRole)}
                          className={`relative z-10 py-1.5 px-3 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E] ${
                            isActive ? 'text-white' : 'text-zinc-800 hover:text-zinc-950'
                          }`}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="login-role-indicator"
                              transition={transitionFast}
                              className="absolute inset-0 bg-[#A6192E] rounded-md -z-10 shadow-xs"
                            />
                          )}
                          {tabRole === 'student' ? 'Student' : 'Admin / Chair'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Animated Auth Mode Form */}
              <AnimatePresence mode="wait">
                <motion.form
                  key={`${authMode}-${role}`}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={transitionFast}
                  onSubmit={handleSubmit}
                  className="space-y-3.5"
                  noValidate
                >
                  {authMode === 'register' && (
                    <div>
                      <label
                        htmlFor="auth-name"
                        className="block text-xs font-medium text-zinc-900 mb-1"
                      >
                        Full Name
                      </label>
                      <input
                        id="auth-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jordan Rivera"
                        className="w-full px-3.5 py-2 text-sm bg-white/70 backdrop-blur-xs border border-stone-400/55 rounded-lg text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#A6192E] focus:border-[#A6192E]"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="auth-email"
                      className="block text-xs font-medium text-zinc-900 mb-1"
                    >
                      University Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={
                          role === 'student'
                            ? 'm.patel@mymail.mapua.edu.ph'
                            : 'e.alvarez@mapua.edu.ph'
                        }
                        className="w-full pl-10 pr-3.5 py-2 text-sm bg-white/70 backdrop-blur-xs border border-stone-400/55 rounded-lg text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#A6192E] focus:border-[#A6192E]"
                      />
                    </div>
                  </div>

                  {authMode === 'register' && (
                    <div>
                      <label
                        htmlFor="auth-dept"
                        className="block text-xs font-medium text-zinc-900 mb-1"
                      >
                        SOIT Program
                      </label>
                      <select
                        id="auth-dept"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-white/75 backdrop-blur-xs border border-stone-400/55 rounded-lg text-zinc-950 focus:outline-none focus:ring-2 focus:ring-[#A6192E] focus:border-[#A6192E]"
                      >
                        <option value="Information Technology">Information Technology</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Data Science">Data Science</option>
                        <option value="Information Systems">Information Systems</option>
                      </select>
                    </div>
                  )}

                  {authMode !== 'forgot' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="auth-password"
                          className="block text-xs font-medium text-zinc-900"
                        >
                          Password
                        </label>
                        {authMode === 'signin' && (
                          <button
                            type="button"
                            onClick={() => handleModeChange('forgot')}
                            className="text-xs font-medium text-[#881325] hover:text-[#6B0F1D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E] rounded"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="auth-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full pl-10 pr-10 py-2 text-sm bg-white/70 backdrop-blur-xs border border-stone-400/55 rounded-lg text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#A6192E] focus:border-[#A6192E]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-600 hover:text-zinc-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

              {authMode === 'signin' && (
                <label className="inline-flex items-center gap-2 text-xs text-zinc-800 select-none pt-0.5">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-400 text-[#A6192E] focus:ring-[#A6192E]"
                  />
                  <span>Keep me signed in</span>
                </label>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-rose-50/90 border border-rose-200 text-xs font-medium text-rose-800"
                >
                  {errorMsg}
                </div>
              )}

              {authMode === 'forgot' && resetSent && (
                <div className="p-2.5 rounded-lg bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900">
                  Reset instructions prepared for{' '}
                  <span className="font-medium">{email}</span>.
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#A6192E] hover:bg-[#881325] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E] focus-visible:ring-offset-2"
              >
                <span>
                  {authMode === 'signin'
                    ? `Sign In as ${role === 'student' ? 'Student' : 'Admin'}`
                    : authMode === 'register'
                    ? 'Create Account'
                    : 'Send Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Toggle Sign In / Register */}
          <div className="mt-4 text-center text-xs text-zinc-800">
            {authMode === 'signin' ? (
              <>
                New to ThesisDesk?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('register')}
                  className="font-semibold text-[#881325] hover:text-[#6B0F1D] hover:underline"
                >
                  Register here
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('signin')}
                  className="font-semibold text-[#881325] hover:text-[#6B0F1D] hover:underline"
                >
                  Back to sign in
                </button>
              </>
            )}
          </div>

          {/* Instant Demo Quick Launch */}
          <div className="mt-5 pt-4 border-t border-stone-900/15">
            <p className="text-[11px] font-medium text-zinc-700 mb-2">
              Quick Template Preview
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onLogin(DEMO_USERS.student, null)}
                className="py-2 px-3 bg-white/55 hover:bg-white/85 backdrop-blur-xs border border-stone-400/50 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950 whitespace-nowrap">
                  <UserCheck className="w-3.5 h-3.5 text-[#A6192E] shrink-0" />
                  <span>Demo Student</span>
                </span>
                <span className="block text-[11px] text-zinc-700 mt-0.5 truncate">
                  Maya Patel
                </span>
              </button>

              <button
                type="button"
                onClick={() => onLogin(DEMO_USERS.admin, null)}
                className="py-2 px-3 bg-white/55 hover:bg-white/85 backdrop-blur-xs border border-stone-400/50 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950 whitespace-nowrap">
                  <KeyRound className="w-3.5 h-3.5 text-[#9A6E00] shrink-0" />
                  <span>Demo Admin</span>
                </span>
                <span className="block text-[11px] text-zinc-700 mt-0.5 truncate">
                  Dr. Elena Alvarez
                </span>
              </button>
            </div>
          </div>
          </section>

          {/* Right Column: Translucent Cardinal Red SOIT Announcements Panel */}
          <aside className="lg:col-span-6 bg-[#A6192E]/74 backdrop-blur-[3px] p-6 sm:p-8 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/25">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white text-center mb-5">
                Announcements
              </h2>

              <div className="space-y-2.5">
                {announcements.map((item) => {
                  const isOpen = expandedNoticeId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg bg-white/64 hover:bg-white/76 backdrop-blur-[2px] border border-white/60 text-zinc-900 transition-colors overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedNoticeId(isOpen ? '' : item.id)
                        }
                        aria-expanded={isOpen}
                        className="w-full px-4 py-3 text-left flex items-start justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
                      >
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-zinc-950 leading-snug">
                            {item.title}
                          </p>
                          <p className="text-[11px] italic text-zinc-700 mt-0.5">
                            {item.date}
                          </p>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-3.5 pt-1 text-xs text-zinc-800 leading-relaxed space-y-1.5 border-t border-stone-900/10">
                          <p>{item.summary}</p>
                          <p className="text-zinc-700">{item.detail}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Mapúa Gold Term Summary Banner */}
            <div className="mt-5 rounded-lg bg-[#E5A91A]/82 backdrop-blur-xs border border-[#F5CA5C]/65 px-4 py-3 text-zinc-950">
              <p className="text-xs font-bold tracking-tight text-zinc-950">
                {quarterCodeLabel} UOx Online Defense Availability
              </p>
              <p className="text-xs text-zinc-900 mt-0.5 tabular-nums">
                {openSlotCount} open Zoom windows across {zoomRooms.length} UOx channels ·{' '}
                {pendingReviewCount}{' '}
                requests awaiting coordinator review
              </p>
            </div>
          </aside>
        </motion.div>
      </main>
    </div>
  );
}
