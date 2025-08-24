import Link from "next/link";

export default function SeatingPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Seating Chart</h1>
      <p className="mb-4">Seating chart functionality coming soon...</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Back to Home
      </Link>
    </main>
  );
}