
import React from 'react';
import { Theme } from '../../types';

interface LogoCarouselProps {
  theme: Theme;
  className?: string;
}

const LogoCarousel: React.FC<LogoCarouselProps> = ({ theme, className = "" }) => {
  const isDark = theme === 'dark';
  
  const logos = [
    { name: "Next.js", src: isDark ? "/imgs/logos/Nextwhite.png" : "/imgs/logos/Nextbalck.svg", alt: "Next.js" },
    { name: "TailwindCSS", src: isDark ? "/imgs/logos/Tailwindwhite.svg" : "/imgs/logos/Tailwindblack.svg", alt: "TailwindCSS" },
    { name: "React", src: isDark ? "/imgs/logos/Reactwhite.svg" : "/imgs/logos/Reactblack.svg", alt: "React" },
    { name: "TypeScript", src: isDark ? "/imgs/logos/TSwhite.svg" : "/imgs/logos/TSblack.svg", alt: "TypeScript" },
  ];
  
  return (
    <div className={`relative mt-8 w-full ${className}`}>
      <style>{`
        @keyframes logo-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .logo-marquee {
          animation: logo-marquee 30s linear infinite;
        }
      `}</style>
      <div 
        className="group relative w-full overflow-hidden bg-transparent" 
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, transparent 20%, black 35%, black 65%, transparent 80%, transparent 100%)'
        }}
      >
        <div className="logo-marquee flex">
          {/* First set of logos */}
          {logos.map((logo, idx) => (
            <span key={`first-${idx}`} className="inline-block px-3 md:px-6 flex-shrink-0">
              <span className="flex h-12 w-24 items-center justify-center transition-all duration-300 md:h-16 md:w-32">
                <span className="text-2xl font-bold opacity-50">{logo.name}</span>
              </span>
            </span>
          ))}
          
          {/* Second set of logos - following the first set */}
          {logos.map((logo, idx) => (
            <span key={`second-${idx}`} className="inline-block px-3 md:px-6 flex-shrink-0">
              <span className="flex h-12 w-24 items-center justify-center transition-all duration-300 md:h-16 md:w-32">
                <span className="text-2xl font-bold opacity-50">{logo.name}</span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogoCarousel;
