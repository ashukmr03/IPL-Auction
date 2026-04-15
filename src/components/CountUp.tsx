"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  duration?: number;
  decimals?: number;
};

export default function CountUp({
  value,
  duration = 1000,
  decimals = 2,
}: CountUpProps) {
  const [display, setDisplay] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    // Run only once on mount
    if (hasRun.current) return;
    hasRun.current = true;

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Cubic ease-out: fast start, smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // SSR: render final value to avoid hydration mismatch
  // Client: display animated value (null until useEffect fires, then animates)
  if (display === null) return <>{value.toFixed(decimals)}</>;

  return <>{display.toFixed(decimals)}</>;
}
