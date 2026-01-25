"use client";

export default function DetailsPage() {
  const handleAddToCalendar = () => {
    // Navigate to the calendar API endpoint which will serve the .ics file
    // This approach has better file association than blob URLs
    window.location.href = '/api/calendar';
    
    // Show a brief success message
    const toast = document.createElement('div');
    toast.textContent = 'Opening calendar events...';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #059669;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-family: system-ui;
      font-size: 14px;
    `;
    
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="font-playfair text-5xl font-light text-gray-900 mb-4 tracking-wide">Wedding Details</h1>
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
      </div>
      
      {/* Date */}
      <div className="text-center mb-20">
        <div className="bg-gradient-to-br from-gray-50 to-white p-10 rounded-2xl shadow-lg border border-gray-100">
          <h2 className="font-playfair text-3xl font-light text-gray-800 mb-6 tracking-wide">Save the Date</h2>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto mb-6"></div>
          <p className="font-playfair text-2xl font-light text-gray-700 mb-8 italic">Saturday, May 16, 2026</p>
          <button
            onClick={handleAddToCalendar}
            className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white font-light px-8 py-3 rounded-full hover:shadow-xl transition-all duration-300 transform hover:scale-105 tracking-wide"
          >
            Add to Calendar
          </button>
        </div>
      </div>

      {/* Ceremony */}
      <div className="mb-20">
        <div className="bg-gradient-to-br from-gray-50 to-white p-10 rounded-2xl shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="font-playfair text-4xl font-light text-gray-800 mb-4 tracking-wide">Ceremony</h2>
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
          </div>
          <div className="text-center space-y-4">
            <h3 className="font-playfair text-2xl font-light text-gray-900 tracking-wide">St. Padre Pio Parish</h3>
            <p className="text-gray-700 font-light leading-relaxed">225 37th Street<br />Pittsburgh, Pennsylvania 15201</p>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 inline-block">
              <p className="font-playfair text-3xl font-light text-gray-900 mb-2">2:00 PM</p>
              <p className="text-gray-600 font-light italic text-sm">The ceremony will begin promptly at 2:00 PM<br />and is expected to last about 45 minutes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reception */}
      <div className="mb-20">
        <div className="bg-gradient-to-br from-gray-50 to-white p-10 rounded-2xl shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="font-playfair text-4xl font-light text-gray-800 mb-4 tracking-wide">Reception</h2>
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
          </div>
          <div className="text-center space-y-6">
            <h3 className="font-playfair text-2xl font-light text-gray-900 tracking-wide">Hilton Garden Inn Southpointe</h3>
            <p className="text-gray-700 font-light leading-relaxed">1000 Corporate Drive<br />Canonsburg, Pennsylvania 15317</p>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="font-playfair text-xl font-light text-gray-900 mb-1">Cocktail Hour</p>
                <p className="text-gray-600 font-light">5:00 - 6:00 PM</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <p className="font-playfair text-xl font-light text-gray-900 mb-1">Reception</p>
                <p className="text-gray-600 font-light">6:00 - 10:30 PM</p>
              </div>
            </div>
            <p className="text-gray-600 font-light italic">Dinner and dancing to follow cocktails</p>
          </div>
        </div>
      </div>

      {/* Attire */}
      <div className="mb-20">
        <div className="bg-gradient-to-br from-purple-50 to-white p-10 rounded-2xl shadow-lg border border-purple-100">
          <div className="text-center mb-8">
            <h2 className="font-playfair text-4xl font-light text-gray-800 mb-4 tracking-wide">Attire</h2>
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent mx-auto"></div>
          </div>
          <div className="text-center space-y-4">
            <p className="font-playfair text-2xl font-light text-gray-900 tracking-wide">Bright Semi-Formal or Cocktail Attire Preferred</p>
            <p className="text-gray-700 font-light leading-relaxed max-w-2xl mx-auto">
              We invite you to dress in bright, vibrant colors that reflect the joy of the celebration! 
              Semi-formal or cocktail attire works beautifully for this occasion.
            </p>
          </div>
        </div>
      </div>

      {/* After Party */}
      <div className="mb-20">
        <div className="bg-gradient-to-br from-green-50 to-white p-10 rounded-2xl shadow-lg border border-green-100">
          <div className="text-center mb-8">
            <h2 className="font-playfair text-4xl font-light text-gray-800 mb-4 tracking-wide">After Party</h2>
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent mx-auto"></div>
          </div>
          <div className="text-center space-y-4">
            <h3 className="font-playfair text-2xl font-light text-gray-900 tracking-wide">Jackson&apos;s Restaurant & Bar</h3>
            <p className="text-gray-700 font-light leading-relaxed">1100 Corporate Drive, Canonsburg, Pennsylvania 15317<br /><span className="italic text-sm">(Next door to the reception)</span></p>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 inline-block">
              <p className="font-playfair text-2xl sm:text-3xl font-light text-gray-900 mb-2 whitespace-nowrap">10:30 PM - 1:30 AM</p>
              <p className="text-gray-600 font-light italic">Keep the celebration going!<br />Join us for drinks and more fun right next door.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transportation Note */}
      <div className="mb-20">
        <div className="bg-gradient-to-br from-blue-50 to-white p-10 rounded-2xl shadow-lg border border-blue-100">
          <div className="flex items-start justify-center">
            <div className="flex-shrink-0 mr-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-playfair text-2xl font-light text-blue-900 mb-4 tracking-wide">Transportation Between Venues</h3>
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mb-4"></div>
              <p className="text-blue-800 font-light leading-relaxed max-w-2xl">
                Please note that you will need to drive from the ceremony to the reception venue. 
                The drive is approximately 30 minutes. Uber and Lyft services are widely available.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What to do between ceremony and reception */}
      <div className="mb-20">
        <div className="bg-gradient-to-br from-gray-50 to-white p-10 rounded-2xl shadow-lg border border-gray-100">
          <div className="text-center mb-10">
            <h2 className="font-playfair text-4xl font-light text-gray-800 mb-4 tracking-wide">Between Ceremony & Reception</h2>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto mb-6"></div>
            <p className="text-gray-600 font-light leading-relaxed max-w-2xl mx-auto">
              There&apos;s a 2-hour gap between the end of the ceremony and reception. Here are some great options to explore in the area:
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-playfair text-xl font-light text-gray-800 mb-4 tracking-wide">Pubs & Restaurants</h3>
              <p className="text-xs text-gray-500 mb-4 italic">in Lawrenceville</p>
              <div className="space-y-3 text-gray-600 font-light text-sm">
                <div className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-gray-800">Cork Harbor Pub</strong><br />
                    <span className="text-xs">Have a cheeky pint in a proper Irish pub</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-gray-800">Industry Public House</strong><br />
                    <span className="text-xs">Gastropub with craft beer and elevated pub fare</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-gray-800">Long Story Short</strong><br />
                    <span className="text-xs">Sandwich shop with great beers</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-gray-800">William Penn Tavern</strong><br />
                    <span className="text-xs">Relaxed pub sure to have some sports on</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-gray-800">Many other coffee shops, restaurants, bars and more!</strong><br />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-playfair text-xl font-light text-gray-800 mb-4 tracking-wide">Things to Do</h3>
              <div className="space-y-3 text-gray-600 font-light text-sm">
                <div className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>Explore the trendy shops and galleries on Butler Street</span>
                </div>
                <div className="flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                  <span>Take photos at Arsenal Park</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-playfair text-xl font-light text-gray-800 mb-4 tracking-wide">Near Reception Venue</h3>
              <div className="text-gray-600 font-light text-sm leading-relaxed">
                <strong className="text-gray-800">Jackson&apos;s Restaurant & Bar</strong> is conveniently located right next to the Hilton Garden Inn Southpointe. 
                <br /><br />
                <span className="text-xs italic">It&apos;s a perfect spot to grab drinks or a bite before the reception begins!</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="mb-12">
        <div className="text-center mb-10">
          <h2 className="font-playfair text-4xl font-light text-gray-800 mb-4 tracking-wide">Venue Locations</h2>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="bg-gray-100 rounded-xl overflow-hidden mb-8" style={{ height: '500px' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d50000!2d-80.0668!3d40.3746!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x8834f20c32b85095%3A0x7c2f6df1bdbb5f2a!2s225%2037th%20St%2C%20Pittsburgh%2C%20PA%2015201%2C%20USA!3m2!1d40.4659399!2d-79.96113!4m5!1s0x8834c7d8e1a5e40b%3A0x4e5b9c7e8f9a0b1c!2s1000%20Corporate%20Dr%2C%20Canonsburg%2C%20PA%2015317%2C%20USA!3m2!1d40.282838!2d-80.171637!5e0!3m2!1sen!2sus!4v1703000000000!5m2!1sen!2sus"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Wedding Venue Locations - Directions from Ceremony to Reception"
            ></iframe>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className="mb-4">
                <h4 className="font-playfair text-lg font-light text-gray-800 tracking-wide">Ceremony Venue</h4>
              </div>
              <p className="text-gray-700 font-light mb-1">St. Padre Pio Parish</p>
              <p className="text-gray-600 font-light text-sm mb-4">225 37th Street, Pittsburgh, Pennsylvania 15201</p>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=225+37th+St,+Pittsburgh,+PA+15201" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-900 hover:text-black font-semibold text-sm sm:text-base transition-colors duration-200 inline-flex items-center underline decoration-2 underline-offset-2"
              >
                Open in Google Maps →
              </a>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className="mb-4">
                <h4 className="font-playfair text-lg font-light text-gray-800 tracking-wide">Reception Venue</h4>
              </div>
              <p className="text-gray-700 font-light mb-1">Hilton Garden Inn Southpointe</p>
              <p className="text-gray-600 font-light text-sm mb-4">1000 Corporate Drive, Canonsburg, Pennsylvania 15317</p>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=1000+Corporate+Dr,+Canonsburg,+PA+15317" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-900 hover:text-black font-semibold text-sm sm:text-base transition-colors duration-200 inline-flex items-center underline decoration-2 underline-offset-2"
              >
                Open in Google Maps →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Parking Information */}
      <div className="mb-12">
        <div className="bg-gradient-to-br from-gray-50 to-white p-10 rounded-2xl shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="font-playfair text-4xl font-light text-gray-800 mb-4 tracking-wide">Parking</h2>
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
          </div>
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-playfair text-xl font-light text-gray-800 mb-3 tracking-wide">Church Parking Lot</h3>
              <p className="text-gray-700 font-light leading-relaxed">
                A parking lot is located on 37th Street, directly across from the church entrance, and will be available for guests.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-playfair text-xl font-light text-gray-800 mb-3 tracking-wide">Street Parking</h3>
              <p className="text-gray-700 font-light leading-relaxed">
                Additional street parking is available on nearby side streets in Lawrenceville.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="text-center bg-gradient-to-r from-gray-50 to-white p-8 rounded-2xl border border-gray-100">
        <div className="mb-6">
          <h3 className="font-playfair text-2xl font-light text-gray-800 mb-4 tracking-wide">Questions?</h3>
          <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto mb-4"></div>
        </div>
        <p className="text-gray-600 font-light mb-4">
          We&apos;re here to help with any accommodation questions.
        </p>
        <p className="text-gray-500 font-light italic">
          Ryan & Marsha&apos;s email: rmarzentiwedding@gmail.com
        </p>
      </div>
    </main>
  );
}