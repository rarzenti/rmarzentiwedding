"use client";


import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Admin Dropdown Component
interface AdminDropdownProps {
  adminLinks: NavLink[];
  pathname: string | null;
  onLogout: () => void;
}
function AdminDropdown({ adminLinks, pathname, onLogout }: AdminDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const isAnyAdminPageActive = adminLinks.some(link => 
    pathname === link.href || pathname?.startsWith(link.href + "/")
  );

  return (
    <div className="relative" data-dropdown>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 font-cormorant uppercase tracking-[0.12em] text-[15px] px-3 py-1.5 rounded-md transition-colors ${
          isAnyAdminPageActive
            ? "text-gray-900 bg-gray-100"
            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
        }`}
      >
        Admin
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-48 z-50">
          {adminLinks.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors ${
                  active
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="border-t border-gray-200 my-1" />
          <button
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}


// MobileNav component for hamburger menu
interface NavLink {
  href: string;
  label: string;
}
interface MobileNavProps {
  links: NavLink[];
  adminLinks: NavLink[];
  adminMode: boolean;
  pathname: string | null;
  onLogout: () => void;
}
function MobileNav({ links, adminLinks, adminMode, pathname, onLogout }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  
  return (
    <>
      <button
        className="p-2 rounded focus:outline-none focus:ring-2 focus:ring-black/20"
        aria-label="Open menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="block w-6 h-0.5 bg-gray-900 mb-1" />
        <span className="block w-6 h-0.5 bg-gray-900 mb-1" />
        <span className="block w-6 h-0.5 bg-gray-900" />
      </button>
      {open && (
        <div className="absolute top-16 right-2 left-2 bg-white rounded-xl shadow-lg border z-50 p-4 flex flex-col gap-3 animate-fade-in">
          {links.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`font-cormorant uppercase tracking-[0.12em] text-[17px] py-2 px-3 rounded-md transition-colors ${
                  active
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setOpen(false)
                }
              >
                {l.label}
              </Link>
            );
          })}
          
          {adminMode && (
            <>
              <div className="border-t my-2" />
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className="flex items-center justify-between font-cormorant uppercase tracking-[0.12em] text-[17px] py-2 px-3 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Admin
                <svg 
                  className={`w-4 h-4 transition-transform ${adminOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {adminOpen && (
                <div className="ml-4 flex flex-col gap-2">
                  {adminLinks.map((l) => {
                    const active = pathname === l.href || pathname?.startsWith(l.href + "/");
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        aria-current={active ? "page" : undefined}
                        className={`font-cormorant uppercase tracking-[0.12em] text-[15px] py-2 px-3 rounded-md transition-colors ${
                          active
                            ? "text-gray-900 bg-gray-100"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        {l.label}
                      </Link>
                    );
                  })}
                  <button
                    onClick={() => { onLogout(); setOpen(false); }}
                    className="text-left font-cormorant uppercase tracking-[0.12em] text-[15px] py-2 px-3 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </>
          )}
          
          {!adminMode && (
            <Link
              href="/admin/login"
              className="font-cormorant uppercase tracking-[0.12em] text-[17px] py-2 px-3 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              Admin
            </Link>
          )}
        </div>
      )}
    </>
  );
}
export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (mounted) setAdminMode(Boolean(data?.admin));
      } catch {
        if (mounted) setAdminMode(false);
      }
    };
    refresh();
    if (typeof window !== "undefined") {
      const onStorage = (e: StorageEvent) => {
        if (e.key === "admin") refresh();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        mounted = false;
        window.removeEventListener("storage", onStorage);
      };
    }
  }, []);

  // Re-check auth when route changes (same-tab transitions)
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        setAdminMode(Boolean(data?.admin));
      } catch {
        setAdminMode(false);
      }
    };
    check();
  }, [pathname]);

  const links = [
    { href: "/about", label: "About Us" },
    { href: "/details", label: "Wedding Details" },
    { href: "/rsvp", label: "RSVP" },
    { href: "/seating", label: "Seating Chart" },
    { href: "/photos", label: "Photos" },
  ];

  const adminLinks = [
    { href: "/admin", label: "Guest Adder" },
    { href: "/admin/guests", label: "Guest Data" },
    { href: "/admin/meals", label: "Meals" },
    { href: "/admin/seating", label: "Seating Chart" },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    if (typeof window !== "undefined") localStorage.removeItem("admin");
    setAdminMode(false);
    router.push("/");
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-black/5">
      <nav className="w-full px-2 sm:px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-dancing text-2xl sm:text-3xl md:text-4xl tracking-wide text-gray-900 whitespace-nowrap">
          Ryan & Marsha
        </Link>
        <div className="hidden xl:flex items-center gap-6">
          {links.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`font-cormorant uppercase tracking-[0.12em] text-[15px] px-3 py-1.5 rounded-md transition-colors ${
                  active
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {l.label}
              </Link>
            );
          })}

          {adminMode ? (
            <AdminDropdown
              adminLinks={adminLinks}
              pathname={pathname}
              onLogout={handleLogout}
            />
          ) : (
            <Link
              href="/admin/login"
              className="font-cormorant uppercase tracking-[0.12em] text-[15px] px-3 py-1.5 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Admin
            </Link>
          )}
        </div>
        {/* Mobile nav */}
        <div className="xl:hidden flex items-center">
          <MobileNav
            links={links}
            adminLinks={adminLinks}
            adminMode={adminMode}
            pathname={pathname}
            onLogout={handleLogout}
          />
        </div>
      </nav>
    </header>
  );
}
