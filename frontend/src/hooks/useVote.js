// src/hooks/useVote.js
import { useState, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import toast from 'react-hot-toast';

export function useVote() {
	const { contract, account } = useWeb3();
	const [voting, setVoting] = useState(false);
	const [txHash, setTxHash] = useState(null);

	const castVote = useCallback(
		async (proposalId, optionIndex) => {
			if (!contract || !account) {
				toast.error('Connect your wallet first');
				return false;
			}

			setVoting(true);
			setTxHash(null);
			const tid = toast.loading('Submitting vote…');

			try {
				const tx = await contract.vote(proposalId, optionIndex);
				toast.loading('Waiting for confirmation…', { id: tid });
				const receipt = await tx.wait();

				setTxHash(receipt.hash);
				toast.success('Vote cast successfully!', { id: tid });
				return true;
			} catch (e) {
				const msg = _parseError(e);
				toast.error(msg, { id: tid });
				return false;
			} finally {
				setVoting(false);
			}
		},
		[contract, account],
	);

	return { castVote, voting, txHash };
}

export function useChangeVote() {
	const { contract, account } = useWeb3();
	const [changing, setChanging] = useState(false);

	const changeVote = useCallback(
		async (proposalId, newOptionIndex) => {
			if (!contract || !account) {
				toast.error('Connect your wallet first');
				return false;
			}

			setChanging(true);
			const tid = toast.loading('Changing vote…');

			try {
				const tx = await contract.changeVote(proposalId, newOptionIndex);
				toast.loading('Confirming…', { id: tid });
				const receipt = await tx.wait();

				toast.success('Vote changed!', { id: tid });
				return true;
			} catch (e) {
				const msg = _parseError(e);
				toast.error(msg, { id: tid });
				return false;
			} finally {
				setChanging(false);
			}
		},
		[contract, account],
	);

	return { changeVote, changing };
}

export function useDelegate() {
	const { contract, account, refreshVoterInfo } = useWeb3();
	const [delegating, setDelegating] = useState(false);

	const delegate = useCallback(
		async (delegateAddress) => {
			if (!contract || !account) {
				toast.error('Connect your wallet first');
				return false;
			}

			setDelegating(true);
			const tid = toast.loading('Delegating vote…');
			try {
				const tx = await contract.delegateVote(delegateAddress);
				await tx.wait();
				toast.success('Vote delegated!', { id: tid });
				refreshVoterInfo();
				return true;
			} catch (e) {
				toast.error(_parseError(e), { id: tid });
				return false;
			} finally {
				setDelegating(false);
			}
		},
		[contract, account, refreshVoterInfo],
	);

	return { delegate, delegating };
}

// Parse Solidity custom errors into readable messages
function _parseError(e) {
	const msg =
		e?.reason || e?.data?.message || e?.message || 'Transaction failed';
	if (msg.includes('AlreadyVoted'))
		return "You've already voted on this proposal";
	if (msg.includes('VotingClosed')) return 'Voting period has ended';
	if (msg.includes('NotRegistered') || msg.includes('AccessControl'))
		return 'You are not a registered voter';
	if (msg.includes('NoVotingWeight'))
		return 'No voting weight (check delegation)';
	if (msg.includes('SelfDelegation')) return 'Cannot delegate to yourself';
	if (msg.includes('CircularDelegation')) return 'Circular delegation detected';
	if (msg.includes('AlreadyDelegated')) return 'You have already delegated';
	if (msg.includes('NotYetVoted'))
		return "You haven't voted on this proposal yet";
	if (msg.includes('ProposalAlreadyCancelled'))
		return 'This proposal has been cancelled';
	if (msg.includes('user rejected')) return 'Transaction rejected';
	if (msg.includes('insufficient funds')) return 'Insufficient ETH for gas';
	return msg.length > 100 ? msg.slice(0, 100) + '…' : msg;
}
