import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plug,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Link,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { integrationsList, type IntegrationItem } from "./constants";

interface IntegrationsSectionProps {
  connectedIntegrations: Record<string, boolean>;
  onConnectIntegration: (integrationId: string, apiKey: string) => Promise<void>;
  onDisconnectIntegration: (integrationId: string) => Promise<void>;
}

export function IntegrationsSection({ 
  connectedIntegrations, 
  onConnectIntegration,
  onDisconnectIntegration
}: IntegrationsSectionProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectingIntegration, setConnectingIntegration] = useState(false);

  const handleIntegrationClick = (integration: IntegrationItem) => {
    setSelectedIntegration(integration);
    setApiKey('');
    setShowApiKey(false);
    setConnectDialogOpen(true);
  };

  const handleConnectIntegration = async () => {
    if (!selectedIntegration || !apiKey.trim()) return;
    
    setConnectingIntegration(true);
    try {
      await onConnectIntegration(selectedIntegration.id, apiKey);
      setConnectDialogOpen(false);
      toast({
        title: "Integration connected",
        description: `${selectedIntegration.name} has been successfully connected.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: `Failed to connect ${selectedIntegration.name}. Please check your API key.`,
      });
    } finally {
      setConnectingIntegration(false);
    }
  };

  const handleDisconnectIntegration = async () => {
    if (!selectedIntegration) return;
    
    setConnectingIntegration(true);
    try {
      await onDisconnectIntegration(selectedIntegration.id);
      setConnectDialogOpen(false);
      toast({
        title: "Integration disconnected",
        description: `${selectedIntegration.name} has been disconnected.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Disconnect failed",
        description: `Failed to disconnect ${selectedIntegration.name}.`,
      });
    } finally {
      setConnectingIntegration(false);
    }
  };

  return (
    <>
      <section id="integrations" className="py-12 sm:py-16 md:py-20 bg-[#0a0a12]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 sm:mb-16">
            <Badge className="mb-3 sm:mb-4 bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 text-xs sm:text-sm">
              <Plug className="h-3 w-3 mr-1" />
              Connect Anything
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-white">
              Powerful <span className="text-fuchsia-400 drop-shadow-[0_0_20px_rgba(255,0,255,0.5)]">integrations</span>
            </h2>
            <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto px-2">
              Connect your favorite tools. Payments, analytics, AI, and automation — all pre-wired.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-5xl mx-auto">
            {integrationsList.map((integration) => {
              const IconComponent = integration.icon;
              const isConnected = connectedIntegrations[integration.id];
              return (
                <Card 
                  key={integration.id}
                  onClick={() => handleIntegrationClick(integration)}
                  className={cn(
                    "group relative border bg-[#12121e] overflow-hidden transition-all duration-300 hover:scale-[1.02] sm:hover:scale-105 cursor-pointer",
                    isConnected 
                      ? "border-lime-500/50 shadow-[0_0_15px_rgba(132,204,22,0.2)]" 
                      : "border-white/10 hover:border-fuchsia-500/50 hover:shadow-[0_0_25px_rgba(255,0,255,0.2)]"
                  )}
                >
                  {isConnected && (
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-lime-400 drop-shadow-[0_0_8px_rgba(132,204,22,0.6)]" />
                    </div>
                  )}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300",
                    integration.color
                  )} />
                  <CardContent className="p-3 sm:p-4 md:p-6 text-center relative">
                    <div className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl mx-auto mb-2 sm:mb-4 flex items-center justify-center bg-gradient-to-br shadow-lg",
                      integration.color
                    )}>
                      <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-white text-xs sm:text-sm md:text-base mb-0.5 sm:mb-1">{integration.name}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2 hidden sm:block">{integration.description}</p>
                    <div className="mt-2 sm:mt-3">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] sm:text-xs",
                          isConnected 
                            ? "border-lime-500/50 text-lime-400 bg-lime-500/10" 
                            : "border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/10"
                        )}
                      >
                        {isConnected ? (
                          <>
                            <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            Connected
                          </>
                        ) : (
                          <>
                            <Link className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            Connect
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="text-center mt-8 sm:mt-10">
            <Button 
              variant="ghost"
              onClick={() => navigate("/cloud")}
              className="text-fuchsia-400 border border-fuchsia-500/30 hover:bg-fuchsia-500/20 hover:border-fuchsia-500/50 h-11 sm:h-10"
            >
              View All Integrations
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="bg-[#12121e] border-fuchsia-500/30 text-white max-w-[90vw] sm:max-w-md">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                    selectedIntegration.color
                  )}>
                    <selectedIntegration.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg sm:text-xl">{selectedIntegration.name}</DialogTitle>
                    <DialogDescription className="text-gray-400 text-xs sm:text-sm">
                      {selectedIntegration.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 py-3 sm:py-4">
                {connectedIntegrations[selectedIntegration.id] ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-lime-400 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(132,204,22,0.5)]" />
                    <p className="text-lime-400 font-medium mb-1 text-sm sm:text-base">Integration Connected</p>
                    <p className="text-xs sm:text-sm text-gray-400">
                      {selectedIntegration.name} is connected and ready to use.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="apiKey" className="text-gray-300 text-sm">
                        API Key / Credentials
                      </Label>
                      <div className="relative">
                        <Input
                          id="apiKey"
                          type={showApiKey ? "text" : "password"}
                          placeholder={selectedIntegration.apiKeyPlaceholder}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="bg-[#0a0a12] border-fuchsia-500/30 text-white pr-10 focus:border-fuchsia-500 h-11 sm:h-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      Your API key is encrypted and stored securely. 
                      <a 
                        href={selectedIntegration.docsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-fuchsia-400 hover:text-fuchsia-300 ml-1"
                      >
                        Get your API key →
                      </a>
                    </p>
                  </>
                )}
              </div>

              <DialogFooter className="gap-2 flex-col sm:flex-row">
                {connectedIntegrations[selectedIntegration.id] ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setConnectDialogOpen(false)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800 h-11 sm:h-10"
                    >
                      Close
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDisconnectIntegration}
                      disabled={connectingIntegration}
                      className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 h-11 sm:h-10"
                    >
                      {connectingIntegration ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        'Disconnect'
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setConnectDialogOpen(false)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800 h-11 sm:h-10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConnectIntegration}
                      disabled={connectingIntegration || !apiKey.trim()}
                      className={cn(
                        "bg-fuchsia-500 text-white hover:bg-fuchsia-400 h-11 sm:h-10",
                        "shadow-[0_0_15px_rgba(255,0,255,0.3)] hover:shadow-[0_0_20px_rgba(255,0,255,0.5)]"
                      )}
                    >
                      {connectingIntegration ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plug className="h-4 w-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
