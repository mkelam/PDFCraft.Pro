/**
 * Subscription Manager Component - PDFCraft.Pro
 * Comprehensive subscription management for OCR Overlay system
 * Handles plan selection, billing, and feature access
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle, Star, Zap, Shield, Crown, ExternalLink,
  Calendar, CreditCard, AlertTriangle, Sparkles, Brain,
  TrendingUp, Users, Clock, ArrowRight
} from 'lucide-react';
import { StripeAPI, SubscriptionPlan, SubscriptionDetails, UserFeatures } from '@/lib/stripe-api';

interface SubscriptionManagerProps {
  userId?: string;
  showPlansOnly?: boolean;
  onSubscriptionChange?: (planId: string) => void;
}

export default function SubscriptionManager({
  userId,
  showPlansOnly = false,
  onSubscriptionChange
}: SubscriptionManagerProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [userFeatures, setUserFeatures] = useState<UserFeatures | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'current' | 'billing'>('plans');

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load plans (always available)
      const plansData = await StripeAPI.getPlans();
      setPlans(plansData);

      if (!showPlansOnly && userId) {
        // Load user-specific data
        const [subscriptionData, featuresData] = await Promise.all([
          StripeAPI.getSubscriptionDetails(),
          StripeAPI.getUserFeatures()
        ]);

        setSubscriptionDetails(subscriptionData);
        setUserFeatures(featuresData);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelection = async (planId: string) => {
    if (planId === 'free') return;

    setIsProcessing(true);
    setError(null);

    try {
      const successUrl = `${window.location.origin}/dashboard?payment=success`;
      const cancelUrl = `${window.location.origin}/pricing?payment=canceled`;

      await StripeAPI.redirectToCheckout(planId, successUrl, cancelUrl);
    } catch (error) {
      console.error('Checkout failed:', error);
      setError(error instanceof Error ? error.message : 'Checkout failed');
      setIsProcessing(false);
    }
  };

  const handleBillingPortal = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const returnUrl = `${window.location.origin}/dashboard`;
      await StripeAPI.openBillingPortal(returnUrl);
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      setError(error instanceof Error ? error.message : 'Failed to open billing portal');
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to OCR Overlay features.')) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await StripeAPI.cancelSubscription();
      if (result.success) {
        await loadSubscriptionData();
        onSubscriptionChange?.('free');
      } else {
        setError(result.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancellation failed:', error);
      setError(error instanceof Error ? error.message : 'Cancellation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free': return <Zap className="h-5 w-5" />;
      case 'starter': return <Shield className="h-5 w-5" />;
      case 'pro': return <Star className="h-5 w-5" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'starter': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pro': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan, isCurrent: boolean = false) => (
    <Card key={plan.id} className={`relative ${isCurrent ? 'ring-2 ring-blue-500 border-blue-200' : ''}`}>
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-600 text-white">Current Plan</Badge>
        </div>
      )}

      {plan.id === 'starter' && !isCurrent && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-600 text-white">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getPlanColor(plan.id)}`}>
          {getPlanIcon(plan.id)}
          <span className="font-semibold">{plan.name}</span>
        </div>

        <div className="mt-4">
          <span className="text-3xl font-bold">{plan.formattedPrice}</span>
          {plan.price > 0 && <span className="text-gray-600">/{plan.interval}</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* OCR Overlay Access */}
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <Brain className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-medium text-sm">OCR Overlay Technology</p>
            <p className="text-xs text-gray-600">
              {plan.features.ocrOverlayAccess ? 'Full Access' : 'Not Available'}
            </p>
          </div>
          {plan.features.ocrOverlayAccess && (
            <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
          )}
        </div>

        {/* Feature List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Monthly Conversions</span>
            <span className="font-medium">
              {plan.features.conversionsPerMonth === -1 ? 'Unlimited' : plan.features.conversionsPerMonth}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Max File Size</span>
            <span className="font-medium">
              {Math.round(plan.features.maxFileSize / (1024 * 1024))}MB
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Advanced Features</span>
            {plan.features.advancedFeatures ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Priority Processing</span>
            {plan.features.priorityProcessing ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">API Access</span>
            {plan.features.apiAccess ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          {isCurrent ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleBillingPortal}
              disabled={isProcessing}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          ) : (
            <Button
              className={`w-full ${
                plan.id === 'starter'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  : plan.id === 'pro'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                  : ''
              }`}
              onClick={() => handlePlanSelection(plan.id)}
              disabled={isProcessing || plan.id === 'free'}
            >
              {plan.id === 'free' ? (
                'Current Plan'
              ) : (
                <>
                  {isProcessing ? 'Processing...' : 'Choose Plan'}
                  {!isProcessing && <ArrowRight className="h-4 w-4 ml-2" />}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderCurrentSubscription = () => {
    if (!subscriptionDetails || !userFeatures) return null;

    const usagePercentage = StripeAPI.getUsagePercentage(userFeatures);
    const remaining = StripeAPI.getRemainingConversions(userFeatures);
    const daysUntilRenewal = subscriptionDetails.subscription
      ? StripeAPI.getDaysUntilRenewal(subscriptionDetails.subscription.currentPeriodEnd)
      : 0;

    return (
      <div className="space-y-6">
        {/* Current Plan Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {subscriptionDetails.currentPlan && getPlanIcon(subscriptionDetails.currentPlan.id)}
              Current Subscription
            </CardTitle>
            <CardDescription>
              Your current plan and usage details
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {subscriptionDetails.currentPlan && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold">{subscriptionDetails.currentPlan.name} Plan</h3>
                  <p className="text-sm text-gray-600">
                    {subscriptionDetails.currentPlan.formattedPrice}
                    {subscriptionDetails.currentPlan.price > 0 && ` per ${subscriptionDetails.currentPlan.interval}`}
                  </p>
                </div>
                <Badge className={getPlanColor(subscriptionDetails.currentPlan.id)}>
                  Active
                </Badge>
              </div>
            )}

            {/* Usage Statistics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Conversion Usage</span>
                <span className="text-sm text-gray-600">
                  {userFeatures.usage.conversionsUsed} / {
                    userFeatures.usage.isUnlimited ? '∞' : userFeatures.usage.conversionsLimit
                  }
                </span>
              </div>

              {!userFeatures.usage.isUnlimited && (
                <Progress value={usagePercentage} className="h-2" />
              )}

              <div className="flex items-center justify-between text-sm">
                <span>Remaining this month:</span>
                <span className="font-medium">
                  {remaining === 'unlimited' ? 'Unlimited' : remaining}
                </span>
              </div>
            </div>

            {/* OCR Overlay Access */}
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <Brain className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">OCR Overlay Technology</p>
                <p className="text-xs text-gray-600">
                  {subscriptionDetails.hasOCROverlayAccess
                    ? 'You have full access to our revolutionary OCR Overlay system'
                    : 'Upgrade to access OCR Overlay features'
                  }
                </p>
              </div>
              {subscriptionDetails.hasOCROverlayAccess && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>

            {/* Billing Information */}
            {subscriptionDetails.subscription && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span>Next billing date:</span>
                  <span className="font-medium">
                    {StripeAPI.formatDate(subscriptionDetails.subscription.currentPeriodEnd)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>Days until renewal:</span>
                  <span className="font-medium">{daysUntilRenewal} days</span>
                </div>

                {subscriptionDetails.subscription.cancelAtPeriodEnd && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription is set to cancel on {
                        StripeAPI.formatDate(subscriptionDetails.subscription.currentPeriodEnd)
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={handleBillingPortal}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Manage Billing
            <ExternalLink className="h-4 w-4" />
          </Button>

          {subscriptionDetails.currentPlan?.id !== 'free' && (
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Cancel Subscription
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!showPlansOnly && subscriptionDetails && (
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'plans' ? 'default' : 'outline'}
            onClick={() => setActiveTab('plans')}
            size="sm"
          >
            Available Plans
          </Button>
          <Button
            variant={activeTab === 'current' ? 'default' : 'outline'}
            onClick={() => setActiveTab('current')}
            size="sm"
          >
            Current Subscription
          </Button>
        </div>
      )}

      {(showPlansOnly || activeTab === 'plans') && (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
            <p className="text-gray-600">
              Unlock the power of OCR Overlay technology with our flexible pricing plans
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map(plan =>
              renderPlanCard(
                plan,
                subscriptionDetails?.currentPlan?.id === plan.id
              )
            )}
          </div>

          {/* OCR Overlay Benefits */}
          <Card className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600" />
                OCR Overlay Technology Benefits
              </CardTitle>
              <CardDescription>
                Revolutionary PDF-to-PowerPoint conversion with 99% image preservation
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">90%+ Text Accuracy</h3>
                  <p className="text-sm text-gray-600">
                    Advanced OCR with multi-pass processing
                  </p>
                </div>

                <div className="text-center">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Sub-5 Second Speed</h3>
                  <p className="text-sm text-gray-600">
                    Lightning-fast conversion processing
                  </p>
                </div>

                <div className="text-center">
                  <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Perfect Image Quality</h3>
                  <p className="text-sm text-gray-600">
                    99% image preservation with invisible text
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!showPlansOnly && activeTab === 'current' && renderCurrentSubscription()}
    </div>
  );
}