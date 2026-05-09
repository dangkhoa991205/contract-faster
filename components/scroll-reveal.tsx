"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number; // ms
  direction?: "up" | "left" | "right" | "none";
};

export function ScrollReveal({ children, className = "", delay = 0, direction = "up" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const baseStyle: React.CSSProperties = {
    transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    opacity: visible ? 1 : 0,
    transform: visible
      ? "none"
      : direction === "up" ? "translateY(32px)"
      : direction === "left" ? "translateX(-32px)"
      : direction === "right" ? "translateX(32px)"
      : "none",
  };

  return (
    <div ref={ref} style={baseStyle} className={className}>
      {children}
    </div>
  );
}
