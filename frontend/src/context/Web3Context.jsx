// src/context/Web3Context.jsx
// Central hub for all Web3 state: wallet, provider, contract instance.
import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	useRef,
} from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import contractData from '../contract/GovernanceVoting.json';

const EXPECTED_CHAIN_ID = 31337; // localhost – change to 11155111 for Sepolia
const EXPECTED_CHAIN_HEX = '0x7A69'; // 31337 hex

// const EXPECTED_CHAIN_ID  = 11155111;
// const EXPECTED_CHAIN_HEX = "0xaa36a7";

const Web3Ctx = createContext(null);

export function Web3Provider({ children }) {
	const [provider, setProvider] = useState(null);
	const [signer, setSigner] = useState(null);
	const [contract, setContract] = useState(null); // read/write
	const [roContract, setRoContract] = useState(null); // read-only (no wallet)
	const [account, setAccount] = useState(null);
	const [chainId, setChainId] = useState(null);
	const [connecting, setConnecting] = useState(false);
	const [voterInfo, setVoterInfo] = useState(null);
	const listenersRef = useRef([]);

	// ── Bootstrap read-only provider on mount ──────────────────────────────
	useEffect(() => {
		const rpcProvider = new ethers.JsonRpcProvider(
			'http://127.0.0.1:8545',
			null,
			{ disableCaching: true },
		);
		// const rpcProvider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/ja-JPibLcikkqzaJsUVhV");
		const ro = new ethers.Contract(
			contractData.address,
			contractData.abi,
			rpcProvider,
		);
		setRoContract(ro);
	}, []);

	// ── Auto-reconnect if already authorised ───────────────────────────────
	useEffect(() => {
		if (window.ethereum) {
			window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
				if (accounts[0]) _buildSession(accounts[0]);
			});
		}
	}, []); // eslint-disable-line

	// ── MetaMask event listeners ────────────────────────────────────────────
	useEffect(() => {
		if (!window.ethereum) return;

		const onAccountsChanged = ([newAccount]) => {
			if (newAccount) {
				_buildSession(newAccount);
			} else {
				_reset();
			}
		};

		const onChainChanged = () => window.location.reload();

		window.ethereum.on('accountsChanged', onAccountsChanged);
		window.ethereum.on('chainChanged', onChainChanged);
		return () => {
			window.ethereum.removeListener('accountsChanged', onAccountsChanged);
			window.ethereum.removeListener('chainChanged', onChainChanged);
		};
	}, []);

	async function _buildSession(address) {
		try {
			const web3Provider = new ethers.BrowserProvider(window.ethereum);
			const web3Signer = await web3Provider.getSigner();
			const network = await web3Provider.getNetwork();
			const cid = Number(network.chainId);

			const rwContract = new ethers.Contract(
				contractData.address,
				contractData.abi,
				web3Signer,
			);
			const roRead = new ethers.Contract(
				contractData.address,
				contractData.abi,
				web3Provider,
			);

			setProvider(web3Provider);
			setSigner(web3Signer);
			setContract(rwContract);
			setRoContract(roRead);
			setAccount(address);
			setChainId(cid);

			_refreshVoterInfo(address, roRead);
		} catch (e) {
			console.error('Session build error:', e);
		}
	}

	function _reset() {
		setProvider(null);
		setSigner(null);
		setContract(null);
		setAccount(null);
		setChainId(null);
		setVoterInfo(null);
	}

	// ── Connect wallet ──────────────────────────────────────────────────────
	const connectWallet = useCallback(async () => {
		if (!window.ethereum) {
			toast.error('MetaMask not detected. Please install it.');
			return;
		}
		setConnecting(true);
		try {
			// Request accounts
			const accounts = await window.ethereum.request({
				method: 'eth_requestAccounts',
			});

			// Check / switch network
			const cid = await window.ethereum.request({ method: 'eth_chainId' });
			if (parseInt(cid, 16) !== EXPECTED_CHAIN_ID) {
				try {
					await window.ethereum.request({
						method: 'wallet_switchEthereumChain',
						params: [{ chainId: EXPECTED_CHAIN_HEX }],
					});
				} catch (switchErr) {
					if (switchErr.code === 4902) {
						toast.error(`Please add chain ${EXPECTED_CHAIN_ID} to MetaMask`);
					} else {
						toast.error('Please switch to the correct network');
					}
					setConnecting(false);
					return;
				}
			}

			await _buildSession(accounts[0]);
			toast.success('Wallet connected');
		} catch (e) {
			if (e.code !== 4001) toast.error('Connection failed');
		} finally {
			setConnecting(false);
		}
	}, []);

	const disconnectWallet = useCallback(() => {
		_reset();
		toast('Wallet disconnected', { icon: '👋' });
	}, []);

	// ── Voter info refresh ──────────────────────────────────────────────────
	const _refreshVoterInfo = useCallback(
		async (addr, con) => {
			try {
				const c = con || roContract;
				if (!c) return;
				const info = await c.getVoterInfo(addr || account);
				setVoterInfo({
					registered: info.registered,
					weight: Number(info.weight),
					delegate: info.delegate,
					hasDelegated: info.hasDelegated,
				});
			} catch {
				/* contract not deployed */
			}
		},
		[roContract, account],
	);

	const refreshVoterInfo = useCallback(() => {
		if (account) _refreshVoterInfo(account, roContract);
	}, [account, roContract, _refreshVoterInfo]);

	// ── Contract event listener helper ─────────────────────────────────────
	const onContractEvent = useCallback(
		(eventName, handler) => {
			if (!roContract) return () => {};
			roContract.on(eventName, handler);
			listenersRef.current.push({ eventName, handler });
			return () => roContract.off(eventName, handler);
		},
		[roContract],
	);

	const isWrongNetwork = !!account && chainId !== EXPECTED_CHAIN_ID;

	return (
		<Web3Ctx.Provider
			value={{
				provider,
				signer,
				contract,
				roContract,
				account,
				chainId,
				connecting,
				voterInfo,
				refreshVoterInfo,
				connectWallet,
				disconnectWallet,
				onContractEvent,
				isWrongNetwork,
				contractAddress: contractData.address,
			}}
		>
			{children}
		</Web3Ctx.Provider>
	);
}

export const useWeb3 = () => {
	const ctx = useContext(Web3Ctx);
	if (!ctx) throw new Error('useWeb3 must be used inside Web3Provider');
	return ctx;
};
