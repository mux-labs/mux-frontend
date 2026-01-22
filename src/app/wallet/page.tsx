import React from "react";
import Link from "next/link";

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
              Wallet Details
            </h1>
            <p className="text-neutral-500 mt-1">
              Manage and view your wallet assets
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg shadow-xs hover:bg-neutral-50 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        {/* Security Notice */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
          <div className="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-amber-900">
              Security Mode Active
            </h3>
            <p className="text-amber-700 text-sm mt-1">
              For your safety, sensitive data is hidden and advanced transaction
              features are currently disabled in this view.
            </p>
          </div>
        </section>

        {/* Summary Section */}
        <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Balance Card */}
            <div>
              <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">
                Total Balance
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-neutral-900 tracking-tight">
                  ****
                </span>
                <span className="text-xl text-neutral-400 font-medium">
                  USD
                </span>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  disabled
                  className="px-6 py-2.5 bg-neutral-100 text-neutral-400 rounded-lg font-medium cursor-not-allowed opacity-70 flex items-center gap-2"
                >
                  <span>Send</span>
                </button>
                <button
                  disabled
                  className="px-6 py-2.5 bg-neutral-100 text-neutral-400 rounded-lg font-medium cursor-not-allowed opacity-70 flex items-center gap-2"
                >
                  <span>Receive</span>
                </button>
                <button
                  disabled
                  className="px-6 py-2.5 bg-neutral-100 text-neutral-400 rounded-lg font-medium cursor-not-allowed opacity-70 flex items-center gap-2"
                >
                  <span>Swap</span>
                </button>
              </div>
            </div>

            {/* Wallet Info */}
            <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-100 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
                <span className="text-sm text-neutral-500 font-medium">
                  Network
                </span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-sm font-semibold text-neutral-800">
                    Mainnet
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-500 font-medium">
                  Wallet Address
                </span>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-neutral-200">
                  <code className="text-sm text-neutral-700 font-mono">
                    0x71...3A92
                  </code>
                  <button className="text-neutral-400 hover:text-neutral-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Activity Placeholder */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-neutral-900">
              Recent Activity
            </h2>
            <button
              disabled
              className="text-sm font-medium text-neutral-400 cursor-not-allowed"
            >
              View All
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4 text-neutral-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">
              No activity to show
            </h3>
            <p className="text-neutral-500 max-w-sm mt-2">
              Your recent transactions will appear here once you start using
              your wallet.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
