"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const links = [
    { href: "/about", label: "About Us" },
    { href: "/details", label: "Wedding Details" },
    { href: "/rsvp", label: "RSVP" },
    { href: "/photos", label: "Photos" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/60 backdrop-blur border-b border-black/5">
      <nav className="w-full px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        <Link href="/" className="font-dancing text-3xl md:text-4xl tracking-wide text-gray-900">
          Ryan & Marsha
        </Link>
        <div className="hidden md:flex items-center gap-8">
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
          {!isAdmin && (
            <Link
              href="/admin/login"
              className="font-cormorant uppercase tracking-[0.12em] text-[15px] text-gray-700 hover:text-gray-900"
            >
              Admin
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
