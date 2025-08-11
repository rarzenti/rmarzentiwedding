import Image from "next/image";

const placeholders = Array.from({ length: 8 }).map((_, i) => ({
  id: i,
  src: "/images/placeholder.png",
}));

export default function PhotosPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-playfair text-4xl mb-6">Photos</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {placeholders.map((p) => (
          <div key={p.id} className="aspect-square bg-gray-100 rounded overflow-hidden">
            <Image src={p.src} alt="placeholder" width={600} height={600} className="object-cover w-full h-full" />
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500 mt-4">Replace with real images in /public/images.</p>
    </main>
  );
}
