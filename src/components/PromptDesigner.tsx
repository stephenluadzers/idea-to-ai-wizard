import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Download, Sparkles, Brain, Target, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  idea: string;
  domain: string;
  targetAudience: string;
  specificRequirements: string;
}

export const PromptDesigner = () => {
  const [formData, setFormData] = useState<FormData>({
    idea: "",
    domain: "",
    targetAudience: "",
    specificRequirements: ""
  });
  
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePrompt = () => {
    if (!formData.idea.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide your AI assistant idea to get started.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate generation process
    setTimeout(() => {
      const prompt = `# **Role:**
You are a ${formData.domain || 'specialized'} AI assistant designed to ${formData.idea}.

# **Objective:**
To provide expert guidance and support in ${formData.domain || 'your domain'}, delivering precise, actionable insights tailored to ${formData.targetAudience || 'users'}.

# **Context:**
This AI operates as a ${formData.domain || 'domain'} specialist, leveraging comprehensive knowledge and best practices to assist ${formData.targetAudience || 'users'} in achieving their goals efficiently and effectively.

# **Instructions:**
- **Persona**: You are analytical, authoritative, and highly knowledgeable in ${formData.domain || 'your field'}. Your tone is professional, clear, and solution-oriented, ensuring maximum value in every interaction.
- **Key Functions**:
    - Analyze and understand user requirements with precision
    - Provide structured, actionable recommendations
    - Deliver insights based on industry best practices
    - Maintain consistency in quality and approach
    ${formData.specificRequirements ? `- ${formData.specificRequirements}` : ''}
- **Rules & Constraints**:
    - MUST provide evidence-based recommendations when possible
    - MUST NOT make assumptions without clarifying with users
    - MUST maintain professional standards in all communications
    - MUST prioritize accuracy and relevance in all responses

# **Notes:**
Focus on delivering clear, actionable guidance that directly addresses user needs. Emphasize practical implementation and measurable outcomes in your recommendations.

**Recommended AI Model:** Google Gemini 2.5 Pro (for complex reasoning and multimodal capabilities)

**Knowledge Base Requirements:** 
- ${formData.domain || 'Domain'}-specific documentation and best practices
- Industry standards and compliance guidelines
- Current trends and emerging technologies in ${formData.domain || 'the field'}`;

      setGeneratedPrompt(prompt);
      setIsGenerating(false);
      
      toast({
        title: "Prompt Generated!",
        description: "Your structured AI assistant prompt is ready.",
      });
    }, 2000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    toast({
      title: "Copied!",
      description: "Prompt copied to clipboard.",
    });
  };

  const downloadPrompt = () => {
    const blob = new Blob([generatedPrompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-assistant-prompt.md';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Prompt saved as Markdown file.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-background/10 backdrop-blur-sm"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Brain className="w-8 h-8 text-primary-foreground" />
            <span className="text-primary-foreground font-semibold text-lg">AI Assistant Designer</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
            Transform Ideas into
            <br />
            <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Intelligent Assistants
            </span>
          </h1>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Convert your raw concepts into structured, professional AI assistant prompts using the proven "Thinker Doer" methodology.
          </p>
          <div className="flex gap-4 justify-center">
            <Badge variant="secondary" className="text-sm px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Structured Prompts
            </Badge>
            <Badge variant="secondary" className="text-sm px-4 py-2">
              <Target className="w-4 h-4 mr-2" />
              Model Recommendations
            </Badge>
            <Badge variant="secondary" className="text-sm px-4 py-2">
              <Settings className="w-4 h-4 mr-2" />
              Knowledge Bases
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card className="bg-gradient-card border-border/50 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Assistant Configuration
              </CardTitle>
              <CardDescription>
                Provide details about your AI assistant concept to generate a structured prompt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="idea" className="text-sm font-medium">
                  Core Idea *
                </Label>
                <Textarea
                  id="idea"
                  placeholder="Describe your AI assistant idea in detail. What should it do? What problems should it solve?"
                  value={formData.idea}
                  onChange={(e) => handleInputChange("idea", e.target.value)}
                  className="min-h-[120px] bg-secondary border-border/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="domain" className="text-sm font-medium">
                  Domain/Industry
                </Label>
                <Input
                  id="domain"
                  placeholder="e.g., Healthcare, Finance, Education, Marketing"
                  value={formData.domain}
                  onChange={(e) => handleInputChange("domain", e.target.value)}
                  className="bg-secondary border-border/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="audience" className="text-sm font-medium">
                  Target Audience
                </Label>
                <Input
                  id="audience"
                  placeholder="e.g., Business professionals, Students, Developers"
                  value={formData.targetAudience}
                  onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                  className="bg-secondary border-border/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="requirements" className="text-sm font-medium">
                  Specific Requirements
                </Label>
                <Textarea
                  id="requirements"
                  placeholder="Any specific features, constraints, or capabilities your assistant should have..."
                  value={formData.specificRequirements}
                  onChange={(e) => handleInputChange("specificRequirements", e.target.value)}
                  className="bg-secondary border-border/50"
                />
              </div>
              
              <Button 
                onClick={generatePrompt}
                disabled={isGenerating || !formData.idea.trim()}
                className="w-full bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-glow transition-all duration-300"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Generating Prompt...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Assistant Prompt
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Prompt Output */}
          <Card className="bg-gradient-card border-border/50 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                Generated Prompt
              </CardTitle>
              <CardDescription>
                Your structured "Thinker Doer" style prompt ready for deployment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedPrompt ? (
                <div className="space-y-4">
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96 font-mono leading-relaxed">
                      {generatedPrompt}
                    </pre>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={copyToClipboard}
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={downloadPrompt}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No prompt generated yet</p>
                  <p className="text-sm">Fill out the form and click generate to create your structured AI assistant prompt.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};