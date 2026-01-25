export default function WeddingPartyPage() {
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
      { name: "Tyler Iddon" },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
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
