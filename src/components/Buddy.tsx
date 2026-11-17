import { BUDDY_NAME } from "@/config";
import type { ReactNode } from "react";

// Original paw-print avatar for the study buddy.
export function BuddyAvatar({ size = 48 }: { size?: number }) {
  return (
    <div className="buddy-avatar" style={{ width: size, height: size, flexBasis: size }} aria-hidden>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 32 32" fill="#fff">
        <ellipse cx="16" cy="21" rx="7" ry="6" />
        <ellipse cx="7.5" cy="13" rx="3" ry="3.8" />
        <ellipse cx="13" cy="8.5" rx="3" ry="3.8" />
        <ellipse cx="19" cy="8.5" rx="3" ry="3.8" />
        <ellipse cx="24.5" cy="13" rx="3" ry="3.8" />
      </svg>
    </div>
  );
}

export function Buddy({ children, showName = true }: { children: ReactNode; showName?: boolean }) {
  return (
    <div className="buddy">
      <BuddyAvatar />
      <div className="bubble">
        {showName && <span className="name">{BUDDY_NAME}</span>}
        {children}
      </div>
    </div>
  );
}
