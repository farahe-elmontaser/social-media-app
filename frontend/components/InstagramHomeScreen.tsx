import { useFocusEffect } from '@react-navigation/native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../utils/api';
import CommentsSheet from './CommentsSheet';
import ShareSheet from './ShareSheet';
import AdCard, { AdItem } from './AdCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AD_INTERVAL = 8;

// ─── Types ────────────────────────────────────────────────────────────────────

type Story = {
  id: string;
  username: string;
  avatar: string;
  imageUrl?: string;
  isOwn?: boolean;
};

type ApiStory = {
  id: string;
  imageUrl: string;
  user: { id: string; username: string; avatar: string };
};

type Post = {
  id: string;
  username: string;
  avatar: string;
  location: string;
  image: string;
  likes: number;
  caption: string;
  comments: number;
  timeAgo: string;
  isLiked: boolean;
  isSaved: boolean;
};

type FeedResponse = {
  posts: Post[];
  nextCursor: string | null;
  feedType: 'following' | 'discover';
};

type FeedItem =
  | { type: 'post'; data: Post; key: string }
  | { type: 'ad'; data: AdItem; key: string };

// ─── Heart animation hook ─────────────────────────────────────────────────────

function useLikeAnimation() {
  const scale = useRef(new Animated.Value(1)).current;

  const pulse = () => {
    scale.setValue(1);
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 40,
        bounciness: 12,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
    ]).start();
  };

  return { scale, pulse };
}

// ─── Story Item ───────────────────────────────────────────────────────────────

function StoryItem({ item }: { item: Story }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={styles.storyContainer}
      activeOpacity={0.7}
      onPress={() => {
        if (item.isOwn) {
          router.push('/Camera');
        } else {
          router.push({
            pathname: '/story/[userId]',
            params: {
              userId: item.id,
              imageUrl: item.imageUrl ?? '',
              username: item.username,
              avatar: item.avatar,
            },
          });
        }
      }}
    >
      <View style={[styles.storyRing, { borderColor: item.isOwn ? colors.border : colors.storyRing }]}>
        <Image source={{ uri: item.avatar }} style={[styles.storyAvatar, { borderColor: colors.background }]} />
        {item.isOwn && (
          <View style={[styles.storyAddBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>+</Text>
          </View>
        )}
      </View>
      <Text style={[styles.storyUsername, { color: colors.text }]} numberOfLines={1}>
        {item.isOwn ? 'Your Story' : item.username}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onCommentPress,
  onSharePress,
}: {
  post: Post;
  onCommentPress: (postId: string) => void;
  onSharePress: (post: Post) => void;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const [liked, setLiked] = useState(post.isLiked);
  const [saved, setSaved] = useState(post.isSaved);
  const [likes, setLikes] = useState(post.likes);
  const { scale, pulse } = useLikeAnimation();

  const handleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes((prev) => (next ? prev + 1 : prev - 1));
    if (next) pulse();
    try {
      await apiPost(`/posts/${post.id}/like`);
    } catch (err: unknown) {
      console.warn('[PostCard] like failed:', err instanceof Error ? err.message : err);
      setLiked(!next);
      setLikes((prev) => (next ? prev - 1 : prev + 1));
    }
  };

  const handleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await apiPost(`/posts/${post.id}/save`);
    } catch (err: unknown) {
      console.warn('[PostCard] save failed:', err instanceof Error ? err.message : err);
      setSaved(!next);
    }
  };

  return (
    <View style={[styles.postCard, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.postHeaderLeft}
          activeOpacity={0.8}
          onPress={() =>
            router.push({ pathname: '/user/[username]', params: { username: post.username } })
          }
        >
          <View style={[styles.postAvatarRing, { borderColor: colors.storyRing }]}>
            <Image source={{ uri: post.avatar }} style={styles.postAvatar} />
          </View>
          <View>
            <Text style={[styles.postUsername, { color: colors.text }]}>{post.username}</Text>
            {post.location ? (
              <Text style={[styles.postLocation, { color: colors.textSecondary }]}>{post.location}</Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* FIX: Remplacé "•••" (caractères qui s'affichaient en ?) par une icône Ionicons */}
        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Image with double-tap like */}
      <TouchableOpacity activeOpacity={0.97} onPress={handleLike}>
        <Image
          source={{ uri: post.image }}
          style={[styles.postImage, { backgroundColor: colors.surface }]}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actionBar}>
        <View style={styles.actionLeft}>
          <TouchableOpacity onPress={handleLike} style={styles.actionBtn} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale }] }}>
              {liked ? (
                <AntDesign name="heart" size={26} color="#FF3040" />
              ) : (
                <Ionicons name="heart-outline" size={26} color={colors.text} />
              )}
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onCommentPress(post.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => onSharePress(post)}>
            <Ionicons name="paper-plane-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSave} style={styles.actionBtn} activeOpacity={0.7}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={saved ? colors.primary : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Meta */}
      <View style={styles.postMeta}>
        <Text style={[styles.likesText, { color: colors.text }]}>{likes.toLocaleString()} likes</Text>
        <Text style={[styles.captionText, { color: colors.text }]}>
          <Text style={[styles.postUsername, { color: colors.text }]}>{post.username} </Text>
          {post.caption}
        </Text>
        <TouchableOpacity onPress={() => onCommentPress(post.id)}>
          <Text style={[styles.commentsLink, { color: colors.textSecondary }]}>
            View all {post.comments} comments
          </Text>
        </TouchableOpacity>
        <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>{post.timeAgo}</Text>
      </View>
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <Text style={[styles.logoText, { color: colors.primary }]}>Sharely</Text>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Ionicons name="paper-plane-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Stories header component (for FlatList header) ──────────────────────────

function StoriesHeader({ stories }: { stories: Story[] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.storiesWrapper, { backgroundColor: colors.background }]}>
      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StoryItem item={item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesList}
      />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InstagramHomeScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [feedType, setFeedType] = useState<'following' | 'discover' | null>(null);
  const [loadError, setLoadError] = useState(false);

  const cursorRef = useRef<string | null | undefined>(undefined);
  const loadingMoreRef = useRef(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const adPoolRef = useRef<AdItem[]>([]);
  const adIndexRef = useRef(0);
  const postCountRef = useRef(0);

  const getNextAd = (): AdItem | null => {
    if (!adPoolRef.current.length) return null;
    const ad = adPoolRef.current[adIndexRef.current % adPoolRef.current.length];
    adIndexRef.current += 1;
    return ad;
  };

  // FIX: injectAds extrait hors du useCallback — n'a plus de dépendance sur feedItems
  const injectAds = (posts: Post[], offset: number): FeedItem[] => {
    const items: FeedItem[] = [];
    posts.forEach((post, i) => {
      items.push({ type: 'post', data: post, key: `post-${post.id}` });
      const globalIndex = offset + i + 1;
      if (globalIndex % AD_INTERVAL === 0) {
        const ad = getNextAd();
        if (ad) items.push({ type: 'ad', data: ad, key: `ad-${ad.id}-${globalIndex}` });
      }
    });
    return items;
  };

  // FIX: loadFeed n'a plus cursor ni feedItems dans ses dépendances
  // On utilise des refs pour lire leurs valeurs courantes sans re-créer la fonction
  const loadFeed = useCallback(async (reset = false) => {
    if (!reset && cursorRef.current === null) return; // plus de pages
    if (!reset && loadingMoreRef.current) return; // déjà en cours

    if (reset) {
      setLoadingInitial(true);
      cursorRef.current = undefined;
      postCountRef.current = 0;
      adIndexRef.current = 0;
      setFeedItems([]);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({ limit: '10' });
      if (!reset && cursorRef.current) params.set('cursor', cursorRef.current);

      const [feedRes, adsRes] = await Promise.all([
        apiGet<FeedResponse>(`/posts/feed?${params}`),
        adPoolRef.current.length
          ? Promise.resolve(null)
          : apiGet<AdItem[]>('/ads').catch(() => [] as AdItem[]),
      ]);

      if (adsRes) adPoolRef.current = adsRes as AdItem[];

      const offset = postCountRef.current;
      const newItems = injectAds(feedRes.posts, offset);
      postCountRef.current += feedRes.posts.length;

      setFeedItems((prev) => (reset ? newItems : [...prev, ...newItems]));
      cursorRef.current = feedRes.nextCursor;
      if (reset) {
        setFeedType(feedRes.feedType);
        setLoadError(false);
      }
    } catch (err: unknown) {
      console.warn('[Feed] loadFeed failed:', err instanceof Error ? err.message : err);
      // Stop further retries — FlatList onEndReached checks cursorRef !== null
      cursorRef.current = null;
      if (reset) setLoadError(true);
    } finally {
      setLoadingInitial(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  // FIX: dépendances vides — on lit tout depuis les refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStories = useCallback(() => {
    const ownEntry: Story = {
      id: 'own',
      username: 'Your Story',
      avatar: user?.avatar ?? 'https://i.pravatar.cc/150?img=1',
      isOwn: true,
    };
    apiGet<ApiStory[]>('/stories')
      .then((data) => {
        const mapped: Story[] = data.map((s) => ({
          id: s.id,
          username: s.user.username,
          avatar: s.user.avatar,
          imageUrl: s.imageUrl,
        }));
        setStories([ownEntry, ...mapped]);
      })
      .catch(() => setStories([ownEntry]));
  }, [user]);

  // FIX: useFocusEffect stable — loadFeed et fetchStories sont stables grâce aux refs
  useFocusEffect(
    useCallback(() => {
      fetchStories();
      loadFeed(true);
    }, [fetchStories, loadFeed]),
  );

  const handleEndReached = useCallback(() => {
    if (!loadingMoreRef.current && cursorRef.current !== null) {
      loadFeed(false);
    }
  }, [loadFeed]);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.type === 'ad') return <AdCard ad={item.data} />;
    return (
      <PostCard
        post={item.data}
        onCommentPress={setActivePostId}
        onSharePress={setSharePost}
      />
    );
  }, []);

  const keyExtractor = useCallback((item: FeedItem) => item.key, []);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <Header />

      {loadingInitial ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} size="large" />
      ) : loadError ? (
        <View style={styles.errorState}>
          <Text style={[styles.errorStateText, { color: colors.textSecondary }]}>
            Could not connect to server.{'\n'}Make sure the backend is running.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.primary }]}
            onPress={() => { cursorRef.current = undefined; loadFeed(true); }}
          >
            <Text style={[styles.retryBtnText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              <StoriesHeader stories={stories} />
              {feedType === 'discover' && (
                <View style={[styles.feedBanner, { backgroundColor: colors.surface ?? '#f3f4f6' }]}>
                  <Text style={[styles.feedBannerText, { color: colors.textSecondary }]}>
                    ✦ For You — follow people to see their posts here
                  </Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No posts yet.
            </Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ margin: 20 }} color={colors.primary} />
            ) : null
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      <CommentsSheet
        postId={activePostId}
        visible={!!activePostId}
        onClose={() => setActivePostId(null)}
      />

      <ShareSheet
        postId={sharePost?.id ?? null}
        postImage={sharePost?.image}
        postCaption={sharePost?.caption}
        postUsername={sharePost?.username}
        visible={!!sharePost}
        onClose={() => setSharePost(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  logoText: { fontSize: 26, fontWeight: '800', letterSpacing: 1.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIconBtn: { padding: 6 },
  storiesWrapper: {},
  storiesList: { paddingHorizontal: 12, paddingVertical: 10 },
  storyContainer: { alignItems: 'center', marginHorizontal: 6, width: 66 },
  storyRing: { width: 66, height: 66, borderRadius: 33, padding: 2, borderWidth: 2.5 },
  storyAvatar: { width: 57, height: 57, borderRadius: 28.5, borderWidth: 2 },
  storyAddBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  storyUsername: { fontSize: 11, marginTop: 5, textAlign: 'center', maxWidth: 66 },
  divider: { height: 0.5 },
  postCard: { marginBottom: 4 },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatarRing: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, padding: 1 },
  postAvatar: { width: 28, height: 28, borderRadius: 14 },
  postUsername: { fontSize: 13.5, fontWeight: '600' },
  postLocation: { fontSize: 11, marginTop: 1 },
  postImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: { padding: 4, marginRight: 4 },
  postMeta: { paddingHorizontal: 14, paddingBottom: 14, gap: 2 },
  likesText: { fontSize: 13.5, fontWeight: '600', marginBottom: 2 },
  captionText: { fontSize: 13.5, lineHeight: 18, marginBottom: 3 },
  commentsLink: { fontSize: 13, marginBottom: 3 },
  timeAgo: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 60, fontSize: 14 },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, marginTop: 80 },
  errorStateText: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  retryBtnText: { fontSize: 14, fontWeight: '600' },
  feedBanner: { paddingHorizontal: 16, paddingVertical: 8 },
  feedBannerText: { fontSize: 12, textAlign: 'center' },
});