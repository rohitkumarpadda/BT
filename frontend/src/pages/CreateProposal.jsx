import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateProposal } from "../hooks/useAdmin";
import WalletGate from "../components/WalletGate";
import { PlusCircle, Trash2, Loader2, Clock, Users, Hash } from "lucide-react";
import toast from "react-hot-toast";
 
const CATEGORIES = [
  { value: 0, label: "⚙️ General" },
  { value: 1, label: "💰 Treasury" },
  { value: 2, label: "🔧 Protocol" },
  { value: 3, label: "👥 Membership" },
  { value: 4, label: "🚨 Emergency" },
];
 
const DURATIONS = [
  { label: "1 hour",  secs: 3600 },
  { label: "6 hours", secs: 21600 },
  { label: "1 day",   secs: 86400 },
  { label: "3 days",  secs: 259200 },
  { label: "1 week",  secs: 604800 },
  { label: "Custom",  secs: 0 },
];
 
export default function CreateProposal() {
  const navigate = useNavigate();
  const { createProposal, creating } = useCreateProposal();
 
  const [form, setForm] = useState({
    description:  "",
    options:      ["Yes", "No"],
    durationPreset: 3600,
    durationCustom: "",
    quorum:       1,
    category:     0,
    ipfsHash:     "",
  });
 
  const isCustom = form.durationPreset === 0;
 
  function addOption() {
    if (form.options.length >= 10) { toast.error("Max 10 options"); return; }
    setForm(f => ({ ...f, options: [...f.options, ""] }));
  }
 
  function removeOption(i) {
    if (form.options.length <= 2) { toast.error("Minimum 2 options"); return; }
    setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
  }
 
  function setOption(i, val) {
    setForm(f => {
      const opts = [...f.options];
      opts[i] = val;
      return { ...f, options: opts };
    });
  }
 
  async function handleSubmit(e) {
    e.preventDefault();
 
    const dur = isCustom ? Number(form.durationCustom) : form.durationPreset;
    if (dur < 60) { toast.error("Duration must be at least 60 seconds"); return; }
    if (form.options.some(o => !o.trim())) { toast.error("All options must be non-empty"); return; }
    if (new Set(form.options).size !== form.options.length) {
      toast.error("Duplicate options are not allowed"); return;
    }
 
    const newId = await createProposal({
      description:     form.description.trim(),
      options:         form.options.map(o => o.trim()),
      durationSeconds: dur,
      quorum:          Number(form.quorum),
      category:        form.category,
      ipfsHash:        form.ipfsHash.trim(),
    });
 
    if (newId !== null) navigate(`/proposal/${newId}`);
  }
 
  return (
    <WalletGate message="Connect your wallet to create proposals">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
 
        <div className="mb-8 animate-fade-up">
          <h1 className="font-display font-extrabold text-3xl tracking-tight mb-1">
            New Proposal
          </h1>
          <p className="text-dim text-sm">
            Submit a governance proposal for on-chain voting
          </p>
        </div>
 
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-up"
              style={{ animationDelay: "60ms" }}>
 
          {/* Description */}
          <div className="card">
            <h2 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <Hash size={14} /> Proposal Details
            </h2>
 
            <div className="space-y-4">
              <div>
                <label className="label">Description *</label>
                <textarea
                  required
                  rows={3}
                  className="input resize-none"
                  placeholder="What are you proposing? Be clear and concise."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
 
              <div>
                <label className="label">Category</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      type="button"
                      key={c.value}
                      onClick={() => setForm(f => ({ ...f, category: c.value }))}
                      className={`text-xs font-display font-medium py-2 px-3 rounded-xl
                                  border-2 transition-all
                                  ${form.category === c.value
                                    ? "border-ink bg-ink text-paper"
                                    : "border-ink border-opacity-10 hover:border-ink border-opacity-25"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
 
              <div>
                <label className="label">IPFS Metadata Hash <span className="text-dim">(optional)</span></label>
                <input
                  className="input font-mono text-sm"
                  placeholder="Qm… or bafyb…"
                  value={form.ipfsHash}
                  onChange={e => setForm(f => ({ ...f, ipfsHash: e.target.value }))}
                />
              </div>
            </div>
          </div>
 
          {/* Options */}
          <div className="card">
            <h2 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <PlusCircle size={14} /> Voting Options
              <span className="tag">{form.options.length}/10</span>
            </h2>
 
            <div className="space-y-2.5 mb-3">
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="w-5 h-5 rounded bg-ink bg-opacity-[0.08] flex items-center justify-center
                                  text-xs font-mono text-dim shrink-0">
                    {i + 1}
                  </div>
                  <input
                    required
                    className="input flex-1 py-2"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => setOption(i, e.target.value)}
                  />
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-dim hover:text-signal transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
 
            <button
              type="button"
              onClick={addOption}
              disabled={form.options.length >= 10}
              className="btn-outline text-sm w-full justify-center"
            >
              <PlusCircle size={13} /> Add Option
            </button>
          </div>
 
          {/* Duration + Quorum */}
          <div className="card">
            <h2 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <Clock size={14} /> Timing & Quorum
            </h2>
 
            <div className="space-y-4">
              {/* Duration presets */}
              <div>
                <label className="label">Voting Duration *</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                  {DURATIONS.map(d => (
                    <button
                      type="button"
                      key={d.label}
                      onClick={() => setForm(f => ({ ...f, durationPreset: d.secs }))}
                      className={`text-xs font-display font-medium py-2 px-2 rounded-xl
                                  border-2 transition-all text-center
                                  ${form.durationPreset === d.secs
                                    ? "border-ink bg-ink text-paper"
                                    : "border-ink border-opacity-10 hover:border-ink border-opacity-25"}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {isCustom && (
                  <input
                    type="number"
                    min="60"
                    className="input font-mono"
                    placeholder="Duration in seconds (min 60)"
                    value={form.durationCustom}
                    onChange={e => setForm(f => ({ ...f, durationCustom: e.target.value }))}
                  />
                )}
              </div>
 
              {/* Quorum */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <Users size={12} /> Minimum Quorum (total voting weight) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input font-mono"
                  placeholder="e.g. 3"
                  value={form.quorum}
                  onChange={e => setForm(f => ({ ...f, quorum: e.target.value }))}
                />
                <p className="text-xs text-dim mt-1.5">
                  Proposal results are valid only if total votes cast ≥ this number
                </p>
              </div>
            </div>
          </div>
 
          {/* Submit */}
          <button type="submit" disabled={creating} className="btn-primary w-full justify-center py-3">
            {creating
              ? <><Loader2 size={15} className="animate-spin" /> Creating…</>
              : <><PlusCircle size={15} /> Create Proposal</>
            }
          </button>
        </form>
      </div>
    </WalletGate>
  );
}