import { ReactNode, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeftRight, LogOut, Menu, RotateCcw, UserCog, X } from 'lucide-react';
import { UserAccount } from '../types/defense';

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badgeCount?: number;
}

export interface QuartermBannerInfo {
  code: string;
  label: string;
  status: 'Open' | 'Closed' | 'Unopened';
}

interface PortalLayoutProps {
  user: UserAccount;
  navItems: NavItem[];
  activeTab: string;
  backgroundUrl: string;
  quartermInfo?: QuartermBannerInfo;
  onSelectTab: (tabId: string) => void;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onSwitchRole: () => void;
  onSignOut: () => void;
  onResetDemoData?: () => void;
  onOpenProfileModal?: () => void;
  children: ReactNode;
}

export function PortalLayout({
  user,
  navItems,
  activeTab,
  backgroundUrl,
  quartermInfo,
  onSelectTab,
  primaryActionLabel,
  onPrimaryAction,
  onSwitchRole,
  onSignOut,
  onResetDemoData,
  onOpenProfileModal,
  children,
}: PortalLayoutProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const activeNav = navItems.find((item) => item.id === activeTab);
  const portalLabel = user.role === 'admin' ? 'Admin Portal' : 'Student Portal';

  const handleNavClick = (id: string) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  const transitionFast = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const };

  // 20% Secondary Structure: Translucent Frosted Stone Sidebar integrated with backgrounds
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white/68 backdrop-blur-xl text-zinc-900 border-r border-stone-300/70">
      <div className="h-16 px-5 flex items-center justify-between border-b border-stone-300/60 shrink-0">
        <span className="text-xl font-bold tracking-tight text-zinc-900 whitespace-nowrap">
          ThesisDesk
        </span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 -mr-2 text-zinc-500 hover:text-zinc-900 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-3 py-5 flex-1 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold text-[#9A6E00]">
          {user.role === 'admin' ? 'SOIT Coordinator Console' : 'SOIT Candidate Portal'}
        </p>
        {quartermInfo && (
          <div className="mx-3 mb-4 px-3 py-2 rounded-lg bg-stone-900/[0.04] border border-stone-300/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold font-mono tabular-nums text-zinc-900">
                {quartermInfo.code}
              </span>
              <span
                className={`text-[11px] font-semibold whitespace-nowrap ${
                  quartermInfo.status === 'Open'
                    ? 'text-emerald-700'
                    : quartermInfo.status === 'Closed'
                    ? 'text-[#A6192E]'
                    : 'text-[#9A6E00]'
                }`}
              >
                {quartermInfo.status === 'Unopened' ? 'Awaiting Term' : quartermInfo.status}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">{quartermInfo.label}</p>
          </div>
        )}
        <nav aria-label="Portal sections" className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E] ${
                  isActive
                    ? 'bg-[#A6192E]/12 text-[#8E1425] font-semibold'
                    : 'text-zinc-700 hover:text-zinc-900 hover:bg-stone-900/[0.05]'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className={isActive ? 'text-[#A6192E]' : 'text-zinc-500'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                  <span
                    className={`text-xs font-mono tabular-nums shrink-0 ${
                      isActive ? 'text-[#A6192E]' : 'text-zinc-500'
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-stone-300/60 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {user.avatarUrl && !avatarError ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-9 h-9 rounded-full object-cover border border-stone-300 shrink-0 shadow-2xs"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#A6192E] text-white text-xs font-semibold flex items-center justify-center shrink-0 shadow-2xs">
                {user.name
                  .split(' ')
                  .filter(Boolean)
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 truncate">
                {user.role === 'student' && user.studentId ? `${user.studentId} · ` : ''}
                {user.department}
              </p>
            </div>
          </div>

          {onOpenProfileModal && (
            <button
              type="button"
              onClick={onOpenProfileModal}
              title="Edit Profile"
              aria-label="Edit Profile"
              className="p-1.5 text-zinc-500 hover:text-[#A6192E] hover:bg-stone-200/70 rounded-md transition-colors shrink-0 cursor-pointer"
            >
              <UserCog className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={onSwitchRole}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium text-zinc-800 bg-stone-900/[0.05] hover:bg-stone-900/[0.09] border border-stone-300/60 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
            <span>{user.role === 'student' ? 'Admin View' : 'Student View'}</span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-medium text-zinc-800 bg-stone-900/[0.05] hover:bg-stone-900/[0.09] border border-stone-300/60 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>

        {onResetDemoData && (
          <button
            type="button"
            onClick={() => {
              onResetDemoData();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-stone-900/[0.04] rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E]"
          >
            <RotateCcw className="w-3 h-3 shrink-0" />
            <span>Reset Demo Data</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    /* 60% Primary Canvas: Page-Specific Geometric Backgrounds */
    <div className="relative min-h-screen bg-[#ECEBE9] flex">
      {/* Dynamic Per-Page Widescreen Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#ECEBE9]">
        <AnimatePresence mode="wait">
          <motion.img
            key={backgroundUrl}
            src={backgroundUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            transition={transitionFast}
            className="w-full h-full object-cover object-center"
          />
        </AnimatePresence>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen z-20">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.18 }}
              className="fixed inset-0 bg-zinc-950/35 backdrop-blur-xs"
              aria-hidden="true"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Portal navigation"
              initial={prefersReducedMotion ? { opacity: 1 } : { x: -280 }}
              animate={{ x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: -280 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0.01 }
                  : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }
              }
              className="relative z-50 w-[270px] max-w-[85vw] h-full shadow-2xl"
            >
              {renderSidebarContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-10 h-16 bg-white/65 backdrop-blur-xl border-b border-stone-300/70">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 -ml-2 text-zinc-600 hover:text-zinc-900 hover:bg-stone-900/5 rounded-md"
              >
                <Menu className="w-5 h-5" />
              </button>
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-zinc-500 whitespace-nowrap hidden sm:inline">
                  {portalLabel}
                </span>
                <span className="text-zinc-400 hidden sm:inline" aria-hidden="true">
                  /
                </span>
                <span className="font-semibold text-zinc-900 truncate">
                  {activeNav?.label ?? 'Overview'}
                </span>
              </nav>
            </div>

            {/* 10% Accent CTA: Mapua Cardinal Red */}
            <button
              type="button"
              onClick={onPrimaryAction}
              className="py-2 px-4 bg-[#A6192E] hover:bg-[#881325] text-white text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6192E] focus-visible:ring-offset-2"
            >
              {primaryActionLabel}
            </button>
          </div>
        </header>

        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-3.5 sm:pt-4 pb-8 sm:pb-10">
          <motion.div
            key={activeTab}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.01 }
                : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
            }
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
