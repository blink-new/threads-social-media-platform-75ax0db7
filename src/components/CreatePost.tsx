import { useState, useEffect } from 'react'
import { ArrowLeft, Type, Image, Video, Link, Send } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { useToast } from '../hooks/use-toast'
import { blink } from '../blink/client'
import type { User, Community, ViewType } from '../App'

interface CreatePostProps {
  user: User
  onViewChange: (view: ViewType) => void
}

export function CreatePost({ user, onViewChange }: CreatePostProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedCommunity, setSelectedCommunity] = useState('')
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'link'>('text')
  const [linkUrl, setLinkUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const loadCommunities = async () => {
    try {
      const communitiesData = await blink.db.communities.list({
        orderBy: { memberCount: 'desc' },
        limit: 50
      })
      setCommunities(communitiesData as Community[])
    } catch (error) {
      console.error('Error loading communities:', error)
    }
  }

  useEffect(() => {
    loadCommunities()
  }, [])

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true)
      const { publicUrl } = await blink.storage.upload(
        file,
        `posts/${Date.now()}_${file.name}`,
        { upsert: true }
      )
      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive'
      })
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleVideoUpload = async (file: File) => {
    try {
      setUploading(true)
      const { publicUrl } = await blink.storage.upload(
        file,
        `posts/videos/${Date.now()}_${file.name}`,
        { upsert: true }
      )
      return publicUrl
    } catch (error) {
      console.error('Error uploading video:', error)
      toast({
        title: 'Upload failed',
        description: 'Failed to upload video. Please try again.',
        variant: 'destructive'
      })
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !selectedCommunity) {
      toast({
        title: 'Missing information',
        description: 'Please provide a title and select a community.',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoading(true)

      let imageUrl = null
      let videoUrl = null

      // Upload files if needed
      if (postType === 'image' && imageFile) {
        imageUrl = await handleImageUpload(imageFile)
        if (!imageUrl) return
      }

      if (postType === 'video' && videoFile) {
        videoUrl = await handleVideoUpload(videoFile)
        if (!videoUrl) return
      }

      // Create the post
      const newPost = await blink.db.posts.create({
        id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        content: content.trim() || null,
        imageUrl,
        videoUrl,
        postType,
        linkUrl: postType === 'link' ? linkUrl : null,
        authorId: user.id,
        communityId: selectedCommunity,
        upvotes: 0,
        downvotes: 0,
        commentCount: 0,
        isPinned: false,
        isLocked: false
      })

      // Update community member count if user isn't already a member
      const existingMembership = await blink.db.communityMembers.list({
        where: {
          AND: [
            { userId: user.id },
            { communityId: selectedCommunity }
          ]
        },
        limit: 1
      })

      if (existingMembership.length === 0) {
        await blink.db.communityMembers.create({
          id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          communityId: selectedCommunity,
          role: 'member'
        })

        // Update community member count
        const community = communities.find(c => c.id === selectedCommunity)
        if (community) {
          await blink.db.communities.update(selectedCommunity, {
            memberCount: community.memberCount + 1
          })
        }
      }

      toast({
        title: 'Post created!',
        description: 'Your post has been published successfully.'
      })

      // Reset form and go back to home
      setTitle('')
      setContent('')
      setLinkUrl('')
      setImageFile(null)
      setVideoFile(null)
      setSelectedCommunity('')
      onViewChange('home')

    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: 'Failed to create post',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onViewChange('home')}
          className="rounded-xl hover:bg-[hsl(var(--threads-surface-hover))]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold">Create Post</h1>
      </div>

      <Card className="threads-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Share your thoughts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Community Selection */}
          <div className="space-y-2">
            <Label htmlFor="community">Choose a community</Label>
            <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a community..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {communities.map((community) => (
                  <SelectItem key={community.id} value={community.id} className="rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-lg bg-[hsl(var(--threads-primary))] flex items-center justify-center text-xs font-bold text-white">
                        {community.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">t/{community.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {community.memberCount.toLocaleString()} members
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Post Type Selection */}
          <Tabs value={postType} onValueChange={(value) => setPostType(value as typeof postType)}>
            <TabsList className="grid w-full grid-cols-4 bg-[hsl(var(--threads-surface))] rounded-xl">
              <TabsTrigger value="text" className="rounded-lg">
                <Type className="w-4 h-4 mr-2" />
                Text
              </TabsTrigger>
              <TabsTrigger value="image" className="rounded-lg">
                <Image className="w-4 h-4 mr-2" />
                Image
              </TabsTrigger>
              <TabsTrigger value="video" className="rounded-lg">
                <Video className="w-4 h-4 mr-2" />
                Video
              </TabsTrigger>
              <TabsTrigger value="link" className="rounded-lg">
                <Link className="w-4 h-4 mr-2" />
                Link
              </TabsTrigger>
            </TabsList>

            {/* Title Input */}
            <div className="space-y-2 mt-6">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="An interesting title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
                maxLength={300}
              />
              <div className="text-xs text-muted-foreground text-right">
                {title.length}/300
              </div>
            </div>

            {/* Content based on post type */}
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Content (optional)</Label>
                <Textarea
                  id="content"
                  placeholder="What are your thoughts?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-32 rounded-xl resize-none"
                  maxLength={10000}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {content.length}/10,000
                </div>
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Caption (optional)</Label>
                <Textarea
                  id="content"
                  placeholder="Add a caption to your image..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-24 rounded-xl resize-none"
                  maxLength={2000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Upload Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="rounded-xl"
                />
                {imageFile && (
                  <div className="mt-2">
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className="max-w-full h-48 object-cover rounded-xl"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="video" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Description (optional)</Label>
                <Textarea
                  id="content"
                  placeholder="Describe your video..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-24 rounded-xl resize-none"
                  maxLength={2000}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video">Upload Video</Label>
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="rounded-xl"
                />
                {videoFile && (
                  <div className="mt-2">
                    <video
                      src={URL.createObjectURL(videoFile)}
                      controls
                      className="max-w-full h-48 rounded-xl"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="link" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkUrl">URL</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Description (optional)</Label>
                <Textarea
                  id="content"
                  placeholder="Tell us about this link..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-24 rounded-xl resize-none"
                  maxLength={2000}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-[hsl(var(--threads-border))]">
            <Button
              variant="outline"
              onClick={() => onViewChange('home')}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || uploading || !title.trim() || !selectedCommunity}
              className="threads-gradient text-white hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-xl"
            >
              {loading || uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : loading ? 'Publishing...' : 'Publish Post'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}