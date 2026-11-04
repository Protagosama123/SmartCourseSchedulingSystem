/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface AccessibleTooltipProps {
  id: string;
  triggerRect: DOMRect | null;
  isOpen: boolean;
  children: React.ReactNode;
}

export const AccessibleTooltip: React.FC<AccessibleTooltipProps> = ({
  id,
  triggerRect,
  isOpen,
  children,
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 0,
    left: 0,
    placement: 'top',
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !triggerRect) return;

    const updatePosition = () => {
      const tooltipEl = tooltipRef.current;
      const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 280;
      const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 160;
      const spacing = 8;
      const margin = 12;

      // Vertical position
      let placement: 'top' | 'bottom' = 'top';
      let top = triggerRect.top - tooltipHeight - spacing;

      if (top < margin) {
        // Not enough room above, place below
        top = triggerRect.bottom + spacing;
        placement = 'bottom';
      }

      // Horizontal position centered over trigger, clamped to viewport
      let left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
      const maxLeft = window.innerWidth - tooltipWidth - margin;
      left = Math.max(margin, Math.min(maxLeft, left));

      setCoords({ top, left, placement });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, triggerRect]);

  if (!isOpen || !triggerRect || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={tooltipRef}
      id={id}
      role="tooltip"
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      className="z-50 w-72 sm:w-80 rounded-xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-700/80 dark:border-slate-800 p-4 shadow-2xl text-xs space-y-2.5 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
    >
      {children}
    </div>,
    document.body
  );
};
