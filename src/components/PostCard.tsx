import { useState } from 'react'
import { ChevronUp, ChevronDown, MessageCircle, Share, MoreHorizontal, ExternalLink, Heart, DollarSign } from 'lucide-react'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import type { User, Post, ViewType } from '../App'

interface PostCardProps {
  post: Post
  user: User
  onVote: (postId: string, voteType: 'upvote' | 'downvote') => void
  onViewChange: (view: ViewType, communityId?: string, userId?: string) => void
}

export function PostCard({ post, user, onVote, onViewChange }: PostCardProps) {
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null)
  const [showTipModal, setShowTipModal] = useState(false)

  const handleVote = (voteType: 'upvote' | 'downvote') => {
    onVote(post.id, voteType)
    setUserVote(userVote === voteType ? null : voteType)
  }

  const getVoteScore = () => {
    return post.upvotes - post.downvotes
  }

  const formatVoteCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  const renderPostContent = () => {
    switch (post.postType) {
      case 'image':
        return (
          <div className="mt-4">
            {post.content && (
              <p className="text-foreground mb-4 leading-relaxed">{post.content}</p>
            )}
            {post.imageUrl && (
              <img 
                src={post.imageUrl} 
                alt={post.title}
                className="w-full rounded-xl max-h-96 object-cover"
              />
            )}
          </div>
        )
      case 'video':
        return (
          <div className="mt-4">
            {post.content && (
              <p className="text-foreground mb-4 leading-relaxed">{post.content}</p>
            )}
            {post.videoUrl && (
              <video 
                src={post.videoUrl} 
                controls
                className="w-full rounded-xl max-h-96"
              />
            )}
          </div>
        )
      case 'link':
        return (
          <div className="mt-4">
            {post.content && (
              <p className="text-foreground mb-4 leading-relaxed">{post.content}</p>
            )}
            {post.linkUrl && (
              <a 
                href={post.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 border border-[hsl(var(--threads-border))] rounded-xl hover:border-[hsl(var(--threads-primary))] transition-colors"
              >
                <div className="flex items-center space-x-2 text-[hsl(var(--threads-primary))] hover:underline">
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm font-medium">{post.linkUrl}</span>
                </div>
              </a>
            )}
          </div>
        )
      default:
        return post.content && (
          <p className="text-foreground mt-4 leading-relaxed">{post.content}</p>
        )
    }
  }

  return (
    <article className="threads-post-card group">
      <div className="flex space-x-4">
        {/* Voting Section */}
        <div className="flex flex-col items-center space-y-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className={`threads-vote-button ${
              userVote === 'upvote' 
                ? 'text-[hsl(var(--threads-upvote))] bg-[hsl(var(--threads-upvote))]/10' 
                : 'text-muted-foreground hover:text-[hsl(var(--threads-upvote))]'
            }`}
            onClick={() => handleVote('upvote')}
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
          
          <span className={`font-bold text-sm ${
            getVoteScore() > 0 
              ? 'text-[hsl(var(--threads-upvote))]' 
              : getVoteScore() < 0 
                ? 'text-[hsl(var(--threads-downvote))]' 
                : 'text-muted-foreground'
          }`}>
            {formatVoteCount(getVoteScore())}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            className={`threads-vote-button ${
              userVote === 'downvote' 
                ? 'text-[hsl(var(--threads-downvote))] bg-[hsl(var(--threads-downvote))]/10' 
                : 'text-muted-foreground hover:text-[hsl(var(--threads-downvote))]'
            }`}
            onClick={() => handleVote('downvote')}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>

        {/* Post Content */}
        <div className="flex-1 min-w-0">
          {/* Post Header */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
            <Button
              variant="ghost"
              className="p-0 h-auto font-medium hover:text-[hsl(var(--threads-primary))] transition-colors"
              onClick={() => onViewChange('community', post.communityId)}
            >
              t/{post.community?.name || 'unknown'}
            </Button>
            <span>•</span>
            <span>Posted by</span>
            <Button
              variant="ghost"
              className="p-0 h-auto font-medium hover:text-[hsl(var(--threads-primary))] transition-colors"
              onClick={() => onViewChange('profile', undefined, post.authorId)}
            >
              u/{post.author?.username || 'unknown'}
            </Button>
            {post.author?.isPremium && (
              <Badge className="bg-[hsl(var(--threads-accent))] text-white text-xs px-2 py-0">
                PRO
              </Badge>
            )}
            <span>•</span>
            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
            {post.isPinned && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">Pinned</Badge>
              </>
            )}
          </div>

          {/* Post Title */}
          <h2 className="text-xl font-bold text-foreground mb-2 leading-tight hover:text-[hsl(var(--threads-primary))] transition-colors cursor-pointer">
            {post.title}
          </h2>

          {/* Post Content */}
          {renderPostContent()}

          {/* Post Actions */}
          <div className="flex items-center space-x-4 mt-4 pt-3 border-t border-[hsl(var(--threads-border))]">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-[hsl(var(--threads-primary))] hover:bg-[hsl(var(--threads-primary))]/10 rounded-lg"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {post.commentCount} Comments
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-[hsl(var(--threads-secondary))] hover:bg-[hsl(var(--threads-secondary))]/10 rounded-lg"
            >
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg"
            >
              <Heart className="w-4 h-4 mr-2" />
              Save
            </Button>

            {/* Tip Creator Button */}
            {post.authorId !== user.id && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-[hsl(var(--threads-accent))] hover:bg-[hsl(var(--threads-accent))]/10 rounded-lg"
                onClick={() => setShowTipModal(true)}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Tip
              </Button>
            )}

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground rounded-lg ml-auto"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem className="rounded-lg">
                  Report Post
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg">
                  Hide Post
                </DropdownMenuItem>
                {post.authorId === user.id && (
                  <>
                    <DropdownMenuItem className="rounded-lg">
                      Edit Post
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-lg text-destructive">
                      Delete Post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </article>
  )
}