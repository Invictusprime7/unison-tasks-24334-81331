/**
 * Settings Page
 * 
 * Unified settings page with tabs for:
 * - Profile
 * - Security
 * - Notifications
 * - Billing
 * 
 * Note: Team management has been moved to Cloud Dashboard > Teams
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Shield, Bell, CreditCard, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSettings, SecuritySettings, NotificationSettings } from '@/components/settings';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { ProjectBusinessSettings } from '@/components/settings/ProjectBusinessSettings';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'businesses', label: 'Businesses', icon: Building2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
] as const;


type TabId = typeof TABS[number]['id'];

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current tab from URL or default to profile
  const currentTab = (searchParams.get('tab') as TabId) || 'profile';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Header */}
      <div className="border-b border-cyan-500/20 bg-[#0d0d18]">
        <div className="container max-w-5xl py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-white">Settings</h1>
                <p className="text-sm text-gray-400">
                  Manage your account and preferences
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-5xl py-8">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 bg-[#12121e] border border-cyan-500/20">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "flex items-center gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400",
                  "text-gray-400 transition-all duration-200"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="businesses" className="space-y-6">
            <ProjectBusinessSettings />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SecuritySettings />
          </TabsContent>


          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <SubscriptionSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
