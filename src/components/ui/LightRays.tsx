import { motion } from 'framer-motion';

interface LightRaysProps {
  raysColor?: string;
  rayLength?: number;
}

export default function LightRays({
  raysColor = '#cecece',
  rayLength = 1000
}: LightRaysProps) {
  // Define rays emanating from top center
  // Each ray has: angle (from vertical), width at base, opacity
  const rays = [
    { angle: -45, width: 8, opacity: 0.12, delay: 0 },
    { angle: -35, width: 4, opacity: 0.08, delay: 0.3 },
    { angle: -25, width: 6, opacity: 0.15, delay: 0.1 },
    { angle: -15, width: 3, opacity: 0.06, delay: 0.5 },
    { angle: -8, width: 5, opacity: 0.1, delay: 0.2 },
    { angle: 0, width: 10, opacity: 0.18, delay: 0 },
    { angle: 8, width: 5, opacity: 0.1, delay: 0.4 },
    { angle: 15, width: 3, opacity: 0.06, delay: 0.6 },
    { angle: 25, width: 6, opacity: 0.15, delay: 0.15 },
    { angle: 35, width: 4, opacity: 0.08, delay: 0.35 },
    { angle: 45, width: 8, opacity: 0.12, delay: 0.05 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Top center glow source */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 0%, ${raysColor}30 0%, ${raysColor}15 20%, ${raysColor}05 50%, transparent 80%)`
        }}
      />

      {/* Light rays container */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ filter: 'blur(1px)' }}
      >
        <defs>
          {/* Gradient for rays - bright at source, fading out */}
          <linearGradient id="rayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={raysColor} stopOpacity="0.9" />
            <stop offset="15%" stopColor={raysColor} stopOpacity="0.5" />
            <stop offset="50%" stopColor={raysColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={raysColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Render each ray as a polygon from top center */}
        {rays.map((ray, index) => {
          const centerX = 50; // center of viewBox
          const topY = -2; // slightly above top for seamless source
          const length = 100; // full height of viewBox (will be stretched by preserveAspectRatio="none")

          // Calculate endpoints for the ray (trapezoid shape)
          const angleRad = (ray.angle * Math.PI) / 180;

          // Width increases based on rayLength prop (higher = wider spread)
          const widthMultiplier = rayLength / 100;
          const spreadFactor = (0.8 + (Math.abs(ray.angle) / 45) * 2) * widthMultiplier;

          // Top point (narrow at source)
          const topWidth = ray.width * 0.2;
          // Bottom points (wider as they extend)
          const bottomWidth = ray.width * spreadFactor;

          // Calculate x positions based on angle
          const tanAngle = Math.tan(angleRad);
          const x1 = centerX - topWidth / 2;
          const x2 = centerX + topWidth / 2;
          const x3 = centerX + bottomWidth / 2 + tanAngle * length;
          const x4 = centerX - bottomWidth / 2 + tanAngle * length;

          return (
            <motion.polygon
              key={index}
              points={`${x1},${topY} ${x2},${topY} ${x3},${length} ${x4},${length}`}
              fill="url(#rayGradient)"
              opacity={ray.opacity}
              animate={{
                opacity: [ray.opacity * 0.6, ray.opacity, ray.opacity * 0.6]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: ray.delay
              }}
            />
          );
        })}
      </svg>

      {/* Additional ambient rays with more blur for depth */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full"
        style={{ filter: 'blur(30px)' }}
      >
        {/* Central bright ray */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 origin-top"
          style={{
            width: '8px',
            height: '120%',
            background: `linear-gradient(to bottom, ${raysColor} 0%, ${raysColor}40 30%, ${raysColor}10 70%, transparent 100%)`
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Left angled ray */}
        <motion.div
          className="absolute top-0 left-1/2 origin-top"
          style={{
            width: '6px',
            height: '130%',
            background: `linear-gradient(to bottom, ${raysColor} 0%, ${raysColor}30 40%, transparent 100%)`,
            transform: 'translateX(-50%) rotate(-18deg)'
          }}
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />

        {/* Right angled ray */}
        <motion.div
          className="absolute top-0 left-1/2 origin-top"
          style={{
            width: '6px',
            height: '130%',
            background: `linear-gradient(to bottom, ${raysColor} 0%, ${raysColor}30 40%, transparent 100%)`,
            transform: 'translateX(-50%) rotate(18deg)'
          }}
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        {/* Far left ray */}
        <motion.div
          className="absolute top-0 left-1/2 origin-top"
          style={{
            width: '4px',
            height: '140%',
            background: `linear-gradient(to bottom, ${raysColor}90 0%, ${raysColor}25 50%, transparent 100%)`,
            transform: 'translateX(-50%) rotate(-35deg)'
          }}
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />

        {/* Far right ray */}
        <motion.div
          className="absolute top-0 left-1/2 origin-top"
          style={{
            width: '4px',
            height: '140%',
            background: `linear-gradient(to bottom, ${raysColor}90 0%, ${raysColor}25 50%, transparent 100%)`,
            transform: 'translateX(-50%) rotate(35deg)'
          }}
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        />
      </div>

      {/* Geometric accent elements (subtle, secondary) */}
      <motion.div
        className="absolute top-[20%] right-[15%] w-16 h-16 border border-accent/10"
        style={{ transform: 'rotate(45deg)' }}
        animate={{ opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[25%] left-[12%] w-12 h-12 border border-accent/10"
        style={{ transform: 'rotate(45deg)' }}
        animate={{ opacity: [0.08, 0.18, 0.08] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Subtle grid overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <defs>
          <pattern id="subtleGrid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke={raysColor} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#subtleGrid)" />
      </svg>

      {/* Bottom fade to ensure content visibility */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[40%]"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)'
        }}
      />
    </div>
  );
}
