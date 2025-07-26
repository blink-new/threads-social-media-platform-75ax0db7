import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ChevronUp, ChevronDown, MessageCircle, Share, MoreHorizontal, Reply, Flag, Heart } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { useToast } from '../hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { blink } from '../blink/client'
import type { User, Post, Comment, ViewType } from '../App'

interface PostDetailProps {
  postId: string
  user: User
  onViewChange: (view: ViewType, communityId?: string, userId?: string, postId?: string) => void
}

export function PostDetail({ postId, user, onViewChange }: PostDetailProps) {
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const buildCommentTree = useCallback((comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>()
    const rootComments: Comment[] = []

    // First pass: create map and initialize replies array
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // Second pass: build tree structure
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId)
        if (parent) {
          parent.replies = parent.replies || []
          parent.replies.push(commentWithReplies)
        }
      } else {
        rootComments.push(commentWithReplies)
      }
    })

    return rootComments
  }, [])

  const loadComments = useCallback(async () => {
    try {
      const commentsData = await blink.db.comments.list({
        where: { postId },
        orderBy: { createdAt: 'asc' }
      })

      // Load comment authors
      const enrichedComments = await Promise.all(
        commentsData.map(async (comment) => {
          const author = await blink.db.users.list({
            where: { id: comment.authorId },
            limit: 1
          })
          return {
            ...comment,
            author: author[0] || null
          } as Comment
        })
      )

      // Build comment tree
      const commentTree = buildCommentTree(enrichedComments)
      setComments(commentTree)
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }, [postId, buildCommentTree])

  const loadPostAndComments = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load post
      const postData = await blink.db.posts.list({
        where: { id: postId },
        limit: 1
      })

      if (postData.length === 0) {
        toast({
          title: 'Post not found',
          description: 'The post you are looking for does not exist.',
          variant: 'destructive'
        })
        onViewChange('home')
        return
      }

      // Load post author and community
      const [author, community] = await Promise.all([
        blink.db.users.list({ where: { id: postData[0].authorId }, limit: 1 }),
        blink.db.communities.list({ where: { id: postData[0].communityId }, limit: 1 })
      ])

      const enrichedPost = {
        ...postData[0],
        author: author[0] || null,
        community: community[0] || null
      } as Post

      setPost(enrichedPost)

      // Load comments
      await loadComments()
    } catch (error) {
      console.error('Error loading post:', error)
      toast({
        title: 'Error loading post',
        description: 'Failed to load post details.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [postId, toast, onViewChange, loadComments])

  useEffect(() => {
    loadPostAndComments()
  }, [loadPostAndComments])

  const handleVote = async (targetId: string, targetType: 'post' | 'comment', voteType: 'upvote' | 'downvote') => {
    try {
      // Check existing vote
      const existingVote = await blink.db.votes.list({
        where: {
          AND: [
            { userId: user.id },
            { targetId },
            { targetType }
          ]
        },
        limit: 1
      })

      if (existingVote.length > 0) {
        if (existingVote[0].voteType === voteType) {
          // Remove vote
          await blink.db.votes.delete(existingVote[0].id)
        } else {
          // Change vote
          await blink.db.votes.update(existingVote[0].id, { voteType })
        }
      } else {
        // Create new vote
        await blink.db.votes.create({
          id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          targetId,
          targetType,
          voteType
        })
      }

      // Reload to get updated counts
      if (targetType === 'post') {
        await loadPostAndComments()
      } else {
        await loadComments()
      }
    } catch (error) {
      console.error('Error voting:', error)
      toast({
        title: 'Error voting',
        description: 'Failed to register your vote.',
        variant: 'destructive'
      })
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return

    try {
      await blink.db.comments.create({
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: newComment.trim(),
        authorId: user.id,
        postId,
        parentId: null,
        upvotes: 0,
        downvotes: 0,
        depth: 0,
        isDeleted: false
      })

      // Update post comment count
      if (post) {
        await blink.db.posts.update(postId, {
          commentCount: post.commentCount + 1
        })
      }

      setNewComment('')
      await loadComments()
      
      toast({
        title: 'Comment posted!',
        description: 'Your comment has been added to the discussion.'
      })
    } catch (error) {
      console.error('Error posting comment:', error)
      toast({
        title: 'Error posting comment',
        description: 'Failed to post your comment.',
        variant: 'destructive'
      })
    }
  }

  const handleSubmitReply = async (parentId: string, depth: number) => {
    if (!replyText.trim()) return

    try {
      await blink.db.comments.create({
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: replyText.trim(),
        authorId: user.id,
        postId,
        parentId,
        upvotes: 0,
        downvotes: 0,
        depth: Math.min(depth + 1, 10), // Max depth of 10
        isDeleted: false
      })

      // Update post comment count
      if (post) {
        await blink.db.posts.update(postId, {
          commentCount: post.commentCount + 1
        })
      }

      setReplyText('')
      setReplyingTo(null)
      await loadComments()
      
      toast({
        title: 'Reply posted!',
        description: 'Your reply has been added to the discussion.'
      })
    } catch (error) {
      console.error('Error posting reply:', error)
      toast({
        title: 'Error posting reply',
        description: 'Failed to post your reply.',
        variant: 'destructive'
      })
    }
  }

  const toggleCommentCollapse = (commentId: string) => {
    const newCollapsed = new Set(collapsedComments)
    if (newCollapsed.has(commentId)) {
      newCollapsed.delete(commentId)
    } else {
      newCollapsed.add(commentId)
    }
    setCollapsedComments(newCollapsed)
  }

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isCollapsed = collapsedComments.has(comment.id)
    const maxDepth = 8
    const shouldIndent = depth < maxDepth

    return (
      <div key={comment.id} className={`${shouldIndent ? `ml-${Math.min(depth * 4, 32)}` : ''} ${depth > 0 ? 'border-l-2 border-[hsl(var(--threads-border))] pl-4' : ''}`}>
        <div className="threads-card p-4 mb-3">
          <div className="flex items-start space-x-3">
            {/* Voting */}
            <div className="flex flex-col items-center space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="threads-vote-button text-muted-foreground hover:text-[hsl(var(--threads-upvote))] p-1"
                onClick={() => handleVote(comment.id, 'comment', 'upvote')}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium">
                {comment.upvotes - comment.downvotes}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="threads-vote-button text-muted-foreground hover:text-[hsl(var(--threads-downvote))] p-1"
                onClick={() => handleVote(comment.id, 'comment', 'downvote')}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>

            {/* Comment Content */}
            <div className="flex-1 min-w-0">
              {/* Comment Header */}
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={comment.author?.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {comment.author?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-medium hover:text-[hsl(var(--threads-primary))] transition-colors"
                  onClick={() => onViewChange('profile', undefined, comment.authorId)}
                >
                  u/{comment.author?.username || 'unknown'}
                </Button>
                {comment.author?.isPremium && (
                  <Badge className="bg-[hsl(var(--threads-accent))] text-white text-xs px-2 py-0">
                    PRO
                  </Badge>
                )}
                <span>•</span>
                <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                
                {/* Collapse button for comments with replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto text-xs"
                    onClick={() => toggleCommentCollapse(comment.id)}
                  >
                    [{isCollapsed ? '+' : '−'}]
                  </Button>
                )}
              </div>

              {/* Comment Text */}
              {!comment.isDeleted ? (
                <p className="text-foreground mb-3 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              ) : (
                <p className="text-muted-foreground italic mb-3">
                  [Comment deleted]
                </p>
              )}

              {/* Comment Actions */}
              {!isCollapsed && (
                <div className="flex items-center space-x-4 text-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-[hsl(var(--threads-primary))] p-0 h-auto"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  >
                    <Reply className="w-3 h-3 mr-1" />
                    Reply
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-500 p-0 h-auto"
                  >
                    <Heart className="w-3 h-3 mr-1" />
                    Save
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground p-0 h-auto"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-xl">
                      <DropdownMenuItem className="rounded-lg">
                        <Flag className="w-3 h-3 mr-2" />
                        Report
                      </DropdownMenuItem>
                      {comment.authorId === user.id && (
                        <>
                          <DropdownMenuItem className="rounded-lg">
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div className="mt-4 space-y-3">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-20 rounded-xl resize-none"
                  />
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleSubmitReply(comment.id, depth)}
                      disabled={!replyText.trim()}
                      className="threads-gradient text-white rounded-xl"
                      size="sm"
                    >
                      Reply
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReplyingTo(null)
                        setReplyText('')
                      }}
                      className="rounded-xl"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nested Replies */}
        {!isCollapsed && comment.replies && comment.replies.length > 0 && (
          <div className="space-y-0">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="threads-card p-6 animate-pulse">
          <div className="flex space-x-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 bg-muted rounded-lg" />
              <div className="w-8 h-4 bg-muted rounded" />
              <div className="w-8 h-8 bg-muted rounded-lg" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-8 bg-muted rounded w-full" />
              <div className="h-32 bg-muted rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Post not found</h2>
        <p className="text-muted-foreground mb-6">
          The post you are looking for does not exist or has been removed.
        </p>
        <Button onClick={() => onViewChange('home')} className="rounded-xl">
          Go Home
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => onViewChange('home')}
        className="rounded-xl hover:bg-[hsl(var(--threads-surface-hover))]"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Feed
      </Button>

      {/* Post Content */}
      <article className="threads-post-card">
        <div className="flex space-x-4">
          {/* Voting Section */}
          <div className="flex flex-col items-center space-y-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="threads-vote-button text-muted-foreground hover:text-[hsl(var(--threads-upvote))]"
              onClick={() => handleVote(post.id, 'post', 'upvote')}
            >
              <ChevronUp className="w-5 h-5" />
            </Button>
            
            <span className="font-bold text-sm text-muted-foreground">
              {post.upvotes - post.downvotes}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              className="threads-vote-button text-muted-foreground hover:text-[hsl(var(--threads-downvote))]"
              onClick={() => handleVote(post.id, 'post', 'downvote')}
            >
              <ChevronDown className="w-5 h-5" />
            </Button>
          </div>

          {/* Post Content */}
          <div className="flex-1 min-w-0">
            {/* Post Header */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-3">
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
            </div>

            {/* Post Title */}
            <h1 className="text-2xl font-bold text-foreground mb-4 leading-tight">
              {post.title}
            </h1>

            {/* Post Content */}
            {post.content && (
              <div className="prose prose-sm max-w-none mb-6">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>
            )}

            {/* Media Content */}
            {post.imageUrl && (
              <div className="mb-6">
                <img 
                  src={post.imageUrl} 
                  alt={post.title}
                  className="w-full rounded-xl max-h-96 object-cover"
                />
              </div>
            )}

            {post.videoUrl && (
              <div className="mb-6">
                <video 
                  src={post.videoUrl} 
                  controls
                  className="w-full rounded-xl max-h-96"
                />
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center space-x-4 pt-4 border-t border-[hsl(var(--threads-border))]">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{post.commentCount} Comments</span>
              </div>

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
            </div>
          </div>
        </div>
      </article>

      {/* Comment Form */}
      <div className="threads-card p-6">
        <h3 className="font-semibold mb-4">Add a comment</h3>
        <div className="space-y-4">
          <Textarea
            placeholder="What are your thoughts?"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-24 rounded-xl resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
              className="threads-gradient text-white hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Comment
            </Button>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-0">
        <h3 className="font-semibold mb-6 text-lg">
          Comments ({comments.length})
        </h3>
        
        {comments.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold mb-2">No comments yet</h4>
            <p className="text-muted-foreground">
              Be the first to share your thoughts on this post!
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {comments.map(comment => renderComment(comment))}
          </div>
        )}
      </div>
    </div>
  )
}