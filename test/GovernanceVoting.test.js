// test/GovernanceVoting.test.js
const { expect }  = require("chai");
const { ethers }  = require("hardhat");
const { time }    = require("@nomicfoundation/hardhat-network-helpers");

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DURATION  = 3600; // 1 hour
const QUORUM    = 1;    // minimal quorum for most tests

const Category = { General: 0, Treasury: 1, Protocol: 2, Membership: 3, Emergency: 4 };
const Status   = { Active: 0, Closed: 1, QuorumFailed: 2 };

const OPTIONS_2 = ["Yes", "No"];
const OPTIONS_3 = ["Option A", "Option B", "Option C"];

// ─────────────────────────────────────────────────────────────────────────────
// Role bytes
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_ROLE    = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
const VOTER_ROLE    = ethers.keccak256(ethers.toUtf8Bytes("VOTER_ROLE"));

// ─────────────────────────────────────────────────────────────────────────────
// Fixture
// ─────────────────────────────────────────────────────────────────────────────
async function deployFixture() {
  const [admin, proposer, voterA, voterB, voterC, stranger] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("GovernanceVoting");
  const gov     = await Factory.deploy();
  await gov.waitForDeployment();

  return { gov, admin, proposer, voterA, voterB, voterC, stranger };
}

async function fullFixture() {
  const base = await deployFixture();
  const { gov, admin, proposer, voterA, voterB, voterC } = base;

  // Setup roles
  await gov.grantRole(PROPOSER_ROLE, proposer.address);
  await gov.addVoter(voterA.address, 1);
  await gov.addVoter(voterB.address, 2);   // voterB has weight 2
  await gov.addVoter(voterC.address, 1);

  // Create a default proposal
  await gov.connect(proposer).createProposal(
    "Test Proposal", OPTIONS_2, DURATION, QUORUM, Category.General, ""
  );

  return base;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────
describe("GovernanceVoting", function () {

  // ── Deployment ──────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("grants DEFAULT_ADMIN_ROLE and ADMIN_ROLE to deployer", async function () {
      const { gov, admin } = await deployFixture();
      const DEFAULT_ADMIN = await gov.DEFAULT_ADMIN_ROLE();
      expect(await gov.hasRole(DEFAULT_ADMIN, admin.address)).to.be.true;
      expect(await gov.hasRole(ADMIN_ROLE,    admin.address)).to.be.true;
    });

    it("starts unpaused with zero proposals", async function () {
      const { gov } = await deployFixture();
      expect(await gov.paused()).to.be.false;
      expect(await gov.totalProposals()).to.equal(0);
    });
  });

  // ── Voter Management ────────────────────────────────────────────────────
  describe("addVoter()", function () {
    it("registers voter with default weight 1", async function () {
      const { gov, voterA } = await deployFixture();
      await gov.addVoter(voterA.address, 0);
      const info = await gov.getVoterInfo(voterA.address);
      expect(info.registered).to.be.true;
      expect(info.weight).to.equal(1);
    });

    it("registers voter with custom weight", async function () {
      const { gov, voterA } = await deployFixture();
      await gov.addVoter(voterA.address, 5);
      const info = await gov.getVoterInfo(voterA.address);
      expect(info.weight).to.equal(5);
    });

    it("emits VoterRegistered event", async function () {
      const { gov, voterA } = await deployFixture();
      await expect(gov.addVoter(voterA.address, 1))
        .to.emit(gov, "VoterRegistered")
        .withArgs(voterA.address, 1);
    });

    it("reverts for non-admin", async function () {
      const { gov, stranger, voterA } = await deployFixture();
      await expect(gov.connect(stranger).addVoter(voterA.address, 1))
        .to.be.reverted;
    });

    it("reverts for zero address", async function () {
      const { gov } = await deployFixture();
      await expect(gov.addVoter(ethers.ZeroAddress, 1))
        .to.be.revertedWith("Zero address");
    });
  });

  describe("removeVoter()", function () {
    it("removes voter and revokes VOTER_ROLE", async function () {
      const { gov, voterA } = await deployFixture();
      await gov.addVoter(voterA.address, 1);
      await gov.removeVoter(voterA.address);
      const info = await gov.getVoterInfo(voterA.address);
      expect(info.registered).to.be.false;
      expect(await gov.hasRole(VOTER_ROLE, voterA.address)).to.be.false;
    });

    it("reverts when voter not registered", async function () {
      const { gov, voterA } = await deployFixture();
      await expect(gov.removeVoter(voterA.address)).to.be.revertedWith("Not registered");
    });
  });

  describe("setVoterWeight()", function () {
    it("updates weight for registered voter", async function () {
      const { gov, voterA } = await deployFixture();
      await gov.addVoter(voterA.address, 1);
      await gov.setVoterWeight(voterA.address, 10);
      const info = await gov.getVoterInfo(voterA.address);
      expect(info.weight).to.equal(10);
    });

    it("reverts for weight of 0", async function () {
      const { gov, voterA } = await deployFixture();
      await gov.addVoter(voterA.address, 1);
      await expect(gov.setVoterWeight(voterA.address, 0))
        .to.be.revertedWith("Weight must be > 0");
    });
  });

  // ── Proposal Creation ───────────────────────────────────────────────────
  describe("createProposal()", function () {
    it("creates proposal and returns id 0", async function () {
      const { gov } = await deployFixture();
      const tx = await gov.createProposal("P1", OPTIONS_2, DURATION, 1, Category.General, "");
      await expect(tx).to.emit(gov, "ProposalCreated").withArgs(
        0, await gov.owner !== undefined ? (await ethers.getSigners())[0].address : (await ethers.getSigners())[0].address,
        "P1", Category.General,
        expect.anything !== undefined ? (await gov.getProposal(0)).deadline : 0n,
        1
      );
      expect(await gov.totalProposals()).to.equal(1);
    });

    it("auto-increments proposal IDs", async function () {
      const { gov } = await deployFixture();
      await gov.createProposal("P1", OPTIONS_2, DURATION, 1, Category.General, "");
      await gov.createProposal("P2", OPTIONS_3, DURATION, 1, Category.Treasury, "QmABC");
      expect(await gov.totalProposals()).to.equal(2);
    });

    it("stores IPFS hash correctly", async function () {
      const { gov } = await deployFixture();
      await gov.createProposal("With IPFS", OPTIONS_2, DURATION, 1, Category.General, "QmXyz123");
      const p = await gov.getProposal(0);
      expect(p.ipfsHash).to.equal("QmXyz123");
    });

    it("reverts on empty description", async function () {
      const { gov } = await deployFixture();
      await expect(gov.createProposal("", OPTIONS_2, DURATION, 1, Category.General, ""))
        .to.be.revertedWithCustomError(gov, "EmptyDescription");
    });

    it("reverts with fewer than 2 options", async function () {
      const { gov } = await deployFixture();
      await expect(gov.createProposal("P", ["Only one"], DURATION, 1, Category.General, ""))
        .to.be.revertedWithCustomError(gov, "EmptyOptions");
    });

    it("reverts when options exceed MAX_OPTIONS (10)", async function () {
      const { gov } = await deployFixture();
      const tooMany = Array.from({ length: 11 }, (_, i) => `Option ${i}`);
      await expect(gov.createProposal("P", tooMany, DURATION, 1, Category.General, ""))
        .to.be.revertedWithCustomError(gov, "TooManyOptions");
    });

    it("reverts on duration below MIN_DURATION", async function () {
      const { gov } = await deployFixture();
      await expect(gov.createProposal("P", OPTIONS_2, 30, 1, Category.General, ""))
        .to.be.revertedWithCustomError(gov, "InvalidDuration");
    });

    it("reverts on zero quorum", async function () {
      const { gov } = await deployFixture();
      await expect(gov.createProposal("P", OPTIONS_2, DURATION, 0, Category.General, ""))
        .to.be.revertedWithCustomError(gov, "ZeroQuorum");
    });

    it("reverts for non-proposer", async function () {
      const { gov, stranger } = await deployFixture();
      await expect(gov.connect(stranger).createProposal("P", OPTIONS_2, DURATION, 1, Category.General, ""))
        .to.be.reverted;
    });
  });

  // ── Voting ───────────────────────────────────────────────────────────────
  describe("vote()", function () {
    it("registered voter casts vote, emits VoteCast", async function () {
      const { gov, voterA } = await fullFixture();
      await expect(gov.connect(voterA).vote(0, 0))
        .to.emit(gov, "VoteCast")
        .withArgs(0, voterA.address, 0, 1);

      const [counts, total] = await gov.getResults(0);
      expect(counts[0]).to.equal(1n);
      expect(total).to.equal(1n);
    });

    it("weighted vote accumulates correctly", async function () {
      const { gov, voterB } = await fullFixture(); // voterB weight = 2
      await gov.connect(voterB).vote(0, 1);
      const [counts, total] = await gov.getResults(0);
      expect(counts[1]).to.equal(2n);
      expect(total).to.equal(2n);
    });

    it("two voters on same option accumulate", async function () {
      const { gov, voterA, voterB } = await fullFixture();
      await gov.connect(voterA).vote(0, 0); // +1
      await gov.connect(voterB).vote(0, 0); // +2
      const [counts] = await gov.getResults(0);
      expect(counts[0]).to.equal(3n);
    });

    it("reverts on double vote", async function () {
      const { gov, voterA } = await fullFixture();
      await gov.connect(voterA).vote(0, 0);
      await expect(gov.connect(voterA).vote(0, 0))
        .to.be.revertedWithCustomError(gov, "AlreadyVoted");
    });

    it("reverts for non-voter", async function () {
      const { gov, stranger } = await fullFixture();
      await expect(gov.connect(stranger).vote(0, 0)).to.be.reverted;
    });

    it("reverts after deadline", async function () {
      const { gov, voterA } = await fullFixture();
      await time.increase(DURATION + 1);
      await expect(gov.connect(voterA).vote(0, 0))
        .to.be.revertedWithCustomError(gov, "VotingClosed");
    });

    it("reverts for invalid option index", async function () {
      const { gov, voterA } = await fullFixture();
      await expect(gov.connect(voterA).vote(0, 99))
        .to.be.revertedWithCustomError(gov, "InvalidOption");
    });

    it("reverts for invalid proposal ID", async function () {
      const { gov, voterA } = await fullFixture();
      await expect(gov.connect(voterA).vote(999, 0))
        .to.be.revertedWithCustomError(gov, "InvalidProposal");
    });
  });

  // ── Delegation ───────────────────────────────────────────────────────────
  describe("delegateVote()", function () {
    it("voter can delegate to another voter", async function () {
      const { gov, voterA, voterB } = await fullFixture();
      await expect(gov.connect(voterA).delegateVote(voterB.address))
        .to.emit(gov, "VoteDelegated")
        .withArgs(voterA.address, voterB.address);

      const info = await gov.getVoterInfo(voterA.address);
      expect(info.hasDelegated).to.be.true;
      expect(info.delegate).to.equal(voterB.address);
    });

    it("delegated voter loses direct voting weight", async function () {
      const { gov, voterA, voterB } = await fullFixture();
      await gov.connect(voterA).delegateVote(voterB.address);
      // voterA delegates away → weight resolves to 0 → cannot vote
      await expect(gov.connect(voterA).vote(0, 0))
        .to.be.revertedWithCustomError(gov, "NoVotingWeight");
    });

    it("reverts self-delegation", async function () {
      const { gov, voterA } = await fullFixture();
      await expect(gov.connect(voterA).delegateVote(voterA.address))
        .to.be.revertedWithCustomError(gov, "SelfDelegation");
    });

    it("reverts delegating to non-voter", async function () {
      const { gov, voterA, stranger } = await fullFixture();
      await expect(gov.connect(voterA).delegateVote(stranger.address))
        .to.be.revertedWithCustomError(gov, "DelegateNotVoter");
    });

    it("reverts double delegation", async function () {
      const { gov, voterA, voterB, voterC } = await fullFixture();
      await gov.connect(voterA).delegateVote(voterB.address);
      await expect(gov.connect(voterA).delegateVote(voterC.address))
        .to.be.revertedWithCustomError(gov, "AlreadyDelegated");
    });

    it("reverts circular delegation", async function () {
      const { gov, voterA, voterB } = await fullFixture();
      await gov.connect(voterB).delegateVote(voterA.address);
      await expect(gov.connect(voterA).delegateVote(voterB.address))
        .to.be.revertedWithCustomError(gov, "CircularDelegation");
    });
  });

  // ── Winner / Quorum ──────────────────────────────────────────────────────
  describe("getWinner()", function () {
    it("reverts while voting still open", async function () {
      const { gov } = await fullFixture();
      await expect(gov.getWinner(0))
        .to.be.revertedWithCustomError(gov, "VotingStillOpen");
    });

    it("returns correct winner after deadline", async function () {
      const { gov, voterA, voterB } = await fullFixture();
      await gov.connect(voterB).vote(0, 1); // voterB weight 2 → option 1
      await gov.connect(voterA).vote(0, 0); // voterA weight 1 → option 0
      await time.increase(DURATION + 1);

      const w = await gov.getWinner(0);
      expect(w.winningOptionIndex).to.equal(1n);
      expect(w.winningOptionText).to.equal("No");
      expect(w.winningVoteCount).to.equal(2n);
      expect(w.isTie).to.be.false;
      expect(w.quorumReached).to.be.true;
    });

    it("reports tie correctly (lowest index wins)", async function () {
      const { gov, voterA, voterC } = await fullFixture();
      await gov.connect(voterA).vote(0, 0);
      await gov.connect(voterC).vote(0, 1);
      await time.increase(DURATION + 1);

      const w = await gov.getWinner(0);
      expect(w.isTie).to.be.true;
      expect(w.winningOptionIndex).to.equal(0n); // tie → lower index
    });

    it("reports quorumReached=false when votes < quorum", async function () {
      const { gov } = await deployFixture();
      await gov.createProposal("High Quorum", OPTIONS_2, DURATION, 100, Category.General, "");
      await gov.addVoter((await ethers.getSigners())[2].address, 1);
      await gov.connect((await ethers.getSigners())[2]).vote(0, 0);
      await time.increase(DURATION + 1);

      const w = await gov.getWinner(0);
      expect(w.quorumReached).to.be.false;
    });
  });

  // ── Proposal Status ──────────────────────────────────────────────────────
  describe("Proposal status transitions", function () {
    it("is Active before deadline", async function () {
      const { gov } = await fullFixture();
      const p = await gov.getProposal(0);
      expect(p.status).to.equal(Status.Active);
    });

    it("is QuorumFailed after deadline if votes < quorum", async function () {
      const { gov } = await deployFixture();
      await gov.createProposal("Q", OPTIONS_2, DURATION, 999, Category.General, "");
      await time.increase(DURATION + 1);
      const p = await gov.getProposal(0);
      expect(p.status).to.equal(Status.QuorumFailed);
    });

    it("is Closed after deadline if quorum met", async function () {
      const { gov, voterA } = await fullFixture();
      await gov.connect(voterA).vote(0, 0);
      await time.increase(DURATION + 1);
      const p = await gov.getProposal(0);
      expect(p.status).to.equal(Status.Closed);
    });
  });

  // ── Pagination ───────────────────────────────────────────────────────────
  describe("getProposals() pagination", function () {
    it("returns correct page slice", async function () {
      const { gov } = await deployFixture();
      for (let i = 0; i < 5; i++) {
        await gov.createProposal(`P${i}`, OPTIONS_2, DURATION, 1, Category.General, "");
      }
      const [page, total] = await gov.getProposals(2, 2);
      expect(total).to.equal(5n);
      expect(page.length).to.equal(2);
      expect(page[0].description).to.equal("P2");
      expect(page[1].description).to.equal("P3");
    });

    it("returns empty array for out-of-range offset", async function () {
      const { gov } = await deployFixture();
      const [page, total] = await gov.getProposals(100, 10);
      expect(page.length).to.equal(0);
      expect(total).to.equal(0n);
    });
  });

  // ── Pause ────────────────────────────────────────────────────────────────
  describe("pause() / unpause()", function () {
    it("admin can pause and unpause", async function () {
      const { gov } = await deployFixture();
      await gov.pause();
      expect(await gov.paused()).to.be.true;
      await gov.unpause();
      expect(await gov.paused()).to.be.false;
    });

    it("blocks addVoter while paused", async function () {
      const { gov, voterA } = await deployFixture();
      await gov.pause();
      await expect(gov.addVoter(voterA.address, 1)).to.be.reverted;
    });

    it("blocks vote while paused", async function () {
      const { gov, voterA } = await fullFixture();
      await gov.pause();
      await expect(gov.connect(voterA).vote(0, 0)).to.be.reverted;
    });
  });

  // ── hasUserVoted ─────────────────────────────────────────────────────────
  describe("hasUserVoted()", function () {
    it("returns voted=false before voting", async function () {
      const { gov, voterA } = await fullFixture();
      const [voted] = await gov.hasUserVoted(0, voterA.address);
      expect(voted).to.be.false;
    });

    it("returns voted=true and correct optionIndex after voting", async function () {
      const { gov, voterA } = await fullFixture();
      await gov.connect(voterA).vote(0, 1);
      const [voted, idx] = await gov.hasUserVoted(0, voterA.address);
      expect(voted).to.be.true;
      expect(idx).to.equal(1n);
    });
  });
});
