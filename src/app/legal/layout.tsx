'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, ShieldAlert, RefreshCw } from 'lucide-react';

const legalDocuments = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: ShieldAlert,
    description: 'How we handle and protect your data',
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    icon: FileText,
    description: 'Rules and guidelines for using our service',
  },
  {
    id: 'refund',
    title: 'Refund Policy',
    icon: RefreshCw,
    description: 'Our policy on refunds and cancellations',
  },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </button>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar Navigation */}
          <div className="w-full flex-shrink-0 lg:w-64">
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900">Legal Documents</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Important information about our services
                </p>
              </div>
              <nav className="space-y-2 p-4">
                {legalDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/legal/${doc.id}`}
                    className="block rounded-md p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <doc.icon className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                        <div className="text-xs text-gray-500">{doc.description}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
