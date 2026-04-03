import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Zap, Bot, Sparkles, Activity, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { PluginStateDisplay } from "@/components/ai-agent/PluginStateDisplay";
import { AIEventTrigger } from "@/components/ai-agent/AIEventTrigger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAIPluginProvisioning } from "@/hooks/useAIPluginProvisioning";
import { useAIActivityMonitor } from "@/hooks/useAIActivityMonitor";
import { toast } from "sonner";

interface AIPluginsPanelProps {
  businessId?: string;
  pluginInstanceId?: string;
}

export const AIPluginsPanel = ({ businessId, pluginInstanceId: propPluginInstanceId }: AIPluginsPanelProps) => {
  const [activeTab, setActiveTab] = useState<"state" | "trigger" | "activity">("activity");
  const [localPluginInstanceId, setLocalPluginInstanceId] = useState<string | undefined>(propPluginInstanceId);
  
  const { ensurePluginInstance, isProvisioning } = useAIPluginProvisioning();
  const { events, isLoading: isLoadingEvents, activityState, refetch } = useAIActivityMonitor({ 
    businessId, 
    maxEvents: 10 
  });

  // Check if we have a valid business context
  const hasBusinessContext = Boolean(businessId);

  // Auto-provision plugin instance when business loads
  useEffect(() => {
    if (businessId && !localPluginInstanceId && !isProvisioning) {
      ensurePluginInstance(businessId, 'unison_ai').then((result) => {
        if (result) {
          setLocalPluginInstanceId(result.pluginInstanceId);
          if (result.isNew) {
            toast.success('AI Orchestrator activated for this business');
          }
        }
      });
    }
  }, [businessId, localPluginInstanceId, ensurePluginInstance, isProvisioning]);

  const effectivePluginInstanceId = propPluginInstanceId || localPluginInstanceId;

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-3 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">AI Plugins</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            Beta
          </Badge>
          {activityState === 'working' && (
            <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Embed AI agents in templates for lead scoring, booking, and automation.
        </p>
      </div>

      {!hasBusinessContext && (
        <div className="p-3 shrink-0">
          <Alert variant="default" className="bg-muted/50 border-dashed">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Load a project from Cloud to enable AI plugin testing. Currently in preview mode.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {hasBusinessContext && isProvisioning && (
        <div className="p-3 shrink-0">
          <Alert variant="default" className="bg-primary/10 border-primary/20">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription className="text-xs">
              Activating AI Orchestrator...
            </AlertDescription>
          </Alert>
        </div>
      )}

      {hasBusinessContext && effectivePluginInstanceId && !isProvisioning && (
        <div className="p-3 shrink-0">
          <Alert variant="default" className="bg-primary/10 border-primary/20">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs">
              AI Orchestrator active. Submit a test form below to see it work!
            </AlertDescription>
          </Alert>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "state" | "trigger" | "activity")} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-2 mt-2 h-8 shrink-0 bg-muted/50">
          <TabsTrigger value="activity" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Activity className="h-3 w-3 mr-1" />
            Activity {events.length > 0 && `(${events.length})`}
          </TabsTrigger>
          <TabsTrigger value="trigger" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Zap className="h-3 w-3 mr-1" />
            Test
          </TabsTrigger>
          <TabsTrigger value="state" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Brain className="h-3 w-3 mr-1" />
            State
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {isLoadingEvents && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {!isLoadingEvents && events.length === 0 && (
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-4 text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground mb-2">
                      No AI activity yet
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mb-3">
                      Switch to the "Test" tab and submit a form to trigger AI processing.
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setActiveTab('trigger')}
                      className="text-xs h-7"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Run a Test
                    </Button>
                  </CardContent>
                </Card>
              )}

              {events.map((event) => (
                <Card key={event.id} className="bg-background/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Brain className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium">{event.agentName}</span>
                      </div>
                      <Badge 
                        variant={event.status === 'success' ? 'default' : event.status === 'blocked' ? 'destructive' : 'secondary'} 
                        className="text-[9px] h-4"
                      >
                        {event.statusLabel}
                      </Badge>
                    </div>
                    {event.score !== undefined && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-muted-foreground">Score:</span>
                        <Badge variant="outline" className="text-[9px] h-4">{event.score}%</Badge>
                      </div>
                    )}
                    {event.tags && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {event.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[9px] h-4">{tag}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {events.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={refetch}
                  className="w-full text-xs h-7"
                >
                  Refresh
                </Button>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="trigger" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              {hasBusinessContext ? (
                <AIEventTrigger 
                  businessId={businessId!}
                  pluginInstanceId={effectivePluginInstanceId}
                  onRunCompleted={() => {
                    refetch();
                    setActiveTab('activity');
                  }}
                />
              ) : (
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-4 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground mb-2">
                      Business context required
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">
                      Open a project from Cloud Dashboard to test AI event triggers with a real business ID.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="state" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {effectivePluginInstanceId ? (
                <PluginStateDisplay 
                  pluginInstanceId={effectivePluginInstanceId} 
                  compact 
                />
              ) : (
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-4 text-center">
                    <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground mb-2">
                      No active plugin instance
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">
                      Configure an AI plugin in your template to see real-time state updates here.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-background/50">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Available Agents
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                        <Brain className="h-3 w-3 text-primary" />
                      </div>
                      <span>Lead Qualifier</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-accent/20 flex items-center justify-center">
                        <Zap className="h-3 w-3 text-accent-foreground" />
                      </div>
                      <span>Booking Agent</span>
                    </div>
                    <Badge variant="secondary" className="text-[9px] h-4">Coming</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
