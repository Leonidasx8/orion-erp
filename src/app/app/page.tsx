'use client';
import React from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CalendarDays, Settings, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function DashboardContent() {
  const { loading, user } = useGlobal();

  const getDaysSinceRegistration = () => {
    if (!user?.registered_at) return 0;
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - user.registered_at.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const daysSinceRegistration = getDaysSinceRegistration();

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.email?.split('@')[0]}! 👋</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Member for {daysSinceRegistration} days
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/app/user-settings"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50"
            >
              <div className="rounded-full bg-primary-50 p-2">
                <Settings className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <h3 className="font-medium">User Settings</h3>
                <p className="text-sm text-gray-500">Manage your account preferences</p>
              </div>
            </Link>

            <Link
              href="/app/table"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50"
            >
              <div className="rounded-full bg-primary-50 p-2">
                <ExternalLink className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <h3 className="font-medium">Example Page</h3>
                <p className="text-sm text-gray-500">Check out example features</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
