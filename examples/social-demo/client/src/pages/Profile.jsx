import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import PostCard from '../components/post/PostCard';
import { Calendar, Link as LinkIcon, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sanitizeUrl } from '../lib/utils';

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const response = await dataApi.getProfiles({ username });
      return Array.isArray(response.data) ? response.data[0] : response.data?.data?.[0];
    },
  });

  // Fetch user posts
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: async () => {
      if (!profile) return [];
      const response = await dataApi.getPosts({
        authorId: profile.userId,
        sort: 'createdAt:-1',
        limit: 50,
      });
      return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    },
    enabled: !!profile,
  });

  // Check if following
  const { data: followData } = useQuery({
    queryKey: ['follow-status', profile?.userId],
    queryFn: async () => {
      const response = await dataApi.getFollows({
        followerId: currentUser.userId || currentUser._id,
        followingId: profile.userId,
      });
      return Array.isArray(response.data) ? response.data[0] : response.data?.data?.[0];
    },
    enabled: !!profile && !!currentUser && profile.userId !== (currentUser.userId || currentUser._id),
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (followData) {
        await dataApi.deleteFollow(followData._id);
      } else {
        await dataApi.createFollow({
          followerId: currentUser.userId || currentUser._id,
          followingId: profile.userId,
          createdAt: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', profile.userId] });
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
    },
  });

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log('Component Render - profile:', profile, 'posts:', posts);

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-xl font-bold mb-2">User not found</p>
        <p className="text-gray-500">@{username} doesn't exist</p>
      </div>
    );
  }

  const isOwnProfile = (currentUser?.userId || currentUser?._id) === profile.userId;

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="h-48 bg-gradient-to-r from-primary to-blue-600">
        {profile.banner && (
          <img src={sanitizeUrl(profile.banner)} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-start -mt-16 mb-4">
          <Avatar
            src={profile.avatar}
            alt={profile.displayName || profile.username}
            size="xl"
            verified={profile.verified}
            className="border-4 border-white dark:border-black"
          />
          {isOwnProfile ? (
            <Button variant="outline" className="mt-16" onClick={() => window.location.href = '/settings'}>
              Edit Profile
            </Button>
          ) : (
            <Button
              variant={followData ? 'secondary' : 'primary'}
              className="mt-16"
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
            >
              {followMutation.isPending ? '...' : followData ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-bold">{profile.displayName || profile.username}</h1>
          <p className="text-gray-500">@{profile.username}</p>
        </div>

        {profile.bio && (
          <p className="mb-4 text-gray-900 dark:text-white">{profile.bio}</p>
        )}

        <div className="flex flex-wrap gap-4 text-gray-500 text-sm mb-4">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.website && (
            <div className="flex items-center gap-1">
              <LinkIcon className="w-4 h-4" />
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Joined {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}</span>
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <div>
            <span className="font-bold">{profile.followingCount || 0}</span>
            <span className="text-gray-500 ml-1">Following</span>
          </div>
          <div>
            <span className="font-bold">{profile.followersCount || 0}</span>
            <span className="text-gray-500 ml-1">Followers</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex">
          <button className="flex-1 py-4 font-semibold border-b-2 border-primary">
            Posts
          </button>
        </div>
      </div>

      {/* Posts */}
      {postsLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : posts?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No posts yet</p>
        </div>
      ) : (
        posts?.map((post) => <PostCard key={post._id} post={post} />)
      )}
    </div>
  );
}
