import Image from "next/image";

export default function AccommodationsPage() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="font-playfair text-5xl font-light text-gray-900 mb-4 tracking-wide">Accommodations</h1>
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
      </div>
      
      {/* Main Hotel Block */}
      <div className="mb-20">
        <div className="bg-gradient-to-br from-gray-50 to-white p-10 rounded-2xl shadow-lg border border-gray-100">
          <h2 className="font-playfair text-4xl font-light text-gray-800 mb-2 text-center tracking-wide">Hilton Garden Inn</h2>
          <p className="font-playfair text-xl font-light text-gray-600 mb-10 text-center italic">Southpointe</p>
          
          {/* Hotel Image */}
          <div className="mb-10">
            <div className="relative">
              <Image
                src="/images/hgi.jpg"
                alt="Hilton Garden Inn Southpointe"
                width={1024}
                height={683}
                className="w-full h-80 object-cover rounded-xl shadow-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10 mb-10">
            <div className="text-center md:text-left">
              <h3 className="font-playfair text-2xl font-light text-gray-800 mb-6 tracking-wide">Hotel Information</h3>
              <div className="space-y-4 text-gray-700">
                <p className="leading-relaxed">1000 Corporate Drive<br />Canonsburg, Pennsylvania 15317</p>
                <p className="font-medium">(724) 743-5000</p>
                <p className="text-sm italic text-gray-600 bg-gray-50 p-3 rounded-lg">Located at the same venue as your reception</p>
              </div>
            </div>
            
            <div className="text-center md:text-left">
              <h3 className="font-playfair text-2xl font-light text-gray-800 mb-6 tracking-wide">Amenities</h3>
              <div className="text-gray-700 space-y-2">
                <p className="flex items-center justify-center md:justify-start"><span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>Indoor pool & fitness center</p>
                <p className="flex items-center justify-center md:justify-start"><span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>Complimentary WiFi & parking</p>
                <p className="flex items-center justify-center md:justify-start"><span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>On-site restaurant & room service</p>
                <p className="flex items-center justify-center md:justify-start"><span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>In-room microwave & refrigerator</p>
              </div>
            </div>
          </div>
          
          {/* Booking Information */}
          <div className="bg-gradient-to-r from-white to-gray-50 p-8 rounded-xl border border-gray-200 shadow-md">
            <div className="text-center mb-8">
              <h3 className="font-playfair text-3xl font-light text-gray-800 mb-4 tracking-wide">Group Reservations</h3>
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 mb-2 font-light">Special rates available for wedding guests</p>
              <p className="text-gray-500 text-sm italic">Please book by April 10, 2026</p>
              <p className="text-gray-500 text-sm italic">We cannot guarantee rooms will be available after that date.</p>
            </div>
            
            <div className="text-center">
              <a
                href="https://group.hiltongardeninn.com/hk1d35"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white font-light py-4 px-12 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl tracking-wide"
              >
                Reserve Your Room
              </a>
              <p className="text-gray-500 text-xs mt-4 italic">
                Note: Default reservation is for Friday & Saturday nights. Please adjust dates as needed.
              </p>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-gray-600 text-sm">
                  If no rooms are available in the hotel block, please call or text<br />
                  <span className="font-medium text-gray-800"><b>Ryan:</b> (412) 926-4922 <br /> <b>Marsha: </b>(412) 302-7179</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Alternative Options */}
      <div className="mb-20">
        <div className="text-center mb-10">
          <h2 className="font-playfair text-3xl font-light text-gray-800 mb-4 tracking-wide">Additional Options</h2>
          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto mb-6"></div>
          <p className="text-gray-600 font-light italic">Other nearby accommodations if needed</p>
        </div>
        
        <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-md border border-gray-100">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <h4 className="font-playfair text-xl font-light text-gray-800 mb-2 tracking-wide">AC Hotel Pittsburgh Southpointe</h4>
              <p className="text-gray-600 font-light">1500 Main Street, Canonsburg, Pennsylvania 15317</p>
              <p className="text-gray-500 text-sm mt-2">(724) 271-3330</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <h4 className="font-playfair text-xl font-light text-gray-800 mb-2 tracking-wide">Homewood Suites by Hilton Pittsburgh Southpointe</h4>
              <p className="text-gray-600 font-light">3000 Horizon Vue Drive, Canonsburg, Pennsylvania 15317</p>
              <p className="text-gray-500 text-sm mt-2">(724) 745-4663</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <h4 className="font-playfair text-xl font-light text-gray-800 mb-2 tracking-wide">Holiday Inn Express Pittsburgh Southpointe</h4>
              <p className="text-gray-600 font-light">4000 Horizon Vue Drive, Canonsburg, Pennsylvania 15317</p>
              <p className="text-gray-500 text-sm mt-2">(724) 743-4300</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Breakfast Options */}
      <div className="mb-20">
        <div className="text-center mb-10">
          <h2 className="font-playfair text-3xl font-light text-gray-800 mb-4 tracking-wide">Breakfast Sat & Sun</h2>
          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto mb-6"></div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl shadow-lg border border-blue-100">
            <h3 className="font-playfair text-2xl font-light text-gray-800 mb-4 text-center tracking-wide">Hilton Garden Inn</h3>
            <div className="text-center space-y-3">
              <p className="text-gray-700 font-light">Hotel Breakfast</p>
              <p className="text-gray-600 text-lg"><span className="font-medium">Sunday:</span> 7:00 AM - 11:00 AM</p>
              <p className="text-gray-600 text-sm mt-3">$17/person</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-white p-8 rounded-2xl shadow-lg border border-amber-100">
            <h3 className="font-playfair text-2xl font-light text-gray-800 mb-4 text-center tracking-wide">Jackson&apos;s Restaurant</h3>
            <div className="text-center space-y-3">
              <p className="text-gray-700 font-light">Sunday Brunch</p>
              <p className="text-gray-600 text-lg"><span className="font-medium">Sunday:</span> 10:00 AM - 2:00 PM</p>
              <p className="text-gray-600 text-sm mt-3">Menu pricing</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contact Info */}
      <div className="text-center bg-gradient-to-r from-gray-50 to-white p-8 rounded-2xl border border-gray-100">
        <div className="mb-6">
          <h3 className="font-playfair text-2xl font-light text-gray-800 mb-4 tracking-wide">Questions?</h3>
          <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto mb-4"></div>
        </div>
        <p className="text-gray-600 font-light mb-4">
          We&apos;re here to help with any accommodation questions.
        </p>
        <p className="text-gray-500 font-light italic">
          Ryan & Marsha&apos;s Email: rmarzentiwedding@gmail.com
        <br />
          or call hotel directly at: (724) 743-5000
        </p>
      </div>

      {/* Map Section */}
      <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="bg-gray-100 rounded-xl overflow-hidden mb-8" style={{ height: '500px' }}>
          <iframe
            src={`https://www.google.com/maps/embed/v1/directions?key=${googleMapsApiKey}&origin=St+Augustine+Church,+225+37th+St,+Pittsburgh,+PA+15201&destination=Hilton+Garden+Inn+Pittsburgh+Southpointe,+1000+Corporate+Dr,+Canonsburg,+PA+15317&mode=driving`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Directions from Ceremony to Reception"
          ></iframe>
        </div>
      </div>
    </main>
  );
}
