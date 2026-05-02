import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useProposal } from "../hooks/useProposals";
import { useWeb3 } from "../context/Web3Context";
import VotePanel from "../components/VotePanel";
import { ArrowLeft, Clock, Users, ExternalLink, Trophy,
         AlertTriangle, Loader2, BarChart2 } from "lucide-react";
import { formatDeadline, formatCountdown, pct, CATEGORY_COLORS,
         CATEGORY_ICONS, getOptionColor, shortAddr } from "../utils/format";
 
export default function ProposalDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { proposal, loading, error, refresh } = useProposal(Number(id));
  const { roContract } = useWeb3();
  const [winner,     setWinner]    = useState(null);
  const [timeLeft,   setTimeLeft]  = useState(0);
 
  useEffect(() => {
    if (!proposal) return;
    setTimeLeft(proposal.timeLeft);
  }, [proposal]);
 
  // Countdown ticker
  useEffect(() => {
    if (!proposal?.isActive) return;
    const t = setInterval(() => setTimeLeft(tl => Math.max(0, tl - 1)), 1000);
    return () => clearInterval(t);
  }, [proposal?.isActive]);
 
  // Fetch winner after closed
  useEffect(() => {
    if (!roContract || !proposal || proposal.isActive) return;
    roContract.getWinner(proposal.id)
      .then(w => setWinner({
        optionIndex: Number(w.winningOptionIndex),
        text:        w.winningOptionText,
        votes:       Number(w.winningVoteCount),
        isTie:       w.isTie,
        quorum:      w.quorumReached,
      }))
      .catch(() => {});
  }, [roContract, proposal]);
 
  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <Loader2 size={28} className="animate-spin text-dim" />
    </div>
  );
 
  if (error || !proposal) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <AlertTriangle size={32} className="text-signal mx-auto mb-3" />
      <p className="font-display font-semibold mb-2">Proposal not found</p>
      <p className="text-sm text-dim mb-4">{error}</p>
      <Link to="/" className="btn-outline text-sm">← Back</Link>
    </div>
  );
 
  const totalVotes = proposal.totalVotes;
  const maxVotes   = Math.max(...proposal.voteCounts, 1);
 
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
 
      {/* Back */}
      <button onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-dim hover:text-ink mb-6 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>
 
      <div className="grid lg:grid-cols-3 gap-6">
 
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-5">
 
          {/* Header card */}
          <div className="card animate-fade-up">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className={
                proposal.status === 0 ? "badge-active" :
                proposal.status === 2 ? "badge-failed" : "badge-closed"
              }>
                {proposal.status === 0 &&
                  <span className="w-1.5 h-1.5 rounded-full bg-pulse animate-pulse-slow" />}
                {proposal.statusLabel}
              </span>
 
              <span className={`badge ${CATEGORY_COLORS[proposal.category]}`}>
                {CATEGORY_ICONS[proposal.category]} {proposal.categoryLabel}
              </span>
 
              <span className="tag">#{proposal.id}</span>
            </div>
 
            <h1 className="font-display font-bold text-xl sm:text-2xl leading-snug mb-4">
              {proposal.description}
            </h1>
 
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-ink border-opacity-[0.06]">
              <Stat label="Total Votes">
                <span className="font-display font-bold text-lg">{totalVotes}</span>
              </Stat>
              <Stat label="Quorum">
                <span className="font-display font-bold text-lg">
                  {proposal.quorumPct}%
                  <span className="text-sm font-normal text-dim ml-1">/ {proposal.quorum} req</span>
                </span>
              </Stat>
              <Stat label={proposal.isActive ? "Time Left" : "Ended"}>
                <span className={`font-mono text-sm font-medium
                                  ${proposal.isActive ? "text-pulse" : "text-dim"}`}>
                  {proposal.isActive ? formatCountdown(timeLeft) : formatDeadline(proposal.deadline)}
                </span>
              </Stat>
              <Stat label="Creator">
                <span className="font-mono text-sm">{shortAddr(proposal.creator)}</span>
              </Stat>
            </div>
 
            {proposal.ipfsHash && (
              <a
                href={`https://ipfs.io/ipfs/${proposal.ipfsHash}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-dim hover:text-ink
                           mt-3 transition-colors"
              >
                <ExternalLink size={11} /> IPFS metadata
              </a>
            )}
          </div>
 
          {/* Results card */}
          <div className="card animate-fade-up" style={{ animationDelay: "80ms" }}>
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
              <BarChart2 size={16} /> Results
            </h2>
 
            <div className="space-y-4">
              {proposal.options.map((opt, i) => {
                const v     = proposal.voteCounts[i] || 0;
                const share = pct(v, Math.max(totalVotes, 1));
                const isWin = winner?.optionIndex === i && !winner?.isTie;
 
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-sm ${getOptionColor(i)}`} />
                        <span className={`font-medium ${isWin ? "text-ink" : "text-ink opacity-80"}`}>
                          {opt}
                        </span>
                        {isWin && <Trophy size={13} className="text-amber-500" />}
                        {winner?.isTie && winner?.optionIndex === i && (
                          <span className="tag text-[10px]">Tie</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-medium">{share}%</span>
                        <span className="text-dim text-xs ml-2">({v}w)</span>
                      </div>
                    </div>
                    <div className="progress-bar h-3">
                      <div
                        className={`progress-fill ${getOptionColor(i)} ${isWin ? "opacity-100" : "opacity-70"}`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
 
            {/* Quorum bar */}
            <div className="mt-5 pt-4 border-t border-ink border-opacity-[0.06]">
              <div className="flex justify-between text-xs text-dim mb-1.5">
                <span>Quorum progress</span>
                <span>{totalVotes} / {proposal.quorum} votes needed</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${proposal.quorumPct >= 100 ? "bg-pulse" : "bg-ink bg-opacity-30"}`}
                  style={{ width: `${Math.min(100, proposal.quorumPct)}%` }}
                />
              </div>
            </div>
 
            {/* Winner banner */}
            {winner && !proposal.isActive && (
              <div className={`mt-4 rounded-xl px-4 py-3 flex items-center gap-3
                              ${winner.quorum
                                ? "bg-pulse bg-opacity-10 border border-pulse border-opacity-25"
                                : "bg-ink bg-opacity-5 border border-ink border-opacity-10"}`}>
                {winner.quorum
                  ? <Trophy size={18} className="text-amber-500 shrink-0" />
                  : <AlertTriangle size={18} className="text-dim shrink-0" />}
                <div>
                  <p className={`text-sm font-display font-semibold
                                ${winner.quorum ? "text-ink" : "text-dim"}`}>
                    {winner.quorum
                      ? (winner.isTie
                          ? "It's a tie — earliest option wins by convention"
                          : `"${winner.text}" wins with ${winner.votes} votes`)
                      : "Quorum not reached — result invalid"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
 
        {/* Right: Vote panel */}
        <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
          <VotePanel proposal={proposal} onVoted={refresh} />
        </div>
      </div>
    </div>
  );
}
 
function Stat({ label, children }) {
  return (
    <div>
      <p className="text-xs text-dim mb-1">{label}</p>
      {children}
    </div>
  );
}