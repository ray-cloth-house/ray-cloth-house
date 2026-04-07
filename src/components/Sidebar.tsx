'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FolderTree, Truck, Users, Package, ShoppingCart,
  CreditCard, Receipt, BookOpen, BarChart3, X, Shirt, UserCog
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'admin', 'staff'] },
  { href: '/dashboard/users', label: 'User Management', icon: UserCog, roles: ['owner', 'admin'] },
  { href: '/dashboard/categories', label: 'Categories', icon: FolderTree, roles: ['owner', 'admin'] },
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: Truck, roles: ['owner', 'admin', 'staff'] },
  { href: '/dashboard/buyers', label: 'Buyers', icon: Users, roles: ['owner', 'admin', 'staff'] },
  { href: '/dashboard/stock', label: 'Stock', icon: Package, roles: ['owner', 'admin', 'staff'] },
  { href: '/dashboard/sales', label: 'Sales', icon: ShoppingCart, roles: ['owner', 'admin', 'staff'] },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard, roles: ['owner', 'admin'] },
  { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt, roles: ['owner', 'admin'] },
  { href: '/dashboard/ledgers', label: 'Ledgers', icon: BookOpen, roles: ['owner', 'admin'] },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, roles: ['owner', 'admin'] },
];

export default function Sidebar({ open, onClose, userRole }: { open: boolean; onClose: () => void; userRole?: string }) {
  const pathname = usePathname();
  const filteredItems = navItems.filter(item => !userRole || item.roles.includes(userRole));

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-gray-50">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shirt className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">Ray Cloth House</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn('w-[18px] h-[18px]', isActive ? 'text-primary-600' : 'text-gray-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
