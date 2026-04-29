'use client';

import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { createSPASassClient } from '@/lib/supabase/client';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const resendVerificationEmail = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const supabase = await createSPASassClient();
      const { error } = await supabase.resendVerificationEmail(email);
      if (error) {
        setError(error.message);
        return;
      }
      setSuccess(true);
    } catch (err: Error | unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>

        <h2 className="mb-2 text-2xl font-bold text-gray-900">Check your email</h2>

        <p className="mb-8 text-gray-600">
          We&#39;ve sent you an email with a verification link. Please check your inbox and click
          the link to verify your account.
        </p>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Didn&#39;t receive the email? Check your spam folder or enter your email to resend:
          </p>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          {success && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
              Verification email has been resent successfully.
            </div>
          )}

          <div className="mt-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
            />
          </div>

          <button
            className="text-sm font-medium text-primary-600 hover:text-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={resendVerificationEmail}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Click here to resend'}
          </button>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            Return to login
          </Link>
        </div>
      </div>
    </div>
  );
}
