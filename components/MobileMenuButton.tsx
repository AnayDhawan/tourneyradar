"use client";

interface MobileMenuButtonProps {
  onClick: () => void;
  style?: React.CSSProperties;
}

export default function MobileMenuButton({ onClick, style }: MobileMenuButtonProps) {
  return (
    <button type="button" className="mobile-menu-btn" aria-label="Open menu" onClick={onClick} style={style}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
