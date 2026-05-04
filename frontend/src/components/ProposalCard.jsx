// src/components/ProposalCard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useProposalManagement } from '../hooks/useAdmin';
import {
	Clock,
	Users,
	BarChart2,
	ChevronRight,
	Edit2,
	X,
	Loader2,
} from 'lucide-react';
import {
	formatCountdown,
	formatDeadline,
	pct,
	CATEGORY_COLORS,
	CATEGORY_ICONS,
	getOptionColor,
	shortAddr,
} from '../utils/format';
import toast from 'react-hot-toast';

export default function ProposalCard({ proposal, delay = 0 }) {
	const navigate = useNavigate();
	const { account } = useWeb3();
	const { cancelProposal, editProposal, loading } = useProposalManagement();

	const [timeLeft, setTimeLeft] = useState(proposal?.timeLeft ?? 0);
	const [showEditModal, setShowEditModal] = useState(false);
	const [editForm, setEditForm] = useState({
		description: proposal?.description || '',
		options: proposal?.options || [],
		newDeadline: proposal?.deadline || 0,
	});
	const [deadlineStr, setDeadlineStr] = useState(() => {
		const d = new Date((proposal?.deadline || 0) * 1000);
		return d.toISOString().slice(0, 16);
	});

	const isCreator =
		account && proposal?.creator?.toLowerCase() === account.toLowerCase();
	const canEdit = isCreator && proposal?.isActive && !proposal?.cancelled;

	// Bug 2 Fix: Sync timeLeft when proposal prop updates (e.g. after refresh)
	useEffect(() => {
		setTimeLeft(proposal?.timeLeft ?? 0);
	}, [proposal?.timeLeft]);

	// Live countdown ticker
	useEffect(() => {
		if (!proposal?.isActive) return;
		const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
		return () => clearInterval(id);
	}, [proposal?.isActive]);

	// Bug 3 Fix: maxVotes was declared but never used — removed the dead variable
	// It was: const maxVotes = Math.max(...proposal.voteCounts, 1);

	// Bug 4 Fix: Guard against empty/undefined proposal
	if (!proposal) return null;

	// Bug 5 Fix: Guard against empty voteCounts array which would cause
	// Math.max(...[]) to return -Infinity
	const totalVotesForPct = Math.max(proposal.totalVotes || 0, 1);

	async function handleEdit(e) {
		e.stopPropagation();
		if (!editForm.description.trim()) {
			toast.error('Description cannot be empty');
			return;
		}
		if (editForm.options.length < 2) {
			toast.error('Need at least 2 options');
			return;
		}
		const timestamp = Math.floor(new Date(deadlineStr).getTime() / 1000);
		if (timestamp <= Math.floor(Date.now() / 1000)) {
			toast.error('Deadline must be in the future');
			return;
		}
		const ok = await editProposal(
			proposal.id,
			editForm.description,
			editForm.options,
			timestamp,
		);
		if (ok) {
			setShowEditModal(false);
		}
	}

	async function handleCancel(e) {
		e.stopPropagation();
		if (!confirm('Are you sure you want to cancel this proposal?')) return;
		const ok = await cancelProposal(proposal.id, 'Cancelled by creator');
		if (ok) {
			// UI will update via event listener
		}
	}

	return (
		<>
			<div
				className='card-hover animate-fade-up'
				style={{
					animationDelay: `${delay}ms`,
					animationFillMode: 'both',
					opacity: 0,
				}}
				onClick={() => navigate(`/proposal/${proposal.id}`)}
				// Bug 6 Fix: Add keyboard accessibility — card is clickable so needs role + handler
				role='button'
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ')
						navigate(`/proposal/${proposal.id}`);
				}}
			>
				{/* Header row */}
				<div className='flex items-start justify-between gap-3 mb-4'>
					<div className='flex items-center gap-2 flex-wrap'>
						{/* Status badge */}
						<span
							className={
								proposal.status === 0
									? 'badge-active'
									: proposal.status === 2
									? 'badge-failed'
									: 'badge-closed'
							}
						>
							{proposal.status === 0 && (
								<span className='w-1.5 h-1.5 rounded-full bg-pulse animate-pulse-slow' />
							)}
							{/* Bug 7 Fix: Guard against undefined statusLabel */}
							{proposal.statusLabel || 'Unknown'}
						</span>

						{/* Category badge */}
						{/* Bug 8 Fix: Guard against undefined category */}
						<span
							className={`badge ${
								CATEGORY_COLORS[proposal.category] || CATEGORY_COLORS[0]
							}`}
						>
							{CATEGORY_ICONS[proposal.category] || '⚙️'}{' '}
							{proposal.categoryLabel || 'General'}
						</span>

						{/* Creator badge */}
						{isCreator && (
							<span className='badge bg-blue-100 text-blue-700 text-xs'>
								Your proposal
							</span>
						)}

						{proposal.cancelled && (
							<span className='badge bg-red-100 text-red-700 text-xs'>
								Cancelled
							</span>
						)}
					</div>

					<div className='flex items-center gap-2'>
						{canEdit && (
							<>
								<button
									onClick={(e) => {
										e.stopPropagation();
										setShowEditModal(true);
									}}
									className='btn-icon hover:bg-blue-100 text-blue-600'
									title='Edit proposal'
								>
									<Edit2 size={14} />
								</button>
								<button
									onClick={handleCancel}
									disabled={loading}
									className='btn-icon hover:bg-red-100 text-red-600'
									title='Cancel proposal'
								>
									{loading ? (
										<Loader2 size={14} className='animate-spin' />
									) : (
										<X size={14} />
									)}
								</button>
							</>
						)}
						<ChevronRight size={16} className='text-dim shrink-0 mt-0.5' />
					</div>
				</div>

				{/* ID + Description */}
				<p className='font-mono text-xs text-dim mb-1'>#{proposal.id}</p>
				<h3 className='font-display font-semibold text-ink leading-snug mb-4 line-clamp-2'>
					{/* Bug 9 Fix: Fallback for missing description */}
					{proposal.description || 'No description provided'}
				</h3>

				{/* Vote bars — top 3 options */}
				<div className='space-y-2 mb-4'>
					{/* Bug 10 Fix: Guard against undefined options array */}
					{(proposal.options || []).slice(0, 3).map((opt, i) => {
						const v = (proposal.voteCounts || [])[i] || 0;
						const share = pct(v, totalVotesForPct);
						return (
							<div key={i}>
								<div className='flex justify-between text-xs mb-1'>
									{/* Bug 11 Fix: opt could be empty string */}
									<span className='font-medium text-ink opacity-80 truncate max-w-[70%]'>
										{opt || `Option ${i + 1}`}
									</span>
									<span className='font-mono text-dim'>{share}%</span>
								</div>
								<div className='progress-bar'>
									<div
										className={`progress-fill ${getOptionColor(i)}`}
										style={{ width: `${share}%` }}
									/>
								</div>
							</div>
						);
					})}
					{(proposal.options || []).length > 3 && (
						<p className='text-xs text-dim'>
							+{proposal.options.length - 3} more option
							{proposal.options.length - 3 !== 1 ? 's' : ''}
						</p>
					)}
				</div>

				{/* Footer */}
				<div
					className='flex items-center justify-between pt-3 text-xs text-dim'
					style={{ borderTop: '1px solid rgba(13,13,15,0.06)' }}
				>
					<span className='flex items-center gap-1.5'>
						<Users size={12} />
						{/* Bug 12 Fix: totalVotes could be 0 — handle singular/plural correctly */}
						{proposal.totalVotes || 0} vote
						{(proposal.totalVotes || 0) !== 1 ? 's' : ''}
					</span>
					<span className='flex items-center gap-1.5'>
						<BarChart2 size={12} />
						Quorum {proposal.quorumPct ?? 0}%
					</span>
					<span className='flex items-center gap-1.5'>
						<Clock size={12} />
						{proposal.isActive
							? formatCountdown(timeLeft)
							: formatDeadline(proposal.deadline)}
					</span>
				</div>
			</div>

			{/* Edit Modal - Outside Card */}
			{showEditModal && (
				<div
					className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm'
					onClick={(e) => {
						if (e.target === e.currentTarget) setShowEditModal(false);
					}}
				>
					<div
						className='bg-paper rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-ink border-opacity-10'
						onClick={(e) => e.stopPropagation()}
					>
						{/* Modal Header */}
						<div className='sticky top-0 flex items-center justify-between p-6 border-b border-ink border-opacity-10 bg-paper'>
							<h2 className='font-display font-semibold text-xl'>
								Edit Proposal
							</h2>
							<button
								onClick={() => setShowEditModal(false)}
								className='text-dim hover:text-ink transition-colors p-1'
							>
								<X size={20} />
							</button>
						</div>

						{/* Modal Body */}
						<div className='p-6 space-y-6'>
							{/* Description */}
							<div>
								<label className='label'>Description</label>
								<textarea
									value={editForm.description}
									onChange={(e) =>
										setEditForm({ ...editForm, description: e.target.value })
									}
									className='input w-full h-24'
									placeholder='Update proposal description...'
									onClick={(e) => e.stopPropagation()}
								/>
							</div>

							{/* Options */}
							<div>
								<label className='label'>Voting Options</label>
								<div className='space-y-2.5'>
									{editForm.options.map((opt, i) => (
										<div key={i} className='flex items-center gap-2'>
											<span className='text-xs font-mono text-dim bg-ink bg-opacity-5 px-3 py-2 rounded-lg min-w-fit'>
												Option {i + 1}
											</span>
											<input
												type='text'
												value={opt}
												onChange={(e) => {
													const newOpts = [...editForm.options];
													newOpts[i] = e.target.value;
													setEditForm({ ...editForm, options: newOpts });
												}}
												className='input flex-1'
												placeholder='Option text...'
												onClick={(e) => e.stopPropagation()}
											/>
											{editForm.options.length > 2 && (
												<button
													type='button'
													onClick={(e) => {
														e.stopPropagation();
														setEditForm({
															...editForm,
															options: editForm.options.filter(
																(_, idx) => idx !== i,
															),
														});
													}}
													className='btn-icon text-red-600 hover:bg-red-100 p-2'
												>
													<X size={14} />
												</button>
											)}
										</div>
									))}
								</div>
								<button
									type='button'
									onClick={(e) => {
										e.stopPropagation();
										if (editForm.options.length < 10) {
											setEditForm({
												...editForm,
												options: [...editForm.options, ''],
											});
										} else {
											toast.error('Maximum 10 options allowed');
										}
									}}
									className='mt-3 w-full text-sm font-medium text-ink py-2 rounded-lg border border-ink border-opacity-20 hover:bg-ink hover:bg-opacity-5 transition-colors'
								>
									+ Add Option
								</button>
							</div>

							{/* New Deadline */}
							<div>
								<label className='label'>New Deadline</label>
								<div className='space-y-2'>
									<input
										type='datetime-local'
										value={deadlineStr}
										onChange={(e) => setDeadlineStr(e.target.value)}
										className='input font-mono text-sm'
										onClick={(e) => e.stopPropagation()}
									/>
									<p className='text-xs text-dim bg-ink bg-opacity-5 px-3 py-2 rounded-lg'>
										Current: {new Date(deadlineStr).toLocaleString()}
									</p>
								</div>
							</div>
						</div>

						{/* Modal Footer */}
						<div className='sticky bottom-0 flex gap-3 p-6 border-t border-ink border-opacity-10 bg-paper'>
							<button
								onClick={() => setShowEditModal(false)}
								className='btn-text flex-1 justify-center text-dim'
							>
								Cancel
							</button>
							<button
								onClick={handleEdit}
								disabled={loading}
								className='btn-primary flex-1 justify-center'
							>
								{loading ? (
									<>
										<Loader2 size={14} className='animate-spin' /> Updating...
									</>
								) : (
									'Save Changes'
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
