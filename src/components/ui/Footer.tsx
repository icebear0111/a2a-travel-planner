'use client';

import React from 'react';

interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer
      className={`py-10 border-t border-slate-100 text-center text-xs text-slate-400 ${className}`}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <button className="hover:text-slate-600 transition-colors">이용약관</button>
        <span>|</span>
        <button className="hover:text-slate-600 transition-colors">개인정보처리방침</button>
      </div>
      <p>© 2025 TrAI. All rights reserved.</p>
    </footer>
  );
}
