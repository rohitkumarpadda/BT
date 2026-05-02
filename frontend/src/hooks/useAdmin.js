// src/hooks/useAdmin.js
import { useState, useCallback } from "react";
import { useWeb3 } from "../context/Web3Context";
import toast from "react-hot-toast";

export function useCreateProposal() {
  const { contract, account } = useWeb3();
  const [creating, setCreating] = useState(false);

  const createProposal = useCallback(async ({
    description, options, durationSeconds, quorum,
    category = 0, ipfsHash = "",
  }) => {
    if (!contract || !account) {
      toast.error("Connect your wallet first");
      return null;
    }

    setCreating(true);
    const tid = toast.loading("Creating proposal…");
    try {
      const tx      = await contract.createProposal(
        description, options, durationSeconds, quorum, category, ipfsHash
      );
      toast.loading("Confirming…", { id: tid });
      const receipt = await tx.wait();

      // Parse ProposalCreated event to get new ID
      let newId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "ProposalCreated") {
            newId = Number(parsed.args.proposalId);
            break;
          }
        } catch (_) {}
      }

      toast.success("Proposal created!", { id: tid });
      return newId;
    } catch (e) {
      toast.error(_parseAdminError(e), { id: tid });
      return null;
    } finally {
      setCreating(false);
    }
  }, [contract, account]);

  return { createProposal, creating };
}

export function useVoterManagement() {
  const { contract } = useWeb3();
  const [loading, setLoading] = useState(false);

  const addVoter = useCallback(async (address, weight = 1) => {
    setLoading(true);
    const tid = toast.loading(`Registering ${address.slice(0, 8)}…`);
    try {
      const tx = await contract.addVoter(address, weight);
      await tx.wait();
      toast.success("Voter registered!", { id: tid });
      return true;
    } catch (e) {
      toast.error(_parseAdminError(e), { id: tid });
      return false;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  const removeVoter = useCallback(async (address) => {
    setLoading(true);
    const tid = toast.loading("Removing voter…");
    try {
      const tx = await contract.removeVoter(address);
      await tx.wait();
      toast.success("Voter removed", { id: tid });
      return true;
    } catch (e) {
      toast.error(_parseAdminError(e), { id: tid });
      return false;
    } finally {
      setLoading(false);
    }
  }, [contract]);

  return { addVoter, removeVoter, loading };
}

function _parseAdminError(e) {
  const msg = e?.reason || e?.message || "Transaction failed";
  if (msg.includes("AccessControl"))   return "You don't have permission for this action";
  if (msg.includes("EmptyDescription")) return "Description cannot be empty";
  if (msg.includes("EmptyOptions"))     return "At least 2 options required";
  if (msg.includes("TooManyOptions"))   return "Maximum 10 options allowed";
  if (msg.includes("InvalidDuration")) return "Duration must be at least 60 seconds";
  if (msg.includes("ZeroQuorum"))      return "Quorum must be at least 1";
  if (msg.includes("user rejected"))   return "Transaction rejected";
  return msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
}
