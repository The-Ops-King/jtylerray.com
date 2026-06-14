import { motion } from 'framer-motion';
import { CSSProperties } from 'react';

interface ShinyTextProps {
  text: string;
  className?: string;
  shimmerWidth?: number;
}

export default function ShinyText({
  text,
  className = '',
  shimmerWidth = 100
}: ShinyTextProps) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`inline-block relative ${className}`}
      style={
        {
          '--shimmer-width': `${shimmerWidth}px`,
        } as CSSProperties
      }
    >
      <span className="relative inline-block bg-gradient-to-r from-accent via-yellow-300 to-accent bg-clip-text text-transparent animate-shimmer bg-[length:200%_100%]">
        {text}
      </span>
    </motion.span>
  );
}
