import React from "react";
import { useWeb3 } from "../context/Web3Context";
import { Wallet } from "lucide-react";
 
export default function WalletGate({ children, message = "Connect your wallet to continue" }) {
  const { account, connectWallet, connecting } = useWeb3();
  if (account) return children;
 
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-ink bg-opacity-[0.06] rounded-2xl flex items-center justify-center mb-5">
        <Wallet size={28} className="text-ink opacity-40" />
      </div>
      <h2 className="font-display font-bold text-xl mb-2">{message}</h2>
      <p className="text-dim text-sm mb-6 max-w-xs">
        You need MetaMask and an authorized account to use this feature.
      </p>
      <button onClick={connectWallet} disabled={connecting} className="btn-primary">
        <Wallet size={15} />
        {connecting ? "Connecting…" : "Connect MetaMask"}
      </button>
    </div>
  );
}