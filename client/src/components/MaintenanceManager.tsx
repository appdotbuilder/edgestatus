import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
import type { 
  MaintenanceWindow, 
  Component, 
  CreateMaintenanceWindowInput, 
  UpdateMaintenanceWindowInput,
  MaintenanceStatus
} from '../../../server/src/schema';

interface MaintenanceManagerProps {
  statusPageId: number;
  maintenanceWindows: MaintenanceWindow[];
  components: Component[];
  userId: number;
  onMaintenanceChange: (windows: MaintenanceWindow[]) => void;
}

export function MaintenanceManager({ 
  statusPageId, 
  maintenanceWindows, 
  components, 
  userId, 
  onMaintenanceChange 
}: MaintenanceManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceWindow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<CreateMaintenanceWindowInput>({
    status_page_id: statusPageId,
    title: '',
    description: '',
    scheduled_start: new Date(),
    scheduled_end: new Date(),
    created_by: userId,
    affected_component_ids: []
  });

  const statusOptions: { value: MaintenanceStatus; label: string; color: string }[] = [
    { value: 'scheduled', label: '📅 Scheduled', color: 'bg-blue-500' },
    { value: 'in_progress', label: '🔧 In Progress', color: 'bg-orange-500' },
    { value: 'completed', label: '✅ Completed', color: 'bg-green-500' },
    { value: 'cancelled', label: '❌ Cancelled', color: 'bg-red-500' }
  ];

  const resetForm = () => {
    const now = new Date();
    const later = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
    
    setFormData({
      status_page_id: statusPageId,
      title: '',
      description: '',
      scheduled_start: now,
      scheduled_end: later,
      created_by: userId,
      affected_component_ids: []
    });
    setEditingMaintenance(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingMaintenance) {
        // Update existing maintenance window
        const updateData: UpdateMaintenanceWindowInput = {
          id: editingMaintenance.id,
          title: formData.title,
          description: formData.description,
          scheduled_start: formData.scheduled_start,
          scheduled_end: formData.scheduled_end
        };
        
        const updatedMaintenance = await trpc.updateMaintenanceWindow.mutate(updateData);
        onMaintenanceChange(maintenanceWindows.map((m: MaintenanceWindow) => 
          m.id === editingMaintenance.id ? updatedMaintenance : m
        ));
      } else {
        // Create new maintenance window
        const newMaintenance = await trpc.createMaintenanceWindow.mutate(formData);
        onMaintenanceChange([...maintenanceWindows, newMaintenance]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Failed to save maintenance window:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (maintenance: MaintenanceWindow) => {
    setFormData({
      status_page_id: statusPageId,
      title: maintenance.title,
      description: maintenance.description,
      scheduled_start: maintenance.scheduled_start,
      scheduled_end: maintenance.scheduled_end,
      created_by: userId,
      affected_component_ids: [] // We'd need to fetch this from the backend
    });
    setEditingMaintenance(maintenance);
    setShowForm(true);
  };

  const handleStatusUpdate = async (maintenanceId: number, newStatus: MaintenanceStatus) => {
    setIsLoading(true);
    try {
      const now = new Date();
      const updateData: UpdateMaintenanceWindowInput = {
        id: maintenanceId,
        status: newStatus,
        ...(newStatus === 'in_progress' && { actual_start: now }),
        ...(newStatus === 'completed' && { actual_end: now })
      };
      
      const updatedMaintenance = await trpc.updateMaintenanceWindow.mutate(updateData);
      onMaintenanceChange(maintenanceWindows.map((m: MaintenanceWindow) => 
        m.id === maintenanceId ? updatedMaintenance : m
      ));
    } catch (error) {
      console.error('Failed to update maintenance status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComponentToggle = (componentId: number) => {
    setFormData((prev: CreateMaintenanceWindowInput) => ({
      ...prev,
      affected_component_ids: prev.affected_component_ids.includes(componentId)
        ? prev.affected_component_ids.filter(id => id !== componentId)
        : [...prev.affected_component_ids, componentId]
    }));
  };

  const getStatusBadgeVariant = (status: MaintenanceStatus) => {
    switch (status) {
      case 'scheduled': return 'outline';
      case 'in_progress': return 'secondary';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: MaintenanceStatus) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || 'bg-gray-500';
  };

  const formatStatus = (status: MaintenanceStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTimeInput = (date: Date) => {
    return date.toISOString().slice(0, 16);
  };

  const parseDateTime = (dateString: string) => {
    return new Date(dateString);
  };

  const isUpcoming = (maintenance: MaintenanceWindow) => {
    return maintenance.status === 'scheduled' && maintenance.scheduled_start > new Date();
  };

  const isActive = (maintenance: MaintenanceWindow) => {
    const now = new Date();
    return maintenance.status === 'in_progress' || 
           (maintenance.status === 'scheduled' && 
            maintenance.scheduled_start <= now && 
            maintenance.scheduled_end > now);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">⚙️ Maintenance Windows</h2>
        <Button onClick={() => setShowForm(true)} disabled={isLoading}>
          ➕ Schedule Maintenance
        </Button>
      </div>

      {/* Maintenance Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingMaintenance ? 'Edit Maintenance Window' : '⚙️ Schedule New Maintenance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="maintenance-title" className="block text-sm font-medium mb-1">
                  Maintenance Title *
                </label>
                <Input
                  id="maintenance-title"
                  placeholder="Database Migration and Server Updates"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateMaintenanceWindowInput) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="maintenance-description" className="block text-sm font-medium mb-1">
                  Description *
                </label>
                <textarea
                  id="maintenance-description"
                  placeholder="We will be performing scheduled maintenance to upgrade our database infrastructure and apply security updates..."
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateMaintenanceWindowInput) => ({ ...prev, description: e.target.value }))
                  }
                  required
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="scheduled-start" className="block text-sm font-medium mb-1">
                    Scheduled Start *
                  </label>
                  <Input
                    id="scheduled-start"
                    type="datetime-local"
                    value={formatDateTimeInput(formData.scheduled_start)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateMaintenanceWindowInput) => ({ 
                        ...prev, 
                        scheduled_start: parseDateTime(e.target.value)
                      }))
                    }
                    required
                  />
                </div>

                <div>
                  <label htmlFor="scheduled-end" className="block text-sm font-medium mb-1">
                    Scheduled End *
                  </label>
                  <Input
                    id="scheduled-end"
                    type="datetime-local"
                    value={formatDateTimeInput(formData.scheduled_end)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateMaintenanceWindowInput) => ({ 
                        ...prev, 
                        scheduled_end: parseDateTime(e.target.value)
                      }))
                    }
                    required
                  />
                </div>
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
                  {isLoading ? 'Saving...' : editingMaintenance ? '💾 Update Maintenance' : '📅 Schedule Maintenance'}
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

      {/* Maintenance Windows List */}
      <div className="space-y-4">
        {maintenanceWindows.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No maintenance scheduled</h3>
              <p className="text-gray-600 mb-6">
                Schedule maintenance windows to keep your users informed about planned downtime.
              </p>
              <Button onClick={() => setShowForm(true)}>
                📅 Schedule First Maintenance
              </Button>
            </CardContent>
          </Card>
        ) : (
          maintenanceWindows
            .sort((a: MaintenanceWindow, b: MaintenanceWindow) => 
              new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime()
            )
            .map((maintenance: MaintenanceWindow) => (
            <Card key={maintenance.id} className={`${
              isActive(maintenance) ? 'border-orange-300 bg-orange-50' : 
              isUpcoming(maintenance) ? 'border-blue-300 bg-blue-50' : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-4 h-4 rounded-full ${getStatusColor(maintenance.status)}`}></div>
                      <h3 className="font-semibold text-lg">{maintenance.title}</h3>
                      <Badge variant={getStatusBadgeVariant(maintenance.status)}>
                        {formatStatus(maintenance.status)}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">{maintenance.description}</p>
                    
                    <div className="space-y-1 text-sm text-gray-500">
                      <div>
                        📅 Scheduled: {formatDateTime(maintenance.scheduled_start)} - {formatDateTime(maintenance.scheduled_end)}
                      </div>
                      {maintenance.actual_start && (
                        <div>
                          🔧 Started: {formatDateTime(maintenance.actual_start)}
                        </div>
                      )}
                      {maintenance.actual_end && (
                        <div>
                          ✅ Completed: {formatDateTime(maintenance.actual_end)}
                        </div>
                      )}
                      <div>
                        Created: {formatDateTime(maintenance.created_at)}
                      </div>
                    </div>

                    {isActive(maintenance) && (
                      <div className="mt-3 p-2 bg-orange-100 border border-orange-200 rounded-md">
                        <span className="text-orange-800 text-sm font-medium">
                          🔧 Maintenance is currently active
                        </span>
                      </div>
                    )}

                    {isUpcoming(maintenance) && (
                      <div className="mt-3 p-2 bg-blue-100 border border-blue-200 rounded-md">
                        <span className="text-blue-800 text-sm font-medium">
                          📅 Upcoming maintenance
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {maintenance.status === 'scheduled' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(maintenance.id, 'in_progress')}
                          disabled={isLoading}
                        >
                          🔧 Start
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(maintenance)}
                          disabled={isLoading}
                        >
                          ✏️ Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusUpdate(maintenance.id, 'cancelled')}
                          disabled={isLoading}
                        >
                          ❌ Cancel
                        </Button>
                      </>
                    )}
                    
                    {maintenance.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStatusUpdate(maintenance.id, 'completed')}
                        disabled={isLoading}
                      >
                        ✅ Complete
                      </Button>
                    )}
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