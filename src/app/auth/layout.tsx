import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;
  const testimonials = [
    {
      quote:
        'This template helped us launch our SaaS product in just two weeks. The authentication and multi-tenancy features are rock solid.',
      author: 'Sarah Chen',
      role: 'CTO, TechStart',
      avatar: 'SC',
    },
    {
      quote:
        'The best part is how well thought out the organization management is. It saved us months of development time.',
      author: 'Michael Roberts',
      role: 'Founder, DataFlow',
      avatar: 'MR',
    },
    {
      quote:
        'Clean code, great documentation, and excellent support. Exactly what we needed to get our MVP off the ground.',
      author: 'Jessica Kim',
      role: 'Lead Developer, CloudScale',
      avatar: 'JK',
    },
  ];

  return (
    <div className="flex min-h-screen">
      <div className="relative flex w-full flex-col justify-center bg-white px-4 py-12 sm:px-6 lg:w-1/2 lg:px-8">
        <Link
          href="/"
          className="absolute left-8 top-8 flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Homepage
        </Link>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            {productName}
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">{children}</div>
      </div>

      <div className="hidden bg-gradient-to-br from-primary-600 to-primary-800 lg:flex lg:w-1/2">
        <div className="flex w-full items-center justify-center p-12">
          <div className="max-w-lg space-y-6">
            <h3 className="mb-8 text-2xl font-bold text-white">Trusted by developers worldwide</h3>
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="relative rounded-xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="bg-primary-400/30 flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white">
                      {testimonial.avatar}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-sm font-light leading-relaxed text-white/90">
                      &#34;{testimonial.quote}&#34;
                    </p>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-white">{testimonial.author}</p>
                      <p className="text-sm text-primary-200">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-8 text-center">
              <p className="text-sm text-primary-100">
                Join thousands of developers building with {productName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
