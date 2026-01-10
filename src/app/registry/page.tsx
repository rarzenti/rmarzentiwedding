export default function RegistryPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="font-playfair text-5xl font-light text-gray-900 mb-4 tracking-wide">Wedding Registry</h1>
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
      </div>
      
      {/* Main Registry Section */}
      <div className="text-center mb-16">
        <div className="bg-gradient-to-br from-gray-50 to-white p-12 rounded-2xl shadow-lg border border-gray-100">
          <h2 className="font-playfair text-3xl font-light text-gray-800 mb-6 tracking-wide">Our Registry</h2>
          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto mb-8"></div>
          
          <p className="text-gray-600 font-light leading-relaxed max-w-2xl mx-auto mb-10">
            Your presence at our wedding is the greatest gift of all. However, if you wish to honor us with a gift, 
            we&apos;ve curated a registry to help us start our new life together.
          </p>
          
          <a
            href="https://www.zola.com/registry/ryanandmarsha2026"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white font-light py-4 px-12 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl tracking-wide text-lg"
          >
            View Our Zola Registry
          </a>
        </div>
      </div>
      {/* Thank You Note */}
      <div className="text-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <p className="font-playfair text-xl font-light text-gray-800 mb-3 tracking-wide italic">
            Thank you for celebrating with us!
          </p>
          <p className="text-gray-600 font-light">Ryan & Marsha</p>
        </div>
      </div>
    </main>
  );
}
