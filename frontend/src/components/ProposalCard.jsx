// src/components/ProposalCard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Users, BarChart2, ChevronRight } from "lucide-react";
import { formatCountdown, formatDeadline, pct,
         CATEGORY_COLORS, CATEGORY_ICONS, getOptionColor } from "../utils/format";
 
export default function ProposalCard({ proposal, delay = 0 }) {
  const navigate = useNavigate();
 
  // Bug 1 Fix: Initialise timeLeft safely — proposal.timeLeft could be undefined
  const [timeLeft, setTimeLeft] = useState(proposal?.timeLeft ?? 0);
 
  // Bug 2 Fix: Sync timeLeft when proposal prop updates (e.g. after refresh)
  useEffect(() => {
    setTimeLeft(proposal?.timeLeft ?? 0);
  }, [proposal?.timeLeft]);
 
  // Live countdown ticker
  useEffect(() => {
    if (!proposal?.isActive) return;
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [proposal?.isActive]);
 
  // Bug 3 Fix: maxVotes was declared but never used — removed the dead variable
  // It was: const maxVotes = Math.max(...proposal.voteCounts, 1);
 
  // Bug 4 Fix: Guard against empty/undefined proposal
  if (!proposal) return null;
 
  // Bug 5 Fix: Guard against empty voteCounts array which would cause
  // Math.max(...[]) to return -Infinity
  const totalVotesForPct = Math.max(proposal.totalVotes || 0, 1);
 
  return (
    <div
      className="card-hover animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both", opacity: 0 }}
      onClick={() => navigate(`/proposal/${proposal.id}`)}
      // Bug 6 Fix: Add keyboard accessibility — card is clickable so needs role + handler
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") navigate(`/proposal/${proposal.id}`); }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status badge */}
          <span className={
            proposal.status === 0 ? "badge-active" :
            proposal.status === 2 ? "badge-failed" : "badge-closed"
          }>
            {proposal.status === 0 &&
              <span className="w-1.5 h-1.5 rounded-full bg-pulse animate-pulse-slow" />}
            {/* Bug 7 Fix: Guard against undefined statusLabel */}
            {proposal.statusLabel || "Unknown"}
          </span>
 
          {/* Category badge */}
          {/* Bug 8 Fix: Guard against undefined category */}
          <span className={`badge ${CATEGORY_COLORS[proposal.category] || CATEGORY_COLORS[0]}`}>
            {CATEGORY_ICONS[proposal.category] || "⚙️"} {proposal.categoryLabel || "General"}
          </span>
        </div>
 
        <ChevronRight size={16} className="text-dim shrink-0 mt-0.5" />
      </div>
 
      {/* ID + Description */}
      <p className="font-mono text-xs text-dim mb-1">#{proposal.id}</p>
      <h3 className="font-display font-semibold text-ink leading-snug mb-4 line-clamp-2">
        {/* Bug 9 Fix: Fallback for missing description */}
        {proposal.description || "No description provided"}
      </h3>
 
      {/* Vote bars — top 3 options */}
      <div className="space-y-2 mb-4">
        {/* Bug 10 Fix: Guard against undefined options array */}
        {(proposal.options || []).slice(0, 3).map((opt, i) => {
          const v = (proposal.voteCounts || [])[i] || 0;
          const share = pct(v, totalVotesForPct);
          return (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                {/* Bug 11 Fix: opt could be empty string */}
                <span className="font-medium text-ink opacity-80 truncate max-w-[70%]">
                  {opt || `Option ${i + 1}`}
                </span>
                <span className="font-mono text-dim">{share}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getOptionColor(i)}`}
                  style={{ width: `${share}%` }}
                />
              </div>
            </div>
          );
        })}
        {(proposal.options || []).length > 3 && (
          <p className="text-xs text-dim">
            +{proposal.options.length - 3} more option{proposal.options.length - 3 !== 1 ? "s" : ""}
          </p>
        )}
      </div>
 
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 text-xs text-dim"
           style={{ borderTop: "1px solid rgba(13,13,15,0.06)" }}>
        <span className="flex items-center gap-1.5">
          <Users size={12} />
          {/* Bug 12 Fix: totalVotes could be 0 — handle singular/plural correctly */}
          {proposal.totalVotes || 0} vote{(proposal.totalVotes || 0) !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <BarChart2 size={12} />
          Quorum {proposal.quorumPct ?? 0}%
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={12} />
          {proposal.isActive
            ? formatCountdown(timeLeft)
            : formatDeadline(proposal.deadline)}
        </span>
      </div>
    </div>
  );
}