import { useState } from 'react'
import { Bell, Check, ChevronUp, MessageCircle, Heart, Award, UserPlus, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { formatDistanceToNow } from 'date-fns'
import { blink } from '../blink/client'
import type { Notification, ViewType } from '../App'

interface NotificationCenterProps {
  notifications: Notification[]
  onMarkAsRead: (notificationId: string) => void
  onViewChange: (view: ViewType, communityId?: string, userId?: string, postId?: string) => void
}

export function NotificationCenter({ notifications, onMarkAsRead, onViewChange }: NotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' || !notification.isRead
  )

  const unreadCount = notifications.filter(n => !n.isRead).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'upvote':
        return <ChevronUp className="w-4 h-4 text-[hsl(var(--threads-upvote))]" />
      case 'comment':
      case 'reply':
        return <MessageCircle className="w-4 h-4 text-[hsl(var(--threads-primary))]" />
      case 'award':
        return <Award className="w-4 h-4 text-[hsl(var(--threads-accent))]" />
      case 'follow':
        return <UserPlus className="w-4 h-4 text-[hsl(var(--threads-secondary))]" />
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }

    // Navigate based on notification type
    if (notification.actionUrl) {
      const url = new URL(notification.actionUrl, window.location.origin)
      const pathParts = url.pathname.split('/')
      
      if (pathParts[1] === 'post' && pathParts[2]) {
        onViewChange('post', undefined, undefined, pathParts[2])
      } else if (pathParts[1] === 'user' && pathParts[2]) {
        onViewChange('profile', undefined, pathParts[2])
      } else if (pathParts[1] === 'community' && pathParts[2]) {
        onViewChange('community', pathParts[2])
      }
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead)
      await Promise.all(
        unreadNotifications.map(notification =>
          blink.db.notifications.update(notification.id, { isRead: true })
        )
      )
      
      // Mark all as read in parent component
      unreadNotifications.forEach(notification => {
        onMarkAsRead(notification.id)
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await blink.db.notifications.delete(notificationId)
      // The parent component should handle removing from state
      window.location.reload() // Temporary solution
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="w-8 h-8 text-[hsl(var(--threads-primary))]" />
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with your community activity
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="outline"
            className="rounded-xl"
          >
            <Check className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'unread')}>
        <TabsList className="bg-[hsl(var(--threads-surface))] rounded-xl">
          <TabsTrigger value="all" className="rounded-lg">
            All Notifications
            <Badge variant="secondary" className="ml-2">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="rounded-lg">
            Unread
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-[hsl(var(--threads-accent))] text-white">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {filteredNotifications.length === 0 ? (
            <Card className="threads-card">
              <CardContent className="text-center py-12">
                <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {filter === 'unread' 
                    ? 'You\'re all caught up! Check back later for new updates.'
                    : 'When you get upvotes, comments, and other activity, they\'ll show up here.'
                  }
                </p>
                <Button
                  onClick={() => onViewChange('home')}
                  className="threads-gradient text-white hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl"
                >
                  Explore Communities
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`threads-card cursor-pointer transition-all duration-200 hover:shadow-md ${
                    !notification.isRead 
                      ? 'border-[hsl(var(--threads-primary))]/30 bg-[hsl(var(--threads-primary))]/5' 
                      : 'hover:bg-[hsl(var(--threads-surface-hover))]'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      {/* Notification Icon */}
                      <div className={`p-2 rounded-xl ${
                        !notification.isRead 
                          ? 'bg-[hsl(var(--threads-primary))]/10' 
                          : 'bg-[hsl(var(--threads-surface))]'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-3 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                              {!notification.isRead && (
                                <Badge className="bg-[hsl(var(--threads-primary))] text-white text-xs px-2 py-0">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2 ml-4">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[hsl(var(--threads-primary))] hover:bg-[hsl(var(--threads-primary))]/10 rounded-lg p-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onMarkAsRead(notification.id)
                                }}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg p-2"
                              onClick={(e) => deleteNotification(notification.id, e)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Notification Settings */}
      <Card className="threads-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notification Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Post Activity</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Upvotes on my posts</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Comments on my posts</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Replies to my comments</span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Social Activity</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>New followers</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Mentions in posts</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Awards received</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[hsl(var(--threads-border))]">
            <Button
              variant="outline"
              className="rounded-xl"
            >
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}