// src/hooks/useProposals.js
import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';

export function useProposals() {
	const { roContract, onContractEvent } = useWeb3();
	const [proposals, setProposals] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchProposals = useCallback(async () => {
		if (!roContract) return;
		setLoading(true);
		setError(null);
		try {
			const raw = await roContract.getAllProposals();
			setProposals(raw.map(normalizeProposal));
		} catch (e) {
			setError(e.message || 'Failed to load proposals');
		} finally {
			setLoading(false);
		}
	}, [roContract]);

	// Initial load
	useEffect(() => {
		fetchProposals();
	}, [fetchProposals]);

	// Live updates via contract events
	useEffect(() => {
		const offCreated = onContractEvent('ProposalCreated', fetchProposals);
		const offVote = onContractEvent('VoteCast', fetchProposals);
		const offEdited = onContractEvent('ProposalEdited', fetchProposals);
		const offCancelled = onContractEvent('ProposalCancelled', fetchProposals);
		const offChanged = onContractEvent('VoteChanged', fetchProposals);
		return () => {
			offCreated?.();
			offVote?.();
			offEdited?.();
			offCancelled?.();
			offChanged?.();
		};
	}, [onContractEvent, fetchProposals]);

	return { proposals, loading, error, refresh: fetchProposals };
}

export function useProposal(proposalId) {
	const { roContract, onContractEvent } = useWeb3();
	const [proposal, setProposal] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetch = useCallback(async () => {
		if (!roContract || proposalId === undefined) return;
		setLoading(true);
		try {
			const raw = await roContract.getProposal(proposalId);
			setProposal(normalizeProposal(raw));
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}, [roContract, proposalId]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	// Listen for changes to this proposal
	useEffect(() => {
		const offEdited = onContractEvent('ProposalEdited', fetch);
		const offCancelled = onContractEvent('ProposalCancelled', fetch);
		const offVote = onContractEvent('VoteCast', fetch);
		const offChanged = onContractEvent('VoteChanged', fetch);
		return () => {
			offEdited?.();
			offCancelled?.();
			offVote?.();
			offChanged?.();
		};
	}, [onContractEvent, fetch]);

	return { proposal, loading, error, refresh: fetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalizer: BigInt → JS-friendly shape
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeProposal(raw) {
	const CATEGORY_LABELS = [
		'General',
		'Treasury',
		'Protocol',
		'Membership',
		'Emergency',
	];
	const STATUS_LABELS = ['Active', 'Closed', 'QuorumFailed'];

	const deadline = Number(raw.deadline);
	const now = Math.floor(Date.now() / 1000);
	const totalVotes = Number(raw.totalVotes);
	const quorum = Number(raw.quorum);

	return {
		id: Number(raw.id),
		description: raw.description,
		ipfsHash: raw.ipfsHash,
		options: [...raw.options],
		voteCounts: [...raw.voteCounts].map(Number),
		totalVotes,
		deadline,
		quorum,
		creator: raw.creator,
		category: Number(raw.category),
		categoryLabel: CATEGORY_LABELS[Number(raw.category)] || 'Unknown',
		status: Number(raw.status),
		statusLabel: STATUS_LABELS[Number(raw.status)] || 'Unknown',
		isActive: Number(raw.status) === 0,
		cancelled: raw.cancelled || false,
		timeLeft: Math.max(0, deadline - now),
		quorumPct:
			quorum > 0 ? Math.min(100, Math.round((totalVotes / quorum) * 100)) : 100,
	};
}
