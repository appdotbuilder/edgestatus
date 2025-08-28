import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
import type { StatusPage, CreateStatusPageInput } from '../../../server/src/schema';

interface StatusPageFormProps {
  organizationId: number;
  onSuccess: (statusPage: StatusPage) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function StatusPageForm({ organizationId, onSuccess, isLoading, setIsLoading }: StatusPageFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateStatusPageInput>({
    organization_id: organizationId,
    name: '',
    slug: '',
    description: null,
    custom_domain: null,
    branding_logo_url: null,
    branding_primary_color: null,
    branding_secondary_color: null,
    is_public: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Auto-generate slug from name if not provided
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const statusPage = await trpc.createStatusPage.mutate({
        ...formData,
        slug,
        organization_id: organizationId
      });
      
      onSuccess(statusPage);
      
      // Reset form
      setFormData({
        organization_id: organizationId,
        name: '',
        slug: '',
        description: null,
        custom_domain: null,
        branding_logo_url: null,
        branding_primary_color: null,
        branding_secondary_color: null,
        is_public: true
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create status page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        className="w-full mt-4"
        disabled={isLoading}
      >
        ➕ New Status Page
      </Button>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Create Status Page</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Page Name *
            </label>
            <Input
              id="name"
              placeholder="My Service Status"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateStatusPageInput) => ({ 
                  ...prev, 
                  name: e.target.value,
                  // Auto-generate slug as user types
                  slug: prev.slug === '' ? e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : prev.slug
                }))
              }
              required
            />
          </div>
          
          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-1">
              URL Slug *
            </label>
            <Input
              id="slug"
              placeholder="my-service-status"
              value={formData.slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateStatusPageInput) => ({ 
                  ...prev, 
                  slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                }))
              }
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be your status page URL: /status/{formData.slug}
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <Input
              id="description"
              placeholder="Status page for our services"
              value={formData.description || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateStatusPageInput) => ({ 
                  ...prev, 
                  description: e.target.value || null 
                }))
              }
            />
          </div>

          <div>
            <label htmlFor="custom_domain" className="block text-sm font-medium mb-1">
              Custom Domain
            </label>
            <Input
              id="custom_domain"
              placeholder="status.mycompany.com"
              value={formData.custom_domain || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateStatusPageInput) => ({ 
                  ...prev, 
                  custom_domain: e.target.value || null 
                }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="primary_color" className="block text-sm font-medium mb-1">
                Primary Color
              </label>
              <Input
                id="primary_color"
                type="color"
                value={formData.branding_primary_color || '#3b82f6'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateStatusPageInput) => ({ 
                    ...prev, 
                    branding_primary_color: e.target.value 
                  }))
                }
              />
            </div>
            
            <div>
              <label htmlFor="secondary_color" className="block text-sm font-medium mb-1">
                Secondary Color
              </label>
              <Input
                id="secondary_color"
                type="color"
                value={formData.branding_secondary_color || '#64748b'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateStatusPageInput) => ({ 
                    ...prev, 
                    branding_secondary_color: e.target.value 
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateStatusPageInput) => ({ 
                  ...prev, 
                  is_public: e.target.checked 
                }))
              }
              className="rounded"
            />
            <label htmlFor="is_public" className="text-sm font-medium">
              Make this status page public
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Creating...' : '🚀 Create Status Page'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowForm(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}