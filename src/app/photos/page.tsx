import Image from "next/image";

const placeholders = Array.from({ length: 8 }).map((_, i) => ({
  id: i,
  src: "/images/placeholder.png",
}));

export default function PhotosPage() {
  return (
    <main className="w-screen min-h-screen bg-white p-0 m-0 overflow-x-hidden">
      <h1 className="font-playfair text-4xl mb-6 text-center">Photos</h1>
      <div className="flex flex-col w-screen">
        {placeholders.map((p) => (
          <div key={p.id} className="relative w-screen aspect-square bg-gray-100 overflow-hidden">
            <Image src={p.src} alt="placeholder" fill className="object-cover" />
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500 mt-4 text-center">Replace with real images in /public/images.</p>
    </main>
  );
}
