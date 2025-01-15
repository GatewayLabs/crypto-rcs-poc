"use client";

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { HouseService } from '@/lib/services/house-service';

interface HouseState {
  activeGames: number;
  pendingGames: number;
  processingGames: number;
  finalizingGames: number;
}

export function HousePanel() {
  const [houseService, setHouseService] = useState<HouseService | null>(null);
  const [houseState, setHouseState] = useState<HouseState>({
    activeGames: 0,
    pendingGames: 0,
    processingGames: 0,
    finalizingGames: 0
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize house service
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined' && !isInitialized) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const service = new HouseService(provider);
      setHouseService(service);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Update state periodically
  useEffect(() => {
    if (!houseService) return;

    const updateState = async () => {
      try {
        const state = await houseService.getHouseState();
        setHouseState(state);
      } catch (error) {
        console.error('Error updating house state:', error);
      }
    };

    // Update immediately and then every 5 seconds
    updateState();
    const interval = setInterval(updateState, 5000);

    return () => clearInterval(interval);
  }, [houseService]);

  return (
    <div className="bg-gray-900 rounded-lg p-6 shadow-xl border border-blue-500">
      <h2 className="text-2xl font-bold text-blue-400 mb-4">House Status</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Active Games */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Active Games</div>
          <div className="text-2xl font-bold text-blue-300">{houseState.activeGames}</div>
        </div>

        {/* Games by Status */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Pending</span>
              <span className="text-yellow-400 font-medium">{houseState.pendingGames}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Processing</span>
              <span className="text-green-400 font-medium">{houseState.processingGames}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Finalizing</span>
              <span className="text-purple-400 font-medium">{houseState.finalizingGames}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-400">House Status:</span>
        </div>
        <span className={`font-medium ${isInitialized ? 'text-green-400' : 'text-red-400'}`}>
          {isInitialized ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
    </div>
  );
}