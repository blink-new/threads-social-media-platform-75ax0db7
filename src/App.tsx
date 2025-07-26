import { useState, useEffect } from 'react'
import { Bell, Search, Plus, Menu, X, Settings, Crown, Shield, TrendingUp, Flame, DollarSign } from 'lucide-react'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar'
import { Badge } from './components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet'
import { Toaster } from './components/ui/sonner'
import { PostFeed } from './components/PostFeed'
import { CreatePost } from './components/CreatePost'
import { CommunityView } from './components/CommunityView'
import { UserProfile } from './components/UserProfile'
import { PostDetail } from './components/PostDetail'
import { NotificationCenter } from './components/NotificationCenter'
import { PremiumSubscription } from './components/PremiumSubscription'
import { ModerationDashboard } from './components/ModerationDashboard'
import { SearchResults } from './components/SearchResults'
import { CreatorDashboard } from './components/CreatorDashboard'
import { TrendingPage } from './components/TrendingPage'
import { blink } from './blink/client'

// Types
export interface User {
  id: string
  username: string
  email: string
  displayName: string
  avatarUrl?: string
  karma: number
  isPremium: boolean
  isAdmin: boolean
  isModerator: boolean
  createdAt: string
}

export interface Community {
  id: string
  name: string
  displayName: string
  description: string
  iconUrl?: string
  bannerUrl?: string
  memberCount: number
  isNsfw: boolean
  createdAt: string
  creatorId: string
}

export interface Post {
  id: string
  title: string
  content?: string
  imageUrl?: string
  videoUrl?: string
  linkUrl?: string
  postType: 'text' | 'image' | 'video' | 'link'
  authorId: string
  communityId: string
  upvotes: number
  downvotes: number
  commentCount: number
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  author?: User
  community?: Community
}

export interface Comment {
  id: string
  content: string
  authorId: string
  postId: string
  parentId?: string
  upvotes: number
  downvotes: number
  depth: number
  isDeleted: boolean
  createdAt: string
  author?: User
  replies?: Comment[]
}

export interface Notification {
  id: string
  userId: string
  type: 'upvote' | 'comment' | 'reply' | 'mention' | 'award' | 'follow'
  title: string
  message: string
  isRead: boolean
  actionUrl?: string
  createdAt: string
}

export type ViewType = 'home' | 'create' | 'community' | 'profile' | 'post' | 'notifications' | 'premium' | 'moderation' | 'search' | 'creator' | 'trending'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<ViewType>('home')
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>()
  const [selectedUserId, setSelectedUserId] = useState<string>()
  const [selectedPostId, setSelectedPostId] = useState<string>()
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [communities, setCommunities] = useState<Community[]>([])

  const loadNotifications = async (userId: string) => {
    try {
      const notificationsData = await blink.db.notifications.list({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        limit: 20
      })
      setNotifications(notificationsData as Notification[])
      setUnreadCount(notificationsData.filter(n => !n.isRead).length)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  // Initialize auth and load user data
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      if (state.user) {
        try {
          // Check if user exists in our database
          const existingUsers = await blink.db.users.list({
            where: { email: state.user.email },
            limit: 1
          })

          let userData: User
          if (existingUsers.length === 0) {
            // Create new user
            userData = await blink.db.users.create({
              id: state.user.id,
              username: state.user.email.split('@')[0],
              email: state.user.email,
              displayName: state.user.displayName || state.user.email.split('@')[0],
              avatarUrl: state.user.avatarUrl,
              karma: 0,
              isPremium: false,
              isAdmin: false,
              isModerator: false
            }) as User
          } else {
            userData = existingUsers[0] as User
          }

          setUser(userData)
          await loadNotifications(userData.id)
        } catch (error) {
          console.error('Error loading user:', error)
        }
      } else {
        setUser(null)
      }
      setLoading(state.isLoading)
    })

    return unsubscribe
  }, [])

  // Load communities
  useEffect(() => {
    const loadCommunities = async () => {
      try {
        const communitiesData = await blink.db.communities.list({
          orderBy: { memberCount: 'desc' },
          limit: 10
        })
        setCommunities(communitiesData as Community[])
      } catch (error) {
        console.error('Error loading communities:', error)
      }
    }

    loadCommunities()
  }, [])

  const handleViewChange = (view: ViewType, communityId?: string, userId?: string, postId?: string) => {
    setCurrentView(view)
    setSelectedCommunityId(communityId)
    setSelectedUserId(userId)
    setSelectedPostId(postId)
    setSidebarOpen(false)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setCurrentView('search')
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await blink.db.notifications.update(notificationId, { isRead: true })
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[hsl(var(--threads-primary))] border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-2xl font-bold">Loading Threads...</h2>
          <p className="text-muted-foreground">Preparing your social experience</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--threads-primary))]/20 via-background to-[hsl(var(--threads-secondary))]/20 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto p-8">
          <div className="w-24 h-24 bg-gradient-to-br from-[hsl(var(--threads-primary))] to-[hsl(var(--threads-secondary))] rounded-2xl mx-auto flex items-center justify-center">
            <span className="text-3xl font-bold text-white">T</span>
          </div>
          <h1 className="text-4xl font-bold">Welcome to Threads</h1>
          <p className="text-muted-foreground text-lg">
            Join the conversation. Share your thoughts. Build communities.
          </p>
          <Button 
            onClick={() => blink.auth.login()}
            className="threads-gradient text-white hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl px-8 py-3 text-lg"
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    )
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'create':
        return <CreatePost user={user} onViewChange={handleViewChange} />
      case 'community':
        return <CommunityView communityId={selectedCommunityId!} user={user} onViewChange={handleViewChange} />
      case 'profile':
        return <UserProfile userId={selectedUserId!} currentUser={user} onViewChange={handleViewChange} />
      case 'post':
        return <PostDetail postId={selectedPostId!} user={user} onViewChange={handleViewChange} />
      case 'notifications':
        return <NotificationCenter notifications={notifications} onMarkAsRead={markNotificationAsRead} onViewChange={handleViewChange} />
      case 'premium':
        return <PremiumSubscription user={user} onViewChange={handleViewChange} />
      case 'moderation':
        return <ModerationDashboard user={user} onViewChange={handleViewChange} />
      case 'search':
        return <SearchResults user={user} query={searchQuery} onViewChange={handleViewChange} />
      case 'creator':
        return <CreatorDashboard user={user} onViewChange={handleViewChange} />
      case 'trending':
        return <TrendingPage user={user} onViewChange={handleViewChange} />
      default:
        return <PostFeed user={user} onViewChange={handleViewChange} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[hsl(var(--threads-border))] bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              {/* Mobile menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden rounded-xl">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="p-6 border-b border-[hsl(var(--threads-border))]">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--threads-primary))] to-[hsl(var(--threads-secondary))] rounded-xl flex items-center justify-center">
                        <span className="text-lg font-bold text-white">T</span>
                      </div>
                      <div>
                        <h2 className="font-bold text-lg">Threads</h2>
                        <p className="text-sm text-muted-foreground">Social Platform</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <Button
                      variant={currentView === 'home' ? 'default' : 'ghost'}
                      className="w-full justify-start rounded-xl"
                      onClick={() => handleViewChange('home')}
                    >
                      <TrendingUp className="w-4 h-4 mr-3" />
                      Home Feed
                    </Button>
                    
                    <Button
                      variant={currentView === 'trending' ? 'default' : 'ghost'}
                      className="w-full justify-start rounded-xl"
                      onClick={() => handleViewChange('trending')}
                    >
                      <Flame className="w-4 h-4 mr-3" />
                      Trending
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-xl threads-gradient text-white"
                      onClick={() => handleViewChange('create')}
                    >
                      <Plus className="w-4 h-4 mr-3" />
                      Create Post
                    </Button>

                    <Button
                      variant={currentView === 'creator' ? 'default' : 'ghost'}
                      className="w-full justify-start rounded-xl"
                      onClick={() => handleViewChange('creator')}
                    >
                      <DollarSign className="w-4 h-4 mr-3" />
                      Creator Hub
                    </Button>

                    {user.isPremium && (
                      <Button
                        variant={currentView === 'premium' ? 'default' : 'ghost'}
                        className="w-full justify-start rounded-xl"
                        onClick={() => handleViewChange('premium')}
                      >
                        <Crown className="w-4 h-4 mr-3" />
                        Premium
                      </Button>
                    )}

                    {(user.isAdmin || user.isModerator) && (
                      <Button
                        variant={currentView === 'moderation' ? 'default' : 'ghost'}
                        className="w-full justify-start rounded-xl"
                        onClick={() => handleViewChange('moderation')}
                      >
                        <Shield className="w-4 h-4 mr-3" />
                        Moderation
                      </Button>
                    )}

                    <div className="pt-4 border-t border-[hsl(var(--threads-border))]">
                      <h3 className="font-semibold mb-3">Popular Communities</h3>
                      <div className="space-y-2">
                        {communities.slice(0, 5).map((community) => (
                          <Button
                            key={community.id}
                            variant="ghost"
                            className="w-full justify-start rounded-lg text-sm"
                            onClick={() => handleViewChange('community', community.id)}
                          >
                            <div className="w-6 h-6 rounded-lg bg-[hsl(var(--threads-primary))] flex items-center justify-center text-xs font-bold text-white mr-3">
                              {community.displayName.charAt(0).toUpperCase()}
                            </div>
                            t/{community.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Logo */}
              <Button
                variant="ghost"
                className="flex items-center space-x-2 hover:bg-transparent p-0"
                onClick={() => handleViewChange('home')}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--threads-primary))] to-[hsl(var(--threads-secondary))] rounded-xl flex items-center justify-center">
                  <span className="text-lg font-bold text-white">T</span>
                </div>
                <span className="text-2xl font-bold hidden sm:block">Threads</span>
              </Button>
            </div>

            {/* Center - Search */}
            <div className="flex-1 max-w-2xl mx-8 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search communities, posts, users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 rounded-xl bg-[hsl(var(--threads-surface))] border-[hsl(var(--threads-border))] focus:border-[hsl(var(--threads-primary))]"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-3">
              {/* Create Post Button */}
              <Button
                onClick={() => handleViewChange('create')}
                className="threads-gradient text-white hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl hidden sm:flex"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-xl"
                onClick={() => handleViewChange('notifications')}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-[hsl(var(--threads-accent))] text-white text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-xl">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                      <AvatarFallback className="bg-[hsl(var(--threads-primary))] text-white">
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {user.isPremium && (
                      <Crown className="absolute -top-1 -right-1 w-4 h-4 text-[hsl(var(--threads-accent))]" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  <div className="px-3 py-2 border-b border-[hsl(var(--threads-border))]">
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">u/{user.username}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-muted-foreground">Karma:</span>
                      <span className="text-xs font-medium text-[hsl(var(--threads-primary))]">
                        {user.karma.toLocaleString()}
                      </span>
                      {user.isPremium && (
                        <Badge className="bg-[hsl(var(--threads-accent))] text-white text-xs px-2 py-0">
                          PRO
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenuItem 
                    className="rounded-lg"
                    onClick={() => handleViewChange('profile', undefined, user.id)}
                  >
                    My Profile
                  </DropdownMenuItem>
                  
                  {!user.isPremium && (
                    <DropdownMenuItem 
                      className="rounded-lg"
                      onClick={() => handleViewChange('premium')}
                    >
                      <Crown className="w-4 h-4 mr-2 text-[hsl(var(--threads-accent))]" />
                      Upgrade to Premium
                    </DropdownMenuItem>
                  )}
                  
                  {(user.isAdmin || user.isModerator) && (
                    <DropdownMenuItem 
                      className="rounded-lg"
                      onClick={() => handleViewChange('moderation')}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Moderation
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem className="rounded-lg">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    className="rounded-lg text-destructive"
                    onClick={() => blink.auth.logout()}
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Navigation */}
              <div className="threads-card p-6">
                <h3 className="font-semibold mb-4">Navigation</h3>
                <div className="space-y-2">
                  <Button
                    variant={currentView === 'home' ? 'default' : 'ghost'}
                    className="w-full justify-start rounded-xl"
                    onClick={() => handleViewChange('home')}
                  >
                    <TrendingUp className="w-4 h-4 mr-3" />
                    Home Feed
                  </Button>
                  
                  <Button
                    variant={currentView === 'trending' ? 'default' : 'ghost'}
                    className="w-full justify-start rounded-xl"
                    onClick={() => handleViewChange('trending')}
                  >
                    <Flame className="w-4 h-4 mr-3" />
                    Trending
                  </Button>

                  <Button
                    variant={currentView === 'creator' ? 'default' : 'ghost'}
                    className="w-full justify-start rounded-xl"
                    onClick={() => handleViewChange('creator')}
                  >
                    <DollarSign className="w-4 h-4 mr-3" />
                    Creator Hub
                  </Button>
                  
                  {user.isPremium && (
                    <Button
                      variant={currentView === 'premium' ? 'default' : 'ghost'}
                      className="w-full justify-start rounded-xl"
                      onClick={() => handleViewChange('premium')}
                    >
                      <Crown className="w-4 h-4 mr-3" />
                      Premium
                    </Button>
                  )}

                  {(user.isAdmin || user.isModerator) && (
                    <Button
                      variant={currentView === 'moderation' ? 'default' : 'ghost'}
                      className="w-full justify-start rounded-xl"
                      onClick={() => handleViewChange('moderation')}
                    >
                      <Shield className="w-4 h-4 mr-3" />
                      Moderation
                    </Button>
                  )}
                </div>
              </div>

              {/* Popular Communities */}
              <div className="threads-card p-6">
                <h3 className="font-semibold mb-4">Popular Communities</h3>
                <div className="space-y-3">
                  {communities.slice(0, 8).map((community) => (
                    <Button
                      key={community.id}
                      variant="ghost"
                      className="w-full justify-start rounded-lg text-sm p-2"
                      onClick={() => handleViewChange('community', community.id)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--threads-primary))] flex items-center justify-center text-xs font-bold text-white mr-3">
                        {community.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <div className="font-medium">t/{community.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {community.memberCount.toLocaleString()} members
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Premium Upgrade */}
              {!user.isPremium && (
                <div className="threads-card p-6 bg-gradient-to-br from-[hsl(var(--threads-accent))]/10 to-[hsl(var(--threads-primary))]/10 border-[hsl(var(--threads-accent))]/20">
                  <div className="text-center space-y-3">
                    <Crown className="w-8 h-8 text-[hsl(var(--threads-accent))] mx-auto" />
                    <h3 className="font-semibold">Upgrade to Premium</h3>
                    <p className="text-sm text-muted-foreground">
                      Get ad-free browsing, exclusive badges, and premium features.
                    </p>
                    <Button
                      onClick={() => handleViewChange('premium')}
                      className="w-full bg-[hsl(var(--threads-accent))] hover:bg-[hsl(var(--threads-accent))]/90 text-white rounded-xl"
                    >
                      Learn More
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderCurrentView()}
          </div>
        </div>
      </main>

      <Toaster />
    </div>
  )
}

export default App