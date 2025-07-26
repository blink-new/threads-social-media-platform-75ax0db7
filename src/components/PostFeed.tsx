import { useState, useEffect, useCallback } from 'react'
import { PostCard } from './PostCard'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { TrendingUp, Clock, Star } from 'lucide-react'
import { blink } from '../blink/client'
import type { User, Post, ViewType } from '../App'

interface PostFeedProps {
  user: User
  onViewChange: (view: ViewType, communityId?: string, userId?: string) => void
}

export function PostFeed({ user, onViewChange }: PostFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot')

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load posts with different sorting
      let orderBy: any = { createdAt: 'desc' }
      if (sortBy === 'hot') {
        // Hot algorithm: combine upvotes and recency
        orderBy = { upvotes: 'desc' }
      } else if (sortBy === 'top') {
        orderBy = { upvotes: 'desc' }
      }

      const postsData = await blink.db.posts.list({
        orderBy,
        limit: 20
      })

      // Load additional data for each post (author, community)
      const enrichedPosts = await Promise.all(
        postsData.map(async (post) => {
          const [author, community] = await Promise.all([
            blink.db.users.list({ where: { id: post.authorId }, limit: 1 }),
            blink.db.communities.list({ where: { id: post.communityId }, limit: 1 })
          ])

          return {
            ...post,
            author: author[0] || null,
            community: community[0] || null
          }
        })
      )

      setPosts(enrichedPosts as Post[])
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }, [sortBy])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleVote = async (postId: string, voteType: 'upvote' | 'downvote') => {
    try {
      // Check if user already voted
      const existingVote = await blink.db.votes.list({
        where: { 
          AND: [
            { userId: user.id },
            { targetId: postId },
            { targetType: 'post' }
          ]
        },
        limit: 1
      })

      if (existingVote.length > 0) {
        // Remove existing vote if same type, or update if different
        if (existingVote[0].voteType === voteType) {
          await blink.db.votes.delete(existingVote[0].id)
          // Update post vote count
          const post = posts.find(p => p.id === postId)
          if (post) {
            const updatedPost = {
              ...post,
              [voteType === 'upvote' ? 'upvotes' : 'downvotes']: 
                post[voteType === 'upvote' ? 'upvotes' : 'downvotes'] - 1
            }
            await blink.db.posts.update(postId, {
              [voteType === 'upvote' ? 'upvotes' : 'downvotes']: updatedPost[voteType === 'upvote' ? 'upvotes' : 'downvotes']
            })
            setPosts(posts.map(p => p.id === postId ? updatedPost : p))
          }
        } else {
          // Update vote type
          await blink.db.votes.update(existingVote[0].id, { voteType })
          // Update post counts
          const post = posts.find(p => p.id === postId)
          if (post) {
            const updatedPost = {
              ...post,
              upvotes: voteType === 'upvote' ? post.upvotes + 1 : post.upvotes - 1,
              downvotes: voteType === 'downvote' ? post.downvotes + 1 : post.downvotes - 1
            }
            await blink.db.posts.update(postId, {
              upvotes: updatedPost.upvotes,
              downvotes: updatedPost.downvotes
            })
            setPosts(posts.map(p => p.id === postId ? updatedPost : p))
          }
        }
      } else {
        // Create new vote
        await blink.db.votes.create({
          id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          targetId: postId,
          targetType: 'post',
          voteType
        })

        // Update post vote count
        const post = posts.find(p => p.id === postId)
        if (post) {
          const updatedPost = {
            ...post,
            [voteType === 'upvote' ? 'upvotes' : 'downvotes']: 
              post[voteType === 'upvote' ? 'upvotes' : 'downvotes'] + 1
          }
          await blink.db.posts.update(postId, {
            [voteType === 'upvote' ? 'upvotes' : 'downvotes']: updatedPost[voteType === 'upvote' ? 'upvotes' : 'downvotes']
          })
          setPosts(posts.map(p => p.id === postId ? updatedPost : p))
        }
      }
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="threads-card p-6 animate-pulse">
            <div className="flex space-x-4">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 bg-muted rounded-lg" />
                <div className="w-8 h-4 bg-muted rounded" />
                <div className="w-8 h-8 bg-muted rounded-lg" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-6 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Home Feed</h1>
        <Tabs value={sortBy} onValueChange={(value) => setSortBy(value as 'hot' | 'new' | 'top')}>
          <TabsList className="bg-[hsl(var(--threads-surface))] rounded-xl">
            <TabsTrigger value="hot" className="rounded-lg">
              <TrendingUp className="w-4 h-4 mr-2" />
              Hot
            </TabsTrigger>
            <TabsTrigger value="new" className="rounded-lg">
              <Clock className="w-4 h-4 mr-2" />
              New
            </TabsTrigger>
            <TabsTrigger value="top" className="rounded-lg">
              <Star className="w-4 h-4 mr-2" />
              Top
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-muted rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
          <p className="text-muted-foreground mb-6">
            Be the first to share something with the community!
          </p>
          <Button 
            onClick={() => onViewChange('create')}
            className="threads-gradient text-white hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl"
          >
            Create First Post
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              onVote={handleVote}
              onViewChange={onViewChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}