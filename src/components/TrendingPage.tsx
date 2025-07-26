import { useState, useEffect } from 'react'
import { TrendingUp, Flame, Clock, Star, Hash, Users, MessageCircle, Eye } from 'lucide-react'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { PostCard } from './PostCard'
import { blink } from '../blink/client'
import { formatDistanceToNow } from 'date-fns'
import type { User, Post, Community, ViewType } from '../App'

interface TrendingPageProps {
  user: User
  onViewChange: (view: ViewType, communityId?: string, userId?: string, postId?: string) => void
}

interface TrendingPost extends Post {
  trendingScore: number
  viewCount: number
  shareCount: number
}

interface TrendingCommunity extends Community {
  growthRate: number
  recentActivity: number
}

export function TrendingPage({ user, onViewChange }: TrendingPageProps) {
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([])
  const [trendingCommunities, setTrendingCommunities] = useState<TrendingCommunity[]>([])
  const [hotTopics, setHotTopics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'hour' | 'day' | 'week' | 'month'>('day')

  useEffect(() => {
    const loadTrendingContent = async () => {
      try {
        setLoading(true)

        // Load posts and calculate trending scores
        const postsData = await blink.db.posts.list({
          orderBy: { createdAt: 'desc' },
          limit: 50
        })

        // Enrich posts with author and community data
        const enrichedPosts = await Promise.all(
          postsData.map(async (post) => {
            const [author, community] = await Promise.all([
              blink.db.users.list({ where: { id: post.authorId }, limit: 1 }),
              blink.db.communities.list({ where: { id: post.communityId }, limit: 1 })
            ])

            // Calculate trending score (simplified algorithm)
            const hoursOld = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)
            const score = post.upvotes - post.downvotes
            const trendingScore = score / Math.pow(hoursOld + 2, 1.5) // Decay over time

            return {
              ...post,
              author: author[0] || null,
              community: community[0] || null,
              trendingScore,
              viewCount: Math.floor(Math.random() * 1000) + post.upvotes * 10, // Simulated
              shareCount: Math.floor(Math.random() * 50) + Math.floor(post.upvotes / 5) // Simulated
            }
          })
        )

        // Sort by trending score and filter by timeframe
        const now = new Date()
        const timeframeCutoff = new Date()
        
        switch (timeframe) {
          case 'hour':
            timeframeCutoff.setHours(now.getHours() - 1)
            break
          case 'day':
            timeframeCutoff.setDate(now.getDate() - 1)
            break
          case 'week':
            timeframeCutoff.setDate(now.getDate() - 7)
            break
          case 'month':
            timeframeCutoff.setMonth(now.getMonth() - 1)
            break
        }

        const filteredPosts = enrichedPosts
          .filter(post => new Date(post.createdAt) >= timeframeCutoff)
          .sort((a, b) => b.trendingScore - a.trendingScore)
          .slice(0, 20)

        setTrendingPosts(filteredPosts as TrendingPost[])

        // Load trending communities
        const communitiesData = await blink.db.communities.list({
          orderBy: { memberCount: 'desc' },
          limit: 10
        })

        const trendingCommunitiesData = communitiesData.map(community => ({
          ...community,
          growthRate: Math.random() * 50 + 5, // Simulated growth rate
          recentActivity: Math.floor(Math.random() * 100) + 20 // Simulated activity
        }))

        setTrendingCommunities(trendingCommunitiesData as TrendingCommunity[])

        // Generate hot topics (simplified)
        const topics = [
          'AI Technology', 'Web Development', 'Gaming News', 'Crypto Updates',
          'Science Discoveries', 'Art Showcase', 'Music Releases', 'Book Reviews',
          'Fitness Tips', 'Cooking Recipes', 'Travel Stories', 'Photography'
        ]
        setHotTopics(topics.slice(0, 8))

      } catch (error) {
        console.error('Error loading trending content:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTrendingContent()
  }, [timeframe])

  const handleVote = async (postId: string, voteType: 'upvote' | 'downvote') => {
    // Implement voting logic (same as PostFeed)
    console.log('Vote:', postId, voteType)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="threads-card p-6 animate-pulse">
              <div className="flex space-x-4">
                <div className="w-12 h-12 bg-muted rounded-lg" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-6 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
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
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Trending</h1>
            <p className="text-muted-foreground">What's hot on Threads right now</p>
          </div>
        </div>

        {/* Timeframe Selector */}
        <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as any)}>
          <TabsList className="bg-[hsl(var(--threads-surface))] rounded-xl">
            <TabsTrigger value="hour" className="rounded-lg text-xs">1H</TabsTrigger>
            <TabsTrigger value="day" className="rounded-lg text-xs">24H</TabsTrigger>
            <TabsTrigger value="week" className="rounded-lg text-xs">7D</TabsTrigger>
            <TabsTrigger value="month" className="rounded-lg text-xs">30D</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Trending Posts */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[hsl(var(--threads-primary))]" />
              <h2 className="text-xl font-semibold">Trending Posts</h2>
              <Badge className="bg-orange-500 text-white">
                {trendingPosts.length}
              </Badge>
            </div>

            {trendingPosts.length === 0 ? (
              <div className="text-center py-12">
                <Flame className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No trending posts</h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to create trending content in this timeframe!
                </p>
                <Button 
                  onClick={() => onViewChange('create')}
                  className="threads-gradient text-white rounded-xl"
                >
                  Create Post
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {trendingPosts.map((post, index) => (
                  <div key={post.id} className="relative">
                    {/* Trending Rank */}
                    <div className="absolute -left-4 top-4 z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-[hsl(var(--threads-primary))]'
                      }`}>
                        {index + 1}
                      </div>
                    </div>

                    {/* Post Card with Trending Stats */}
                    <div className="ml-4">
                      <PostCard
                        post={post}
                        user={user}
                        onVote={handleVote}
                        onViewChange={onViewChange}
                      />
                      
                      {/* Trending Stats */}
                      <div className="mt-2 ml-16 flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>{post.viewCount.toLocaleString()} views</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Score: {post.trendingScore.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{post.shareCount} shares</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Hot Topics */}
          <div className="threads-card p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Hash className="w-5 h-5 text-[hsl(var(--threads-accent))]" />
              <h3 className="font-semibold">Hot Topics</h3>
            </div>
            <div className="space-y-2">
              {hotTopics.map((topic, index) => (
                <Button
                  key={topic}
                  variant="ghost"
                  className="w-full justify-start rounded-lg text-sm p-2 h-auto"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">
                      {index + 1}
                    </span>
                    <div className="text-left">
                      <div className="font-medium">#{topic.toLowerCase().replace(' ', '')}</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.floor(Math.random() * 1000) + 100} posts
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Trending Communities */}
          <div className="threads-card p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-[hsl(var(--threads-secondary))]" />
              <h3 className="font-semibold">Trending Communities</h3>
            </div>
            <div className="space-y-3">
              {trendingCommunities.slice(0, 5).map((community, index) => (
                <Button
                  key={community.id}
                  variant="ghost"
                  className="w-full justify-start rounded-lg text-sm p-3 h-auto"
                  onClick={() => onViewChange('community', community.id)}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-lg bg-[hsl(var(--threads-primary))] flex items-center justify-center text-white font-bold">
                        {community.displayName.charAt(0).toUpperCase()}
                      </div>
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                          <Flame className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium">t/{community.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center space-x-2">
                        <span>{community.memberCount.toLocaleString()} members</span>
                        <span>•</span>
                        <span className="text-green-500">+{community.growthRate.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Trending Stats */}
          <div className="threads-card p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Trending Stats</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Users</span>
                <span className="font-bold text-[hsl(var(--threads-primary))]">
                  {(Math.random() * 10000 + 5000).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Posts Today</span>
                <span className="font-bold text-[hsl(var(--threads-secondary))]">
                  {(Math.random() * 500 + 200).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Comments Today</span>
                <span className="font-bold text-[hsl(var(--threads-accent))]">
                  {(Math.random() * 2000 + 800).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New Members</span>
                <span className="font-bold text-green-500">
                  +{(Math.random() * 100 + 50).toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="threads-card p-6">
            <h3 className="font-semibold mb-4">Join the Trend</h3>
            <div className="space-y-3">
              <Button 
                onClick={() => onViewChange('create')}
                className="w-full threads-gradient text-white rounded-xl"
              >
                Create Trending Post
              </Button>
              <Button 
                variant="outline" 
                className="w-full rounded-xl"
                onClick={() => onViewChange('home')}
              >
                Browse All Posts
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}