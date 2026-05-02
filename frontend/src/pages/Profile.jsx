// src/pages/Profile.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useDelegate } from "../hooks/useVote";
import { useVoterManagement } from "../hooks/useAdmin";
import WalletGate from "../components/WalletGate";
import { shortAddr } from "../utils/format";
import {
  User, CheckCircle2, XCircle, ArrowRightLeft, Loader2,
  Shield, UserPlus, UserMinus, Weight, Star, ShieldMinus
} from "lucide-react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
 
export default function Profile() {
  const { account, voterInfo, refreshVoterInfo, roContract } = useWeb3();
 
  return (
    <WalletGate message="Connect your wallet to view your profile">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
 
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="font-display font-extrabold text-3xl tracking-tight mb-1">
            My Profile
          </h1>
          <p className="text-dim text-sm font-mono">{account}</p>
        </div>
 
        {/* Voter status card */}
        <VoterStatusCard voterInfo={voterInfo} account={account} roContract={roContract} />
 
        {/* Delegation card */}
        {voterInfo?.registered && !voterInfo?.hasDelegated && (
          <DelegateCard onDelegated={refreshVoterInfo} />
        )}
 
        {/* Admin panel */}
        <AdminPanel roContract={roContract} />
      </div>
    </WalletGate>
  );
}
 
// -- Voter status -------------------------------------------------------------
function VoterStatusCard({ voterInfo, account, roContract }) {
  const [isProposer, setIsProposer] = useState(false);
 
  useEffect(() => {
    if (!roContract || !account) return;
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    roContract.hasRole(PROPOSER_ROLE, account)
      .then(setIsProposer)
      .catch(() => setIsProposer(false));
  }, [roContract, account]);
 
  return (
    <div className="card animate-fade-up" style={{ animationDelay: "40ms" }}>
      <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
        <User size={15} /> Voter Status
      </h2>
      <div className="space-y-3">
        <StatusRow
          label="Registration"
          ok={voterInfo?.registered}
          yes="Registered voter"
          no="Not registered — ask the admin to add you"
        />
        {voterInfo?.registered && (
          <StatusRow
            label="Voting weight"
            value={<span className="font-mono font-bold text-lg">{voterInfo.weight}</span>}
          />
        )}
        {voterInfo?.registered && (
          <StatusRow
            label="Delegation"
            ok={!voterInfo?.hasDelegated}
            yes="You vote directly"
            no={"Delegated to " + shortAddr(voterInfo.delegate)}
          />
        )}
        <StatusRow
          label="Proposer Role"
          ok={isProposer}
          yes="Can create proposals"
          no="Cannot create proposals"
        />
      </div>
    </div>
  );
}
 
function StatusRow({ label, ok, yes, no, value }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-ink border-opacity-[0.06] last:border-0">
      <span className="text-sm text-dim">{label}</span>
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {value !== undefined ? value : (
          <>
            {ok !== undefined && (
              ok
                ? <CheckCircle2 size={14} className="text-pulse" />
                : <XCircle size={14} className="text-signal" />
            )}
            <span className={ok === false ? "text-signal" : "text-ink"}>
              {ok ? yes : no}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
 
// -- Delegate panel -----------------------------------------------------------
function DelegateCard({ onDelegated }) {
  const { delegate, delegating } = useDelegate();
  const [addr, setAddr] = useState("");
 
  async function handleDelegate(e) {
    e.preventDefault();
    if (!ethers.isAddress(addr)) { toast.error("Invalid address"); return; }
    const ok = await delegate(addr);
    if (ok) { setAddr(""); onDelegated?.(); }
  }
 
  return (
    <div className="card animate-fade-up" style={{ animationDelay: "80ms" }}>
      <h2 className="font-display font-semibold mb-1 flex items-center gap-2">
        <ArrowRightLeft size={15} /> Delegate Vote
      </h2>
      <p className="text-xs text-dim mb-4">
        Transfer your voting weight to another registered voter.
        This is permanent and cannot be undone.
      </p>
      <form onSubmit={handleDelegate} className="flex gap-2">
        <input
          className="input flex-1 font-mono text-sm py-2.5"
          placeholder="0x delegate address"
          value={addr}
          onChange={e => setAddr(e.target.value)}
        />
        <button type="submit" disabled={delegating || !addr} className="btn-primary shrink-0">
          {delegating
            ? <Loader2 size={14} className="animate-spin" />
            : <ArrowRightLeft size={14} />}
        </button>
      </form>
    </div>
  );
}
 
// -- Admin panel --------------------------------------------------------------
function AdminPanel({ roContract }) {
  const { contract, account } = useWeb3();
  const { addVoter, removeVoter, loading } = useVoterManagement();
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [tab,         setTab]         = useState("add");
  const [addr,        setAddr]        = useState("");
  const [weight,      setWeight]      = useState(1);
  const [roleLoading, setRoleLoading] = useState(false);
 
  useEffect(() => {
    if (!roContract || !account) return;
    const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    roContract.hasRole(ADMIN_ROLE, account)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [roContract, account]);
 
  if (!isAdmin) return null;
 
  async function handleAdd(e) {
    e.preventDefault();
    if (!ethers.isAddress(addr)) { toast.error("Invalid address"); return; }
    const ok = await addVoter(addr, Number(weight));
    if (ok) setAddr("");
  }
 
  async function handleRemove(e) {
    e.preventDefault();
    if (!ethers.isAddress(addr)) { toast.error("Invalid address"); return; }
    const ok = await removeVoter(addr);
    if (ok) setAddr("");
  }
 
  async function handleGrantProposer(e) {
    e.preventDefault();
    if (!ethers.isAddress(addr)) { toast.error("Invalid address"); return; }
    setRoleLoading(true);
    const tid = toast.loading("Granting Proposer Role...");
    try {
      const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
      const already = await roContract.hasRole(PROPOSER_ROLE, addr);
      if (already) {
        toast.error("Address already has Proposer Role", { id: tid });
        return;
      }
      const tx = await contract.grantRole(PROPOSER_ROLE, addr);
      toast.loading("Confirming...", { id: tid });
      await tx.wait();
      toast.success("Proposer Role granted! They can now create proposals.", { id: tid });
      setAddr("");
    } catch (err) {
      const msg = err?.reason || err?.message || "Failed";
      toast.error(msg.includes("user rejected") ? "Rejected" : "Failed to grant role", { id: tid });
    } finally {
      setRoleLoading(false);
    }
  }
 
  async function handleRevokeProposer(e) {
    e.preventDefault();
    if (!ethers.isAddress(addr)) { toast.error("Invalid address"); return; }
    setRoleLoading(true);
    const tid = toast.loading("Revoking Proposer Role...");
    try {
      const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
      const hasIt = await roContract.hasRole(PROPOSER_ROLE, addr);
      if (!hasIt) {
        toast.error("Address does not have Proposer Role", { id: tid });
        return;
      }
      const tx = await contract.revokeRole(PROPOSER_ROLE, addr);
      toast.loading("Confirming...", { id: tid });
      await tx.wait();
      toast.success("Proposer Role revoked.", { id: tid });
      setAddr("");
    } catch (err) {
      const msg = err?.reason || err?.message || "Failed";
      toast.error(msg.includes("user rejected") ? "Rejected" : "Failed to revoke role", { id: tid });
    } finally {
      setRoleLoading(false);
    }
  }
 
  function handleSubmit(e) {
    if (tab === "add")    return handleAdd(e);
    if (tab === "remove") return handleRemove(e);
    if (tab === "grant")  return handleGrantProposer(e);
    if (tab === "revoke") return handleRevokeProposer(e);
  }
 
  const isAnyLoading = loading || roleLoading;
 
  return (
    <div className="card border-2 border-volt border-opacity-40 animate-fade-up"
         style={{ animationDelay: "120ms" }}>
 
      <h2 className="font-display font-semibold mb-1 flex items-center gap-2">
        <Shield size={15} className="text-signal" /> Admin Panel
      </h2>
      <p className="text-xs text-dim mb-5">Manage voter registrations and proposer roles</p>
 
      {/* Voter management tabs */}
      <p className="text-xs text-dim font-semibold uppercase tracking-wide mb-2">
        Voter Management
      </p>
      <div className="flex gap-2 mb-4">
        {[
          { id: "add",    label: "Add Voter",    icon: UserPlus  },
          { id: "remove", label: "Remove Voter", icon: UserMinus },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setAddr(""); }}
            className={"flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-lg transition-all " +
              (tab === id ? "bg-ink text-paper" : "bg-ink bg-opacity-[0.06] text-dim hover:text-ink")}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>
 
      {/* Proposer role tabs */}
      <p className="text-xs text-dim font-semibold uppercase tracking-wide mb-2">
        Proposer Role
      </p>
      <div className="flex gap-2 mb-5">
        {[
          { id: "grant",  label: "Grant Proposer",  icon: Star   },
          { id: "revoke", label: "Revoke Proposer",  icon: ShieldMinus },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setAddr(""); }}
            className={"flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-lg transition-all " +
              (tab === id
                ? id === "grant" ? "bg-pulse text-ink" : "bg-signal text-white"
                : "bg-ink bg-opacity-[0.06] text-dim hover:text-ink")}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>
 
      {/* Info banners */}
      {tab === "grant" && (
        <div className="rounded-xl px-4 py-3 mb-4 text-xs text-teal-700 bg-pulse bg-opacity-10"
             style={{ border: "1px solid rgba(0,212,170,0.25)" }}>
          <p className="font-semibold mb-0.5">Granting Proposer Role</p>
          <p>This address will be able to create new governance proposals.</p>
        </div>
      )}
      {tab === "revoke" && (
        <div className="rounded-xl px-4 py-3 mb-4 text-xs text-signal bg-signal bg-opacity-10"
             style={{ border: "1px solid rgba(255,92,0,0.25)" }}>
          <p className="font-semibold mb-0.5">Revoking Proposer Role</p>
          <p>This address will no longer be able to create proposals.</p>
        </div>
      )}
 
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">
            {tab === "add"    && "Voter Address to Register"}
            {tab === "remove" && "Voter Address to Remove"}
            {tab === "grant"  && "Address to Grant Proposer Role"}
            {tab === "revoke" && "Address to Revoke Proposer Role"}
          </label>
          <input required className="input font-mono text-sm" placeholder="0x..."
            value={addr} onChange={e => setAddr(e.target.value)} />
        </div>
 
        {tab === "add" && (
          <div>
            <label className="label flex items-center gap-1.5">
              <Weight size={11} /> Voting Weight
            </label>
            <input type="number" min="1" required className="input font-mono"
              value={weight} onChange={e => setWeight(e.target.value)} />
            <p className="text-xs text-dim mt-1">Higher weight = more voting power</p>
          </div>
        )}
 
        <button type="submit" disabled={isAnyLoading || !addr}
          className={"w-full justify-center " +
            (tab === "add" || tab === "grant" ? "btn-pulse" : "btn-signal")}>
          {isAnyLoading
            ? <><Loader2 size={14} className="animate-spin" /> Processing...</>
            : tab === "add"    ? <><UserPlus  size={14} /> Register Voter</>
            : tab === "remove" ? <><UserMinus size={14} /> Remove Voter</>
            : tab === "grant"  ? <><Star   size={14} /> Grant Proposer Role</>
            :                    <><ShieldMinus size={14} /> Revoke Proposer Role</>
          }
        </button>
      </form>
 
      {/* Quick fill - Hardhat test addresses */}
      <div className="mt-5 pt-4 border-t border-ink border-opacity-[0.08]">
        <p className="text-xs text-dim font-semibold mb-2">
          Click to fill address field:
        </p>
        <div className="space-y-1">
          {[
            { label: "Account #1", a: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
            { label: "Account #2", a: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
            { label: "Account #3", a: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" },
          ].map(({ label, a }) => (
            <div key={a} onClick={() => { setAddr(a); toast(label + " filled", { icon: "📋" }); }}
              className="flex items-center justify-between gap-2 cursor-pointer
                         rounded-lg px-2 py-1.5 transition-all hover:bg-ink hover:bg-opacity-[0.04]">
              <span className="text-xs font-semibold text-dim shrink-0">{label}</span>
              <span className="font-mono text-xs text-ink truncate">{a}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}