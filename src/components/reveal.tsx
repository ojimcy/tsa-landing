import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li";
};

export function Reveal({ children, delay = 0, className, as = "div" }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const classes = cn("reveal", visible && "reveal-on", className);
  const style: CSSProperties | undefined =
    visible && delay > 0 ? { animationDelay: `${delay}ms` } : undefined;

  if (as === "li") {
    return (
      <li
        ref={(el) => {
          ref.current = el;
        }}
        className={classes}
        style={style}
      >
        {children}
      </li>
    );
  }

  return (
    <div
      ref={(el) => {
        ref.current = el;
      }}
      className={classes}
      style={style}
    >
      {children}
    </div>
  );
}
