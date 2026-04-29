'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LegalDocumentProps {
  filePath: string;
  title: string;
}

const LegalDocument: React.FC<LegalDocumentProps> = ({ filePath, title }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(filePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load document');
        }
        return response.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading markdown:', error);
        setError('Failed to load document. Please try again later.');
        setLoading(false);
      });
  }, [filePath]);

  return (
    <Card className="mx-auto my-8 w-full max-w-4xl">
      <CardHeader>
        <h1 className="text-center text-2xl font-bold">{title}</h1>
      </CardHeader>
      <CardContent className="prose prose-blue min-h-[200px] max-w-none">
        {loading ? (
          <div className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-600">{error}</div>
        ) : (
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="mb-4 mt-8 text-2xl font-bold">{children}</h1>,
              h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-semibold">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-medium">{children}</h3>,
              ul: ({ children }) => <ul className="mb-4 list-disc pl-6">{children}</ul>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              p: ({ children }) => <p className="mb-4">{children}</p>,
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </CardContent>
    </Card>
  );
};

export default LegalDocument;
