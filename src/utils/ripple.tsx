import React, { useCallback } from 'react';

/**
 * Creates a ripple element at the click coordinates within a container.
 * Call this from an onClick handler on an element with `position: relative; overflow: hidden`.
 */
function createRipple(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.2;
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  const ripple = document.createElement('span');
  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.35);
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    pointer-events: none;
    transform: scale(0);
    animation: ripple-effect 0.5s ease-out forwards;
  `;
  el.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

/**
 * Pre-styled retro button with magnetic-press + ripple effects baked in.
 * Use this instead of raw <button> for consistency across the app.
 *
 * @param variant - 'default' (retro-btn-ingame) | 'bare' (no base styles) | 'danger' | 'export' | 'collage' | 'ghost' | 'outline' | 'select'
 * @param press - 'press' (scale(0.97)) | 'light' (scale(0.95)) | 'none'
 */
export const RetroButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'default' | 'bare' | 'danger' | 'export' | 'collage' | 'ghost' | 'outline' | 'select';
    press?: 'press' | 'light' | 'none';
  }
>(({ variant = 'default', press = 'press', className = '', onClick, children, ...props }, ref) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      createRipple(e);
      onClick?.(e);
    },
    [onClick],
  );

  const pressClass = press === 'light' ? 'magnetic-press-light' : press === 'none' ? '' : 'magnetic-press';

  const variantClasses: Record<string, string> = {
    default: 'retro-btn-ingame',
    bare: '',
    danger:
      'bg-red-600 text-white border border-red-500 hover:bg-red-500',
    export:
      'bg-purple-600 text-white border border-purple-500 hover:bg-purple-500',
    collage:
      'bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-500',
    ghost:
      'bg-transparent text-gray-400 border border-gray-600 hover:bg-gray-700 hover:text-white',
    outline:
      'bg-white text-gray-800 border border-gray-500 hover:bg-gray-200',
    select:
      'bg-white text-gray-500 border border-neutral-300 hover:bg-neutral-100',
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={`ripple-container ${pressClass} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

RetroButton.displayName = 'RetroButton';
