export default function RegistryPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="font-playfair text-5xl font-light text-gray-900 mb-4 tracking-wide">Wedding Registry</h1>
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
      </div>
      
      {/* Coming Soon Section */}
      <div className="text-center">
        <div className="bg-gradient-to-br from-gray-50 to-white p-12 rounded-2xl shadow-lg border border-gray-100">
          <h2 className="font-playfair text-3xl font-light text-gray-800 mb-6 tracking-wide">Coming Soon</h2>
          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto mb-8"></div>
          <p className="text-gray-600 font-light leading-relaxed max-w-2xl mx-auto mb-8">
            We&apos;re currently curating our wedding registry with items that will help us start our new life together. 
            Check back soon for our wish list!
          </p>
        </div>
      </div>
    </main>
  );
}
