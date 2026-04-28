'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, User, Menu, X, ChevronDown, LogOut, Key, Files, LucideListTodo } from 'lucide-react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { createSPASassClient } from '@/lib/supabase/client';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { user } = useGlobal();

  const handleLogout = async () => {
    try {
      const client = await createSPASassClient();
      await client.logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  const handleChangePassword = async () => {
    router.push('/app/user-settings');
  };

  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split(/[._-]/);
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  };

  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;

  const navigation = [
    { name: 'Homepage', href: '/app', icon: Home },
    { name: 'Example Storage', href: '/app/storage', icon: Files },
    { name: 'Example Table', href: '/app/table', icon: LucideListTodo },
    { name: 'User Settings', href: '/app/user-settings', icon: User },
  ];

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-100">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <span className="text-xl font-semibold text-primary-600">{productName}</span>
          <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700 lg:hidden">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 ${
                    isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 flex h-16 items-center justify-between bg-white px-4 shadow-sm">
          <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700 lg:hidden">
            <Menu className="h-6 w-6" />
          </button>

          <div className="relative ml-auto">
            <button
              onClick={() => setUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                <span className="font-medium text-primary-700">
                  {user ? getInitials(user.email) : '??'}
                </span>
              </div>
              <span>{user?.email || 'Loading...'}</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {isUserDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-md border bg-white shadow-lg">
                <div className="border-b border-gray-100 p-2">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="truncate text-sm font-medium text-gray-900">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleChangePassword();
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Key className="mr-3 h-4 w-4 text-gray-400" />
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setUserDropdownOpen(false);
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="mr-3 h-4 w-4 text-red-400" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
