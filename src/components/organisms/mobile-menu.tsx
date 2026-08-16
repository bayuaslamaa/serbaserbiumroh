'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ChevronDown, LayoutDashboard, LogOut, Menu, Settings, X } from 'lucide-react';
import { EstimateCta } from '@/components/molecules/estimate-cta';
import { adminLinks, exploreLinks, memberLinks } from '@/shared/nav-links';
import { isExternalHref, serviceCardTreatment, services } from '@/packages/layanan/domain/catalog';

interface MobileMenuProps {
  userEmail?: string | null;
  showAdmin?: boolean;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  signOutAction: () => Promise<void>;
}

const sectionLabelClass = 'text-[11px] font-bold tracking-[0.12em]';
const rowClass =
  'flex items-center gap-3 border-b py-3 pl-1 pr-1 text-[15px] text-text-soft transition-colors hover:text-text';
const rowBorder = { borderColor: 'rgba(201,168,76,0.1)' } as const;

const Wordmark = ({ withTagline = false }: { withTagline?: boolean }) => {
  return (
    <span className="flex items-center gap-2">
      <Image
        src="/assets/images/logo.webp"
        alt="Serba Serbi Umroh"
        width={32}
        height={32}
        className="h-8 w-8 object-contain"
      />
      {withTagline && <span className="text-[11px] text-text-muted">Serba Serbi Umroh</span>}
    </span>
  );
};

export const MobileMenu = ({
  userEmail,
  showAdmin,
  isAdmin = false,
  isLoggedIn,
  signOutAction,
}: MobileMenuProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAdminOpen, setIsAdminOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    } else {
      setIsAdminOpen(false);
    }
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const bar = (
    <div
      className="flex h-14 items-center justify-between gap-2.5 px-4 nav:hidden"
      data-testid="mobile-nav"
    >
      <Link href={isLoggedIn ? '/dashboard' : '/'}>
        <Wordmark />
      </Link>
      <div className="flex items-center gap-2">
        <EstimateCta variant="mobileBar" isAdmin={isAdmin} />
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka menu"
          aria-expanded={isOpen}
          className="flex p-2 text-text transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>
    </div>
  );

  if (!mounted) return bar;

  return (
    <>
      {bar}

      {isOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            className="fixed inset-0 z-[99] flex flex-col"
            style={{
              background: 'rgba(11, 28, 18, 0.98)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div
              className="flex h-14 flex-shrink-0 items-center justify-between border-b px-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <Link href={isLoggedIn ? '/dashboard' : '/'} onClick={close}>
                <Wordmark withTagline />
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                aria-label="Tutup menu"
                className="flex p-2 text-text-muted transition-colors hover:text-text"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <span className={`${sectionLabelClass} text-gold`}>LAYANAN</span>
                <Link href="/layanan" onClick={close} className="text-xs font-semibold text-gold">
                  Lihat semua →
                </Link>
              </div>

              <div className="mb-[26px] grid grid-cols-2 gap-2">
                {services.map((service) => {
                  const Icon = service.icon;
                  const external = isExternalHref(service.href);

                  return (
                    <Link
                      key={service.id}
                      href={service.href}
                      onClick={close}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="flex flex-col gap-2 rounded-[10px] border p-3"
                      style={serviceCardTreatment(service.isNew)}
                    >
                      <span className="flex items-center justify-between">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg border"
                          style={{
                            background: 'rgba(201,168,76,0.1)',
                            borderColor: 'rgba(201,168,76,0.25)',
                          }}
                        >
                          <Icon size={16} className="text-gold" />
                        </span>
                        {service.isNew && (
                          <span className="rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold tracking-[0.06em] text-bg">
                            BARU
                          </span>
                        )}
                      </span>
                      <span>
                        <span className="block text-[13px] font-semibold text-text">
                          {service.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-semibold text-gold">
                          {service.price}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className={`${sectionLabelClass} mb-1.5 text-text-muted`}>JELAJAHI</div>
              <div className="mb-[26px] flex flex-col">
                {exploreLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={close}
                      className={rowClass}
                      style={rowBorder}
                    >
                      <Icon size={17} className="flex-shrink-0" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className={`${sectionLabelClass} mb-1.5 text-text-muted`}>AKUN</div>
              <div className="flex flex-col">
                {isLoggedIn ? (
                  <>
                    <Link href="/dashboard" onClick={close} className={rowClass} style={rowBorder}>
                      <LayoutDashboard size={17} className="flex-shrink-0" />
                      Dashboard
                    </Link>

                    {memberLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={close}
                          className={rowClass}
                          style={rowBorder}
                        >
                          <Icon size={17} className="flex-shrink-0" />
                          {link.label}
                        </Link>
                      );
                    })}

                    {showAdmin && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => setIsAdminOpen((open) => !open)}
                          aria-expanded={isAdminOpen}
                          className={`${rowClass} justify-between`}
                          style={rowBorder}
                        >
                          <span className="flex items-center gap-3">
                            <Settings size={17} className="flex-shrink-0" />
                            Panel Admin
                          </span>
                          <ChevronDown
                            size={18}
                            className={`transition-transform duration-200 ${
                              isAdminOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isAdminOpen && (
                          <div
                            className="ml-2 border-l pl-6"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            {adminLinks.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={close}
                                className="block py-2 text-base text-text-muted transition-colors hover:text-text"
                              >
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <form
                      action={async () => {
                        close();
                        await signOutAction();
                      }}
                    >
                      <button
                        type="submit"
                        className="flex w-full items-center gap-3 py-3 pl-1 text-[15px] text-danger-text transition-colors hover:text-danger-text-hover"
                      >
                        <LogOut size={17} className="flex-shrink-0" />
                        Keluar
                      </button>
                    </form>
                  </>
                ) : (
                  <Link href="/login" onClick={close} className={rowClass} style={rowBorder}>
                    <LayoutDashboard size={17} className="flex-shrink-0" />
                    Masuk
                  </Link>
                )}
              </div>
            </div>

            <div
              className="flex-shrink-0 border-t px-4 pt-3.5"
              style={{
                borderColor: 'var(--color-border)',
                background: 'rgba(11, 28, 18, 0.98)',
                paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom))',
              }}
            >
              <EstimateCta variant="mobileFooter" isAdmin={isAdmin} onNavigate={close} />
              {userEmail && (
                <div className="mt-2.5 break-all text-center text-[11px] text-text-muted">
                  {userEmail}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
