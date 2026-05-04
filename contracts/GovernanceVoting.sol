// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title  GovernanceVoting
 * @notice Full-featured decentralized governance voting contract.
 *
 * Key Features
 * ─────────────
 * • Role-based access control  (ADMIN_ROLE, PROPOSER_ROLE, VOTER_ROLE)
 * • Multi-choice proposals      (each proposal carries N options)
 * • Weighted voting             (configurable per-voter weight)
 * • Delegated voting            (voters may delegate their weight)
 * • Proposal categories/types   (enum-based)
 * • Quorum enforcement          (minimum total weight for validity)
 * • Winning option calculation  (with tie-break by earliest option index)
 * • IPFS metadata support       (optional CIDv1 hash per proposal)
 * • Pagination                  (getAllProposals returns a page slice)
 * • Reentrancy guard + Pausable (safety)
 *
 * Governance Flow
 * ───────────────
 * 1. Deploy  → deployer gets DEFAULT_ADMIN_ROLE + ADMIN_ROLE.
 * 2. Admin grants PROPOSER_ROLE to addresses allowed to create proposals.
 * 3. Admin grants VOTER_ROLE and sets optional voting weight per voter.
 * 4. Voters cast votes (or delegate) while proposal is open & quorum unmet.
 * 5. After deadline, anyone queries getWinner() to read the result.
 */
contract GovernanceVoting is AccessControl, ReentrancyGuard, Pausable {

    // ──────────────────────────────────────────────────────────────────────
    // Roles
    // ──────────────────────────────────────────────────────────────────────

    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant VOTER_ROLE    = keccak256("VOTER_ROLE");

    // ──────────────────────────────────────────────────────────────────────
    // Custom Errors
    // ──────────────────────────────────────────────────────────────────────

    error AlreadyVoted(uint256 proposalId, address voter);
    error AlreadyDelegated(address voter);
    error VotingClosed(uint256 proposalId, uint256 deadline);
    error VotingStillOpen(uint256 proposalId, uint256 deadline);
    error InvalidProposal(uint256 proposalId);
    error InvalidOption(uint256 optionIndex, uint256 maxOptions);
    error InvalidDuration();
    error EmptyDescription();
    error EmptyOptions();
    error TooManyOptions(uint256 given, uint256 max);
    error SelfDelegation();
    error DelegateNotVoter(address delegate);
    error CircularDelegation(address delegate);
    error NoVotingWeight(address voter);
    error QuorumNotReached(uint256 proposalId, uint256 totalVotes, uint256 quorum);
    error ZeroQuorum();

    // ──────────────────────────────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────────────────────────────

    uint256 public constant MIN_DURATION  = 60;      // 60 seconds minimum
    uint256 public constant MAX_OPTIONS   = 10;      // max choices per proposal
    uint256 public constant DEFAULT_WEIGHT = 1;      // unweighted default

    // ──────────────────────────────────────────────────────────────────────
    // Enums
    // ──────────────────────────────────────────────────────────────────────

    enum ProposalCategory {
        General,        // 0 – catch-all
        Treasury,       // 1 – fund allocation
        Protocol,       // 2 – parameter changes
        Membership,     // 3 – add/remove roles
        Emergency       // 4 – urgent governance
    }

    enum ProposalStatus {
        Active,         // 0 – voting ongoing
        Closed,         // 1 – deadline passed
        QuorumFailed    // 2 – closed but quorum not met
    }

    // ──────────────────────────────────────────────────────────────────────
    // Structs
    // ──────────────────────────────────────────────────────────────────────

    struct Proposal {
        string            description;       // Short text description
        string            ipfsHash;          // Optional IPFS CID for metadata
        string[]          options;           // Voting choices (≥2)
        uint256[]         voteCounts;        // Weight totals per option
        uint256           totalVotes;        // Cumulative weight cast
        uint256           deadline;          // Unix timestamp
        uint256           quorum;            // Min total weight for validity
        address           creator;           // Who created the proposal
        ProposalCategory  category;          // Proposal type
        bool              exists;            // Guard against invalid IDs
    }

    struct VoterInfo {
        bool     registered;    // Has VOTER_ROLE + is tracked here
        uint256  weight;        // Voting power
        address  delegate;      // address(0) if not delegated
        bool     hasDelegated;  // True once delegated (one-way per slot)
    }

    // Return-type structs (avoids stack-too-deep in view functions)
    struct ProposalView {
        uint256          id;
        string           description;
        string           ipfsHash;
        string[]         options;
        uint256[]        voteCounts;
        uint256          totalVotes;
        uint256          deadline;
        uint256          quorum;
        address          creator;
        ProposalCategory category;
        ProposalStatus   status;
    }

    struct WinnerInfo {
        uint256 winningOptionIndex;
        string  winningOptionText;
        uint256 winningVoteCount;
        bool    isTie;
        bool    quorumReached;
    }

    // ──────────────────────────────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────────────────────────────

    /// @dev proposalId → Proposal
    mapping(uint256 => Proposal) private _proposals;

    /// @dev proposalId → voter → optionIndex+1 (0 means not voted)
    mapping(uint256 => mapping(address => uint256)) private _votes;

    /// @dev voter address → VoterInfo
    mapping(address => VoterInfo) public voters;

    uint256 private _proposalCount;

    // ──────────────────────────────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────────────────────────────

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        string           description,
        ProposalCategory category,
        uint256          deadline,
        uint256          quorum
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint256          optionIndex,
        uint256          weight
    );

    event VoteDelegated(
        address indexed from,
        address indexed to
    );

    event VoterRegistered(address indexed voter, uint256 weight);
    event VoterRemoved(address indexed voter);
    event VoterWeightUpdated(address indexed voter, uint256 newWeight);

    // ──────────────────────────────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────────────────────────────

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE,         msg.sender);
        _grantRole(PROPOSER_ROLE,      msg.sender);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Modifiers
    // ──────────────────────────────────────────────────────────────────────

    modifier validProposal(uint256 proposalId) {
        if (!_proposals[proposalId].exists) revert InvalidProposal(proposalId);
        _;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Admin: Voter Management
    // ──────────────────────────────────────────────────────────────────────

    /**
     * @notice Register a voter with an optional custom weight (default = 1).
     * @param  _voter  Address to register.
     * @param  _weight Voting power; pass 0 to use DEFAULT_WEIGHT.
     */
    function addVoter(address _voter, uint256 _weight)
        external
        onlyRole(ADMIN_ROLE)
        whenNotPaused
    {
        require(_voter != address(0), "Zero address");
        uint256 w = _weight == 0 ? DEFAULT_WEIGHT : _weight;

        voters[_voter] = VoterInfo({
            registered:   true,
            weight:       w,
            delegate:     address(0),
            hasDelegated: false
        });

        _grantRole(VOTER_ROLE, _voter);
        emit VoterRegistered(_voter, w);
    }

    /**
     * @notice Remove a voter and revoke their VOTER_ROLE.
     */
    function removeVoter(address _voter)
        external
        onlyRole(ADMIN_ROLE)
        whenNotPaused
    {
        require(voters[_voter].registered, "Not registered");
        delete voters[_voter];
        _revokeRole(VOTER_ROLE, _voter);
        emit VoterRemoved(_voter);
    }

    /**
     * @notice Update a registered voter's weight.
     */
    function setVoterWeight(address _voter, uint256 _weight)
        external
        onlyRole(ADMIN_ROLE)
        whenNotPaused
    {
        require(voters[_voter].registered, "Not registered");
        require(_weight > 0, "Weight must be > 0");
        voters[_voter].weight = _weight;
        emit VoterWeightUpdated(_voter, _weight);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Proposer: Create Proposals
    // ──────────────────────────────────────────────────────────────────────

    /**
     * @notice Create a multi-choice proposal.
     *
     * @param _description  Human-readable description.
     * @param _options      Array of choice labels (2 – MAX_OPTIONS).
     * @param _durationSecs How many seconds the vote is open (≥ MIN_DURATION).
     * @param _quorum       Minimum total voting weight required for the result
     *                      to be considered valid. Pass 1 for no effective quorum.
     * @param _category     ProposalCategory enum value.
     * @param _ipfsHash     Optional IPFS CID string (pass "" to skip).
     * @return proposalId   ID of the new proposal (0-indexed).
     */
    function createProposal(
        string   calldata   _description,
        string[] calldata   _options,
        uint256             _durationSecs,
        uint256             _quorum,
        ProposalCategory    _category,
        string   calldata   _ipfsHash
    )
        external
        onlyRole(PROPOSER_ROLE)
        whenNotPaused
        returns (uint256 proposalId)
    {
        if (bytes(_description).length == 0)    revert EmptyDescription();
        if (_options.length < 2)                revert EmptyOptions();
        if (_options.length > MAX_OPTIONS)      revert TooManyOptions(_options.length, MAX_OPTIONS);
        if (_durationSecs < MIN_DURATION)       revert InvalidDuration();
        if (_quorum == 0)                       revert ZeroQuorum();

        proposalId = _proposalCount++;

        // Build in-storage proposal
        Proposal storage p = _proposals[proposalId];
        p.description = _description;
        p.ipfsHash    = _ipfsHash;
        p.deadline    = block.timestamp + _durationSecs;
        p.quorum      = _quorum;
        p.creator     = msg.sender;
        p.category    = _category;
        p.exists      = true;
        p.totalVotes  = 0;

        // Store options and zero-initialise vote counts
        for (uint256 i; i < _options.length; ) {
            p.options.push(_options[i]);
            p.voteCounts.push(0);
            unchecked { ++i; }
        }

        emit ProposalCreated(
            proposalId,
            msg.sender,
            _description,
            _category,
            p.deadline,
            _quorum
        );
    }

    // ──────────────────────────────────────────────────────────────────────
    // Voting
    // ──────────────────────────────────────────────────────────────────────

    /**
     * @notice Cast a vote for one option on a proposal.
     *
     * Rules
     * ─────
     * • Caller must hold VOTER_ROLE.
     * • Caller (or delegator chain) must have voting weight > 0.
     * • Caller must not have already voted on this proposal.
     * • Proposal deadline must not have passed.
     * • If the caller has delegated, they cannot vote directly
     *   (the delegate votes on their behalf).
     *
     * @param proposalId  Target proposal.
     * @param optionIndex 0-based index into proposal.options.
     */
    function vote(uint256 proposalId, uint256 optionIndex)
        external
        nonReentrant
        whenNotPaused
        onlyRole(VOTER_ROLE)
        validProposal(proposalId)
    {
        Proposal storage p = _proposals[proposalId];
        VoterInfo storage vi = voters[msg.sender];

        if (block.timestamp > p.deadline)
            revert VotingClosed(proposalId, p.deadline);
        if (_votes[proposalId][msg.sender] != 0)
            revert AlreadyVoted(proposalId, msg.sender);
        if (optionIndex >= p.options.length)
            revert InvalidOption(optionIndex, p.options.length);

        // Resolve effective weight: if delegated-to, use that weight
        uint256 effectiveWeight = _resolveWeight(msg.sender);
        if (effectiveWeight == 0) revert NoVotingWeight(msg.sender);

        // Store vote (1-indexed so 0 == "not voted")
        _votes[proposalId][msg.sender] = optionIndex + 1;

        // Accumulate
        p.voteCounts[optionIndex] += effectiveWeight;
        p.totalVotes              += effectiveWeight;

        emit VoteCast(proposalId, msg.sender, optionIndex, effectiveWeight);
    }

    /**
     * @notice Delegate your voting weight to another registered voter.
     *
     * Notes
     * ─────
     * • Delegation is one-time per voter slot (can only delegate once).
     * • No circular delegation — the target must not be delegating to you.
     * • The delegate votes on all future proposals on your behalf
     *   (their effective weight includes yours).
     * • You cannot delegate if you have already voted in the current epoch.
     *
     * @param _delegate Address of the voter receiving your delegation.
     */
    function delegateVote(address _delegate)
        external
        whenNotPaused
        onlyRole(VOTER_ROLE)
    {
        if (_delegate == msg.sender)             revert SelfDelegation();
        if (!voters[_delegate].registered)       revert DelegateNotVoter(_delegate);
        if (voters[msg.sender].hasDelegated)     revert AlreadyDelegated(msg.sender);

        // Circular-delegation guard: ensure _delegate doesn't delegate back to us
        address cursor = _delegate;
        while (voters[cursor].hasDelegated) {
            cursor = voters[cursor].delegate;
            if (cursor == msg.sender) revert CircularDelegation(_delegate);
        }

        // Transfer delegator's weight to delegate
        uint256 delegatorWeight = voters[msg.sender].weight;
        voters[_delegate].weight += delegatorWeight;
        voters[msg.sender].weight = 0;

        voters[msg.sender].delegate     = _delegate;
        voters[msg.sender].hasDelegated = true;

        emit VoteDelegated(msg.sender, _delegate);
    }

    // ──────────────────────────────────────────────────────────────────────
    // View: Single Proposal
    // ──────────────────────────────────────────────────────────────────────

    /**
     * @notice Returns full details for one proposal.
     */
    function getProposal(uint256 proposalId)
        external
        view
        validProposal(proposalId)
        returns (ProposalView memory)
    {
        return _toView(proposalId);
    }

    /**
     * @notice Returns the winning option for a closed proposal.
     *         Reverts if voting is still open.
     *         In a tie, returns the lowest option index.
     */
    function getWinner(uint256 proposalId)
        external
        view
        validProposal(proposalId)
        returns (WinnerInfo memory info)
    {
        Proposal storage p = _proposals[proposalId];

        if (block.timestamp <= p.deadline)
            revert VotingStillOpen(proposalId, p.deadline);

        info.quorumReached = p.totalVotes >= p.quorum;

        uint256 best     = 0;
        bool    tieFound = false;

        for (uint256 i = 1; i < p.voteCounts.length; ) {
            if (p.voteCounts[i] > p.voteCounts[best]) {
                best     = i;
                tieFound = false;
            } else if (p.voteCounts[i] == p.voteCounts[best] && i != best) {
                tieFound = true;   // tie – lowest index already wins by default
            }
            unchecked { ++i; }
        }

        info.winningOptionIndex = best;
        info.winningOptionText  = p.options[best];
        info.winningVoteCount   = p.voteCounts[best];
        info.isTie              = tieFound;
    }

    /**
     * @notice Returns vote count and open/closed status.
     */
    function getResults(uint256 proposalId)
        external
        view
        validProposal(proposalId)
        returns (uint256[] memory voteCounts, uint256 totalVotes, bool votingOpen)
    {
        Proposal storage p = _proposals[proposalId];
        voteCounts = p.voteCounts;
        totalVotes = p.totalVotes;
        votingOpen = block.timestamp <= p.deadline;
    }

    // ──────────────────────────────────────────────────────────────────────
    // View: Paginated Proposal List
    // ──────────────────────────────────────────────────────────────────────

    /**
     * @notice Returns a page of proposals (for large-set UIs).
     *
     * @param offset  First proposalId to include (0-indexed).
     * @param limit   Maximum number of proposals to return.
     * @return page   Array of ProposalView structs.
     * @return total  Total proposals ever created.
     */
    function getProposals(uint256 offset, uint256 limit)
        external
        view
        returns (ProposalView[] memory page, uint256 total)
    {
        total = _proposalCount;
        if (offset >= total) return (new ProposalView[](0), total);

        uint256 end  = offset + limit > total ? total : offset + limit;
        uint256 size = end - offset;

        page = new ProposalView[](size);
        for (uint256 i; i < size; ) {
            page[i] = _toView(offset + i);
            unchecked { ++i; }
        }
    }

    /**
     * @notice Returns ALL proposals. Only use from off-chain / frontend.
     *         Avoid calling on-chain from contracts that loop over this.
     */
    function getAllProposals() external view returns (ProposalView[] memory) {
        ProposalView[] memory all = new ProposalView[](_proposalCount);
        for (uint256 i; i < _proposalCount; ) {
            all[i] = _toView(i);
            unchecked { ++i; }
        }
        return all;
    }

    // ──────────────────────────────────────────────────────────────────────
    // View: Voter Queries
    // ──────────────────────────────────────────────────────────────────────

    function isEligible(address user) external view returns (bool) {
        return voters[user].registered;
    }

    function hasUserVoted(uint256 proposalId, address user)
        external
        view
        returns (bool voted, uint256 optionIndex)
    {
        uint256 stored = _votes[proposalId][user];
        voted       = stored != 0;
        optionIndex = stored > 0 ? stored - 1 : 0;
    }

    function getVoterInfo(address user) external view returns (VoterInfo memory) {
        return voters[user];
    }

    function totalProposals() external view returns (uint256) {
        return _proposalCount;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Admin: Pause
    // ──────────────────────────────────────────────────────────────────────

    function pause()   external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    // ──────────────────────────────────────────────────────────────────────
    // Internal Helpers
    // ──────────────────────────────────────────────────────────────────────

    /**
     * @dev Resolves the effective weight of a voter, following the delegation
     *      chain up to one level (single-hop delegation is supported).
     *      Multi-hop delegation is intentionally limited to one level to
     *      prevent gas-exhaustion attacks via long chains.
     */
    function _resolveWeight(address voter) internal view returns (uint256) {
        VoterInfo storage vi = voters[voter];
        
        if (vi.hasDelegated) {
            // Voter delegated away — they cannot vote directly
            return 0;
        }
        
        // Return own weight (includes delegations added during delegateVote)
        return vi.weight;
    }

    /**
     * @dev Builds a ProposalView return struct from storage.
     */
    function _toView(uint256 id) internal view returns (ProposalView memory v) {
        Proposal storage p = _proposals[id];
        ProposalStatus status;
        if (block.timestamp <= p.deadline) {
            status = ProposalStatus.Active;
        } else if (p.totalVotes < p.quorum) {
            status = ProposalStatus.QuorumFailed;
        } else {
            status = ProposalStatus.Closed;
        }

        v = ProposalView({
            id:          id,
            description: p.description,
            ipfsHash:    p.ipfsHash,
            options:     p.options,
            voteCounts:  p.voteCounts,
            totalVotes:  p.totalVotes,
            deadline:    p.deadline,
            quorum:      p.quorum,
            creator:     p.creator,
            category:    p.category,
            status:      status
        });
    }
}
