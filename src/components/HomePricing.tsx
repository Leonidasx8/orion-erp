'use client';
import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import PricingService from '@/lib/pricing';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const HomePricing = () => {
  const tiers = PricingService.getAllTiers();
  const commonFeatures = PricingService.getCommonFeatures();

  return (
    <section id="pricing" className="bg-gray-100 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">Simple, Transparent Pricing</h2>
          <p className="text-lg text-gray-600">
            Choose the plan that&#39;s right for your business (IT&#39;S PLACEHOLDER NO PRICING FOR
            THIS TEMPLATE)
          </p>
        </div>

        <div className="mb-12 grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col ${
                tier.popular ? 'border-primary-500 shadow-lg' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute right-0 top-0 -translate-y-1/2 rounded-full bg-primary-500 px-3 py-1 text-sm text-white">
                  Most Popular
                </div>
              )}

              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-grow flex-col">
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {PricingService.formatPrice(tier.price)}
                  </span>
                  <span className="ml-2 text-gray-600">/month</span>
                </div>

                <ul className="mb-8 flex-grow space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/register"
                  className={`w-full rounded-lg px-6 py-3 text-center font-medium transition-colors ${
                    tier.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Get Started
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-gray-600">All plans include: {commonFeatures.join(', ')}</p>
        </div>
      </div>
    </section>
  );
};

export default HomePricing;
