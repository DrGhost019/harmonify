"use client";

import React, { useEffect, useRef } from "react";
import { useAudio } from "@/context/AudioContext";

class AmbientStar {
  x: number = 0;
  y: number = 0;
  size: number = 1;
  speed: number = 1;
  opacity: number = 0.5;
  twinkleSpeed: number = 0.01;
  twinkleDirection: number = 1;

  constructor(width: number, height: number, initial: boolean = false) {
    this.reset(width, height, initial);
  }

  reset(width: number, height: number, initial: boolean = false) {
    this.x = Math.random() * width;
    this.y = initial ? Math.random() * height : -10;
    this.size = Math.random() * 2.2 + 0.8;
    this.speed = Math.random() * 1.5 + 0.5;
    this.opacity = Math.random() * 0.5 + 0.2;
    this.twinkleSpeed = Math.random() * 0.02 + 0.008;
    this.twinkleDirection = 1;
  }

  update(width: number, height: number) {
    this.y += this.speed;
    this.opacity += this.twinkleSpeed * this.twinkleDirection;
    if (this.opacity >= 0.7 || this.opacity <= 0.2) {
      this.twinkleDirection *= -1;
    }
    if (this.y > height + 10) {
      this.reset(width, height);
    }
  }

  draw(ctx: CanvasRenderingContext2D, accentColor: string) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = accentColor;
    ctx.shadowBlur = 8;
    ctx.shadowColor = accentColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export default function StarfieldCanvas() {
  const { isStarfieldOpen } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const starsRef = useRef<AmbientStar[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      starsRef.current = Array.from({ length: 45 }, () => new AmbientStar(canvas.width, canvas.height, true));
    };

    resize();
    window.addEventListener("resize", resize);

    let animId: number;
    const animate = () => {
      if (isStarfieldOpen) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#1ed760";
        starsRef.current.forEach((s) => {
          s.update(canvas.width, canvas.height);
          s.draw(ctx, accent);
        });
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      animId = requestAnimationFrame(animate);
    };

    animate();

    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, [isStarfieldOpen]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-500 ${
          isStarfieldOpen ? "opacity-60" : "opacity-0"
        }`}
      />
      <div
        ref={cursorRef}
        className="fixed w-72 h-72 rounded-full pointer-events-none z-0 -translate-x-1/2 -translate-y-1/2 opacity-10 mix-blend-screen transition-opacity duration-300"
        style={{
          background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
        }}
      />
    </>
  );
}
