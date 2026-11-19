"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface WaveformTimelineProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  songKey: string;
  onSeek: (seconds: number) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// Deterministic pseudo-random generator seeded by songKey string
function getBarsProfile(seedStr: string, count: number = 72): number[] {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }

  const bars: number[] = [];
  let prev = 0.4;
  for (let i = 0; i < count; i++) {
    // Linear congruential generator step
    hash = (hash * 1664525 + 1013904223) | 0;
    const rand = Math.abs(hash) / 2147483647;
    // Smooth transitions between adjacent bars
    const target = 0.2 + rand * 0.75;
    prev = prev * 0.4 + target * 0.6;
    bars.push(Math.max(0.18, Math.min(1.0, prev)));
  }
  return bars;
}

export default function WaveformTimeline({
  currentTime,
  duration,
  isPlaying,
  songKey,
  onSeek,
}: WaveformTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);

  // Generate unique waveform geometry for the current track
  const baseBarsRef = useRef<number[]>([]);
  useEffect(() => {
    baseBarsRef.current = getBarsProfile(songKey || "harmonify", 72);
  }, [songKey]);

  // Main canvas render function
  const render = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Read accent color from CSS
      let accent = "#22c55e";
      if (typeof window !== "undefined") {
        const computed = getComputedStyle(document.body).getPropertyValue("--accent").trim();
        if (computed) accent = computed;
      }

      const bars = baseBarsRef.current.length > 0 ? baseBarsRef.current : getBarsProfile("song", 72);
      const totalBars = bars.length;
      const gap = 2;
      const barWidth = Math.max(2, (width - (totalBars - 1) * gap) / totalBars);
      const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
      const hoverRatio = hoverTime !== null && duration > 0 ? Math.min(1, Math.max(0, hoverTime / duration)) : null;

      // Harmonic oscillation time for the wave animation
      const t = timestamp * 0.0035;

      for (let i = 0; i < totalBars; i++) {
        const barRatio = i / (totalBars - 1);
        const x = i * (barWidth + gap);

        // Animated wave modulation when music is playing
        let waveMultiplier = 1;
        if (isPlaying) {
          const sine1 = Math.sin(t * 1.5 + i * 0.22);
          const sine2 = Math.cos(t * 2.2 + i * 0.15);
          waveMultiplier = 0.8 + 0.35 * sine1 + 0.15 * sine2;
        }

        const barHeight = Math.max(4, bars[i] * height * 0.85 * waveMultiplier);
        const y = (height - barHeight) / 2;
        const radius = barWidth / 2;

        const isPlayed = barRatio <= progressRatio;
        const isHoveredPast = hoverRatio !== null && barRatio <= hoverRatio && !isPlayed;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, radius);

        if (isPlayed) {
          ctx.fillStyle = accent;
          if (isPlaying) {
            ctx.shadowColor = accent;
            ctx.shadowBlur = 6;
          }
        } else if (isHoveredPast) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw subtle playhead knob at exact current position
      const playheadX = progressRatio * width;
      ctx.beginPath();
      ctx.arc(playheadX, height / 2, isHovered ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 4;
      ctx.fill();

      ctx.restore();

      if (isPlaying) {
        animRef.current = requestAnimationFrame(render);
      }
    },
    [currentTime, duration, isPlaying, hoverTime, isHovered]
  );

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [render]);

  const calculateTimeFromX = useCallback(
    (clientX: number): number => {
      const canvas = canvasRef.current;
      if (!canvas || !duration) return 0;
      const rect = canvas.getBoundingClientRect();
      const pos = Math.max(0, Math.min(clientX - rect.left, rect.width));
      return (pos / rect.width) * duration;
    },
    [duration]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    const newTime = calculateTimeFromX(e.clientX);
    onSeek(newTime);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverX(x);
    const time = calculateTimeFromX(e.clientX);
    setHoverTime(time);

    if (isDraggingRef.current) {
      onSeek(time);
    }
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoverTime(null);
    isDraggingRef.current = false;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center h-8 cursor-pointer select-none group"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Floating Hover Time Tooltip */}
      {isHovered && hoverTime !== null && (
        <div
          className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded text-[11px] font-bold bg-[#1e1e24] text-white shadow-xl border border-white/10 pointer-events-none transition-transform z-30"
          style={{ left: `${Math.max(16, Math.min(containerRef.current?.clientWidth || 300 - 16, hoverX))}px` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}

      {/* Responsive Waveform Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-7 block"
      />
    </div>
  );
}
