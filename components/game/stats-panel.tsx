"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameHistory } from './game-history';
import { Leaderboard } from './leaderboard';
import { cn } from '@/lib/utils';

type Tab = 'history' | 'leaderboard';

export function StatsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('history');

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="rounded-lg bg-black bg-opacity-70 p-6 border border-blue-500">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors duration-300",
              "text-lg font-semibold",
              activeTab === 'history' 
                ? "bg-blue-500/20 text-blue-400" 
                : "text-gray-400 hover:bg-gray-800"
            )}
          >
            Game History
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors duration-300",
              "text-lg font-semibold",
              activeTab === 'leaderboard' 
                ? "bg-blue-500/20 text-blue-400" 
                : "text-gray-400 hover:bg-gray-800"
            )}
          >
            Leaderboard
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <GameHistory />
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Leaderboard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}