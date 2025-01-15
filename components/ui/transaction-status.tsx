"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from './spinner';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export type TransactionStep = {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  hash?: string;
};

interface TransactionStatusProps {
  steps: TransactionStep[];
  onClose?: () => void;
  className?: string;
}

export function TransactionStatus({
  steps,
  onClose,
  className
}: TransactionStatusProps) {
  return (
    <div className={cn(
      "fixed bottom-4 right-4 max-w-sm w-full bg-black bg-opacity-90 rounded-lg border border-blue-500 p-4 shadow-xl",
      className
    )}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-blue-400">Transaction Status</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {steps.map((step) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-start gap-3"
              >
                <div className="flex-shrink-0 mt-1">
                  {step.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
                  )}
                  {step.status === 'processing' && (
                    <Spinner size="sm" className="text-blue-400" />
                  )}
                  {step.status === 'completed' && (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                  {step.status === 'error' && (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    step.status === 'completed' && "text-green-400",
                    step.status === 'error' && "text-red-400",
                    step.status === 'processing' && "text-blue-400",
                    step.status === 'pending' && "text-gray-400"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {step.description}
                  </p>
                  {step.hash && (
                    <a
                      href={`https://etherscan.io/tx/${step.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-flex items-center gap-1"
                    >
                      View on Etherscan
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {steps.some(step => step.status === 'error') && (
          <div className="mt-3 p-2 rounded bg-red-900 bg-opacity-20 border border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                An error occurred. Please try again or contact support if the problem persists.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}