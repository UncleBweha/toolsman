import { useRef, ReactNode } from "react";
import { motion, useInView } from "framer-motion";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Wraps a section to reveal with a stagger fade-in
 * when it enters the viewport.
 */
const AnimatedSection = ({ children, className = "", delay = 0 }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedSection;
