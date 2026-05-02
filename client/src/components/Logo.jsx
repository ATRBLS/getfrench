export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
         fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sg" x1="0" y1="80" x2="80" y2="0"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0055A4"/>
          <stop offset="50%"  stopColor="#FFFFFF"/>
          <stop offset="100%" stopColor="#EF4135"/>
        </linearGradient>
      </defs>
      {/* Speech bubble shape */}
      <path d="M10 18 Q10 8 20 8 L60 8 Q70 8 70 18 L70 46 Q70 56 60 56 L48 56 L40 68 L32 56 L20 56 Q10 56 10 46 Z"
            fill="url(#sg)"/>
      {/* Sound bars inside bubble */}
      <rect x="22" y="30" width="5" height="10" rx="2.5" fill="white" opacity="0.95"/>
      <rect x="31" y="24" width="5" height="22" rx="2.5" fill="white" opacity="0.95"/>
      <rect x="40" y="27" width="5" height="16" rx="2.5" fill="white" opacity="0.95"/>
      <rect x="49" y="30" width="5" height="10" rx="2.5" fill="white" opacity="0.95"/>
    </svg>
  )
}
