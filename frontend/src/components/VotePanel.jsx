import React, { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useVote } from "../hooks/useVote";
import { getOptionColor, pct } from "../utils/format";
import { CheckCircle2, Send, Lock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
 
export default function VotePanel({ proposal, onVoted }) {
  const { account, voterInfo, connectWallet, roContract } = useWeb3();
  const { castVote, voting } = useVote();
 
  const [selected,    setSelected]    = useState(null);
  const [userVoted,   setUserVoted]   = useState(false);
  const [userOptIdx,  setUserOptIdx]  = useState(null);
 
  // Check if user already voted
  useEffect(() => {
    if (!roContract || !account || !proposal) return;
    roContract.hasUserVoted(proposal.id, account).then(([voted, idx]) => {
      setUserVoted(voted);
      setUserOptIdx(voted ? Number(idx) : null);
    }).catch(() => {});
  }, [roContract, account, proposal]);
 
  async function handleVote() {
    if (selected === null) { toast.error("Select an option first"); return; }
    const ok = await castVote(proposal.id, selected);
    if (ok) {
      setUserVoted(true);
      setUserOptIdx(selected);
      onVoted?.();
    }
  }
 
  const canVote = account && voterInfo?.registered && !voterInfo?.hasDelegated;
  const isOpen  = proposal.isActive;
 
  return (
    <div className="card">
      <h2 className="font-display font-semibold text-base mb-4 flex items-center gap-2">
        Cast Your Vote
        {!isOpen && <span className="badge-closed">Closed</span>}
      </h2>
 
      {/* Options */}
      <div className="space-y-2.5 mb-5">
        {proposal.options.map((opt, i) => {
          const votes    = proposal.voteCounts[i] || 0;
          const share    = pct(votes, Math.max(proposal.totalVotes, 1));
          const isChosen = userVoted && userOptIdx === i;
          const isPicked = selected === i;
 
          return (
            <button
              key={i}
              disabled={!isOpen || userVoted || !canVote || voting}
              onClick={() => setSelected(i)}
              className={`w-full relative text-left rounded-xl border-2 p-4 transition-all duration-150
                          ${isChosen  ? "border-pulse bg-pulse bg-opacity-[0.08]"
                            : isPicked ? "border-ink bg-ink bg-opacity-[0.04]"
                            : "border-ink border-opacity-10 bg-white hover:border-ink border-opacity-25 hover:bg-ink bg-opacity-[0.08]"}
                          disabled:cursor-not-allowed`}
            >
              {/* Vote bar fill */}
              <div
                className={`absolute inset-0 rounded-xl opacity-10 transition-all duration-700
                            ${getOptionColor(i)}`}
                style={{ width: `${share}%` }}
              />
 
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Radio dot */}
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                                  ${isChosen  ? "border-pulse bg-pulse"
                                    : isPicked ? "border-ink"
                                    : "border-ink border-opacity-25"}`}>
                    {(isChosen || isPicked) &&
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className={`font-display font-medium text-sm
                                    ${isChosen || isPicked ? "text-ink" : "text-ink opacity-80"}`}>
                    {opt}
                  </span>
                  {isChosen && <CheckCircle2 size={14} className="text-pulse" />}
                </div>
 
                <div className="text-right">
                  <span className="font-mono text-xs text-dim">{share}%</span>
                  <p className="font-mono text-xs text-dim/70">{votes}w</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
 
      {/* Action area */}
      {!account && (
        <button onClick={connectWallet} className="btn-primary w-full justify-center">
          <Lock size={14} /> Connect Wallet to Vote
        </button>
      )}
 
      {account && !voterInfo?.registered && (
        <div className="text-sm text-dim bg-ink bg-opacity-[0.04] rounded-xl px-4 py-3 text-center">
          Your address is not registered as a voter
        </div>
      )}
 
      {account && voterInfo?.registered && voterInfo?.hasDelegated && (
        <div className="text-sm text-dim bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
          You've delegated your vote — your delegate votes on your behalf
        </div>
      )}
 
      {account && voterInfo?.registered && !voterInfo?.hasDelegated && !userVoted && isOpen && (
        <button
          onClick={handleVote}
          disabled={selected === null || voting}
          className="btn-primary w-full justify-center"
        >
          {voting
            ? <><Loader2 size={14} className="animate-spin" /> Submitting…</>
            : <><Send size={14} /> Submit Vote</>
          }
        </button>
      )}
 
      {userVoted && (
        <div className="flex items-center gap-2 bg-pulse bg-opacity-10 border border-pulse border-opacity-30
                        rounded-xl px-4 py-3 text-sm text-teal-700">
          <CheckCircle2 size={16} />
          Vote recorded for "{proposal.options[userOptIdx]}"
        </div>
      )}
 
      {!isOpen && !userVoted && (
        <div className="text-sm text-dim text-center bg-ink bg-opacity-[0.04] rounded-xl px-4 py-3">
          Voting has ended
        </div>
      )}
    </div>
  );
}