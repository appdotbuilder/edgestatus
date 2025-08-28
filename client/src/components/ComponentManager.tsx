import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
import type { Component, CreateComponentInput, UpdateComponentInput, ComponentStatus } from '../../../server/src/schema';

interface ComponentManagerProps {
  statusPageId: number;
  components: Component[];
  onComponentsChange: (components: Component[]) => void;
}

export function ComponentManager({ statusPageId, components, onComponentsChange }: ComponentManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateComponentInput>({
    status_page_id: statusPageId,
    name: '',
    description: null,
    status: 'operational',
    position: 0
  });

  const statusOptions: { value: ComponentStatus; label: string; color: string }[] = [
    { value: 'operational', label: '🟢 Operational', color: 'bg-green-500' },
    { value: 'performance_issues', label: '🟡 Performance Issues', color: 'bg-yellow-500' },
    { value: 'partial_outage', label: '🟠 Partial Outage', color: 'bg-orange-500' },
    { value: 'major_outage', label: '🔴 Major Outage', color: 'bg-red-500' },
    { value: 'under_maintenance', label: '🔵 Under Maintenance', color: 'bg-blue-500' }
  ];

  const resetForm = () => {
    setFormData({
      status_page_id: statusPageId,
      name: '',
      description: null,
      status: 'operational',
      position: components.length
    });
    setEditingComponent(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingComponent) {
        // Update existing component
        const updateData: UpdateComponentInput = {
          id: editingComponent.id,
          name: formData.name,
          description: formData.description,
          status: formData.status,
          position: formData.position
        };
        
        const updatedComponent = await trpc.updateComponent.mutate(updateData);
        onComponentsChange(components.map((c: Component) => 
          c.id === editingComponent.id ? updatedComponent : c
        ));
      } else {
        // Create new component
        const newComponent = await trpc.createComponent.mutate(formData);
        onComponentsChange([...components, newComponent]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Failed to save component:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (component: Component) => {
    setFormData({
      status_page_id: statusPageId,
      name: component.name,
      description: component.description,
      status: component.status,
      position: component.position
    });
    setEditingComponent(component);
    setShowForm(true);
  };

  const handleDelete = async (componentId: number) => {
    if (!confirm('Are you sure you want to delete this component?')) return;
    
    setIsLoading(true);
    try {
      await trpc.deleteComponent.mutate({ id: componentId });
      onComponentsChange(components.filter((c: Component) => c.id !== componentId));
    } catch (error) {
      console.error('Failed to delete component:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: ComponentStatus) => {
    switch (status) {
      case 'operational': return 'default';
      case 'performance_issues': return 'secondary';
      case 'partial_outage': return 'destructive';
      case 'major_outage': return 'destructive';
      case 'under_maintenance': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: ComponentStatus) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || 'bg-gray-500';
  };

  const formatStatus = (status: ComponentStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🔧 Components</h2>
        <Button onClick={() => setShowForm(true)} disabled={isLoading}>
          ➕ Add Component
        </Button>
      </div>

      {/* Component Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingComponent ? 'Edit Component' : 'Add New Component'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="component-name" className="block text-sm font-medium mb-1">
                  Component Name *
                </label>
                <Input
                  id="component-name"
                  placeholder="API Server"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateComponentInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="component-description" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Input
                  id="component-description"
                  placeholder="Main API server handling user requests"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateComponentInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                />
              </div>

              <div>
                <label htmlFor="component-status" className="block text-sm font-medium mb-1">
                  Status *
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value: ComponentStatus) =>
                    setFormData((prev: CreateComponentInput) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status">
                      {formData.status ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(formData.status)}`}></div>
                          {statusOptions.find(opt => opt.value === formData.status)?.label || '🟢 Operational'}
                        </div>
                      ) : (
                        '🟢 Operational'
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

              <div>
                <label htmlFor="component-position" className="block text-sm font-medium mb-1">
                  Display Order
                </label>
                <Input
                  id="component-position"
                  type="number"
                  min="0"
                  value={formData.position}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateComponentInput) => ({ 
                      ...prev, 
                      position: parseInt(e.target.value) || 0 
                    }))
                  }
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Saving...' : editingComponent ? '💾 Update Component' : '🚀 Add Component'}
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

      {/* Components List */}
      <div className="space-y-4">
        {components.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">🔧</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No components yet</h3>
              <p className="text-gray-600 mb-6">
                Start by adding components that you want to monitor and display on your status page.
              </p>
              <Button onClick={() => setShowForm(true)}>
                ➕ Add Your First Component
              </Button>
            </CardContent>
          </Card>
        ) : (
          components
            .sort((a: Component, b: Component) => a.position - b.position)
            .map((component: Component) => (
            <Card key={component.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(component.status)}`}></div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{component.name}</h3>
                      {component.description && (
                        <p className="text-gray-600 text-sm mt-1">{component.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant={getStatusBadgeVariant(component.status)}>
                          {formatStatus(component.status)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Position: {component.position}
                        </span>
                        <span className="text-xs text-gray-500">
                          Updated: {component.updated_at.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(component)}
                      disabled={isLoading}
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(component.id)}
                      disabled={isLoading}
                    >
                      🗑️ Delete
                    </Button>
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