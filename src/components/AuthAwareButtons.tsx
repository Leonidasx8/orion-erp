'use client';
import { useState, useEffect } from 'react';
import { createSPASassClient } from '@/lib/supabase/client';
import { ArrowRight, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function AuthAwareButtons({ variant = 'primary' }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = await createSPASassClient();
        const {
          data: { user },
        } = await supabase.getSupabaseClient().auth.getUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return null;
  }

  // Navigation buttons for the header
  if (variant === 'nav') {
    return isAuthenticated ? (
      <Link
        href="/app"
        className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
      >
        Go to Dashboard
      </Link>
    ) : (
      <>
        <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
          Login
        </Link>
        <Link
          href="/auth/register"
          className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
        >
          Get Started
        </Link>
      </>
    );
  }

  // Primary buttons for the hero section
  return isAuthenticated ? (
    <Link
      href="/app"
      className="inline-flex items-center rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700"
    >
      Go to Dashboard
      <ArrowRight className="ml-2 h-5 w-5" />
    </Link>
  ) : (
    <>
      <Link
        href="/auth/register"
        className="inline-flex items-center rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700"
      >
        Start Building Free
        <ArrowRight className="ml-2 h-5 w-5" />
      </Link>
      <Link
        href="#features"
        className="inline-flex items-center rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        Learn More
        <ChevronRight className="ml-2 h-5 w-5" />
      </Link>
    </>
  );
}
