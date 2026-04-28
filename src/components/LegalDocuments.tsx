'use client';
import React from 'react';
import { FileText, RefreshCw, Shield } from 'lucide-react';
import Link from 'next/link';

type LegalDocumentsParams = {
  minimalist: boolean;
};

export default function LegalDocuments({ minimalist }: LegalDocumentsParams) {
  if (minimalist) {
    return (
      <>
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-gray-900">Legal Documents</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href={`/legal/privacy`}
            className="flex items-center justify-center rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
          >
            <span className="text-sm text-gray-600 hover:text-blue-600">Privacy Policy</span>
          </Link>
          <Link
            href={`/legal/terms`}
            className="flex items-center justify-center rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
          >
            <span className="text-sm text-gray-600 hover:text-blue-600">Terms of Service</span>
          </Link>
          <Link
            href={`/legal/refund`}
            className="flex items-center justify-center rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
          >
            <span className="text-sm text-gray-600 hover:text-blue-600">Refund Policy</span>
          </Link>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <span className="text-base font-medium text-gray-900">Legal Documents</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href={`/legal/privacy`}
          className="group flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 transition-all hover:border-blue-500 hover:bg-blue-50"
        >
          <Shield className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
          <span className="text-sm text-gray-700 group-hover:text-blue-700">Privacy Policy</span>
        </Link>
        <Link
          href={`/legal/terms`}
          className="group flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 transition-all hover:border-blue-500 hover:bg-blue-50"
        >
          <FileText className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
          <span className="text-sm text-gray-700 group-hover:text-blue-700">Terms of Service</span>
        </Link>
        <Link
          href={`/legal/refund`}
          className="group flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 transition-all hover:border-blue-500 hover:bg-blue-50"
        >
          <RefreshCw className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
          <span className="text-sm text-gray-700 group-hover:text-blue-700">Refund Policy</span>
        </Link>
      </div>
    </>
  );
}
