import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function KingdomBackground() {
  // Rich gold palette
  const gold = {
    bright: '#ffd700',
    light: '#f4e4a6',
    primary: '#d4af37',
    dark: '#b8941f',
    deep: '#8b6914',
    richDark: '#5c4a1f',
  };

  // Generate floating particles
  const particles = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 4,
      opacity: Math.random() * 0.6 + 0.2,
    }));
  }, []);

  // Generate geometric diamond grid positions
  const diamonds = useMemo(() => {
    const items = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 12; col++) {
        if (Math.random() > 0.7) {
          items.push({
            id: `${row}-${col}`,
            x: col * 9 + (row % 2) * 4.5,
            y: row * 14,
            size: Math.random() * 20 + 10,
            delay: Math.random() * 3,
            duration: Math.random() * 4 + 6,
          });
        }
      }
    }
    return items;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Deep base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 0%, ${gold.richDark}40 0%, transparent 50%),
            radial-gradient(ellipse 80% 40% at 50% 100%, ${gold.deep}20 0%, transparent 40%),
            linear-gradient(180deg, #0a0804 0%, #000000 100%)
          `
        }}
      />

      {/* Main crown rays - dramatic gold light burst */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          {/* Rich gold ray gradient */}
          <linearGradient id="kingRay" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={gold.bright} stopOpacity="0.7" />
            <stop offset="10%" stopColor={gold.primary} stopOpacity="0.4" />
            <stop offset="40%" stopColor={gold.dark} stopOpacity="0.15" />
            <stop offset="100%" stopColor={gold.deep} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="kingRayBright" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={gold.bright} stopOpacity="0.9" />
            <stop offset="15%" stopColor={gold.light} stopOpacity="0.5" />
            <stop offset="50%" stopColor={gold.primary} stopOpacity="0.2" />
            <stop offset="100%" stopColor={gold.dark} stopOpacity="0" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="kingGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#kingGlow)">
          {/* Central crown ray - the king's light */}
          <motion.polygon
            points="47,-5 53,-5 58,100 42,100"
            fill="url(#kingRayBright)"
            animate={{ opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Crown point rays - 7 rays like a royal crown */}
          {[-42, -28, -14, 0, 14, 28, 42].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const width = i === 3 ? 4 : 2.5;
            const x1 = 50 - width;
            const x2 = 50 + width;
            const spread = 6 + Math.abs(angle) / 7;
            const x3 = 50 + spread + Math.tan(rad) * 100;
            const x4 = 50 - spread + Math.tan(rad) * 100;

            return (
              <motion.polygon
                key={i}
                points={`${x1},-5 ${x2},-5 ${x3},100 ${x4},100`}
                fill="url(#kingRay)"
                animate={{ opacity: [0.2 + (i === 3 ? 0.2 : 0), 0.5 + (i === 3 ? 0.2 : 0), 0.2 + (i === 3 ? 0.2 : 0)] }}
                transition={{
                  duration: 5 + i * 0.3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.2
                }}
              />
            );
          })}
        </g>
      </svg>

      {/* Crown silhouette at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl">
        <svg viewBox="0 0 500 80" className="w-full" preserveAspectRatio="xMidYMin slice">
          <defs>
            <linearGradient id="crownFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gold.bright} stopOpacity="0.25" />
              <stop offset="50%" stopColor={gold.primary} stopOpacity="0.1" />
              <stop offset="100%" stopColor={gold.dark} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="crownStroke" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gold.bright} stopOpacity="0.6" />
              <stop offset="100%" stopColor={gold.primary} stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 50,80 L 100,25 L 150,55 L 200,15 L 250,45 L 300,15 L 350,55 L 400,25 L 450,80 Z"
            fill="url(#crownFill)"
            stroke="url(#crownStroke)"
            strokeWidth="1.5"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Crown jewel points */}
          {[100, 200, 250, 300, 400].map((x, i) => (
            <motion.circle
              key={i}
              cx={x}
              cy={i === 2 ? 15 : i % 2 === 0 ? 25 : 15}
              r={i === 2 ? 4 : 3}
              fill={gold.bright}
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            />
          ))}
        </svg>
      </div>

      {/* Geometric diamond pattern overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        <defs>
          <pattern id="diamondGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <polygon
              points="30,0 60,30 30,60 0,30"
              fill="none"
              stroke={gold.primary}
              strokeWidth="0.5"
              opacity="0.4"
            />
            <polygon
              points="30,15 45,30 30,45 15,30"
              fill="none"
              stroke={gold.dark}
              strokeWidth="0.3"
              opacity="0.3"
            />
          </pattern>
          <linearGradient id="gridFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="50%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="gridMask">
            <rect width="100%" height="100%" fill="url(#gridFade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#diamondGrid)" mask="url(#gridMask)" />
      </svg>

      {/* Animated floating diamonds */}
      {diamonds.map((diamond) => (
        <motion.div
          key={diamond.id}
          className="absolute"
          style={{
            left: `${diamond.x}%`,
            top: `${diamond.y}%`,
            width: diamond.size,
            height: diamond.size,
            transform: 'rotate(45deg)',
          }}
          animate={{
            opacity: [0.05, 0.2, 0.05],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: diamond.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: diamond.delay,
          }}
        >
          <div
            className="w-full h-full border"
            style={{ borderColor: `${gold.primary}60` }}
          />
        </motion.div>
      ))}

      {/* Large geometric accent triangles */}
      <motion.div
        className="absolute top-[10%] left-[5%]"
        animate={{ opacity: [0.05, 0.15, 0.05], rotate: [0, 5, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="120" height="104" viewBox="0 0 120 104">
          <polygon
            points="60,0 120,104 0,104"
            fill="none"
            stroke={gold.primary}
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>
      </motion.div>
      <motion.div
        className="absolute top-[15%] right-[8%]"
        animate={{ opacity: [0.08, 0.2, 0.08], rotate: [0, -5, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <svg width="100" height="87" viewBox="0 0 100 87">
          <polygon
            points="50,0 100,87 0,87"
            fill={`${gold.primary}08`}
            stroke={gold.dark}
            strokeWidth="1"
            opacity="0.6"
          />
        </svg>
      </motion.div>

      {/* Hexagon accents */}
      <motion.div
        className="absolute bottom-[25%] left-[12%]"
        animate={{ opacity: [0.1, 0.25, 0.1], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="80" height="92" viewBox="0 0 80 92">
          <polygon
            points="40,0 80,23 80,69 40,92 0,69 0,23"
            fill="none"
            stroke={gold.primary}
            strokeWidth="1"
            opacity="0.4"
          />
        </svg>
      </motion.div>
      <motion.div
        className="absolute top-[40%] right-[6%]"
        animate={{ opacity: [0.08, 0.18, 0.08], rotate: [0, 10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <svg width="60" height="69" viewBox="0 0 60 69">
          <polygon
            points="30,0 60,17 60,52 30,69 0,52 0,17"
            fill={`${gold.dark}10`}
            stroke={gold.primary}
            strokeWidth="0.8"
            opacity="0.5"
          />
        </svg>
      </motion.div>

      {/* Floating gold particles - increased */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, ${gold.bright} 0%, ${gold.primary} 60%, transparent 100%)`,
            boxShadow: `0 0 ${particle.size * 3}px ${gold.primary}80`,
          }}
          animate={{
            y: [0, -20 - Math.random() * 20, 0],
            x: [0, (Math.random() - 0.5) * 10, 0],
            opacity: [particle.opacity * 0.3, particle.opacity, particle.opacity * 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: particle.delay,
          }}
        />
      ))}

      {/* Large ambient gold orbs */}
      <motion.div
        className="absolute top-[15%] left-[20%] w-64 h-64 rounded-full"
        style={{
          background: `radial-gradient(circle, ${gold.primary}15 0%, ${gold.dark}08 30%, transparent 60%)`,
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[30%] right-[15%] w-48 h-48 rounded-full"
        style={{
          background: `radial-gradient(circle, ${gold.light}12 0%, ${gold.primary}06 40%, transparent 70%)`,
          filter: 'blur(50px)',
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="absolute bottom-[20%] left-[30%] w-56 h-56 rounded-full"
        style={{
          background: `radial-gradient(circle, ${gold.primary}10 0%, transparent 60%)`,
          filter: 'blur(70px)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />

      {/* Corner geometric frames */}
      <div className="absolute top-8 left-8 w-32 h-32">
        <motion.svg viewBox="0 0 100 100" className="w-full h-full" animate={{ opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 6, repeat: Infinity }}>
          <path d="M 0,30 L 0,0 L 30,0" fill="none" stroke={gold.primary} strokeWidth="1" />
          <path d="M 0,20 L 0,10 L 10,10 L 10,0 L 20,0" fill="none" stroke={gold.dark} strokeWidth="0.5" opacity="0.5" />
        </motion.svg>
      </div>
      <div className="absolute top-8 right-8 w-32 h-32">
        <motion.svg viewBox="0 0 100 100" className="w-full h-full" animate={{ opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }}>
          <path d="M 100,30 L 100,0 L 70,0" fill="none" stroke={gold.primary} strokeWidth="1" />
          <path d="M 100,20 L 100,10 L 90,10 L 90,0 L 80,0" fill="none" stroke={gold.dark} strokeWidth="0.5" opacity="0.5" />
        </motion.svg>
      </div>

      {/* Horizontal gold accent lines */}
      <motion.div
        className="absolute top-[35%] left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${gold.primary}30 20%, ${gold.bright}50 50%, ${gold.primary}30 80%, transparent 100%)` }}
        animate={{ opacity: [0.1, 0.3, 0.1], scaleX: [0.8, 1, 0.8] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[65%] left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${gold.dark}25 30%, ${gold.primary}40 50%, ${gold.dark}25 70%, transparent 100%)` }}
        animate={{ opacity: [0.08, 0.2, 0.08], scaleX: [0.9, 1, 0.9] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 30%, transparent 0%, rgba(0,0,0,0.6) 100%)`
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[45%]"
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 40%, transparent 100%)`
        }}
      />

      {/* Premium noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
