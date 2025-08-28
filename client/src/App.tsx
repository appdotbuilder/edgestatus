import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { StatusPageForm } from '@/components/StatusPageForm';
import { ComponentManager } from '@/components/ComponentManager';
import { IncidentManager } from '@/components/IncidentManager';
import { MaintenanceManager } from '@/components/MaintenanceManager';
import { PlanSelector } from '@/components/PlanSelector';
// Using type-only imports for better TypeScript compliance
import type { StatusPage, Component, Incident, MaintenanceWindow, PlanType } from '../../server/src/schema';

function App() {
  // User data - in real app this would come from auth system
  const currentUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'owner' as const
  };

  const currentOrganization = {
    id: 1,
    name: 'EdgeTech Corp',
    plan_type: 'pro' as PlanType
  };

  // State management
  const [statusPages, setStatusPages] = useState<StatusPage[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  const [selectedStatusPage, setSelectedStatusPage] = useState<StatusPage | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'incidents' | 'maintenance' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(false);

  // Load status pages
  const loadStatusPages = useCallback(async () => {
    try {
      const result = await trpc.getStatusPages.query({ organizationId: currentOrganization.id });
      setStatusPages(result);
      if (result.length > 0 && !selectedStatusPage) {
        setSelectedStatusPage(result[0]);
      }
    } catch (error) {
      console.error('Failed to load status pages:', error);
    }
  }, [selectedStatusPage, currentOrganization.id]);

  // Load components for selected status page
  const loadComponents = useCallback(async () => {
    if (!selectedStatusPage) return;
    try {
      const result = await trpc.getComponents.query({ statusPageId: selectedStatusPage.id });
      setComponents(result);
    } catch (error) {
      console.error('Failed to load components:', error);
    }
  }, [selectedStatusPage]);

  // Load incidents for selected status page
  const loadIncidents = useCallback(async () => {
    if (!selectedStatusPage) return;
    try {
      const result = await trpc.getIncidents.query({ statusPageId: selectedStatusPage.id });
      setIncidents(result);
    } catch (error) {
      console.error('Failed to load incidents:', error);
    }
  }, [selectedStatusPage]);

  // Load maintenance windows for selected status page
  const loadMaintenanceWindows = useCallback(async () => {
    if (!selectedStatusPage) return;
    try {
      const result = await trpc.getMaintenanceWindows.query({ statusPageId: selectedStatusPage.id });
      setMaintenanceWindows(result);
    } catch (error) {
      console.error('Failed to load maintenance windows:', error);
    }
  }, [selectedStatusPage]);

  // Load all data when component mounts or status page changes
  useEffect(() => {
    loadStatusPages();
  }, [loadStatusPages]);

  useEffect(() => {
    if (selectedStatusPage) {
      loadComponents();
      loadIncidents();
      loadMaintenanceWindows();
    }
  }, [selectedStatusPage, loadComponents, loadIncidents, loadMaintenanceWindows]);

  // Handle status page creation
  const handleStatusPageCreate = async (statusPage: StatusPage) => {
    setStatusPages((prev: StatusPage[]) => [...prev, statusPage]);
    if (!selectedStatusPage) {
      setSelectedStatusPage(statusPage);
    }
  };

  // Get status badge variant based on component status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'operational': return 'default';
      case 'performance_issues': return 'secondary';
      case 'partial_outage': return 'destructive';
      case 'major_outage': return 'destructive';
      case 'under_maintenance': return 'outline';
      default: return 'outline';
    }
  };

  // Get status color for visual indicators
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-500';
      case 'performance_issues': return 'bg-yellow-500';
      case 'partial_outage': return 'bg-orange-500';
      case 'major_outage': return 'bg-red-500';
      case 'under_maintenance': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Format status text
  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">E</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  EdgeStatus
                </h1>
              </div>
              {selectedStatusPage && (
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                  <span>/</span>
                  <span>{selectedStatusPage.name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <PlanSelector 
                currentPlan={currentOrganization.plan_type}
                organizationName={currentOrganization.name}
              />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">
                    {currentUser.name.charAt(0)}
                  </span>
                </div>
                <div className="hidden md:block text-sm">
                  <div className="font-medium text-gray-900">{currentUser.name}</div>
                  <div className="text-gray-600">{currentUser.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Status Page Selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📊 Status Pages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {statusPages.map((page: StatusPage) => (
                      <button
                        key={page.id}
                        onClick={() => setSelectedStatusPage(page)}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          selectedStatusPage?.id === page.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{page.name}</div>
                        <div className="text-sm text-gray-600">{page.slug}</div>
                        {page.is_public && (
                          <Badge variant="outline" className="mt-1">
                            Public
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                  <StatusPageForm
                    organizationId={currentOrganization.id}
                    onSuccess={handleStatusPageCreate}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                  />
                </CardContent>
              </Card>

              {/* Navigation */}
              <Card>
                <CardContent className="p-3">
                  <nav className="space-y-1">
                    {[
                      { id: 'overview', label: '🏠 Overview', icon: '🏠' },
                      { id: 'components', label: '🔧 Components', icon: '🔧' },
                      { id: 'incidents', label: '🚨 Incidents', icon: '🚨' },
                      { id: 'maintenance', label: '⚙️ Maintenance', icon: '⚙️' },
                      { id: 'settings', label: '⚙️ Settings', icon: '⚙️' }
                    ].map((item: { id: string; label: string; icon: string }) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as 'overview' | 'components' | 'incidents' | 'maintenance' | 'settings')}
                        className={`w-full p-2 rounded-md text-left transition-all ${
                          activeTab === item.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {!selectedStatusPage ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-6xl mb-4">🚀</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome to EdgeStatus!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Create your first status page to get started with monitoring your services.
                  </p>
                  <StatusPageForm
                    organizationId={currentOrganization.id}
                    onSuccess={handleStatusPageCreate}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <>
                    {/* Overall Status */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          📊 Overall System Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className={`w-4 h-4 rounded-full ${
                            incidents.some((i: Incident) => i.status !== 'resolved') 
                              ? 'bg-red-500'
                              : components.some((c: Component) => c.status !== 'operational')
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}></div>
                          <div>
                            <div className="font-semibold text-lg">
                              {incidents.some((i: Incident) => i.status !== 'resolved') 
                                ? '🔴 System Issues Detected'
                                : components.some((c: Component) => c.status !== 'operational')
                                ? '🟡 Some Systems Degraded'
                                : '🟢 All Systems Operational'
                              }
                            </div>
                            <div className="text-sm text-gray-600">
                              Last updated: {new Date().toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Components Status Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle>🔧 Components Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {components.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">
                            No components configured yet
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {components.slice(0, 5).map((component: Component) => (
                              <div key={component.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${getStatusColor(component.status)}`}></div>
                                  <span className="font-medium">{component.name}</span>
                                </div>
                                <Badge variant={getStatusBadgeVariant(component.status)}>
                                  {formatStatus(component.status)}
                                </Badge>
                              </div>
                            ))}
                            {components.length > 5 && (
                              <button 
                                onClick={() => setActiveTab('components')}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                View all {components.length} components →
                              </button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Recent Incidents */}
                    <Card>
                      <CardHeader>
                        <CardTitle>🚨 Recent Incidents</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {incidents.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">
                            🎉 No incidents reported
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {incidents.slice(0, 3).map((incident: Incident) => (
                              <div key={incident.id} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium">{incident.title}</h4>
                                  <Badge variant={incident.status === 'resolved' ? 'default' : 'destructive'}>
                                    {formatStatus(incident.status)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                                <div className="text-xs text-gray-500">
                                  {incident.created_at.toLocaleDateString()} at{' '}
                                  {incident.created_at.toLocaleTimeString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Components Tab */}
                {activeTab === 'components' && (
                  <ComponentManager
                    statusPageId={selectedStatusPage.id}
                    components={components}
                    onComponentsChange={setComponents}
                  />
                )}

                {/* Incidents Tab */}
                {activeTab === 'incidents' && (
                  <IncidentManager
                    statusPageId={selectedStatusPage.id}
                    incidents={incidents}
                    components={components}
                    userId={currentUser.id}
                    onIncidentsChange={setIncidents}
                  />
                )}

                {/* Maintenance Tab */}
                {activeTab === 'maintenance' && (
                  <MaintenanceManager
                    statusPageId={selectedStatusPage.id}
                    maintenanceWindows={maintenanceWindows}
                    components={components}
                    userId={currentUser.id}
                    onMaintenanceChange={setMaintenanceWindows}
                  />
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>⚙️ Status Page Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Page Name</label>
                          <p className="text-gray-700">{selectedStatusPage.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Slug</label>
                          <p className="text-gray-700">{selectedStatusPage.slug}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <p className="text-gray-700">{selectedStatusPage.description || 'No description'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Visibility</label>
                          <Badge variant={selectedStatusPage.is_public ? 'default' : 'outline'}>
                            {selectedStatusPage.is_public ? 'Public' : 'Private'}
                          </Badge>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Created</label>
                          <p className="text-gray-700">{selectedStatusPage.created_at.toLocaleDateString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;