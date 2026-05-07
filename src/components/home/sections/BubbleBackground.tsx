/**
 * BubbleBackground — bold, animated floating orbs for section backgrounds.
 *
 * Uses framer-motion for organic float + pulse + scale cycles.
 * Each bubble is a gradient-filled sphere with heavy blur and glow.
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Bubble {
  id: number;
  size: number; // px
  x: string; // %
  y: string; // %
  color: "cyan" | "fuchsia" | "lime" | "amber" | "violet";
  duration: number; // seconds for one float cycle
  delay: number;
  opacity: number;
}

const COLOR_STOPS: Record<Bubble["color"], { from: string; to: string; glow: string }> = {
  cyan: {
    from: "rgba(6,182,212,0.55)",
    to: "rgba(59,130,246,0.25)",
    glow: "rgba(6,182,212,0.35)",
  },
  fuchsia: {
    from: "rgba(232,121,249,0.50)",
    to: "rgba(168,85,247,0.20)",
    glow: "rgba(232,121,249,0.30)",
  },
  lime: {
    from: "rgba(132,204,22,0.45)",
    to: "rgba(34,197,94,0.18)",
    glow: "rgba(132,204,22,0.28)",
  },
  amber: {
    from: "rgba(251,191,36,0.45)",
    to: "rgba(245,158,11,0.18)",
    glow: "rgba(251,191,36,0.28)",
  },
  violet: {
    from: "rgba(139,92,246,0.50)",
    to: "rgba(124,58,237,0.20)",
    glow: "rgba(139,92,246,0.30)",
  },
};

const BUBBLES: Bubble[] = [
  { id: 1, size: 420, x: "12%", y: "15%", color: "cyan", duration: 14, delay: 0, opacity: 0.9 },
  { id: 2, size: 320, x: "75%", y: "20%", color: "fuchsia", duration: 18, delay: 1.2, opacity: 0.85 },
  { id: 3, size: 280, x: "55%", y: "65%", color: "lime", duration: 16, delay: 2.5, opacity: 0.8 },
  { id: 4, size: 190, x: "30%", y: "75%", color: "violet", duration: 20, delay: 0.8, opacity: 0.75 },
  { id: 5, size: 260, x: "85%", y: "55%", color: "cyan", duration: 15, delay: 3.0, opacity: 0.85 },
  { id: 6, size: 150, x: "45%", y: "30%", color: "amber", duration: 12, delay: 1.5, opacity: 0.7 },
  { id: 7, size: 340, x: "5%", y: "55%", color: "fuchsia", duration: 22, delay: 0.3, opacity: 0.8 },
  { id: 8, size: 200, x: "65%", y: "10%", color: "lime", duration: 17, delay: 2.0, opacity: 0.75 },
  { id: 9, size: 120, x: "90%", y: "85%", color: "violet", duration: 13, delay: 4.0, opacity: 0.65 },
  { id: 10, size: 180, x: "22%", y: "45%", color: "amber", duration: 19, delay: 2.8, opacity: 0.7 },
];

function BubbleOrb({ bubble }: { bubble: Bubble }) {
  const colors = COLOR_STOPS[bubble.color];

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: bubble.size,
        height: bubble.size,
        left: bubble.x,
        top: bubble.y,
        marginLeft: -bubble.size / 2,
        marginTop: -bubble.size / 2,
        background: `radial-gradient(circle at 35% 35%, ${colors.from}, ${colors.to} 60%, transparent 75%)`,
        filter: `blur(${Math.max(2, bubble.size * 0.06)}px)`,
        boxShadow: `0 0 ${bubble.size * 0.5}px ${bubble.size * 0.15}px ${colors.glow}`,
        opacity: bubble.opacity,
        mixBlendMode: "screen",
      }}
      animate={{
        x: [0, 30, -20, 15, 0],
        y: [0, -25, 20, -15, 0],
        scale: [1, 1.08, 0.95, 1.05, 1],
      }}
      transition={{
        duration: bubble.duration,
        delay: bubble.delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

interface BubbleBackgroundProps {
  className?: string;
  bubbleCount?: number; // default all
  intensity?: "subtle" | "normal" | "bold";
}

export function BubbleBackground({
  className,
  bubbleCount,
  intensity = "bold",
}: BubbleBackgroundProps) {
  const bubbles = bubbleCount ? BUBBLES.slice(0, bubbleCount) : BUBBLES;

  const intensityMultiplier = {
    subtle: 0.5,
    normal: 0.8,
    bold: 1.0,
  }[intensity];

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {bubbles.map((b) => (
        <BubbleOrb
          key={b.id}
          bubble={{
            ...b,
            opacity: b.opacity * intensityMultiplier,
          }}
        />
      ))}
    </div>
  );
}

export default BubbleBackground;
