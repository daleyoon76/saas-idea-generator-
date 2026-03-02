'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CANYON as C } from '@/lib/colors';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (status === 'loading') {
    return (
      <div
        className="w-7 h-7 rounded-full animate-pulse"
        style={{ backgroundColor: C.border }}
      />
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="text-xs font-medium px-3 py-1.5 rounded-full transition hover:opacity-80"
        style={{
          backgroundColor: C.accent,
          color: '#fff',
        }}
      >
        로그인
      </Link>
    );
  }

  const user = session.user;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 transition hover:opacity-80"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || '프로필'}
            className="w-7 h-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ backgroundColor: C.cream, color: C.accent }}
          >
            {(user.name || user.email || '?')[0].toUpperCase()}
          </div>
        )}
        <svg
          className="w-3 h-3 transition-transform"
          style={{
            color: C.textMid,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-1 z-50"
          style={{
            backgroundColor: C.cardBg,
            border: `1px solid ${C.border}`,
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: C.border }}>
            <p className="text-sm font-medium truncate" style={{ color: C.textDark }}>
              {user.name}
            </p>
            <p className="text-xs truncate" style={{ color: C.textLight }}>
              {user.email}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="block px-3 py-2 text-sm transition hover:opacity-70"
            style={{ color: C.textDark }}
            onClick={() => setOpen(false)}
          >
            대시보드
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full text-left px-3 py-2 text-sm transition hover:opacity-70"
            style={{ color: C.accent }}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
