'use client';

import React from 'react';

export function EmptyState() {
  return (
    <div style={styles.container}>
      <div style={styles.iconContainer}>
        {/* Stylized 3D Speech Bubbles SVG */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main big bubble */}
          <path
            d="M86 48C86 64.5685 71.6731 78 54 78C48.2432 78 42.8719 76.5746 38.3093 74.0772L22 79L26.7828 65.419C23.7538 60.3664 22 54.4056 22 48C22 31.4315 36.3269 18 54 18C71.6731 18 86 31.4315 86 48Z"
            fill="url(#paint0_linear)"
          />
          {/* Smaller overlapping bubble */}
          <path
            d="M98 70C98 81.0457 88.6011 90 77 90C72.9348 90 69.1557 88.8959 65.8825 86.9942L54 91L57.5255 80.3704C55.3346 76.5413 54 71.9568 54 67C54 55.9543 63.3989 47 75 47C86.6011 47 96 55.9543 96 67C96 68.0264 95.8825 69.0287 95.6601 70H98Z"
            fill="url(#paint1_linear)"
          />
          {/* Bubble Dots */}
          <circle cx="68" cy="70" r="3.5" fill="#F8A74A" />
          <circle cx="77" cy="70" r="3.5" fill="#F8A74A" />
          <circle cx="86" cy="70" r="3.5" fill="#F8A74A" />

          <defs>
            <linearGradient
              id="paint0_linear"
              x1="22"
              y1="18"
              x2="86"
              y2="78"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FFB347" />
              <stop offset="1" stopColor="#FFA033" />
            </linearGradient>
            <linearGradient
              id="paint1_linear"
              x1="54"
              y1="47"
              x2="98"
              y2="91"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FFE099" />
              <stop offset="1" stopColor="#FFD272" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <h3 style={styles.title}>No conversation selected</h3>
      <p style={styles.subtitle}>You can view your conversation in the side bar</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    userSelect: 'none',
  },
  iconContainer: {
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1C2024',
    marginBottom: '8px',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#8A94A6',
    fontWeight: 450,
  },
};
