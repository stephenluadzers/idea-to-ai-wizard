import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp, Clock, Zap } from "lucide-react";

export default function Analytics() {
  const { data: libraryStats } = useQuery({
    queryKey: ["library-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_library")
        .select("*");
      
      if (error) throw error;

      const totalPrompts = data.length;
      const avgScore = data.reduce((sum, p) => sum + (p.performance_score || 0), 0) / totalPrompts || 0;
      const totalUsage = data.reduce((sum, p) => sum + (p.usage_count || 0), 0);
      const favorites = data.filter(p => p.is_favorite).length;

      return { totalPrompts, avgScore, totalUsage, favorites };
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_library")
        .select("title, created_at, category")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Track your prompt engineering performance</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Total Prompts</div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{libraryStats?.totalPrompts || 0}</div>
          <div className="text-xs text-muted-foreground mt-2">In your library</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Avg Score</div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{libraryStats?.avgScore.toFixed(1) || "0.0"}</div>
          <div className="text-xs text-muted-foreground mt-2">Out of 10</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Total Usage</div>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{libraryStats?.totalUsage || 0}</div>
          <div className="text-xs text-muted-foreground mt-2">Times used</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Favorites</div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold">{libraryStats?.favorites || 0}</div>
          <div className="text-xs text-muted-foreground mt-2">Starred prompts</div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity?.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-muted-foreground">{item.category || "Uncategorized"}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
          {!recentActivity?.length && (
            <div className="text-center py-8 text-muted-foreground">
              No activity yet. Start creating prompts!
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
