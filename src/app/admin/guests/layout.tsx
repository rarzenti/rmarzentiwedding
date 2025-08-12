import Navbar from "@/components/shared/Navbar";
import "@/app/globals.css";

export default function GuestTableLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="pt-16 min-h-screen bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50">
        {/* No max-w, no mx-auto, no px-8! */}
        {children}
      </div>
    </>
  );
}
