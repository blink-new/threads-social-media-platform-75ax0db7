import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Calendar, Award, MessageCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { formatDistanceToNow } from 'date-fns'
import { blink } from '../blink/client'
import type { User, ViewType } from '../App'

interface UserProfileProps {
  userId: string
  currentUser: User
  onViewChange: (view: ViewType, communityId?: string, userId?: string) => void
}

export function UserProfile({ userId, currentUser, onViewChange }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    try {
      const userData = await blink.db.users.list({
        where: { id: userId },
        limit: 1
      })

      if (userData.length > 0) {
        setUser(userData[0] as User)
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-muted rounded-xl animate-pulse" />
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        </div>
        <div className="threads-card p-6 animate-pulse">
          <div className="flex items-start space-x-6">
            <div className="w-24 h-24 bg-muted rounded-2xl" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">User not found</h2>
        <Button onClick={() => onViewChange('home')} variant="outline" className="rounded-xl">
          Go Back Home
        </Button>
      </div>
    )
  }

  const isOwnProfile = user.id === currentUser.id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onViewChange('home')}
          className="rounded-xl hover:bg-[hsl(var(--threads-surface-hover))]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold">u/{user.username}</h1>
      </div>

      {/* User Info */}
      <Card className="threads-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="bg-[hsl(var(--threads-primary))] text-white text-2xl">
                  {user.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-2xl">{user.displayName}</CardTitle>
                  {user.isPremium && (
                    <Badge className="bg-[hsl(var(--threads-accent))] text-white">
                      PRO
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">u/{user.username}</p>
                
                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Award className="w-4 h-4" />
                    <span>{user.karma.toLocaleString()} karma</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                {user.bio && (
                  <p className="text-foreground mt-3 max-w-md leading-relaxed">{user.bio}</p>
                )}
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
                <Button
                  className="threads-gradient text-white hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl"
                >
                  Follow
                </Button>
              </div>
            )}

            {isOwnProfile && (
              <Button
                variant="outline"
                className="rounded-xl"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* User Activity */}
      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList className="bg-[hsl(var(--threads-surface))] rounded-xl">
          <TabsTrigger value="posts" className="rounded-lg">Posts</TabsTrigger>
          <TabsTrigger value="comments" className="rounded-lg">Comments</TabsTrigger>
          <TabsTrigger value="communities" className="rounded-lg">Communities</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground mb-6">
              {isOwnProfile ? "You haven't" : `${user.displayName} hasn't`} posted anything yet.
            </p>
            {isOwnProfile && (
              <Button 
                onClick={() => onViewChange('create')}
                className="threads-gradient text-white hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl"
              >
                Create Your First Post
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No comments yet</h3>
            <p className="text-muted-foreground">
              {isOwnProfile ? "You haven't" : `${user.displayName} hasn't`} commented on anything yet.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="communities" className="space-y-4">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No communities joined</h3>
            <p className="text-muted-foreground">
              {isOwnProfile ? "You haven't" : `${user.displayName} hasn't`} joined any communities yet.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}