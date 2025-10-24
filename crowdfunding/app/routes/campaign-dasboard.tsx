import { Card } from "~/components/card";
import type { Route } from "./+types/campaign-dashboard";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useWallet } from "~/hooks/use-wallet";
import { useSubmitTransaction } from "~/hooks/use-submit-transaction";
import * as Crowdfund from "../../packages/crowdfunding";
import { signTransaction } from "~/config/wallet.client";
import { useState, useMemo, useEffect } from "react";
import { MessageSquare, TrendingUp, Target, Calendar, Users, Star } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Campaign Dashboard - Enhanced Crowdfunding" },
    { name: "description", content: "Manage your campaign with updates, comments, and milestones" },
  ];
}

export default function CampaignDashboard() {
  const RPC_URL = "https://soroban-testnet.stellar.org:443";
  const { address, isConnected } = useWallet();

  // Campaign data state
  const [category, setCategory] = useState<string>("");
  const [updates, setUpdates] = useState<string[]>([]);
  const [comments, setComments] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<string[]>([]);
  const [stats, setStats] = useState<any>({});
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);

  // Form states
  const [newUpdate, setNewUpdate] = useState<string>("");
  const [newComment, setNewComment] = useState<string>("");
  const [newMilestone, setNewMilestone] = useState<string>("");

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
    onSuccess: () => {
      console.log("Transaction successful");
      fetchCampaignData();
    },
    onError: (error) => {
      console.error("Transaction failed", error);
    },
  });

  // Fetch all campaign data
  const fetchCampaignData = async () => {
    if (!contract) return;

    try {
      const [
        categoryData,
        updatesData,
        commentsData,
        milestonesData,
        statsData,
        progressData,
        activeData,
      ] = await Promise.all([
        contract.get_category(),
        contract.get_updates(),
        contract.get_comments(),
        contract.get_milestones(),
        contract.get_campaign_stats(),
        contract.get_progress_percentage(),
        contract.is_campaign_active(),
      ]);

      setCategory(categoryData);
      setUpdates(updatesData);
      setComments(commentsData);
      setMilestones(milestonesData);
      setStats(statsData);
      setProgressPercentage(Number(progressData));
      setIsActive(activeData);
    } catch (error) {
      console.error("Error fetching campaign data:", error);
    }
  };

  // Post update
  const handlePostUpdate = async () => {
    if (!contract || !newUpdate.trim()) return;

    try {
      const tx = await contract.post_update({
        owner: address,
        update_text: newUpdate,
      });
      await submit(tx);
      setNewUpdate("");
    } catch (error) {
      console.error("Error posting update:", error);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!contract || !newComment.trim()) return;

    try {
      const tx = await contract.add_comment({
        commenter: address,
        comment_text: newComment,
      });
      await submit(tx);
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  // Add milestone
  const handleAddMilestone = async () => {
    if (!contract || !newMilestone.trim()) return;

    try {
      const tx = await contract.add_milestone({
        owner: address,
        milestone_text: newMilestone,
      });
      await submit(tx);
      setNewMilestone("");
    } catch (error) {
      console.error("Error adding milestone:", error);
    }
  };

  useEffect(() => {
    if (contract) {
      fetchCampaignData();
    }
  }, [contract]);

  if (!isConnected) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground">
            Please connect your Stellar wallet to access the campaign dashboard.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Dashboard</h1>
          <p className="text-muted-foreground">Manage your crowdfunding campaign</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Ended"}
          </Badge>
          <Badge variant="outline">{category || "Uncategorized"}</Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Raised</p>
              <p className="text-2xl font-bold">{stats.raised || 0} XLM</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Goal</p>
              <p className="text-2xl font-bold">{stats.goal || 0} XLM</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-sm text-muted-foreground">Donors</p>
              <p className="text-2xl font-bold">{stats.donors || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 text-orange-600" />
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold">{progressPercentage}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="updates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="updates">Updates ({stats.updates || 0})</TabsTrigger>
          <TabsTrigger value="comments">Comments ({stats.comments || 0})</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
        </TabsList>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Post New Update</h3>
            <div className="space-y-4">
              <Textarea
                placeholder="Share an update with your supporters..."
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                rows={4}
              />
              <Button
                onClick={handlePostUpdate}
                disabled={isSubmitting || !newUpdate.trim()}
                className="w-full"
              >
                {isSubmitting ? "Posting..." : "Post Update"}
              </Button>
            </div>
          </Card>

          <div className="space-y-3">
            {updates.length > 0 ? (
              updates.map((update, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">
                        Update #{updates.length - index}
                      </p>
                      <p>{update}</p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No updates posted yet.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
            <div className="space-y-4">
              <Textarea
                placeholder="Leave a comment or feedback..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddComment}
                disabled={isSubmitting || !newComment.trim()}
                className="w-full"
              >
                {isSubmitting ? "Adding..." : "Add Comment"}
              </Button>
            </div>
          </Card>

          <div className="space-y-3">
            {comments.length > 0 ? (
              comments.map((comment, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Comment #{index + 1}</p>
                      <p>{comment}</p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No comments yet.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Add Milestone</h3>
            <div className="space-y-4">
              <Input
                placeholder="Enter milestone description..."
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
              />
              <Button
                onClick={handleAddMilestone}
                disabled={isSubmitting || !newMilestone.trim()}
                className="w-full"
              >
                {isSubmitting ? "Adding..." : "Add Milestone"}
              </Button>
            </div>
          </Card>

          <div className="space-y-3">
            {milestones.length > 0 ? (
              milestones.map((milestone, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Target className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Milestone #{index + 1}</p>
                      <p>{milestone}</p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No milestones set yet.</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
