import Navbar from "@/components/shared/Navbar";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-serif text-emerald-800 text-center mb-8">
          Our Story
        </h1>
        
        <div className="space-y-12">
          {/* Introduction */}
          <section className="text-center">
            <p className="text-lg text-gray-700 leading-relaxed">
              We&apos;re so excited to share our journey with you and celebrate our love story!
            </p>
          </section>

          {/* Photo Gallery */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden shadow-lg">
              <Image
                src="/images/MR-Engagement-18.jpg"
                alt="Ryan and Marsha engagement photo"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden shadow-lg">
              <Image
                src="/images/MR-Engagement-21.jpg"
                alt="Ryan and Marsha engagement photo"
                fill
                className="object-cover"
              />
            </div>
          </section>

          {/* Story Section */}
          <section className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-2xl font-serif text-emerald-700 mb-4">How We Met</h2>
            <p className="text-gray-700 leading-relaxed">
              Our story began... (Add your story here!)
            </p>
          </section>

          <section className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-2xl font-serif text-emerald-700 mb-4">The Proposal</h2>
            <p className="text-gray-700 leading-relaxed">
              (Add your proposal story here!)
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
