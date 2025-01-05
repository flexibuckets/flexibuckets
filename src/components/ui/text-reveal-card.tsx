import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WordRevealCardProps {
  text: string;
  revealWord: string;
  className?: string;
  textColor?: string;
  revealColor?: string;
}

const WordRevealCard = ({
  text,
  revealWord,
  className,
  textColor = "text-zinc-400",
  revealColor = "text-white"
}: WordRevealCardProps) => {
  const [widthPercentage, setWidthPercentage] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [left, setLeft] = useState(0);
  const [isMouseOver, setIsMouseOver] = useState(false);

  useEffect(() => {
    if (cardRef.current && textRef.current) {
      const { left } = cardRef.current.getBoundingClientRect();
      const { width, height } = textRef.current.getBoundingClientRect();
      setLeft(left);
      setDimensions({ width, height });
    }
  }, [text, revealWord]);

  const mouseMoveHandler = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { clientX } = event;
    const { left, width } = cardRef.current.getBoundingClientRect();
    const relativeX = clientX - left;
    setWidthPercentage((relativeX / width) * 100);
  };

  const mouseLeaveHandler = () => {
    setIsMouseOver(false);
    setWidthPercentage(0);
  };

  const mouseEnterHandler = () => {
    setIsMouseOver(true);
  };

  const touchMoveHandler = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { clientX } = event.touches[0];
    const { left, width } = cardRef.current.getBoundingClientRect();
    const relativeX = clientX - left;
    setWidthPercentage((relativeX / width) * 100);
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={mouseEnterHandler}
      onMouseLeave={mouseLeaveHandler}
      onMouseMove={mouseMoveHandler}
      onTouchMove={touchMoveHandler}
      onTouchStart={mouseEnterHandler}
      onTouchEnd={mouseLeaveHandler}
      style={{
        width: dimensions.width || 'auto',
        height: dimensions.height || 'auto'
      }}
      className={cn(
        "relative inline-block overflow-hidden",
        className
      )}
    >
      {/* Base Text - Used for measuring */}
      <span 
        ref={textRef}
        className={cn("invisible", textColor)}
        aria-hidden="true"
      >
        {text.length > revealWord.length ? text : revealWord}
      </span>

      {/* Actual Text Layer */}
      <span className={cn(
        "absolute inset-0 flex items-center justify-center",
        textColor
      )}>
        {text}
      </span>

      {/* Reveal Layer */}
      <motion.div
        animate={
          isMouseOver
            ? {
                opacity: widthPercentage > 0 ? 1 : 0,
                clipPath: `inset(0 ${100 - widthPercentage}% 0 0)`,
              }
            : {
                clipPath: `inset(0 ${100 - widthPercentage}% 0 0)`,
              }
        }
        transition={isMouseOver ? { duration: 0 } : { duration: 0.4 }}
        className="absolute inset-0 flex items-center justify-center z-20"
      >
        <span className={cn(revealColor)}>
          {revealWord}
        </span>
      </motion.div>

      {/* Light bar */}
      <motion.div
        animate={{
          left: `${widthPercentage}%`,
          opacity: widthPercentage > 0 ? 1 : 0,
        }}
        transition={isMouseOver ? { duration: 0 } : { duration: 0.4 }}
        className="h-full w-1 bg-gradient-to-b from-transparent via-white/20 to-transparent absolute z-50"
      />
    </div>
  );
};

export default WordRevealCard;