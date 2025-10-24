import { Card } from "~/components/card";
import type { Route } from "./+types/home";
import { TextRotate } from "~/components/text-rotate";
import { Donut } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useWallet } from "~/hooks/use-wallet";
import { useNativeBalance } from "~/hooks/use-native-balance";
import { useSubmitTransaction } from "~/hooks/use-submit-transaction";
import * as Crowdfund from "../../packages/crowdfunding";
import { signTransaction } from "~/config/wallet.client";
import { useState, useMemo, useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const RPC_URL = "https://soroban-testnet.stellar.org:443";
  const { address, isConnected } = useWallet();
  const { balance, refetch: refetchBalance } = useNativeBalance(address);

  const [amount, setAmount] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);

  // Enhanced features state
  const [category, setCategory] = useState<string>("Loading...");
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [campaignStats, setCampaignStats] = useState<any>({});
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [commentCount, setCommentCount] = useState<number>(0);

  const contract = useMemo(() => {
    if (!isConnected || address === "-") return null;

    return new Crowdfund.Client({
      ...Crowdfund.networks.testnet,
      rpcUrl: RPC_URL,
      signTransaction,
      publicKey: address,
    });
  }, [isConnected, address]);

  const { submit, isSubmitting } = useSubmitTransaction({
    rpcUrl: RPC_URL,
    networkPassphrase: Crowdfund.networks.testnet.networkPassphrase,
    onSuccess: handleOnSuccess,
    onError: (error) => {
      console.error("Donation failed", error);
    },
  });

  async function handleOnSuccess() {
    // Fetch updated total
    if (contract) {
      setPreviousTotal(total);
      const totalTx = await contract.get_total_raised();
      const updated = BigInt(totalTx.result as any);
      setTotal(Number(updated));
      // Fetch enhanced data as well
      await fetchEnhancedData();
    }
    await refetchBalance();
    setAmount("");
  }

  // Fetch enhanced campaign features
  async function fetchEnhancedData() {
    if (!contract) return;

    try {
      // Try to fetch enhanced features, but gracefully handle if not available
      const categoryPromise = contract.get_category?.().catch(() => "Uncategorized");
      const progressPromise = contract.get_progress_percentage?.().catch(() => 0);
      const updateCountPromise = contract.get_update_count?.().catch(() => 0);
      const commentCountPromise = contract.get_comment_count?.().catch(() => 0);

      const [categoryResult, progressResult, updateCountResult, commentCountResult] =
        await Promise.allSettled([
          categoryPromise,
          progressPromise,
          updateCountPromise,
          commentCountPromise,
        ]);

      if (categoryResult.status === "fulfilled") {
        setCategory(categoryResult.value || "Uncategorized");
      }
      if (progressResult.status === "fulfilled") {
        setProgressPercentage(Number(progressResult.value) || 0);
      }
      if (updateCountResult.status === "fulfilled") {
        setUpdateCount(Number(updateCountResult.value) || 0);
      }
      if (commentCountResult.status === "fulfilled") {
        setCommentCount(Number(commentCountResult.value) || 0);
      }
    } catch (error) {
      console.log("Enhanced features not available yet:", error);
      // Set defaults if enhanced features aren't available
      setCategory("Basic Campaign");
      setProgressPercentage(total > 0 ? Math.min(100, Math.floor((total / 1000000) * 10)) : 0);
    }
  }

  async function handleSubmit() {
    if (!isConnected || !contract) return;
    if (!amount.trim()) return;

    try {
      // Convert XLM to stroops (multiply by 10^7)
      const xlmAmount = parseFloat(amount.trim());
      const stroopsAmount = Math.floor(xlmAmount * 10_000_000);

      const tx = (await contract.donate({
        donor: address,
        amount: BigInt(stroopsAmount),
      })) as any;

      await submit(tx);
    } catch (e) {
      console.error("Failed to create donation transaction", e);
    }
  }

  useEffect(() => {
    if (!contract) return;

    (async () => {
      try {
        const tx = await contract.get_total_raised();
        const total = Number(BigInt(tx.result));

        setTotal(total);

        // Also fetch enhanced data
        await fetchEnhancedData();
      } catch (err) {
        setTotal(0);
        setCategory("Basic Campaign");
      }
    })();
  }, [contract]);

  return (
    <div className="flex flex-col items-center gap-y-16">
      <div className="flex flex-row items-center gap-x-6">
        <p className="text-4xl">Learning</p>
        <TextRotate
          texts={["Stellar", "Rust", "Contract", "Frontend"]}
          mainClassName="bg-white text-black rounded-lg text-4xl px-6 py-3"
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          rotationInterval={2000}
        />
      </div>
      <Card className="flex flex-col gap-y-6 py-4 px-8 w-1/3">
        <p className="flex flex-row items-center gap-x-2 text-lg mb-6 font-medium">
          <Donut className="size-5" />
          Donate {balance}
        </p>

        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row items-center gap-4">
            <img src="https://placehold.co/10" className="size-10 rounded-full" />
            <p>XLM</p>
          </div>
          <p className="tabular-nums flex gap-1">
            {!isConnected && <span>Connect wallet</span>}
            {isConnected && balance === "-" && <span>-</span>}
            {isConnected && balance !== "-" && (
              <>
                <span>{balance}</span>
                <span>XLM</span>
              </>
            )}
          </p>
        </div>

        <Input
          type="text"
          inputMode="decimal"
          placeholder="0.001 (try small amount first)"
          onChange={(e) => setAmount(e.target.value)}
          value={amount}
          disabled={isSubmitting}
        />

        <Button
          className="w-max"
          onClick={handleSubmit}
          disabled={!isConnected || isSubmitting || !amount.trim()}
        >
          {isSubmitting ? "Donating..." : "Submit"}
        </Button>
      </Card>

      {/* Enhanced Campaign Stats */}
      <Card className="w-2/3 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Campaign Overview</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {category}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{(total / 10_000_000).toFixed(2)}</p>
              <p className="text-sm text-gray-500">XLM Raised</p>
              {previousTotal > 0 && previousTotal !== total && (
                <p className="text-xs text-green-600">
                  +{((total - previousTotal) / 10_000_000).toFixed(7)} XLM
                </p>
              )}
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold">{progressPercentage}%</p>
              <p className="text-sm text-gray-500">Progress</p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold">{updateCount}</p>
              <p className="text-sm text-gray-500">Updates</p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold">{commentCount}</p>
              <p className="text-sm text-gray-500">Comments</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Campaign Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Enhanced Features Notice */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              🚀 <strong>Enhanced Features Available!</strong> This campaign now supports
              categories, updates, comments, and milestones.
              {isConnected && (
                <>
                  {" "}
                  Check out the{" "}
                  <a href="/dashboard" className="underline font-medium">
                    Campaign Dashboard
                  </a>{" "}
                  for full management features.
                </>
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
