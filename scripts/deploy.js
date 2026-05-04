// scripts/deploy.js
// Deploy GovernanceVoting to any configured network and export ABI for frontend.
//
// Usage:
//   npx hardhat run scripts/deploy.js --network localhost
//   npx hardhat run scripts/deploy.js --network sepolia

const { ethers, artifacts } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
	const [deployer] = await ethers.getSigners();

	console.log('\n╔══════════════════════════════════════════╗');
	console.log('║   GovernanceVoting — Deploy Script       ║');
	console.log('╚══════════════════════════════════════════╝\n');
	console.log(`Network  : ${(await ethers.provider.getNetwork()).name}`);
	console.log(`Deployer : ${deployer.address}`);
	console.log(
		`Balance  : ${ethers.formatEther(
			await ethers.provider.getBalance(deployer.address),
		)} ETH\n`,
	);

	// ── Deploy ──────────────────────────────────────────────────────────────
	console.log('Deploying GovernanceVoting...');
	const Factory = await ethers.getContractFactory('GovernanceVoting');
	const gov = await Factory.deploy();
	await gov.waitForDeployment();
	const address = await gov.getAddress();
	console.log(`✓ GovernanceVoting deployed: ${address}\n`);

	// ── Post-deploy setup (demo data on local/testnet) ──────────────────────
	const network = (await ethers.provider.getNetwork()).name;
	if (
		network === 'hardhat' ||
		network === 'localhost' ||
		network === 'unknown'
	) {
		console.log('Setting up demo data...');

		const [admin, proposer, voterA, voterB] = await ethers.getSigners();
		const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ADMIN_ROLE'));
		const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PROPOSER_ROLE'));

		await (await gov.grantRole(ADMIN_ROLE, admin.address)).wait();
		console.log(`✓ ADMIN_ROLE granted to ${admin.address}`);

		await (await gov.grantRole(PROPOSER_ROLE, proposer.address)).wait();
		console.log(`✓ PROPOSER_ROLE granted to ${proposer.address}`);

		await (await gov.addVoter(voterA.address, 1)).wait();
		await (await gov.addVoter(voterB.address, 2)).wait();
		console.log(`✓ Registered 2 voters (weights: 1, 2)`);

		const ONE_HOUR = 3600;
		await (
			await gov.connect(proposer).createProposal(
				'Should the DAO allocate 10 ETH to ecosystem grants?',
				['Yes – Approve', 'No – Reject', 'Abstain'],
				ONE_HOUR * 24,
				1,
				1, // Treasury
				'QmExampleIPFSHash123',
			)
		).wait();

		await (
			await gov.connect(proposer).createProposal(
				'Upgrade protocol fee from 0.1% to 0.3%',
				['Accept upgrade', 'Reject upgrade'],
				ONE_HOUR * 48,
				2,
				2, // Protocol
				'',
			)
		).wait();

		console.log(`✓ 2 demo proposals created\n`);
	}

	// ── Export ABI + address for frontend ───────────────────────────────────
	const artifact = await artifacts.readArtifact('GovernanceVoting');
	const exportPath = path.join(__dirname, '../frontend/src/contract');

	fs.mkdirSync(exportPath, { recursive: true });

	fs.writeFileSync(
		path.join(exportPath, 'GovernanceVoting.json'),
		JSON.stringify({ address, abi: artifact.abi }, null, 2),
	);

	console.log(
		`✓ ABI + address exported → frontend/src/contract/GovernanceVoting.json`,
	);
	console.log('\n══════════════════════════════════════════');
	console.log(`  Contract address: ${address}`);
	console.log('══════════════════════════════════════════\n');
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
