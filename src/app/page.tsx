'use client';

import Link from 'next/link';
import { Shirt, BarChart3, Users, ShieldCheck, ArrowRight, Layers, Package } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <Shirt className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">Ray Cloth House</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition">
              Login
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-6">
          <Layers className="w-4 h-4" />
          Wholesale Inventory Management
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight max-w-3xl mx-auto">
          Manage Your Garments
          <br />
          <span className="text-primary-600">Business Smarter</span>
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          A complete inventory, financial, and ledger management system designed for wholesale garments businesses. Track stock, manage suppliers and buyers, and generate detailed reports.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition text-sm">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Package,
              title: 'Stock Management',
              desc: 'Track inventory by batch, category, and supplier. Support for meter-based fabric and piece-based suits with dynamic pricing.',
            },
            {
              icon: Users,
              title: 'Supplier & Buyer Ledgers',
              desc: 'Maintain detailed accounts (khata) for every supplier and buyer. Track credits, debits, and payment histories.',
            },
            {
              icon: BarChart3,
              title: 'Financial Reports',
              desc: 'Generate profit/loss reports, sales ledgers, purchase ledgers, and expense tracking with PDF export.',
            },
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-gray-50 rounded-2xl p-12 text-center">
          <ShieldCheck className="w-10 h-10 text-primary-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Built for Pakistani Wholesale Market</h2>
          <p className="text-gray-500 max-w-xl mx-auto mb-6">
            Designed specifically for wholesale garments businesses with support for PKR currency, Urdu-friendly interface, and industry-standard accounting practices.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition text-sm">
            Login to Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Ray Cloth House. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
