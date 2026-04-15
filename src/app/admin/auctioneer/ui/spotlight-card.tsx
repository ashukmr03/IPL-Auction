"use client";

import React, { ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const colorMap = {
  blue: '#06b6d4',   // cyan
  purple: '#a855f7', // purple
  green: '#22c55e',  
  red: '#ef4444',    
  orange: '#f59e0b'  // amber/gold
};

const GlowCard: React.FC<GlowCardProps> = ({ 
  children, 
  className = '', 
  glowColor = 'blue',
  customSize = false
}) => {
  const activeColor = colorMap[glowColor] || colorMap.blue;

  const styles = `
    @property --glow-angle {
      syntax: "<angle>";
      initial-value: 0deg;
      inherits: false;
    }
    
    @keyframes glow-spin {
      to { --glow-angle: 360deg; }
    }

    [data-glow-tracing]::before {
      content: "";
      position: absolute;
      inset: -2px;
      border: 2px solid transparent;
      border-radius: inherit;
      -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      background: conic-gradient(
        from var(--glow-angle) at 50% 50%, 
        transparent 60%, 
        ${activeColor} 100%
      );
      animation: glow-spin 3s linear infinite;
      pointer-events: none;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div 
        data-glow-tracing
        className={`relative rounded-2xl ${className} ${!customSize ? 'w-64 aspect-[3/4] p-6' : ''}`}
      >
        {children}
      </div>
    </>
  );
};

export { GlowCard };
