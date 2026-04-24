"use client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import React, { useRef, useState, useEffect, useCallback } from "react";

type BeamOptions = {
  initialX?: number;
  translateX?: number;
  initialY?: number;
  translateY?: number;
  rotate?: number;
  className?: string;
  duration?: number;
  delay?: number;
  repeatDelay?: number;
};

type Collision = {
  id: number;
  x: number;
  y: number;
};

const BEAMS: BeamOptions[] = [
  { initialX: 10, translateX: 10, duration: 7, repeatDelay: 3, delay: 2 },
  { initialX: 600, translateX: 600, duration: 3, repeatDelay: 3, delay: 4 },
  { initialX: 100, translateX: 100, duration: 7, repeatDelay: 7, className: "h-6" },
  { initialX: 400, translateX: 400, duration: 5, repeatDelay: 14, delay: 4 },
  { initialX: 800, translateX: 800, duration: 11, repeatDelay: 2, className: "h-20" },
  { initialX: 1000, translateX: 1000, duration: 4, repeatDelay: 2, className: "h-12" },
  { initialX: 1200, translateX: 1200, duration: 6, repeatDelay: 4, delay: 2, className: "h-6" },
];

const COLLISION_CHECK_MS = 500;
const COLLISION_LIFETIME_MS = 2000;

export const BackgroundBeamsWithCollision = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const beamRefs = useRef<Array<HTMLDivElement | null>>([]);
  const collidedRef = useRef<boolean[]>(BEAMS.map(() => false));
  const timeoutsRef = useRef<Set<number>>(new Set());
  const [beamKeys, setBeamKeys] = useState<number[]>(() => BEAMS.map(() => 0));
  const [collisions, setCollisions] = useState<Collision[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const beamSetters = useRef(
    BEAMS.map((_, i) => (el: HTMLDivElement | null) => {
      beamRefs.current[i] = el;
    })
  ).current;

  const addCollision = useCallback((index: number, x: number, y: number) => {
    if (collidedRef.current[index]) return;
    collidedRef.current[index] = true;
    const id = Date.now() + index;
    setCollisions((prev) => [...prev, { id, x, y }]);

    const timeoutId = window.setTimeout(() => {
      timeoutsRef.current.delete(timeoutId);
      setCollisions((prev) => prev.filter((c) => c.id !== id));
      setBeamKeys((prev) => prev.map((v, idx) => (idx === index ? v + 1 : v)));
      collidedRef.current[index] = false;
    }, COLLISION_LIFETIME_MS);
    timeoutsRef.current.add(timeoutId);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    let rafId = 0;
    let lastCheck = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (document.visibilityState !== "visible") return;
      if (now - lastCheck < COLLISION_CHECK_MS) return;
      lastCheck = now;

      const container = containerRef.current;
      const parent = parentRef.current;
      if (!container || !parent) return;

      const containerRect = container.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();

      for (let i = 0; i < beamRefs.current.length; i++) {
        if (collidedRef.current[i]) continue;
        const beam = beamRefs.current[i];
        if (!beam) continue;
        const rect = beam.getBoundingClientRect();
        if (rect.bottom >= containerRect.top) {
          const x = rect.left - parentRect.left + rect.width / 2;
          const y = rect.bottom - parentRect.top;
          addCollision(i, x, y);
        }
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current.clear();
    };
  }, [addCollision, prefersReducedMotion]);

  return (
    <div
      ref={parentRef}
      className={cn(
        "h-96 md:h-[40rem] relative flex items-center w-full justify-center overflow-hidden",
        className
      )}
      style={{ backgroundColor: "var(--page-bg)" }}
    >
      {BEAMS.map((beam, i) => (
        <Beam
          key={`${beam.initialX}-${beamKeys[i]}`}
          beamOptions={beam}
          setRef={beamSetters[i]}
        />
      ))}

      {children}

      <div
        ref={containerRef}
        className="absolute bottom-0 w-full inset-x-0 pointer-events-none"
        style={{
          backgroundColor: "var(--page-bg)",
          boxShadow:
            "0 0 24px rgba(91, 141, 217, 0.06), 0 1px 1px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(91, 141, 217, 0.04), 0 0 4px rgba(91, 141, 217, 0.08), 0 16px 68px rgba(62, 107, 181, 0.05), 0 1px 0 rgba(255, 255, 255, 0.05) inset",
        }}
      />

      <AnimatePresence>
        {collisions.map((c) => (
          <Explosion
            key={c.id}
            style={{
              position: "absolute",
              left: `${c.x}px`,
              top: `${c.y}px`,
              transform: "translate(-50%, -50%)",
              zIndex: 50,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const Beam = ({
  beamOptions,
  setRef,
}: {
  beamOptions: BeamOptions;
  setRef: (el: HTMLDivElement | null) => void;
}) => {
  return (
    <motion.div
      ref={setRef}
      animate="animate"
      initial={{
        translateY: beamOptions.initialY || "-200px",
        translateX: beamOptions.initialX || "0px",
        rotate: beamOptions.rotate || 0,
      }}
      variants={{
        animate: {
          translateY: beamOptions.translateY || "1800px",
          translateX: beamOptions.translateX || "0px",
          rotate: beamOptions.rotate || 0,
        },
      }}
      transition={{
        duration: beamOptions.duration || 8,
        repeat: Infinity,
        repeatType: "loop",
        ease: "linear",
        delay: beamOptions.delay || 0,
        repeatDelay: beamOptions.repeatDelay || 0,
      }}
      className={cn(
        "absolute left-0 top-20 m-auto h-14 w-px rounded-full bg-gradient-to-t from-[#5B8DD9] via-[#3E6BB5] to-transparent",
        beamOptions.className
      )}
    />
  );
};

const Explosion = ({ style }: { style?: React.CSSProperties }) => {
  const spans = React.useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        id: index,
        directionX: Math.floor(Math.random() * 80 - 40),
        directionY: Math.floor(Math.random() * -50 - 10),
        duration: Math.random() * 1.5 + 0.5,
      })),
    []
  );

  return (
    <div style={style} className="absolute z-50 h-2 w-2">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute -inset-x-10 top-0 m-auto h-2 w-10 rounded-full bg-gradient-to-r from-transparent via-[#5B8DD9] to-transparent blur-sm"
      />
      {spans.map((span) => (
        <motion.span
          key={span.id}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: span.directionX, y: span.directionY, opacity: 0 }}
          transition={{ duration: span.duration, ease: "easeOut" }}
          className="absolute h-1 w-1 rounded-full bg-gradient-to-b from-[#5B8DD9] to-[#3E6BB5]"
        />
      ))}
    </div>
  );
};
