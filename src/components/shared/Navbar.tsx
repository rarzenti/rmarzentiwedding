"use client";


import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";


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
                className={
                  (active
                    ? "text-gray-900 underline decoration-2 underline-offset-8 "
                    : "text-gray-700 hover:text-gray-900 ") +
                  "font-cormorant uppercase tracking-[0.12em] text-[17px] py-1"
                }
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            );
          })}
          {adminMode && (
            <>
              <div className="border-t my-2" />
              {adminLinks.map((l) => {
                const active = pathname === l.href || pathname?.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      (active
                        ? "text-gray-900 underline decoration-2 underline-offset-8 "
                        : "text-gray-700 hover:text-gray-900 ") +
                      "font-cormorant uppercase tracking-[0.12em] text-[17px] py-1"
                    }
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                );
              })}
              <button
                onClick={() => { onLogout(); setOpen(false); }}
                className="mt-2 rounded border px-3 py-1.5 text-[15px] text-gray-800 hover:bg-gray-900 hover:text-white w-full text-left"
                title="Logout"
              >
                Logout
              </button>
            </>
          )}
          {!adminMode && (
            <Link
              href="/admin/login"
              className="font-cormorant uppercase tracking-[0.12em] text-[17px] text-gray-700 hover:text-gray-900 py-1"
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
    { href: "/photos", label: "Photos" },
  ];

  const adminLinks = [
    { href: "/admin", label: "Guest Adder" },
    { href: "/admin/guests", label: "Guest Data" },
    { href: "/admin/allergies", label: "Food Allergies" },
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
        <div className="hidden xl:flex items-center gap-4">
          {links.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={
                  (active
                    ? "text-gray-900 underline decoration-2 underline-offset-8 "
                    : "text-gray-700 hover:text-gray-900 ") +
                  "font-cormorant uppercase tracking-[0.12em] text-[15px]"
                }
              >
                {l.label}
              </Link>
            );
          })}

          {adminMode && (
            <>
              <span className="h-5 w-px bg-gray-300" aria-hidden="true" />
              {adminLinks.map((l) => {
                const active = pathname === l.href || pathname?.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      (active
                        ? "text-gray-900 underline decoration-2 underline-offset-8 "
                        : "text-gray-700 hover:text-gray-900 ") +
                      "font-cormorant uppercase tracking-[0.12em] text-[15px]"
                    }
                  >
                    {l.label}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="rounded border px-3 py-1.5 text-[14px] text-gray-800 hover:bg-gray-900 hover:text-white"
                title="Logout"
              >
                Logout
              </button>
            </>
          )}

          {!adminMode && (
            <Link
              href="/admin/login"
              className="font-cormorant uppercase tracking-[0.12em] text-[15px] text-gray-700 hover:text-gray-900"
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
