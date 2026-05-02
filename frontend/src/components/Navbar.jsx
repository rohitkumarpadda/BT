// src/components/Navbar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { shortAddr } from "../utils/format";
import { Wallet, AlertTriangle, LayoutDashboard, PlusCircle, User } from "lucide-react";
 
const NAV = [
  { to: "/",       label: "Dashboard", icon: LayoutDashboard },
  { to: "/create", label: "Create",    icon: PlusCircle },
  { to: "/profile",label: "Profile",   icon: User },
];
 
export default function Navbar() {
  const { account, connecting, connectWallet, disconnectWallet, isWrongNetwork } = useWeb3();
  const { pathname } = useLocation();
 
  return (
    <header className="sticky top-0 z-40 bg-paper bg-opacity-80 backdrop-blur-md border-b border-ink border-opacity-[0.08]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
 
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center
                          group-hover:bg-signal transition-colors duration-200">
            <span className="text-paper text-sm font-bold font-display">G</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            Govern<span className="text-signal">.</span>
          </span>
        </Link>
 
        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-display font-medium
                            transition-all duration-150
                            ${active
                              ? "bg-ink text-paper"
                              : "text-dim hover:text-ink hover:bg-ink bg-opacity-[0.06]"
                            }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>
 
        {/* Wallet */}
        <div className="flex items-center gap-2">
          {isWrongNetwork && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono
                            bg-signal bg-opacity-[0.15] text-signal px-3 py-1.5 rounded-lg">
              <AlertTriangle size={12} />
              Wrong Network
            </div>
          )}
 
          {account ? (
            <button
              onClick={disconnectWallet}
              className="flex items-center gap-2 bg-ink bg-opacity-[0.06] hover:bg-ink bg-opacity-10 
                         border border-ink border-opacity-10 rounded-lg px-3 py-1.5 transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-pulse animate-pulse-slow" />
              <span className="text-sm font-mono font-medium">{shortAddr(account)}</span>
            </button>
          ) : (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="btn-primary text-sm py-1.5"
            >
              <Wallet size={14} />
              {connecting ? "Connecting…" : "Connect"}
            </button>
          )}
        </div>
      </div>
 
      {/* Mobile nav */}
      <div className="sm:hidden flex items-center gap-1 px-4 pb-2">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-display font-medium
                          transition-all ${active ? "bg-ink text-paper" : "text-dim hover:text-ink"}`}
            >
              <Icon size={12} />
              {label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}