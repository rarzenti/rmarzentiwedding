export default function GuestTableLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[80%] max-w-none px-4">
      {children}
    </div>
  );
}
