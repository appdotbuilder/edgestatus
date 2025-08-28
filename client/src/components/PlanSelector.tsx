import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import type { PlanType } from '../../../server/src/schema';

interface PlanSelectorProps {
  currentPlan: PlanType;
  organizationName: string;
}

interface PlanDetails {
  name: string;
  price: string;
  description: string;
  features: string[];
  statusPages: string;
  teamMembers: string;
  components: string;
  integrations: string;
  support?: string;
  popular?: boolean;
  badge?: string;
  emoji: string;
}

const plans: Record<PlanType, PlanDetails> = {
  free: {
    name: 'Free Plan',
    price: 'Free',
    description: 'Perfect for getting started',
    emoji: '🚀',
    statusPages: '1',
    teamMembers: '7',
    components: '7',
    integrations: '0',
    features: [
      '1 Status Page',
      '7 Team Members',
      '7 Components',
      'Basic Status Monitoring',
      'Email Notifications',
      'Community Support'
    ]
  },
  pro: {
    name: 'Pro Plan',
    price: '€10.99/month',
    description: 'Great for growing teams',
    emoji: '⭐',
    popular: true,
    badge: 'Most Popular',
    statusPages: '3',
    teamMembers: '35',
    components: '36',
    integrations: 'All',
    features: [
      '3 Status Pages',
      '35 Team Members',
      '36 Components',
      'All Integrations',
      'Advanced Analytics',
      'Custom Branding',
      'API Access',
      'Priority Email Support'
    ]
  },
  plus: {
    name: 'Plus Plan',
    price: '€50.00/month',
    description: 'For established businesses',
    emoji: '🔥',
    statusPages: '12',
    teamMembers: '50',
    components: '60',
    integrations: 'All',
    features: [
      '12 Status Pages',
      '50 Team Members',
      '60 Components',
      'All Integrations',
      'Advanced Analytics',
      'Custom Branding',
      'API Access',
      'Custom Domains',
      'Advanced Incident Management',
      'Phone Support'
    ]
  },
  enterprise: {
    name: 'Enterprise Plan',
    price: 'Custom Pricing',
    description: 'For large organizations like Cloudflare',
    emoji: '🏢',
    badge: 'Enterprise',
    statusPages: '100+',
    teamMembers: 'Unlimited',
    components: 'Unlimited',
    integrations: 'All + Custom',
    support: '30min - 1hr response',
    features: [
      '100+ Status Pages',
      'Unlimited Team Members',
      'Unlimited Components',
      'Custom Integrations',
      'Dedicated Account Manager',
      'SLA Guarantees',
      'Advanced Security',
      'Custom Reporting',
      'White-label Solution',
      '24/7 Phone & Priority Support'
    ]
  }
};

export function PlanSelector({ currentPlan, organizationName }: PlanSelectorProps) {
  const [showModal, setShowModal] = useState(false);

  const currentPlanDetails = plans[currentPlan];

  const getPlanBadgeVariant = (planType: PlanType) => {
    switch (planType) {
      case 'free': return 'outline';
      case 'pro': return 'default';
      case 'plus': return 'secondary';
      case 'enterprise': return 'destructive';
      default: return 'outline';
    }
  };

  const handleUpgrade = (planType: PlanType) => {
    if (planType === 'enterprise') {
      alert('🏢 Thank you for your interest in Enterprise! Our sales team will contact you within 24 hours to discuss custom pricing and implementation.');
    } else {
      alert(`✨ Upgrade to ${plans[planType].name} coming soon! We'll notify you when billing is available.`);
    }
    setShowModal(false);
  };

  if (!showModal) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">{organizationName}</div>
          <div className="flex items-center gap-2">
            <Badge variant={getPlanBadgeVariant(currentPlan)}>
              {currentPlanDetails.emoji} {currentPlanDetails.name}
            </Badge>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Upgrade →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Choose Your EdgeStatus Plan</h2>
              <p className="text-gray-600 mt-1">
                Upgrade your plan to unlock more features and grow your status pages
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              ✕ Close
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(plans).map(([planType, plan]) => (
              <Card 
                key={planType}
                className={`relative ${
                  plan.popular ? 'border-blue-500 shadow-lg scale-105' : ''
                } ${
                  currentPlan === planType ? 'bg-gray-50 border-gray-400' : ''
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge variant={plan.popular ? 'default' : 'secondary'}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="text-4xl mb-2">{plan.emoji}</div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-2xl font-bold text-blue-600">{plan.price}</div>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Key Stats */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Status Pages:</span>
                      <span className="font-medium">{plan.statusPages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Team Members:</span>
                      <span className="font-medium">{plan.teamMembers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Components:</span>
                      <span className="font-medium">{plan.components}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Integrations:</span>
                      <span className="font-medium">{plan.integrations}</span>
                    </div>
                    {plan.support && (
                      <div className="flex justify-between">
                        <span>Support:</span>
                        <span className="font-medium text-xs">{plan.support}</span>
                      </div>
                    )}
                  </div>

                  <hr />

                  {/* Features List */}
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="pt-4">
                    {currentPlan === planType ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleUpgrade(planType as PlanType)}
                        variant={plan.popular ? 'default' : 'outline'}
                      >
                        {planType === 'enterprise' ? 'Contact Sales' : 'Upgrade Now'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Frequently Asked Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Can I upgrade or downgrade anytime?</h4>
                <p className="text-gray-600">Yes, you can change your plan at any time. Changes are prorated and take effect immediately.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">What happens to my data if I downgrade?</h4>
                <p className="text-gray-600">Your data is preserved, but access may be limited based on your new plan's limits.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Do you offer custom Enterprise features?</h4>
                <p className="text-gray-600">Yes! Enterprise customers get custom integrations, dedicated support, and tailored solutions.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Is there a free trial for paid plans?</h4>
                <p className="text-gray-600">We offer a 14-day free trial for Pro and Plus plans. No credit card required!</p>
              </div>
            </div>
          </div>

          {/* Contact for Enterprise */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🏢 Need Enterprise-Level Solutions?
              </h3>
              <p className="text-gray-600 mb-4">
                Join companies like Cloudflare who trust EdgeStatus for mission-critical status communication.
              </p>
              <Button onClick={() => handleUpgrade('enterprise')}>
                📞 Schedule Enterprise Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}