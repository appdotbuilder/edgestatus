import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import { useState, useCallback } from 'react';
import type { 
  Incident, 
  Component, 
  CreateIncidentInput, 
  IncidentStatus,
  IncidentUpdate,
  CreateIncidentUpdateInput
} from '../../../server/src/schema';

interface IncidentManagerProps {
  statusPageId: number;
  incidents: Incident[];
  components: Component[];
  userId: number;
  onIncidentsChange: (incidents: Incident[]) => void;
}

export function IncidentManager({ statusPageId, incidents, components, userId, onIncidentsChange }: IncidentManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentUpdates, setIncidentUpdates] = useState<IncidentUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const [formData, setFormData] = useState<CreateIncidentInput>({
    status_page_id: statusPageId,
    title: '',
    description: '',
    status: 'investigating',
    created_by: userId,
    affected_component_ids: []
  });

  const [updateFormData, setUpdateFormData] = useState<CreateIncidentUpdateInput>({
    incident_id: 0,
    title: '',
    description: '',
    status: 'investigating',
    created_by: userId
  });

  const statusOptions: { value: IncidentStatus; label: string; color: string }[] = [
    { value: 'investigating', label: '🔍 Investigating', color: 'bg-orange-500' },
    { value: 'identified', label: '🎯 Identified', color: 'bg-yellow-500' },
    { value: 'monitoring', label: '👀 Monitoring', color: 'bg-blue-500' },
    { value: 'resolved', label: '✅ Resolved', color: 'bg-green-500' }
  ];

  const resetForm = () => {
    setFormData({
      status_page_id: statusPageId,
      title: '',
      description: '',
      status: 'investigating',
      created_by: userId,
      affected_component_ids: []
    });
    setShowForm(false);
  };

  const resetUpdateForm = () => {
    setUpdateFormData({
      incident_id: 0,
      title: '',
      description: '',
      status: 'investigating',
      created_by: userId
    });
    setShowUpdateForm(false);
  };

  const loadIncidentUpdates = useCallback(async (incidentId: number) => {
    try {
      const updates = await trpc.getIncidentUpdates.query({ incidentId });
      setIncidentUpdates(updates);
    } catch (error) {
      console.error('Failed to load incident updates:', error);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newIncident = await trpc.createIncident.mutate(formData);
      onIncidentsChange([...incidents, newIncident]);
      resetForm();
    } catch (error) {
      console.error('Failed to create incident:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await trpc.createIncidentUpdate.mutate(updateFormData);
      
      // Also update the incident status if it has changed
      if (selectedIncident && updateFormData.status !== selectedIncident.status) {
        const updatedIncident = await trpc.updateIncident.mutate({
          id: selectedIncident.id,
          status: updateFormData.status
        });
        
        onIncidentsChange(incidents.map((i: Incident) => 
          i.id === selectedIncident.id ? updatedIncident : i
        ));
        setSelectedIncident(updatedIncident);
      }
      
      // Reload updates
      if (selectedIncident) {
        await loadIncidentUpdates(selectedIncident.id);
      }
      
      resetUpdateForm();
    } catch (error) {
      console.error('Failed to create incident update:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewIncident = async (incident: Incident) => {
    setSelectedIncident(incident);
    await loadIncidentUpdates(incident.id);
  };

  const handleComponentToggle = (componentId: number) => {
    setFormData((prev: CreateIncidentInput) => ({
      ...prev,
      affected_component_ids: prev.affected_component_ids.includes(componentId)
        ? prev.affected_component_ids.filter(id => id !== componentId)
        : [...prev.affected_component_ids, componentId]
    }));
  };

  const getStatusBadgeVariant = (status: IncidentStatus) => {
    switch (status) {
      case 'investigating': return 'destructive';
      case 'identified': return 'secondary';
      case 'monitoring': return 'outline';
      case 'resolved': return 'default';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: IncidentStatus) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || 'bg-gray-500';
  };

  const formatStatus = (status: IncidentStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (selectedIncident) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedIncident(null);
              setIncidentUpdates([]);
            }}
          >
            ← Back to Incidents
          </Button>
          <Button
            onClick={() => {
              setUpdateFormData(prev => ({
                ...prev,
                incident_id: selectedIncident.id,
                status: selectedIncident.status
              }));
              setShowUpdateForm(true);
            }}
            disabled={selectedIncident.status === 'resolved'}
          >
            ➕ Post Update
          </Button>
        </div>

        {/* Incident Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${getStatusColor(selectedIncident.status)}`}></div>
                {selectedIncident.title}
              </CardTitle>
              <Badge variant={getStatusBadgeVariant(selectedIncident.status)}>
                {formatStatus(selectedIncident.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{selectedIncident.description}</p>
            <div className="text-sm text-gray-500">
              Created: {selectedIncident.created_at.toLocaleDateString()} at{' '}
              {selectedIncident.created_at.toLocaleTimeString()}
              {selectedIncident.resolved_at && (
                <>
                  <br />
                  Resolved: {selectedIncident.resolved_at.toLocaleDateString()} at{' '}
                  {selectedIncident.resolved_at.toLocaleTimeString()}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Update Form */}
        {showUpdateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Post Incident Update</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div>
                  <label htmlFor="update-title" className="block text-sm font-medium mb-1">
                    Update Title *
                  </label>
                  <Input
                    id="update-title"
                    placeholder="Issue identified and fix in progress"
                    value={updateFormData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateFormData((prev: CreateIncidentUpdateInput) => ({ 
                        ...prev, 
                        title: e.target.value 
                      }))
                    }
                    required
                  />
                </div>

                <div>
                  <label htmlFor="update-description" className="block text-sm font-medium mb-1">
                    Update Description *
                  </label>
                  <textarea
                    id="update-description"
                    placeholder="We have identified the root cause and are implementing a fix..."
                    value={updateFormData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setUpdateFormData((prev: CreateIncidentUpdateInput) => ({ 
                        ...prev, 
                        description: e.target.value 
                      }))
                    }
                    required
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="update-status" className="block text-sm font-medium mb-1">
                    New Status *
                  </label>
                  <Select
                    value={updateFormData.status}
                    onValueChange={(value: IncidentStatus) =>
                      setUpdateFormData((prev: CreateIncidentUpdateInput) => ({ 
                        ...prev, 
                        status: value 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Posting...' : '📢 Post Update'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetUpdateForm}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Incident Updates */}
        <Card>
          <CardHeader>
            <CardTitle>📢 Incident Updates</CardTitle>
          </CardHeader>
          <CardContent>
            {incidentUpdates.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No updates posted yet
              </p>
            ) : (
              <div className="space-y-4">
                {incidentUpdates
                  .sort((a: IncidentUpdate, b: IncidentUpdate) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
                  .map((update: IncidentUpdate) => (
                    <div key={update.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{update.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(update.status)}>
                            {formatStatus(update.status)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {update.created_at.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700">{update.description}</p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🚨 Incidents</h2>
        <Button onClick={() => setShowForm(true)} disabled={isLoading}>
          ➕ Report Incident
        </Button>
      </div>

      {/* Incident Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>🚨 Report New Incident</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="incident-title" className="block text-sm font-medium mb-1">
                  Incident Title *
                </label>
                <Input
                  id="incident-title"
                  placeholder="API Service Experiencing High Latency"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateIncidentInput) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="incident-description" className="block text-sm font-medium mb-1">
                  Description *
                </label>
                <textarea
                  id="incident-description"
                  placeholder="We are currently investigating reports of increased response times affecting our API service..."
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateIncidentInput) => ({ ...prev, description: e.target.value }))
                  }
                  required
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="incident-status" className="block text-sm font-medium mb-1">
                  Initial Status *
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value: IncidentStatus) =>
                    setFormData((prev: CreateIncidentInput) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select initial status">
                      {formData.status ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(formData.status)}`}></div>
                          {statusOptions.find(opt => opt.value === formData.status)?.label || '🔍 Investigating'}
                        </div>
                      ) : (
                        '🔍 Investigating'
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {components.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Affected Components
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {components.map((component: Component) => (
                      <label key={component.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.affected_component_ids.includes(component.id)}
                          onChange={() => handleComponentToggle(component.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{component.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Creating...' : '🚨 Report Incident'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No incidents reported</h3>
              <p className="text-gray-600 mb-6">
                Your services are running smoothly! If any issues arise, you can report them here.
              </p>
              <Button onClick={() => setShowForm(true)}>
                🚨 Report First Incident
              </Button>
            </CardContent>
          </Card>
        ) : (
          incidents
            .sort((a: Incident, b: Incident) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            .map((incident: Incident) => (
            <Card key={incident.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6" onClick={() => handleViewIncident(incident)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(incident.status)}`}></div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{incident.title}</h3>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">{incident.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant={getStatusBadgeVariant(incident.status)}>
                          {formatStatus(incident.status)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Created: {incident.created_at.toLocaleDateString()}
                        </span>
                        {incident.resolved_at && (
                          <span className="text-xs text-gray-500">
                            Resolved: {incident.resolved_at.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    →
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}