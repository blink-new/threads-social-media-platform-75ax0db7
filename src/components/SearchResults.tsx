import { useState, useEffect } from 'react'
import { Search, Users, MessageSquare, Hash, TrendingUp, Filter } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { PostCard } from './PostCard'
import { blink } from '../blink/client'
import type { User, Post, Community, ViewType } from '../App'

interface SearchResultsProps {
  user: User
  query: string
  onViewChange: (view: ViewType, communityId?: string, userId?: string, postId?: string) => void
}

interface SearchUser {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  karma: number
  isPremium: boolean
}

export function SearchResults({ user, query, onViewChange }: SearchResultsProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [users, setUsers] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'communities' | 'users'>('all')

  useEffect(() => {
    const searchContent = async () => {
      if (!query.trim()) return

      try {
        setLoading(true)

        // Search posts
        const postsData = await blink.db.posts.list({
          // Note: In a real implementation, you'd use full-text search
          // For now, we'll simulate search by filtering
          limit: 20
        })

        // Filter posts by query (simulate search)
        const filteredPosts = postsData.filter(post => 
          post.title.toLowerCase().includes(query.toLowerCase()) ||
          (post.content && post.content.toLowerCase().includes(query.toLowerCase()))
        )

        // Enrich posts with author and community data
        const enrichedPosts = await Promise.all(
          filteredPosts.map(async (post) => {
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

        // Search communities
        const communitiesData = await blink.db.communities.list({
          limit: 10
        })

        const filteredCommunities = communitiesData.filter(community =>
          community.name.toLowerCase().includes(query.toLowerCase()) ||
          community.displayName.toLowerCase().includes(query.toLowerCase()) ||
          community.description.toLowerCase().includes(query.toLowerCase())
        )

        // Search users
        const usersData = await blink.db.users.list({
          limit: 10
        })

        const filteredUsers = usersData.filter(user =>
          user.username.toLowerCase().includes(query.toLowerCase()) ||
          user.displayName.toLowerCase().includes(query.toLowerCase())
        )

        setPosts(enrichedPosts as Post[])
        setCommunities(filteredCommunities as Community[])
        setUsers(filteredUsers as SearchUser[])
      } catch (error) {
        console.error('Error searching:', error)
      } finally {
        setLoading(false)
      }
    }

    searchContent()
  }, [query])

  const handleVote = async (postId: string, voteType: 'upvote' | 'downvote') => {
    // Implement voting logic (same as PostFeed)
    console.log('Vote:', postId, voteType)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Search className="w-6 h-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold">Searching...</h1>
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

  const totalResults = posts.length + communities.length + users.length

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Search className="w-6 h-6 text-[hsl(var(--threads-primary))]" />
          <h1 className="text-3xl font-bold">Search Results</h1>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Found {totalResults} results for "{query}"
          </p>
          <Button variant="outline" className="rounded-xl">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Search Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="bg-[hsl(var(--threads-surface))] rounded-xl">
          <TabsTrigger value="all" className="rounded-lg">
            All ({totalResults})
          </TabsTrigger>
          <TabsTrigger value="posts" className="rounded-lg">
            <MessageSquare className="w-4 h-4 mr-2" />
            Posts ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="communities" className="rounded-lg">
            <Hash className="w-4 h-4 mr-2" />
            Communities ({communities.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg">
            <Users className="w-4 h-4 mr-2" />
            Users ({users.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Top Communities */}
          {communities.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Hash className="w-5 h-5 mr-2" />
                Communities
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {communities.slice(0, 4).map((community) => (
                  <div
                    key={community.id}
                    className="threads-card p-4 hover:border-[hsl(var(--threads-primary))] transition-colors cursor-pointer"
                    onClick={() => onViewChange('community', community.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-[hsl(var(--threads-primary))] flex items-center justify-center text-white font-bold text-lg">
                        {community.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">t/{community.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {community.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {community.memberCount.toLocaleString()} members
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Users */}
          {users.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Users
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.slice(0, 4).map((searchUser) => (
                  <div
                    key={searchUser.id}
                    className="threads-card p-4 hover:border-[hsl(var(--threads-primary))] transition-colors cursor-pointer"
                    onClick={() => onViewChange('profile', undefined, searchUser.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={searchUser.avatarUrl} alt={searchUser.displayName} />
                        <AvatarFallback className="bg-[hsl(var(--threads-primary))] text-white">
                          {searchUser.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{searchUser.displayName}</h3>
                          {searchUser.isPremium && (
                            <Badge className="bg-[hsl(var(--threads-accent))] text-white text-xs">
                              PRO
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">u/{searchUser.username}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {searchUser.karma.toLocaleString()} karma
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {posts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Posts
              </h2>
              <div className="space-y-4">
                {posts.slice(0, 5).map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    user={user}
                    onVote={handleVote}
                    onViewChange={onViewChange}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No posts found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or browse popular posts instead.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                onVote={handleVote}
                onViewChange={onViewChange}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="communities" className="space-y-4">
          {communities.length === 0 ? (
            <div className="text-center py-12">
              <Hash className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No communities found</h3>
              <p className="text-muted-foreground">
                Try different search terms or explore trending communities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {communities.map((community) => (
                <div
                  key={community.id}
                  className="threads-card p-6 hover:border-[hsl(var(--threads-primary))] transition-colors cursor-pointer"
                  onClick={() => onViewChange('community', community.id)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 rounded-xl bg-[hsl(var(--threads-primary))] flex items-center justify-center text-white font-bold text-xl">
                      {community.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">t/{community.name}</h3>
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {community.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{community.memberCount.toLocaleString()} members</span>
                        {community.isNsfw && (
                          <Badge variant="destructive" className="text-xs">NSFW</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">
                Try different search terms or browse popular users.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((searchUser) => (
                <div
                  key={searchUser.id}
                  className="threads-card p-6 hover:border-[hsl(var(--threads-primary))] transition-colors cursor-pointer text-center"
                  onClick={() => onViewChange('profile', undefined, searchUser.id)}
                >
                  <Avatar className="w-16 h-16 mx-auto mb-4">
                    <AvatarImage src={searchUser.avatarUrl} alt={searchUser.displayName} />
                    <AvatarFallback className="bg-[hsl(var(--threads-primary))] text-white text-xl">
                      {searchUser.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <h3 className="font-semibold">{searchUser.displayName}</h3>
                      {searchUser.isPremium && (
                        <Badge className="bg-[hsl(var(--threads-accent))] text-white text-xs">
                          PRO
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">u/{searchUser.username}</p>
                    <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                      <span>{searchUser.karma.toLocaleString()} karma</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* No Results */}
      {totalResults === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-muted rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Search className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">No results found</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We couldn't find anything matching "{query}". Try different keywords or browse popular content.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => onViewChange('home')}
              className="rounded-xl"
            >
              Browse Home
            </Button>
            <Button 
              onClick={() => onViewChange('create')}
              className="threads-gradient text-white rounded-xl"
            >
              Create Post
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}