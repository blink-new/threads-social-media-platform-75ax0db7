import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Users, Plus } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { blink } from '../blink/client'
import type { User, Community, ViewType } from '../App'

interface CommunityViewProps {
  communityId: string
  user: User
  onViewChange: (view: ViewType, communityId?: string, userId?: string) => void
}

export function CommunityView({ communityId, user, onViewChange }: CommunityViewProps) {
  const [community, setCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)

  const loadCommunity = useCallback(async () => {
    try {
      const communityData = await blink.db.communities.list({
        where: { id: communityId },
        limit: 1
      })

      if (communityData.length > 0) {
        setCommunity(communityData[0] as Community)

        // Check if user is a member
        const membership = await blink.db.communityMembers.list({
          where: {
            AND: [
              { userId: user.id },
              { communityId }
            ]
          },
          limit: 1
        })
        setIsMember(membership.length > 0)
      }
    } catch (error) {
      console.error('Error loading community:', error)
    } finally {
      setLoading(false)
    }
  }, [communityId, user.id])

  useEffect(() => {
    loadCommunity()
  }, [loadCommunity])

  const handleJoinLeave = async () => {
    try {
      if (isMember) {
        // Leave community
        const membership = await blink.db.communityMembers.list({
          where: {
            AND: [
              { userId: user.id },
              { communityId }
            ]
          },
          limit: 1
        })

        if (membership.length > 0) {
          await blink.db.communityMembers.delete(membership[0].id)
          if (community) {
            await blink.db.communities.update(communityId, {
              memberCount: community.memberCount - 1
            })
            setCommunity({ ...community, memberCount: community.memberCount - 1 })
          }
          setIsMember(false)
        }
      } else {
        // Join community
        await blink.db.communityMembers.create({
          id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          communityId,
          role: 'member'
        })

        if (community) {
          await blink.db.communities.update(communityId, {
            memberCount: community.memberCount + 1
          })
          setCommunity({ ...community, memberCount: community.memberCount + 1 })
        }
        setIsMember(true)
      }
    } catch (error) {
      console.error('Error joining/leaving community:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-muted rounded-xl animate-pulse" />
          <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        </div>
        <div className="threads-card p-6 animate-pulse">
          <div className="h-32 bg-muted rounded-xl mb-4" />
          <div className="h-6 bg-muted rounded w-3/4 mb-2" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!community) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Community not found</h2>
        <Button onClick={() => onViewChange('home')} variant="outline" className="rounded-xl">
          Go Back Home
        </Button>
      </div>
    )
  }

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
        <h1 className="text-3xl font-bold">t/{community.name}</h1>
      </div>

      {/* Community Info */}
      <Card className="threads-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--threads-primary))] to-[hsl(var(--threads-secondary))] flex items-center justify-center text-2xl font-bold text-white">
                {community.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-2xl">{community.displayName}</CardTitle>
                <p className="text-muted-foreground">t/{community.name}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{community.memberCount.toLocaleString()} members</span>
                  </div>
                  {community.isPrivate && (
                    <Badge variant="secondary">Private</Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={handleJoinLeave}
              className={isMember 
                ? "border-[hsl(var(--threads-primary))] text-[hsl(var(--threads-primary))] hover:bg-[hsl(var(--threads-primary))]/10 rounded-xl"
                : "threads-gradient text-white hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl"
              }
              variant={isMember ? "outline" : "default"}
            >
              {isMember ? (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Joined
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Join
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {community.description && (
          <CardContent>
            <p className="text-foreground leading-relaxed">{community.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Community Posts */}
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold mb-2">Community posts coming soon!</h3>
        <p className="text-muted-foreground mb-6">
          Posts from this community will appear here.
        </p>
        <Button 
          onClick={() => onViewChange('create')}
          className="threads-gradient text-white hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl"
        >
          Create Post
        </Button>
      </div>
    </div>
  )
}