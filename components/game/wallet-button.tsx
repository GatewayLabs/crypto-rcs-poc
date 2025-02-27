"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import Avatar from "boring-avatars";

export default function WalletButton() {
  const { authenticated, login, logout, user } = usePrivy();

  return (
    <Button
      onClick={() => (authenticated ? logout() : login())}
      className="bg-zinc-800 border-zinc-800 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 group-hover:opacity-50 hover:!opacity-100 text-white text-sm font-medium hover:bg-zinc-700"
    >
      {authenticated ? (
        <div className="flex items-center gap-2 ">
          <Avatar variant="pixel" size={24} name={user?.wallet?.address} />
          {user?.wallet?.address.slice(0, 6)}...
          {user?.wallet?.address.slice(-4)}
        </div>
      ) : (
        "Login"
      )}
    </Button>
  );
}
