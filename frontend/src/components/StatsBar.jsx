// src/components/StatsBar.jsx
import React from "react";
import { Vote, CheckCheck, Clock, BarChart2 } from "lucide-react";

export default function StatsBar({ proposals }) {
  const total  = proposals.length;
  const active = proposals.filter(p => p.status === 0).length;
  const closed = proposals.filter(p => p.status === 1).length;
  const failed = proposals.filter(p => p.status === 2).length;
  const totalVotes = proposals.reduce((s, p) => s + p.totalVotes, 0);

  const stats = [
    { label: "Total Proposals", value: total,      icon: Vote,      color: "text-ink" },
    { label: "Active",          value: active,     icon: Clock,     color: "text-pulse" },
    { label: "Closed",          value: closed,     icon: CheckCheck,color: "text-dim" },
    { label: "Total Votes",     value: totalVotes, icon: BarChart2, color: "text-signal" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="card py-4 px-5">
          <div className={`mb-2 ${color}`}>
            <Icon size={18} />
          </div>
          <p className="font-display font-bold text-2xl text-ink">{value}</p>
          <p className="text-xs text-dim mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}
