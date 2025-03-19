"use client";

import { useWallet } from "@/contexts/wallet-context";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { useMatches } from "@/hooks/use-matches";
import { MIN_SYNC_INTERVAL, remainingCacheTime } from "@/lib/utils";
import { RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "util";

interface SyncStatusProps {
  isSynced: boolean;
}

export default function SyncStatus({ isSynced }: SyncStatusProps) {
  const { walletAddress: address } = useWallet();
  const { updateLeaderboard } = useLeaderboard(address as string);
  const { isSyncing, lastSyncTime, syncMatches, matches } = useMatches();
  const [cooldown, setCooldown] = useState(0);

  const pendingMatches =
    matches?.filter((m) => m.syncStatus === "pending") ?? [];
  const pendingCount = pendingMatches.length;

  useEffect(() => {
    const remainingTime: number = remainingCacheTime(
      address as string,
      Date.now()
    );
    if (remainingTime > 0) {
      setCooldown(Math.floor(remainingTime / 1000));
    }
  }, [address, lastSyncTime]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (cooldown > 0) {
      timer = setTimeout(() => {
        setCooldown((prevCooldown) => prevCooldown - 1);
      }, 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cooldown]);

  const handleSync = () => {
    syncMatches();
    updateLeaderboard();
    const remainingTime: number = remainingCacheTime(
      address as string,
      Date.now()
    );
    const remainingTimeS = Math.floor(remainingTime / 1000);
    setCooldown(remainingTimeS > 0 ? remainingTimeS : MIN_SYNC_INTERVAL / 1000);
  };

  const formatSyncTime = (timestamp: number) => {
    if (!timestamp) return "Never";
    return format(new Date(timestamp));
  };

  return (
    <div className="flex items-center space-x-2 text-sm mb-8">
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col">
          {pendingCount > 0 && (
            <span className="text-yellow-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500"></span>
              {pendingCount === 1
                ? "1 match pending synchronization"
                : `${pendingCount} matches pending synchronization`}
            </span>
          )}
          <span className="text-zinc-400">
            Last sync: {formatSyncTime(lastSyncTime)}
          </span>
        </div>
        {!isSynced && (
          <button
            onClick={handleSync}
            disabled={isSyncing || cooldown > 0}
            className="px-3 py-1 bg-zinc-800 text-neutral-50 rounded hover:bg-zinc-700 disabled:opacity-50 flex items-center gap-1"
          >
            {isSyncing ? (
              <RefreshCcw size={16} className="animate-spin mr-2" />
            ) : (
              <RefreshCcw size={16} className="mr-2" />
            )}
            {!isSyncing && cooldown > 0 ? "Wait (" + cooldown + "s)" : "Sync"}
          </button>
        )}
      </div>
    </div>
  );
}
