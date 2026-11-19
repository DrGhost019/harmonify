"use client";

import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "w-8 h-8", size }: LogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Background rounded squircle with theme-reactive border */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="16"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.3"
      />

      {/* Outer ambient wave resonance bars */}
      <path
        d="M11 26V38"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
      <path
        d="M53 26V38"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />

      {/* Left wave pillar of the 'H' */}
      <path
        d="M17 18V46"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Center harmonic frequency bars */}
      <path
        d="M24 22V42"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
      <path
        d="M32 14V50"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M40 22V42"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />

      {/* Right wave pillar of the 'H' */}
      <path
        d="M47 18V46"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Center cross-harmonic bridge uniting the waves into an 'H' */}
      <path
        d="M17 32H47"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
    </svg>
  );
}
