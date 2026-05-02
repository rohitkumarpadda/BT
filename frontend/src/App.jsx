// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import ProposalDetail from "./pages/ProposalDetail";
import CreateProposal from "./pages/CreateProposal";
import Profile from "./pages/Profile";
 
export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/"                  element={<Dashboard />} />
          <Route path="/proposal/:id"      element={<ProposalDetail />} />
          <Route path="/create"            element={<CreateProposal />} />
          <Route path="/profile"           element={<Profile />} />
          <Route path="*"                  element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
 
function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="font-display font-bold text-6xl text-ink opacity-10 mb-4">404</p>
      <h2 className="font-display font-semibold text-xl mb-2">Page not found</h2>
      <a href="/" className="btn-outline text-sm mt-2">← Go home</a>
    </div>
  );
}
 
function Footer() {
  return (
    <footer className="border-t border-ink border-opacity-[0.08] py-6 mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center
                      justify-between gap-2 text-xs text-dim">
        <span className="font-display font-semibold">
          Govern<span className="text-signal">.</span>
        </span>
        <span>Decentralized governance on Ethereum</span>
        <span className="font-mono">GovernanceVoting v2.0</span>
      </div>
    </footer>
  );
}