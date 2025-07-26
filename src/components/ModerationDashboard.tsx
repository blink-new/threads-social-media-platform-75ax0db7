import { useState, useEffect, useCallback } from 'react'
import { Shield, Flag, Trash2, Lock, Pin, Eye, EyeOff, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { useToast } from '../hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { blink } from '../blink/client'
import type { User, Post, Comment, ViewType } from '../App'

interface ModerationDashboardProps {
  user: User
  onViewChange: (view: ViewType) => void
}

interface Report {
  id: string
  type: 'post' | 'comment' | 'user'
  targetId: string
  reporterId: string
  reason: string
  description: string
  status: 'pending' | 'resolved' | 'dismissed'
  createdAt: string
  target?: Post | Comment | User
  reporter?: User
}

export function ModerationDashboard({ user, onViewChange }: ModerationDashboardProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('reports')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const loadModerationData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load reports (simulated data since we don't have reports table)
      const mockReports: Report[] = [
        {
          id: 'report_1',
          type: 'post',
          targetId: 'post_1',
          reporterId: 'user_1',
          reason: 'spam',
          description: 'This post contains spam content and promotional links.',
          status: 'pending',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'report_2',
          type: 'comment',
          targetId: 'comment_1',
          reporterId: 'user_2',
          reason: 'harassment',
          description: 'User is being abusive and harassing other members.',
          status: 'pending',
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        }
      ]
      
      setReports(mockReports)

      // Load recent posts for moderation
      const postsData = await blink.db.posts.list({
        orderBy: { createdAt: 'desc' },
        limit: 20
      })

      // Enrich posts with author and community data
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
          } as Post
        })
      )

      setPosts(enrichedPosts)
    } catch (error) {
      console.error('Error loading moderation data:', error)
      toast({
        title: 'Error loading data',
        description: 'Failed to load moderation dashboard data.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (user.isAdmin || user.isModerator) {
      loadModerationData()
    }
  }, [user, loadModerationData])

  const handlePostAction = async (postId: string, action: 'delete' | 'lock' | 'pin' | 'hide') => {
    try {
      setActionLoading(postId)
      
      const updates: any = {}
      
      switch (action) {
        case 'delete':
          await blink.db.posts.delete(postId)
          setPosts(posts.filter(p => p.id !== postId))
          toast({
            title: 'Post deleted',
            description: 'The post has been removed from the platform.'
          })
          return
        case 'lock':
          updates.isLocked = true
          break
        case 'pin':
          updates.isPinned = true
          break
        case 'hide':
          // In a real app, this would set a hidden flag
          updates.isHidden = true
          break
      }

      await blink.db.posts.update(postId, updates)
      
      // Update local state
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, ...updates } : p
      ))

      toast({
        title: 'Action completed',
        description: `Post has been ${action}d successfully.`
      })
    } catch (error) {
      console.error(`Error ${action}ing post:`, error)
      toast({
        title: 'Action failed',
        description: `Failed to ${action} the post.`,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReportAction = async (reportId: string, action: 'resolve' | 'dismiss') => {
    try {
      setActionLoading(reportId)
      
      // Update report status
      setReports(reports.map(r => 
        r.id === reportId ? { ...r, status: action === 'resolve' ? 'resolved' : 'dismissed' } : r
      ))

      toast({
        title: `Report ${action}d`,
        description: `The report has been ${action}d successfully.`
      })
    } catch (error) {
      console.error(`Error ${action}ing report:`, error)
      toast({
        title: 'Action failed',
        description: `Failed to ${action} the report.`,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (!user.isAdmin && !user.isModerator) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access the moderation dashboard.
        </p>
        <Button onClick={() => onViewChange('home')} className="rounded-xl">
          Go Home
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const pendingReports = reports.filter(r => r.status === 'pending')
  const totalPosts = posts.length
  const lockedPosts = posts.filter(p => p.isLocked).length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Shield className="w-8 h-8 text-[hsl(var(--threads-primary))]" />
        <div>
          <h1 className="text-3xl font-bold">Moderation Dashboard</h1>
          <p className="text-muted-foreground">
            Manage community content and user reports
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="threads-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <Flag className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold">Pending Reports</h3>
                <p className="text-2xl font-bold text-red-500">{pendingReports.length}</p>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="threads-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-[hsl(var(--threads-primary))]/10 rounded-xl">
                <Eye className="w-6 h-6 text-[hsl(var(--threads-primary))]" />
              </div>
              <div>
                <h3 className="font-semibold">Total Posts</h3>
                <p className="text-2xl font-bold text-[hsl(var(--threads-primary))]">{totalPosts}</p>
                <p className="text-xs text-muted-foreground">Under moderation</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="threads-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Lock className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold">Locked Posts</h3>
                <p className="text-2xl font-bold text-orange-500">{lockedPosts}</p>
                <p className="text-xs text-muted-foreground">Comments disabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="bg-[hsl(var(--threads-surface))] rounded-xl">
          <TabsTrigger value="reports" className="rounded-lg">
            <Flag className="w-4 h-4 mr-2" />
            Reports
            {pendingReports.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {pendingReports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="posts" className="rounded-lg">
            <Eye className="w-4 h-4 mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {pendingReports.length === 0 ? (
            <Card className="threads-card">
              <CardContent className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">
                  No pending reports to review. Great job keeping the community safe!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingReports.map((report) => (
                <Card key={report.id} className="threads-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-red-500/10 rounded-lg">
                            <Flag className="w-4 h-4 text-red-500" />
                          </div>
                          <div>
                            <h4 className="font-semibold capitalize">
                              {report.type} Report - {report.reason}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Reported {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {report.status}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                          {report.description}
                        </p>

                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Report ID: {report.id}</span>
                          <span>Target: {report.targetId}</span>
                          <span>Reporter: {report.reporterId}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReportAction(report.id, 'dismiss')}
                          disabled={actionLoading === report.id}
                          className="rounded-lg"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReportAction(report.id, 'resolve')}
                          disabled={actionLoading === report.id}
                          className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Posts</h3>
            <div className="flex space-x-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-40 rounded-xl">
                  <SelectValue placeholder="Filter posts" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Posts</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="pinned">Pinned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="threads-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold">{post.title}</h4>
                        {post.isPinned && (
                          <Badge className="bg-[hsl(var(--threads-accent))] text-white">
                            <Pin className="w-3 h-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                        {post.isLocked && (
                          <Badge variant="outline">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                        <span>by u/{post.author?.username || 'unknown'}</span>
                        <span>in t/{post.community?.name || 'unknown'}</span>
                        <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                        <span>{post.upvotes - post.downvotes} points</span>
                        <span>{post.commentCount} comments</span>
                      </div>

                      {post.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.content}
                        </p>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePostAction(post.id, 'pin')}
                        disabled={actionLoading === post.id || post.isPinned}
                        className="rounded-lg"
                      >
                        <Pin className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePostAction(post.id, 'lock')}
                        disabled={actionLoading === post.id || post.isLocked}
                        className="rounded-lg"
                      >
                        <Lock className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePostAction(post.id, 'hide')}
                        disabled={actionLoading === post.id}
                        className="rounded-lg"
                      >
                        <EyeOff className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePostAction(post.id, 'delete')}
                        disabled={actionLoading === post.id}
                        className="rounded-lg text-destructive border-destructive hover:bg-destructive hover:text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card className="threads-card">
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">User Management</h3>
              <p className="text-muted-foreground">
                User moderation features will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}