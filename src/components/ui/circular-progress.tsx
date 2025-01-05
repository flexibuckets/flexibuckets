import { cn } from "@/lib/utils";
import { useSpring, animated } from "@react-spring/web";

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CircularProgress({
  progress,
  size = 24,
  strokeWidth = 2,
  className
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  const springProps = useSpring({
    from: { offset: circumference },
    to: { offset: circumference - (progress / 100) * circumference },
    config: { tension: 120, friction: 14 }
  });

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          className="text-muted-foreground/20"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <animated.circle
          className="text-primary transition-all duration-300 ease-in-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={springProps.offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
    </div>
  );
}