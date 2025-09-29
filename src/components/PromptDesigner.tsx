import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Download, Sparkles, Brain, Target, Settings, Search, Database, ExternalLink, Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  idea: string;
  domain: string;
  targetAudience: string;
  specificRequirements: string;
}

interface KnowledgeBase {
  title: string;
  url: string;
  description: string;
  source: string;
  type: 'dataset' | 'api' | 'documentation' | 'repository';
}

interface KnowledgeBaseSearchState {
  results: KnowledgeBase[];
  isSearching: boolean;
  selectedBases: KnowledgeBase[];
}

export const PromptDesigner = () => {
  const [formData, setFormData] = useState<FormData>({
    idea: "",
    domain: "",
    targetAudience: "",
    specificRequirements: ""
  });
  
  const [knowledgeSearch, setKnowledgeSearch] = useState<KnowledgeBaseSearchState>({
    results: [],
    isSearching: false,
    selectedBases: []
  });
  
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const searchKnowledgeBases = async () => {
    if (!formData.idea.trim() && !formData.domain.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide your AI assistant idea or domain to search for relevant knowledge bases.",
        variant: "destructive"
      });
      return;
    }

    setKnowledgeSearch(prev => ({ ...prev, isSearching: true }));

    try {
      const { data, error } = await supabase.functions.invoke('search-knowledge-bases', {
        body: {
          query: formData.idea,
          domain: formData.domain
        }
      });

      if (error) {
        console.error('Error searching knowledge bases:', error);
        toast({
          title: "Search Error",
          description: "Failed to search for knowledge bases. Please try again.",
          variant: "destructive"
        });
        return;
      }

      setKnowledgeSearch(prev => ({ 
        ...prev, 
        results: data.results || [],
        isSearching: false 
      }));

      toast({
        title: "Search Complete",
        description: `Found ${data.results?.length || 0} relevant knowledge bases.`,
      });
    } catch (error) {
      console.error('Error searching knowledge bases:', error);
      setKnowledgeSearch(prev => ({ ...prev, isSearching: false }));
      toast({
        title: "Search Error",
        description: "Failed to search for knowledge bases. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleKnowledgeBase = (kb: KnowledgeBase) => {
    setKnowledgeSearch(prev => ({
      ...prev,
      selectedBases: prev.selectedBases.find(selected => selected.url === kb.url)
        ? prev.selectedBases.filter(selected => selected.url !== kb.url)
        : [...prev.selectedBases, kb]
    }));
  };

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'kaggle': return <Database className="w-4 h-4" />;
      case 'github': return <Github className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'dataset': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'api': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'repository': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'documentation': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
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
      let knowledgeBaseSection = "";
      if (knowledgeSearch.selectedBases.length > 0) {
        knowledgeBaseSection = `\n\n**Recommended Knowledge Bases:**\n${knowledgeSearch.selectedBases.map(kb => `- [${kb.title}](${kb.url}) - ${kb.description} (${kb.source})`).join('\n')}`;
      }

      const prompt = `# **Role:**
You are a ${formData.domain || 'specialized'} AI assistant designed to ${formData.idea}.

# **Objective:**
To provide expert guidance and support in ${formData.domain || 'your domain'}, delivering precise, actionable insights tailored to ${formData.targetAudience || 'users'}.

# **Context:**
This AI operates as a ${formData.domain || 'domain'} specialist, leveraging comprehensive knowledge and best practices to assist ${formData.targetAudience || 'users'} in achieving their goals efficiently and effectively.${knowledgeBaseSection}

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

**Knowledge Base Integration:** 
${knowledgeSearch.selectedBases.length > 0 
  ? `Leverage the ${knowledgeSearch.selectedBases.length} curated knowledge sources listed above for domain-specific information and data-driven insights.`
  : `Consider integrating domain-specific datasets from Kaggle, GitHub repositories, and public APIs to enhance the assistant's knowledge base and provide more accurate, up-to-date information.`
}`;

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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
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

          {/* Knowledge Base Search */}
          <Card className="bg-gradient-card border-border/50 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-accent" />
                Knowledge Base Discovery
              </CardTitle>
              <CardDescription>
                Find relevant datasets, APIs, and repositories to enhance your AI assistant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={searchKnowledgeBases}
                disabled={knowledgeSearch.isSearching || (!formData.idea.trim() && !formData.domain.trim())}
                className="w-full"
                variant="secondary"
              >
                {knowledgeSearch.isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Knowledge Bases
                  </>
                )}
              </Button>

              {knowledgeSearch.results.length > 0 && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <p className="text-sm text-muted-foreground">
                    Found {knowledgeSearch.results.length} relevant sources. Click to select:
                  </p>
                  {knowledgeSearch.results.map((kb, index) => {
                    const isSelected = knowledgeSearch.selectedBases.some(selected => selected.url === kb.url);
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border/50 hover:border-border'
                        }`}
                        onClick={() => toggleKnowledgeBase(kb)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getSourceIcon(kb.source)}
                              <span className="font-medium text-sm truncate">{kb.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{kb.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className={`text-xs ${getTypeColor(kb.type)}`}>
                                {kb.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {kb.source}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {knowledgeSearch.selectedBases.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {knowledgeSearch.selectedBases.length} selected
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setKnowledgeSearch(prev => ({ ...prev, selectedBases: [] }))}
                      className="text-xs h-6 px-2"
                    >
                      Clear all
                    </Button>
                  </div>
                </div>
              )}
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