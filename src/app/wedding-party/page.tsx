"use client";

import { useState } from "react";

export default function WeddingPartyPage() {
  const [flowers, setFlowers] = useState<{ id: number; left: number; emoji: string; delay: number; duration: number }[]>([]);

  const triggerFlowerRain = () => {
    const flowerEmojis = ['🌸', '🌷', '🌺', '🌻', '🌼', '💐', '🪻', '🪷', '✿', '❀'];
    const newFlowers = Array.from({ length: 100 }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      emoji: flowerEmojis[Math.floor(Math.random() * flowerEmojis.length)],
      delay: Math.random() * 2,
      duration: 4 + Math.random() * 4,
    }));
    // Add new flowers to existing ones instead of replacing
    setFlowers(prev => [...prev, ...newFlowers]);
    
    // Clear only these flowers after animation completes
    const flowerIds = newFlowers.map(f => f.id);
    setTimeout(() => {
      setFlowers(prev => prev.filter(f => !flowerIds.includes(f.id)));
    }, 10000);
  };

  const bridesSide = {
    bride: {
      name: "Marsha Stamatakis",
      role: "Bride",
    },
    maidOfHonor: {
      name: "Joan Stamatakis",
      role: "Maid of Honor",
    },
    matronOfHonor: {
      name: "Julia Rhodes",
      role: "Matron of Honor",
    },
    bridesmaids: [
      { name: "Haleigh O'Brien" },
      { name: "Olivia McGovern" },
      { name: "Lani Coleman" },
    ],
  };

  const groomsSide = {
    groom: {
      name: "Ryan Arzenti",
      role: "Groom",
    },
    bestMan: {
      name: "Matt Arzenti",
      role: "Best Man",
    },
    groomsmen: [
      { name: "Kevin Petrosky" },
      { name: "Ryan Metro" },
      { name: "Steve Barker" },
      { name: "Nick Bartholomew" },
      { name: "Jimmy Ungerman" },
      { name: "Tyler Iddon" },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 relative overflow-hidden">
      {/* Falling Flowers Animation */}
      {flowers.map((flower) => (
        <div
          key={flower.id}
          className="fixed pointer-events-none z-50 text-3xl animate-fall"
          style={{
            left: `${flower.left}%`,
            top: '-50px',
            animationDelay: `${flower.delay}s`,
            animationDuration: `${flower.duration}s`,
          }}
        >
          {flower.emoji}
        </div>
      ))}
      
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(calc(100vh + 100px)) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>

      <div className="text-center mb-12">
        <h1 className="font-playfair text-4xl font-light text-gray-900 mb-3 tracking-wide">
          Wedding Party
        </h1>
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
      </div>

      {/* Head Party */}
      <div className="grid md:grid-cols-2 gap-8 mb-6">
        {/* Bride's Side - Head Party */}
        <div className="space-y-6">
          {/* Bride */}
          <div className="text-center">
            <div className="bg-gradient-to-br from-pink-50 to-white p-6 rounded-2xl shadow-lg border border-pink-100">
              <h2 className="font-playfair text-3xl font-light text-gray-800 mb-1 tracking-wide">
                {bridesSide.bride.name}
              </h2>
              <p className="font-cormorant text-base tracking-wide text-pink-600 font-medium">
                {bridesSide.bride.role}
              </p>
            </div>
          </div>

          {/* Maid of Honor */}
          <div className="text-center">
            <div className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-2xl shadow-lg border border-rose-100">
              <h3 className="font-playfair text-xl font-light text-gray-800 mb-0.5 tracking-wide">
                {bridesSide.maidOfHonor.name}
              </h3>
              <p className="font-cormorant text-xs tracking-wide text-rose-600 font-medium">
                {bridesSide.maidOfHonor.role}
              </p>
            </div>
          </div>

          {/* Matron of Honor */}
          <div className="text-center">
            <div className="bg-gradient-to-br from-fuchsia-50 to-white p-6 rounded-2xl shadow-lg border border-fuchsia-100">
              <h3 className="font-playfair text-xl font-light text-gray-800 mb-0.5 tracking-wide">
                {bridesSide.matronOfHonor.name}
              </h3>
              <p className="font-cormorant text-xs tracking-wide text-fuchsia-600 font-medium">
                {bridesSide.matronOfHonor.role}
              </p>
            </div>
          </div>
        </div>

        {/* Groom's Side - Head Party */}
        <div className="space-y-6">
          {/* Groom */}
          <div className="text-center">
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl shadow-lg border border-blue-100">
              <h2 className="font-playfair text-3xl font-light text-gray-800 mb-1 tracking-wide">
                {groomsSide.groom.name}
              </h2>
              <p className="font-cormorant text-base tracking-wide text-blue-600 font-medium">
                {groomsSide.groom.role}
              </p>
            </div>
          </div>

          {/* Best Man */}
          <div className="text-center">
            <div className="bg-gradient-to-br from-cyan-50 to-white p-6 rounded-2xl shadow-lg border border-cyan-100">
              <h3 className="font-playfair text-xl font-light text-gray-800 mb-0.5 tracking-wide">
                {groomsSide.bestMan.name}
              </h3>
              <p className="font-cormorant text-xs tracking-wide text-cyan-600 font-medium">
                {groomsSide.bestMan.role}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width divider line */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-8"></div>

      {/* Attendants */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Bridesmaids */}
        <div>
          <h3 className="font-playfair text-xl font-light text-gray-800 mb-4 text-center tracking-wide">
            Bridesmaids
          </h3>
          <div className="grid gap-4">
            {bridesSide.bridesmaids.map((bridesmaid, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <p className="font-playfair text-lg font-light text-gray-800 text-center">
                  {bridesmaid.name}
                </p>
              </div>
            ))}
            
            {/* Flower Girl - Special Card */}
            <div className="relative mt-4">
              {/* Decorative flowers */}
              <div className="absolute -top-2 -left-2 text-2xl">🌸</div>
              <div className="absolute -top-2 -right-2 text-2xl">🌸</div>
              <div className="absolute -bottom-2 -left-2 text-2xl">🌷</div>
              <div className="absolute -bottom-2 -right-2 text-2xl">🌷</div>
              
              <div 
                className="bg-gradient-to-br from-pink-100 via-rose-50 to-pink-100 p-6 rounded-2xl shadow-xl border-2 border-pink-200 text-center cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
                onClick={triggerFlowerRain}
              >
                <div className="mb-3">
                  <span className="text-3xl">👑</span>
                </div>
                <h4 className="font-playfair text-sm font-light text-pink-800 mb-2 tracking-widest uppercase">
                  Flower Girl
                </h4>
                <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent mx-auto mb-3"></div>
                <p className="font-playfair text-lg font-light text-gray-800 tracking-wide">
                  Ms. Princess Perry Stamatakis
                </p>
                <p className="font-cormorant text-xs text-pink-600 mt-2 italic">
                  
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Groomsmen */}
        <div>
          <h3 className="font-playfair text-xl font-light text-gray-800 mb-4 text-center tracking-wide">
            Groomsmen
          </h3>
          <div className="grid gap-4">
            {groomsSide.groomsmen.map((groomsman, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <p className="font-playfair text-lg font-light text-gray-800 text-center">
                  {groomsman.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
