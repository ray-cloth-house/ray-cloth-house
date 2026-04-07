'use client';

import { useRouter } from 'next/navigation';
import { Menu, LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const roleBadgeStyles: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  staff: 'bg-gray-100 text-gray-700',
};

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => { if (data.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700">
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600" />
            </div>
            <span className="hidden sm:inline text-gray-700 font-medium">{user.name || user.businessName}</span>
            {user.role && (
              <span className={cn('hidden sm:inline px-2 py-0.5 rounded-full text-xs font-medium capitalize', roleBadgeStyles[user.role] || 'bg-gray-100 text-gray-700')}>
                {user.role}
              </span>
            )}
          </div>
        )}
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
