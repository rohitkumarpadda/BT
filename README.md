# 🗳️ GovernanceVoting dApp

A full-featured **decentralized governance voting system** built with Solidity and React. Create proposals, register voters, cast weighted votes, delegate voting power — all transparently on-chain.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)](https://reactjs.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22-orange.svg)](https://hardhat.org/)

---

## 📸 Overview

| Dashboard | Proposal Detail | Create Proposal | Profile & Admin |
|-----------|----------------|-----------------|-----------------|
| View all proposals with live status, vote bars, countdowns | Full voting UI with results and winner banner | Multi-choice form with IPFS support | Register voters, grant proposer roles |

---

## ✨ Features

### Smart Contract
- ✅ **Role-based access control** — `ADMIN_ROLE`, `PROPOSER_ROLE`, `VOTER_ROLE` via OpenZeppelin
- ✅ **Multi-choice voting** — each proposal supports 2–10 custom options
- ✅ **Weighted voting** — configurable voting power per voter
- ✅ **Delegated voting** — voters can delegate weight to another address
- ✅ **Quorum enforcement** — proposals require minimum vote weight to be valid
- ✅ **Proposal categories** — General, Treasury, Protocol, Membership, Emergency
- ✅ **IPFS metadata** — optional CID hash per proposal for rich off-chain data
- ✅ **Winner calculation** — automatic with tie-breaking by earliest option index
- ✅ **Pagination** — `getProposals(offset, limit)` for large proposal sets
- ✅ **Reentrancy guard** — OpenZeppelin `ReentrancyGuard`
- ✅ **Pausable** — emergency stop mechanism
- ✅ **Custom errors** — EIP-838 compliant, gas efficient

### Frontend
- ✅ **MetaMask integration** — connect wallet, auto-detect network, switch prompts
- ✅ **Live event updates** — UI refreshes automatically on `VoteCast` and `ProposalCreated` events
- ✅ **Real-time countdowns** — live ticking timers per proposal card
- ✅ **Admin panel** — register voters, grant/revoke proposer roles from the UI
- ✅ **Toast notifications** — success/error/loading states for every transaction
- ✅ **Responsive design** — works on desktop and mobile
- ✅ **Search + filter** — filter by status, category, or keyword

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.20 |
| Contract Framework | Hardhat 2.22 |
| Contract Libraries | OpenZeppelin 5.0 |
| Testing | Hardhat + Chai + Ethers.js v6 |
| Frontend | React 18 + Vite 5 |
| Web3 | Ethers.js v6 |
| Styling | Tailwind CSS 3.4 |
| Routing | React Router v6 |
| Notifications | React Hot Toast |

---

## 📁 Project Structure

```
governance-dapp/
├── contracts/
│   ├── GovernanceVoting.sol      # Main governance contract
│   └── interfaces/
│       └── IVoting.sol           # Contract interface
├── scripts/
│   └── deploy.js                 # Deploy + ABI export script
├── test/
│   └── GovernanceVoting.test.js  # 40+ test cases
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── Web3Context.jsx   # Wallet + contract state
│   │   ├── hooks/
│   │   │   ├── useProposals.js   # Fetch + event-driven refresh
│   │   │   ├── useVote.js        # Cast vote + delegate
│   │   │   └── useAdmin.js       # Create proposal + voter management
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx     # Proposal list with filters
│   │   │   ├── ProposalDetail.jsx# Full proposal + voting UI
│   │   │   ├── CreateProposal.jsx# Proposal creation form
│   │   │   └── Profile.jsx       # User status + admin panel
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProposalCard.jsx
│   │   │   ├── VotePanel.jsx
│   │   │   ├── StatsBar.jsx
│   │   │   └── WalletGate.jsx
│   │   └── utils/
│   │       └── format.js         # Helpers: countdown, addresses, colors
│   └── package.json
├── hardhat.config.js
├── package.json
├── .env.example
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [MetaMask](https://metamask.io/) browser extension
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/Rahul8025p/BT.git
cd BT
```

### 2. Install dependencies

```bash
# Contract dependencies
npm install

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

For **local development** you don't need to fill anything in `.env`.
For **Sepolia testnet** deployment, fill in:

```env
PRIVATE_KEY=your_wallet_private_key_without_0x
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
```

---

## 🖥️ Running Locally

### Terminal 1 — Start local blockchain

```bash
npx hardhat node
```

Keep this running. It creates 20 funded test accounts.

### Terminal 2 — Deploy contract

```bash
npx hardhat run scripts/deploy.js --network localhost
```

This deploys the contract and automatically exports the ABI + address to `frontend/src/contract/GovernanceVoting.json`.

### Terminal 3 — Start frontend

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🦊 MetaMask Setup

### Add Hardhat Local Network

| Field | Value |
|-------|-------|
| Network name | Hardhat Local |
| RPC URL | http://127.0.0.1:8545 |
| Chain ID | 31337 |
| Currency | ETH |

### Import a Test Account

Copy any private key printed by `npx hardhat node` and import it into MetaMask.

**Account #0** (Admin — has 10,000 ETH):
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Account #1** (Voter):
```
0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

**Account #2** (Voter):
```
0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

> ⚠️ These are publicly known test keys. Never use them on mainnet.

---

## 🔄 Usage Flow

```
1. Connect MetaMask (Account #0 — Admin)
2. Profile → Admin Panel → Register voters
3. Profile → Admin Panel → Grant Proposer Role (optional)
4. Create → Fill form → Submit proposal
5. Switch to voter account in MetaMask
6. Dashboard → Click proposal → Cast vote
7. After deadline → View winner on proposal detail page
```

---

## 🧪 Running Tests

```bash
# Run all tests
npx hardhat test

# Run with gas report
REPORT_GAS=true npx hardhat test

# Run test coverage
npx hardhat coverage
```

Test coverage includes:

| Category | Tests |
|----------|-------|
| Deployment | 2 |
| Voter Management | 7 |
| Proposal Creation | 7 |
| Voting | 7 |
| Delegation | 6 |
| Winner / Quorum | 4 |
| Proposal Status | 3 |
| Pagination | 2 |
| Pause / Unpause | 5 |
| hasUserVoted | 2 |

---

## 🌐 Deploy to Sepolia Testnet

### 1. Get test ETH
Visit [faucet.alchemy.com](https://faucet.alchemy.com) and request Sepolia ETH.

### 2. Update chain ID in frontend

In `frontend/src/context/Web3Context.jsx`:
```js
const EXPECTED_CHAIN_ID  = 11155111;
const EXPECTED_CHAIN_HEX = "0xaa36a7";
```

### 3. Deploy

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

The ABI and new contract address are automatically saved to the frontend.

### 4. Verify on Etherscan (optional)

```bash
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
```

---

## 📜 Smart Contract — Key Functions

### Admin Functions
| Function | Description |
|----------|-------------|
| `addVoter(address, weight)` | Register a voter with voting weight |
| `removeVoter(address)` | Deregister a voter |
| `setVoterWeight(address, weight)` | Update voter's voting power |
| `grantRole(PROPOSER_ROLE, address)` | Allow address to create proposals |
| `pause()` / `unpause()` | Emergency stop |

### Proposer Functions
| Function | Description |
|----------|-------------|
| `createProposal(desc, options[], duration, quorum, category, ipfsHash)` | Create a new proposal |

### Voter Functions
| Function | Description |
|----------|-------------|
| `vote(proposalId, optionIndex)` | Cast a weighted vote |
| `delegateVote(address)` | Delegate voting weight to another voter |

### View Functions
| Function | Description |
|----------|-------------|
| `getProposal(id)` | Get full proposal details |
| `getAllProposals()` | Get all proposals |
| `getProposals(offset, limit)` | Paginated proposals |
| `getWinner(id)` | Get winning option after deadline |
| `getResults(id)` | Get vote counts + open status |
| `hasUserVoted(id, address)` | Check if address voted |
| `getVoterInfo(address)` | Get voter registration + delegation info |

---

## 🔐 Security

- **Access Control** — OpenZeppelin `AccessControl` with three distinct roles
- **Reentrancy Protection** — `nonReentrant` modifier on `vote()`
- **Custom Errors** — EIP-838 compliant, saves gas vs string reverts
- **Input Validation** — All inputs validated with descriptive error messages
- **Circular Delegation Guard** — Prevents delegation loops
- **Pausable** — Admin can halt all state changes in emergencies
- **No External Calls in Voting** — Reentrancy surface eliminated

---

## ⛽ Gas Optimization

- `unchecked { ++i }` in loops
- Mappings over arrays for O(1) lookups
- Custom errors instead of `require` strings
- Minimal storage writes
- `calldata` instead of `memory` for read-only function params

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [OpenZeppelin](https://openzeppelin.com/) — battle-tested smart contract libraries
- [Hardhat](https://hardhat.org/) — Ethereum development environment
- [Ethers.js](https://ethers.org/) — Web3 library
- [Vite](https://vitejs.dev/) — frontend build tool
- [Tailwind CSS](https://tailwindcss.com/) — utility-first CSS framework

---

<div align="center">
  Built with ❤️ for decentralized governance
</div>
