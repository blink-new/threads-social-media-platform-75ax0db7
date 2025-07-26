import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Users, Heart, Gift, BarChart3, Calendar, Star, Crown, Zap } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Progress } from './ui/progress'
import { blink } from '../blink/client'
import type { User, ViewType } from '../App'

interface CreatorDashboardProps {
  user: User
  onViewChange: (view: ViewType) => void
}

interface CreatorStats {
  totalEarnings: number
  monthlyEarnings: number
  totalTips: number
  totalFollowers: number
  totalPosts: number
  totalUpvotes: number
  engagementRate: number
  topPost: {
    title: string
    upvotes: number
    earnings: number
  } | null
}

interface TipTransaction {
  id: string
  amount: number
  fromUser: string
  postTitle: string
  createdAt: string
  status: 'completed' | 'pending'
}

export function CreatorDashboard({ user, onViewChange }: CreatorDashboardProps) {
  const [stats, setStats] = useState<CreatorStats>({
    totalEarnings: 0,
    monthlyEarnings: 0,
    totalTips: 0,
    totalFollowers: 0,
    totalPosts: 0,
    totalUpvotes: 0,
    engagementRate: 0,
    topPost: null
  })
  const [recentTips, setRecentTips] = useState<TipTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCreatorData = async () => {
      try {
        setLoading(true)

        // Load user's posts
        const userPosts = await blink.db.posts.list({
          where: { authorId: user.id },
          orderBy: { createdAt: 'desc' },
          limit: 100
        })

        // Load tips received
        const tips = await blink.db.tips.list({
          where: { recipientId: user.id },
          orderBy: { createdAt: 'desc' },
          limit: 50
        })

        // Calculate stats
        const totalUpvotes = userPosts.reduce((sum, post) => sum + post.upvotes, 0)
        const totalEarnings = tips.reduce((sum, tip) => sum + tip.amount, 0)
        const currentMonth = new Date().getMonth()
        const monthlyTips = tips.filter(tip => 
          new Date(tip.createdAt).getMonth() === currentMonth
        )
        const monthlyEarnings = monthlyTips.reduce((sum, tip) => sum + tip.amount, 0)

        // Find top performing post
        const topPost = userPosts.length > 0 
          ? userPosts.reduce((max, post) => post.upvotes > max.upvotes ? post : max)
          : null

        // Calculate engagement rate (simplified)
        const engagementRate = userPosts.length > 0 
          ? (totalUpvotes / userPosts.length) * 100 
          : 0

        setStats({
          totalEarnings: totalEarnings / 100, // Convert from cents
          monthlyEarnings: monthlyEarnings / 100,
          totalTips: tips.length,
          totalFollowers: Math.floor(Math.random() * 1000) + 100, // Simulated
          totalPosts: userPosts.length,
          totalUpvotes,
          engagementRate: Math.min(engagementRate, 100),
          topPost: topPost ? {
            title: topPost.title,
            upvotes: topPost.upvotes,
            earnings: tips.filter(tip => tip.postId === topPost.id)
              .reduce((sum, tip) => sum + tip.amount, 0) / 100
          } : null
        })

        // Format recent tips for display
        const formattedTips: TipTransaction[] = tips.slice(0, 10).map(tip => ({
          id: tip.id,
          amount: tip.amount / 100,
          fromUser: `user_${tip.senderId.slice(-4)}`, // Simplified
          postTitle: 'Post Title', // Would need to join with posts
          createdAt: tip.createdAt,
          status: 'completed' as const
        }))

        setRecentTips(formattedTips)
      } catch (error) {
        console.error('Error loading creator data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCreatorData()
  }, [user.id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="threads-card p-6 animate-pulse">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[hsl(var(--threads-accent))] to-[hsl(var(--threads-primary))] rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
            <p className="text-muted-foreground">Track your earnings and engagement</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge className="bg-[hsl(var(--threads-accent))] text-white px-4 py-2">
            <Crown className="w-4 h-4 mr-2" />
            Creator
          </Badge>
          <Button 
            onClick={() => onViewChange('create')}
            className="threads-gradient text-white rounded-xl"
          >
            Create Content
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="threads-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-[hsl(var(--threads-accent))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              +${stats.monthlyEarnings.toFixed(2)} this month
            </p>
          </CardContent>
        </Card>

        <Card className="threads-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tips</CardTitle>
            <Gift className="h-4 w-4 text-[hsl(var(--threads-primary))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTips}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalTips} supporters
            </p>
          </CardContent>
        </Card>

        <Card className="threads-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Followers</CardTitle>
            <Users className="h-4 w-4 text-[hsl(var(--threads-secondary))]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFollowers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="threads-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.engagementRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalUpvotes} total upvotes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-[hsl(var(--threads-surface))] rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="earnings" className="rounded-lg">
            <DollarSign className="w-4 h-4 mr-2" />
            Earnings
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-lg">
            <Star className="w-4 h-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="supporters" className="rounded-lg">
            <Heart className="w-4 h-4 mr-2" />
            Supporters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <Card className="threads-card border-0">
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Your content performance this month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Posts Created</span>
                    <span className="font-medium">{stats.totalPosts}</span>
                  </div>
                  <Progress value={(stats.totalPosts / 20) * 100} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Engagement Rate</span>
                    <span className="font-medium">{stats.engagementRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.engagementRate} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tip Goal</span>
                    <span className="font-medium">${stats.monthlyEarnings.toFixed(2)} / $100</span>
                  </div>
                  <Progress value={(stats.monthlyEarnings / 100) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Top Performing Post */}
            <Card className="threads-card border-0">
              <CardHeader>
                <CardTitle>Top Performing Post</CardTitle>
                <CardDescription>Your most successful content</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topPost ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-[hsl(var(--threads-surface))] rounded-xl">
                      <h3 className="font-semibold mb-2 line-clamp-2">{stats.topPost.title}</h3>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{stats.topPost.upvotes} upvotes</span>
                        <span>${stats.topPost.earnings.toFixed(2)} earned</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full rounded-xl">
                      View Post Details
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No posts yet</p>
                    <Button 
                      onClick={() => onViewChange('create')}
                      className="mt-3 threads-gradient text-white rounded-xl"
                    >
                      Create Your First Post
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="threads-card border-0">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Boost your creator presence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 rounded-xl flex flex-col items-center space-y-2"
                  onClick={() => onViewChange('create')}
                >
                  <Zap className="w-6 h-6 text-[hsl(var(--threads-primary))]" />
                  <span className="font-medium">Create Post</span>
                  <span className="text-xs text-muted-foreground">Share new content</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-4 rounded-xl flex flex-col items-center space-y-2"
                >
                  <Users className="w-6 h-6 text-[hsl(var(--threads-secondary))]" />
                  <span className="font-medium">Engage Fans</span>
                  <span className="text-xs text-muted-foreground">Reply to comments</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-4 rounded-xl flex flex-col items-center space-y-2"
                >
                  <TrendingUp className="w-6 h-6 text-[hsl(var(--threads-accent))]" />
                  <span className="font-medium">Promote Content</span>
                  <span className="text-xs text-muted-foreground">Boost visibility</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Earnings Summary */}
            <Card className="threads-card border-0 lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Tips</CardTitle>
                <CardDescription>Your latest supporter contributions</CardDescription>
              </CardHeader>
              <CardContent>
                {recentTips.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2">No tips received yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create engaging content to start receiving tips from supporters
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentTips.map((tip) => (
                      <div key={tip.id} className="flex items-center justify-between p-3 bg-[hsl(var(--threads-surface))] rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-[hsl(var(--threads-accent))] rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">${tip.amount.toFixed(2)} tip</p>
                            <p className="text-sm text-muted-foreground">
                              From {tip.fromUser} • {new Date(tip.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={tip.status === 'completed' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {tip.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payout Info */}
            <Card className="threads-card border-0">
              <CardHeader>
                <CardTitle>Payout Settings</CardTitle>
                <CardDescription>Manage your earnings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-[hsl(var(--threads-surface))] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Available Balance</span>
                    <span className="text-lg font-bold">${stats.totalEarnings.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum payout: $10.00
                  </p>
                </div>
                
                <Button 
                  className="w-full rounded-xl"
                  disabled={stats.totalEarnings < 10}
                >
                  Request Payout
                </Button>
                
                <Button variant="outline" className="w-full rounded-xl">
                  Payment Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <Card className="threads-card border-0">
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
              <CardDescription>Analyze your posts and their impact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Content Analytics Coming Soon</h3>
                <p className="text-muted-foreground mb-6">
                  Detailed analytics for your posts, including views, engagement, and earnings per post.
                </p>
                <Button 
                  onClick={() => onViewChange('create')}
                  className="threads-gradient text-white rounded-xl"
                >
                  Create New Content
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supporters" className="space-y-6">
          <Card className="threads-card border-0">
            <CardHeader>
              <CardTitle>Your Supporters</CardTitle>
              <CardDescription>People who support your content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Supporter Management Coming Soon</h3>
                <p className="text-muted-foreground mb-6">
                  View and interact with your supporters, send thank you messages, and build your community.
                </p>
                <Button 
                  onClick={() => onViewChange('home')}
                  variant="outline"
                  className="rounded-xl"
                >
                  Engage with Community
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}