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
      <h1 className="font-playfair text-4xl font-bold text-gray-900 mb-8 text-center">Wedding Details</h1>
      
      {/* Date */}
      <div className="text-center mb-12">
        <h2 className="font-playfair text-2xl font-semibold text-gray-800 mb-2">Save the Date</h2>
        <p className="text-xl text-gray-700">Saturday, May 16, 2026</p>
        <button
          onClick={handleAddToCalendar}
          className="mt-4 bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Add to Calendar
        </button>
      </div>

      {/* Ceremony */}
      <div className="mb-12">
        <h2 className="font-playfair text-2xl font-semibold text-gray-800 mb-4">Ceremony</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold text-xl mb-2 text-gray-900">St. Padre Pio Parish</h3>
          <p className="text-gray-900 mb-2 font-medium">225 37th St, Pittsburgh, PA 15201</p>
          <p className="text-gray-900 font-bold text-lg">2:00 PM</p>
          <p className="text-gray-800 mt-2 text-sm font-medium">The ceremony will begin promptly at 2:00 PM and is expected to last about 45 minutes</p>
        </div>
      </div>

      {/* Reception */}
      <div className="mb-12">
        <h2 className="font-playfair text-2xl font-semibold text-gray-800 mb-4">Reception</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-bold text-xl mb-2 text-gray-900">Hilton Garden Inn Southpointe</h3>
          <p className="text-gray-900 mb-3 font-medium">1000 Corporate Dr, Canonsburg, PA 15317</p>
          <div className="space-y-1">
            <p className="text-gray-900 font-bold text-lg">Cocktail Hour: 5:00 - 6:00 PM</p>
            <p className="text-gray-900 font-bold text-lg">Reception: 6:00 - 10:00 PM</p>
          </div>
          <p className="text-gray-800 mt-3 text-sm font-medium">Dinner and dancing to follow cocktails</p>
        </div>
      </div>

      {/* After Party */}
      <div className="mb-12">
        <h2 className="font-playfair text-2xl font-semibold text-gray-800 mb-4">After Party</h2>
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-400">
          <h3 className="font-bold text-xl mb-2 text-gray-900">Jackson&apos;s Restaurant & Bar</h3>
          <p className="text-gray-900 mb-3 font-medium">1000 Corporate Dr, Canonsburg, PA 15317 (Next to the Hilton)</p>
          <p className="text-gray-900 font-bold text-lg">10:00 PM - 1:30 AM</p>
          <p className="text-gray-800 mt-3 text-sm font-medium">Keep the celebration going! Join us for drinks and more fun right next door.</p>
        </div>
      </div>

      {/* Transportation Note */}
      <div className="mb-12">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Transportation Between Venues</h3>
              <p className="text-blue-800">
                Please note that you will need to drive from the ceremony to the reception venue. 
                The drive is approximately 30 minutes. We recommend carpooling with other guests if possible!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What to do between ceremony and reception */}
      <div className="mb-12">
        <h2 className="font-playfair text-2xl font-semibold text-gray-800 mb-4">Between Ceremony & Reception</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="text-gray-700 mb-4">
            There&apos;s a 3-hour gap between the ceremony and reception. Here are some great options to explore in the area:
          </p>
          
          <h3 className="font-semibold text-lg mb-3 text-gray-800">Pubs & Restaurants in Lawrenceville</h3>
          <ul className="text-gray-700 space-y-2 mb-6">
            <li>• <strong>Cork Harbor Pub</strong> - Have a cheeky pint in a proper Irish pub</li>
            <li>• <strong>Industry Public House</strong> - Gastropub with craft beer and elevated pub fare</li>
            <li>• <strong>Long Story Short</strong> - Sandwich shop with great beers</li>
            <li>• <strong>Espresso A Mano</strong> - Get a quick boost with a shot of espresso</li>

            

          </ul>

          <h3 className="font-semibold text-lg mb-3 text-gray-800">Things to Do</h3>
          <ul className="text-gray-700 space-y-2 mb-6">
            <li>• Explore the trendy shops and galleries on Butler Street</li>
            <li>• Take photos at Arsenal Park</li>
          </ul>

          <h3 className="font-semibold text-lg mb-3 text-gray-800">Near the Reception Venue</h3>
          <p className="text-gray-700">
            <strong>Jackson&apos;s Restaurant & Bar</strong> is conveniently located right next to the Hilton Garden Inn Southpointe. 
            It&apos;s a perfect spot to grab drinks or a bite before the reception begins!
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="mb-12">
        <h2 className="font-playfair text-2xl font-semibold text-gray-800 mb-4">Venue Locations</h2>
        <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ height: '500px' }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d98467.67901766938!2d-80.35449435820312!3d40.383671800000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x8834f20c32b85095%3A0x7c2f6df1bdbb5f2a!2s225%2037th%20St%2C%20Pittsburgh%2C%20PA%2015201!3m2!1d40.465939999999996!2d-79.96113!4m5!1s0x8834c7d8e1a5e40b%3A0x4e5b9c7e8f9a0b1c!2s1000%20Corporate%20Dr%2C%20Canonsburg%2C%20PA%2015317!3m2!1d40.282838!2d-80.171637!5e0!3m2!1sen!2sus!4v1699999999999!5m2!1sen!2sus"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Wedding Venue Locations - Directions from Ceremony to Reception"
          ></iframe>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="mb-2">
              <span className="font-semibold">Ceremony Venue</span>
            </div>
            <p className="text-sm text-gray-700 mb-1">St. Padre Pio Parish</p>
            <p className="text-sm text-gray-600">225 37th St, Pittsburgh, PA 15201</p>
            <a 
              href="https://www.google.com/maps/search/?api=1&query=225+37th+St,+Pittsburgh,+PA+15201" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm mt-1 inline-block"
            >
              Open in Google Maps →
            </a>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="mb-2">
              <span className="font-semibold">Reception Venue</span>
            </div>
            <p className="text-sm text-gray-700 mb-1">Hilton Garden Inn Southpointe</p>
            <p className="text-sm text-gray-600">1000 Corporate Dr, Canonsburg, PA 15317</p>
            <a 
              href="https://www.google.com/maps/search/?api=1&query=1000+Corporate+Dr,+Canonsburg,+PA+15317" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm mt-1 inline-block"
            >
              Open in Google Maps →
            </a>
          </div>
        </div>
      </div>

    </main>
  );
}
