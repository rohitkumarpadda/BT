// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useProposals } from "../hooks/useProposals";
import ProposalCard from "../components/ProposalCard";
import StatsBar from "../components/StatsBar";
import { Loader2, RefreshCw, PlusCircle, SearchX } from "lucide-react";
 
const FILTERS = [
  { label: "All",    value: "all"    },
  { label: "Active", value: "active" },
  { label: "Closed", value: "closed" },
  { label: "Failed", value: "failed" },
];
 
const CATEGORIES = ["All", "General", "Treasury", "Protocol", "Membership", "Emergency"];
 
export default function Dashboard() {
  const { proposals, loading, error, refresh } = useProposals();
  const [filter,   setFilter]   = useState("all");
  const [category, setCategory] = useState("All");
  const [search,   setSearch]   = useState("");
 
  // Bug 1 Fix: Reset category/filter when proposals reload to avoid stale filtered state
  useEffect(() => {
    if (!loading && proposals.length === 0) {
      setFilter("all");
      setCategory("All");
      setSearch("");
    }
  }, [loading]);
 
  // Bug 2 Fix: Guard against undefined/null fields before filtering
  const visible = proposals
    .filter(p => {
      if (!p || p.status === undefined) return false; // guard null proposals
      if (filter === "active" && p.status !== 0) return false;
      if (filter === "closed" && p.status !== 1) return false;
      if (filter === "failed" && p.status !== 2) return false;
      if (category !== "All" && p.categoryLabel !== category) return false;
      // Bug 3 Fix: Guard against missing description before calling toLowerCase
      if (search && !(p.description || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    // Bug 4 Fix: Safe sort — guard against undefined id values
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
 
  // Bug 5 Fix: Show "no results" only when proposals exist but none match filters
  // Previously it showed "no proposals" even during initial load
  const hasProposals     = proposals.length > 0;
  const noFilterResults  = hasProposals && visible.length === 0;
  const noProposalsAtAll = !loading && !error && !hasProposals;
 
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
 
      {/* Hero */}
      <div className="mb-8 animate-fade-up">
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-2">
          Governance
        </h1>
        <p className="text-dim text-sm">
          Transparent, on-chain decision making
        </p>
      </div>
 
      {/* Stats — only show when data is loaded */}
      {!loading && !error && hasProposals && <StatsBar proposals={proposals} />}
 
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <input
          className="input flex-1"
          placeholder="Search proposals..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
 
        {/* Status filter */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "rgba(13,13,15,0.04)" }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all
                          ${filter === f.value
                            ? "bg-white shadow-sm text-ink"
                            : "text-dim hover:text-ink"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
 
        {/* Bug 6 Fix: Disable refresh button while already loading */}
        <button
          onClick={refresh}
          disabled={loading}
          className="btn-outline py-2"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
 
      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            // Bug 7 Fix: The original had broken className — hover and bg-opacity were
            // on separate class strings causing the inactive style to never apply correctly
            className="tag cursor-pointer transition-all"
            style={{
              backgroundColor: category === c ? "#0D0D0F" : undefined,
              color:           category === c ? "#F5F3EE" : undefined,
            }}
          >
            {c}
          </button>
        ))}
      </div>
 
      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-dim">
          <Loader2 size={28} className="animate-spin mb-3" />
          <p className="text-sm">Loading proposals...</p>
        </div>
      )}
 
      {/* Error state */}
      {!loading && error && (
        <div className="card text-center py-10"
             style={{ borderColor: "rgba(255,92,0,0.20)", backgroundColor: "rgba(255,92,0,0.05)" }}>
          <p className="text-signal font-medium mb-2">Failed to load</p>
          {/* Bug 8 Fix: Show friendly message, error object could be non-string */}
          <p className="text-sm text-dim mb-4">
            {typeof error === "string" ? error : "Could not connect to contract. Make sure Hardhat node is running."}
          </p>
          <button onClick={refresh} className="btn-outline text-sm">Retry</button>
        </div>
      )}
 
      {/* Bug 9 Fix: Separate "no proposals at all" from "no filter results"
          Previously both cases showed the same message which was confusing */}
 
      {/* No proposals exist at all */}
      {noProposalsAtAll && (
        <div className="flex flex-col items-center justify-center py-20 text-dim">
          <SearchX size={32} className="mb-3 opacity-40" />
          <p className="font-medium mb-1">No proposals yet</p>
          <p className="text-sm mb-4">Be the first to create a governance proposal</p>
          <Link to="/create" className="btn-primary">
            <PlusCircle size={14} /> Create Proposal
          </Link>
        </div>
      )}
 
      {/* Proposals exist but none match current filters */}
      {noFilterResults && (
        <div className="flex flex-col items-center justify-center py-20 text-dim">
          <SearchX size={32} className="mb-3 opacity-40" />
          <p className="font-medium mb-1">No proposals match</p>
          <p className="text-sm mb-4">Try adjusting your search or filters</p>
          {/* Bug 10 Fix: Give a clear reset action instead of linking to create */}
          <button
            onClick={() => { setFilter("all"); setCategory("All"); setSearch(""); }}
            className="btn-outline text-sm"
          >
            Clear filters
          </button>
        </div>
      )}
 
      {/* Proposal grid */}
      {!loading && !error && visible.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((p, i) => (
            // Bug 11 Fix: Use stable key — p.id is unique and stable,
            // using index as key causes React reconciliation bugs on filter changes
            <ProposalCard key={p.id} proposal={p} delay={i * 40} />
          ))}
        </div>
      )}
    </div>
  );
}