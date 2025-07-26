import { useState } from 'react'
import { Crown, Check, Star, Zap, Shield, Palette, Gift, ArrowRight } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Switch } from './ui/switch'
import { useToast } from '../hooks/use-toast'
import { blink } from '../blink/client'
import type { User, ViewType } from '../App'

interface PremiumSubscriptionProps {
  user: User
  onViewChange: (view: ViewType) => void
}

export function PremiumSubscription({ user, onViewChange }: PremiumSubscriptionProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const plans = {
    monthly: {
      price: 9.99,
      period: 'month',
      savings: null
    },
    yearly: {
      price: 99.99,
      period: 'year',
      savings: '17% off'
    }
  }

  const features = [
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Ad-Free Experience',
      description: 'Browse without any advertisements or sponsored content'
    },
    {
      icon: <Crown className="w-5 h-5" />,
      title: 'Premium Badge',
      description: 'Show off your premium status with an exclusive badge'
    },
    {
      icon: <Palette className="w-5 h-5" />,
      title: 'Custom Themes',
      description: 'Access exclusive themes and customization options'
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: 'Priority Support',
      description: 'Get faster response times from our support team'
    },
    {
      icon: <Star className="w-5 h-5" />,
      title: 'Exclusive Communities',
      description: 'Access to premium-only communities and discussions'
    },
    {
      icon: <Gift className="w-5 h-5" />,
      title: 'Monthly Coins',
      description: 'Receive 700 coins monthly to award great content'
    }
  ]

  const handleSubscribe = async () => {
    try {
      setLoading(true)
      
      // In a real app, this would integrate with Stripe
      // For now, we'll simulate the upgrade
      await blink.db.users.update(user.id, {
        isPremium: true
      })

      toast({
        title: 'Welcome to Premium!',
        description: 'Your account has been upgraded successfully.',
      })

      // Refresh the page to update user state
      window.location.reload()
    } catch (error) {
      console.error('Error upgrading to premium:', error)
      toast({
        title: 'Upgrade failed',
        description: 'There was an error processing your upgrade. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    try {
      setLoading(true)
      
      await blink.db.users.update(user.id, {
        isPremium: false
      })

      toast({
        title: 'Subscription cancelled',
        description: 'Your premium subscription has been cancelled.',
      })

      // Refresh the page to update user state
      window.location.reload()
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast({
        title: 'Cancellation failed',
        description: 'There was an error cancelling your subscription. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (user.isPremium) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Premium Status */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-[hsl(var(--threads-accent))] to-[hsl(var(--threads-primary))] rounded-2xl mx-auto flex items-center justify-center">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">You're Premium!</h1>
            <p className="text-muted-foreground">
              Thanks for supporting Threads. Enjoy your premium benefits!
            </p>
          </div>
        </div>

        {/* Premium Features */}
        <Card className="threads-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-[hsl(var(--threads-accent))]" />
              <span>Your Premium Benefits</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="p-2 bg-[hsl(var(--threads-accent))]/10 rounded-lg text-[hsl(var(--threads-accent))]">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="threads-card">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[hsl(var(--threads-primary))]/10 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <Shield className="w-6 h-6 text-[hsl(var(--threads-primary))]" />
              </div>
              <h3 className="font-semibold mb-1">Ads Blocked</h3>
              <p className="text-2xl font-bold text-[hsl(var(--threads-primary))]">1,247</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="threads-card">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[hsl(var(--threads-accent))]/10 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <Gift className="w-6 h-6 text-[hsl(var(--threads-accent))]" />
              </div>
              <h3 className="font-semibold mb-1">Coins Available</h3>
              <p className="text-2xl font-bold text-[hsl(var(--threads-accent))]">650</p>
              <p className="text-xs text-muted-foreground">Resets monthly</p>
            </CardContent>
          </Card>

          <Card className="threads-card">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[hsl(var(--threads-secondary))]/10 rounded-xl mx-auto mb-3 flex items-center justify-center">
                <Star className="w-6 h-6 text-[hsl(var(--threads-secondary))]" />
              </div>
              <h3 className="font-semibold mb-1">Member Since</h3>
              <p className="text-2xl font-bold text-[hsl(var(--threads-secondary))]">Jan</p>
              <p className="text-xs text-muted-foreground">2024</p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Management */}
        <Card className="threads-card">
          <CardHeader>
            <CardTitle>Subscription Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[hsl(var(--threads-surface))] rounded-xl">
              <div>
                <h4 className="font-semibold">Premium Monthly</h4>
                <p className="text-sm text-muted-foreground">Next billing: February 15, 2024</p>
              </div>
              <Badge className="bg-[hsl(var(--threads-accent))] text-white">Active</Badge>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="rounded-xl"
              >
                Update Payment Method
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                disabled={loading}
                className="rounded-xl text-destructive border-destructive hover:bg-destructive hover:text-white"
              >
                {loading ? 'Cancelling...' : 'Cancel Subscription'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-[hsl(var(--threads-accent))] to-[hsl(var(--threads-primary))] rounded-2xl mx-auto flex items-center justify-center">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-2">Upgrade to Premium</h1>
          <p className="text-xl text-muted-foreground">
            Unlock exclusive features and support the community
          </p>
        </div>
      </div>

      {/* Pricing Toggle */}
      <div className="flex items-center justify-center space-x-4">
        <span className={`font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
          Monthly
        </span>
        <Switch
          checked={billingCycle === 'yearly'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
        />
        <span className={`font-medium ${billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
          Yearly
        </span>
        {billingCycle === 'yearly' && (
          <Badge className="bg-[hsl(var(--threads-accent))] text-white">
            Save 17%
          </Badge>
        )}
      </div>

      {/* Pricing Card */}
      <Card className="threads-card max-w-md mx-auto border-[hsl(var(--threads-accent))]/30">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--threads-accent))] to-[hsl(var(--threads-primary))] rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Premium</CardTitle>
          <div className="space-y-2">
            <div className="text-4xl font-bold">
              ${plans[billingCycle].price}
              <span className="text-lg font-normal text-muted-foreground">
                /{plans[billingCycle].period}
              </span>
            </div>
            {plans[billingCycle].savings && (
              <Badge className="bg-[hsl(var(--threads-accent))] text-white">
                {plans[billingCycle].savings}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[hsl(var(--threads-accent))] to-[hsl(var(--threads-primary))] hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl text-white py-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Crown className="w-5 h-5 mr-2" />
            )}
            {loading ? 'Processing...' : 'Upgrade Now'}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Cancel anytime • No hidden fees • Instant activation
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="threads-card">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-[hsl(var(--threads-accent))]/10 rounded-xl text-[hsl(var(--threads-accent))]">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <Card className="threads-card">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! You can cancel your subscription at any time. You'll continue to have access to premium features until the end of your billing period.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">What payment methods do you accept?</h4>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards, PayPal, and other secure payment methods through Stripe.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Do you offer refunds?</h4>
              <p className="text-sm text-muted-foreground">
                We offer a 30-day money-back guarantee. If you're not satisfied with Premium, contact our support team for a full refund.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">How do coins work?</h4>
              <p className="text-sm text-muted-foreground">
                Premium members receive 700 coins monthly to award exceptional posts and comments. Coins reset each month and don't carry over.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Ready to upgrade your experience?</h2>
        <p className="text-muted-foreground mb-6">
          Join thousands of premium members enjoying an ad-free, enhanced Threads experience.
        </p>
        <Button
          onClick={handleSubscribe}
          disabled={loading}
          className="bg-gradient-to-r from-[hsl(var(--threads-accent))] to-[hsl(var(--threads-primary))] hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl text-white px-8 py-3"
        >
          {loading ? 'Processing...' : 'Get Premium Now'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}