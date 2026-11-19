"use client";

import React, { useEffect, useRef } from "react";
import { useAudio } from "@/context/AudioContext";

export default function AudioVisualizer() {
  const { isPlaying } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const numBars = 32;
    const barWidth = canvas.width / numBars;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
        const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#1ed760";
        ctx.fillStyle = accent;

        const time = Date.now() / 180;
        for (let i = 0; i < numBars; i++) {
          const freq = Math.sin(time + i * 0.35) * 0.5 + 0.5;
          const height = Math.max(4, freq * (canvas.height - 4));
          const x = i * barWidth;
          const y = canvas.height - height;

          ctx.beginPath();
          ctx.roundRect(x + 1, y, barWidth - 2, height, [2, 2, 0, 0]);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  return (
    <div className="w-full h-10 flex items-center justify-center overflow-hidden rounded">
      <canvas ref={canvasRef} width={300} height={40} className="w-full h-full" />
    </div>
  );
}
