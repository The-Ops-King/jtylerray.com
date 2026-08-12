import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';
import { content } from '../content';
import ShinyText from './ui/ShinyText';
import CountUp from './ui/CountUp';
import KingdomBackground from './ui/KingdomBackground';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut'
    }
  }
};

export default function Hero() {
  const { hero } = content;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-16 py-96 md:px-32">
      {/* Background */}
      <KingdomBackground />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-container-lg mx-auto text-center"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-24">
          <span className="inline-block px-16 py-8 text-small font-medium tracking-wider uppercase bg-accent/10 border border-accent/20 rounded-full text-accent">
            {hero.badge}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-h1 md:text-h1-lg font-black mb-24 leading-tight"
        >
          <ShinyText text={hero.headline} />
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="text-body-lg md:text-h4 text-fg-muted max-w-3xl mx-auto mb-16"
        >
          {hero.subheadline}
        </motion.p>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-body md:text-body-lg text-fg-muted/80 max-w-2xl mx-auto mb-40"
        >
          {hero.description}
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-16 justify-center items-center mb-80"
        >
          <a
            href={hero.cta.primary.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-8 px-28 py-16 bg-accent hover:bg-accent-dark text-bg font-semibold rounded-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/20"
          >
            {hero.cta.primary.text}
            <ArrowRight className="w-20 h-20 transition-transform group-hover:translate-x-4" />
          </a>

          <a
            href={hero.cta.secondary.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-8 px-28 py-16 border border-border hover:border-accent/50 text-fg font-semibold rounded-card transition-all duration-300 hover:-translate-y-1"
          >
            <Mail className="w-20 h-20" />
            {hero.cta.secondary.text}
          </a>
        </motion.div>

        {/* Secondary link to the sales operations work / resume page */}
        <motion.div variants={itemVariants} className="mb-80 -mt-40">
          <a
            href="/resume"
            className="group inline-flex items-center gap-4 text-body text-fg-muted hover:text-accent transition-colors duration-300"
          >
            See what I build for sales teams
            <ArrowRight className="w-16 h-16 transition-transform group-hover:translate-x-4" />
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-24 max-w-4xl mx-auto"
        >
          {hero.stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="relative p-24 bg-bg-elevated border border-border rounded-card-lg hover:border-accent/30 transition-colors duration-300 group"
            >
              {/* Stat number */}
              <div className="text-h1 md:text-h1-lg font-black mb-8">
                <CountUp end={stat.value} suffix={stat.suffix} />
              </div>

              {/* Label */}
              <div className="text-h4 font-semibold text-fg mb-4">
                {stat.label}
              </div>

              {/* Description */}
              <div className="text-small text-fg-muted">
                {stat.description}
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-card-lg bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
