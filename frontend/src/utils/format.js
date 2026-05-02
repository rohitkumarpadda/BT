export function shortAddr(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
 
export function formatDeadline(unixTs) {
  if (!unixTs) return "—";
  return new Date(unixTs * 1000).toLocaleString(undefined, {
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}
 
export function formatCountdown(secondsLeft) {
  if (secondsLeft <= 0) return "Ended";
  const d = Math.floor(secondsLeft / 86400);
  const h = Math.floor((secondsLeft % 86400) / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}
 
export function pct(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}
 
export const CATEGORY_COLORS = {
  0: "bg-ink bg-opacity-[0.08] text-dim",           // General
  1: "bg-amber-100 text-amber-700", // Treasury
  2: "bg-blue-100 text-blue-700",   // Protocol
  3: "bg-purple-100 text-purple-700",// Membership
  4: "bg-signal bg-opacity-[0.15] text-signal",    // Emergency
};
 
export const CATEGORY_ICONS = {
  0: "⚙️", 1: "💰", 2: "🔧", 3: "👥", 4: "🚨",
};
 
export function getOptionColor(index) {
  const colors = [
    "bg-pulse",
    "bg-signal",
    "bg-violet-500",
    "bg-amber-400",
    "bg-blue-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];
  return colors[index % colors.length];
}