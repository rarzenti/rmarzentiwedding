'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const images = [
  { src: '/images/nyc.JPG', alt: 'Ryan and Marsha in NYC' },
  { src: '/images/hiking.JPG', alt: 'Ryan and Marsha Hiking' },
  { src: '/images/nycWedding.JPG', alt: 'NYC Wedding' },
  { src: '/images/psuWedding.JPG', alt: 'PSU Wedding' },
  { src: '/images/MR-Engagement-18.jpg', alt: 'Engagement Picture 1' },
  { src: '/images/MR-Engagement-2.jpg', alt: 'Engagement Picture 2' },
  { src: '/images/MR-Engagement-21.jpg', alt: 'Engagement Picture 3' },
  { src: '/images/MR-Engagement-34.jpg', alt: 'Engagement Picture 4' },
  { src: '/images/MR-Engagement-85.jpg', alt: 'Engagement Picture 5' },
  { src: '/images/MR-Engagement-97.jpg', alt: 'Engagement Picture 6' },
];

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownItemProps {
  value: number;
  label: string;
}

function CountdownItem({ value, label }: CountdownItemProps) {
  return (
    <div className="text-center">
      <div className="font-playfair text-3xl md:text-4xl font-semibold text-gray-900">
        {value}
      </div>
      <div className="font-cormorant text-sm md:text-base text-gray-700 tracking-wide uppercase font-medium">
        {label}
      </div>
    </div>
  );
}

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const weddingDate = new Date('2026-05-16T00:00:00');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +weddingDate - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();

    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
  };

  // Auto advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-end">
      <div className="fixed inset-0 w-full h-full flex flex-col z-0">
        {/* Image Slides */}
        <div className="relative w-full h-full flex-1 aspect-[3/4] md:aspect-auto">
          {images.map((image, index) => (
            <div
              key={image.src}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={index === currentSlide || index === (currentSlide + 1) % images.length}
                className={`object-cover ${image.src === '/images/psuWedding.JPG' ? 'object-[center_30%]' : image.src === '/images/nyc.JPG' ? 'object-[center_15%]' : image.src === '/images/MR-Engagement-18.jpg' ? 'object-[center_40%]' : image.src === '/images/hiking.JPG' ? 'object-[25%_center] md:object-[center_20%]' : image.src === '/images/nycWedding.JPG' ? 'object-[center_10%]' : 'object-center'}`}
                quality={95}
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
            </div>
          ))}

          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm transition-all hover:scale-110 z-50"
            aria-label="Previous slide"
          >
            <ChevronLeftIcon className="h-8 w-8 text-white" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm transition-all hover:scale-110 z-50"
            aria-label="Next slide"
          >
            <ChevronRightIcon className="h-8 w-8 text-white" />
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide
                    ? 'bg-white w-4'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Title Overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-4 z-30 pointer-events-none">
            <div className="space-y-4">
              <span className="block font-cormorant text-lg md:text-xl text-white tracking-[0.2em] uppercase drop-shadow-lg">
                The Wedding Of
              </span>
              <h1 className="font-dancing text-7xl md:text-8xl lg:text-9xl text-white drop-shadow-2xl">
                Ryan &amp; Marsha
              </h1>
              <div className="space-y-1">
                <div className="font-playfair text-xl md:text-2xl text-white tracking-widest drop-shadow">
                  May Sixteenth, Two Thousand Twenty-Six
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="absolute bottom-0 left-0 w-full flex justify-center bg-white/90 backdrop-blur-md px-8 py-6 z-40">
          <div className="grid grid-cols-4 gap-8 md:gap-12">
            <CountdownItem value={timeLeft.days} label="Days" />
            <CountdownItem value={timeLeft.hours} label="Hours" />
            <CountdownItem value={timeLeft.minutes} label="Minutes" />
            <CountdownItem value={timeLeft.seconds} label="Seconds" />
          </div>
        </div>
      </div>
    </div>
  );
}
