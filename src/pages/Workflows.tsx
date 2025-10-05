import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, Plus, Play } from "lucide-react";

export default function Workflows() {
  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Prompt Workflows</h1>
          <p className="text-muted-foreground">Chain prompts together for complex tasks</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <Card className="p-12 text-center">
        <GitBranch className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Workflow Builder Coming Soon</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Create multi-step prompt workflows with conditional branching, loops, and automated refinement
        </p>
        <div className="flex gap-4 justify-center">
          <div className="text-left">
            <h4 className="font-medium mb-2">Planned Features:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Visual workflow builder</li>
              <li>• Conditional branching logic</li>
              <li>• Output transformation steps</li>
              <li>• Automated refinement loops</li>
              <li>• Error handling & retry logic</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
