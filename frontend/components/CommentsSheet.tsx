import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, FlatList, Image, KeyboardAvoidingView,
  Modal, Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { apiGet, apiPost } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommentItem {
  id: string;
  username: string;
  avatar: string;
  content: string;
  likes: number;
  isLiked: boolean;
  timeAgo: string;
  parentId: string | null;
  replies: CommentItem[];
}

interface Props {
  postId: string | null;
  visible: boolean;
  onClose: () => void;
}

// ─── Single comment row ───────────────────────────────────────────────────────

function CommentRow({
  item,
  depth = 0,
  onLike,
  onReply,
}: {
  item: CommentItem;
  depth?: number;
  onLike: (id: string) => void;
  onReply: (username: string, parentId: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.commentRow, depth > 0 && styles.commentRowReply]}>
      <Image source={{ uri: item.avatar }} style={styles.commentAvatar} />
      <View style={styles.commentBody}>
        <Text style={[styles.commentText, { color: colors.text }]}>
          <Text style={styles.commentUser}>{item.username} </Text>
          {item.content}
        </Text>
        <View style={styles.commentMeta}>
          <Text style={[styles.commentTime, { color: colors.textSecondary }]}>{item.timeAgo}</Text>
          <TouchableOpacity onPress={() => onReply(item.username, item.id)}>
            <Text style={[styles.replyBtn, { color: colors.textSecondary }]}>Reply</Text>
          </TouchableOpacity>
        </View>
        {item.replies?.map((r) => (
          <CommentRow key={r.id} item={r} depth={depth + 1} onLike={onLike} onReply={onReply} />
        ))}
      </View>
      <TouchableOpacity style={styles.commentLike} onPress={() => onLike(item.id)}>
        <Text style={{ fontSize: 12 }}>{item.isLiked ? '❤️' : '🤍'}</Text>
        {item.likes > 0 && (
          <Text style={[styles.commentLikeCount, { color: colors.textSecondary }]}>{item.likes}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── CommentsSheet ────────────────────────────────────────────────────────────

export default function CommentsSheet({ postId, visible, onClose }: Props) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ username: string; parentId: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(() => {
    if (!postId) return;
    apiGet<CommentItem[]>(`/posts/${postId}/comments`)
      .then(setComments)
      .catch((err: unknown) => {
        console.warn('[CommentsSheet] loadComments failed:', err);
      });
  }, [postId]);

  useEffect(() => {
    if (visible) {
      loadComments();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 220,
        useNativeDriver: true,
      }).start();
      setComments([]);
      setReplyTo(null);
      setText('');
      setError(null);
    }
  }, [visible, loadComments, slideAnim]);

  const handleLike = async (commentId: string) => {
    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId)
          return { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 };
        return {
          ...c,
          replies: c.replies.map((r) =>
            r.id === commentId
              ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 }
              : r,
          ),
        };
      }),
    );
    await apiPost(`/posts/comments/${commentId}/like`).catch((err: unknown) => {
      console.warn('[CommentsSheet] comment like failed:', err);
    });
  };

  const handleReply = (username: string, parentId: string) => {
    setReplyTo({ username, parentId });
    setText(`@${username} `);
    setError(null);
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || !postId || loading) return;

    setLoading(true);
    setError(null);

    // Only include parentId when it has a value — never send null
    // (NestJS ValidationPipe with forbidNonWhitelisted rejects unknown fields)
    const body: { content: string; parentId?: string } = { content: trimmed };
    if (replyTo?.parentId) body.parentId = replyTo.parentId;

    try {
      await apiPost(`/posts/${postId}/comments`, body);
      setText('');
      setReplyTo(null);
      loadComments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment';
      console.warn('[CommentsSheet] handleSubmit failed:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Text style={[styles.title, { color: colors.text }]}>Comments</Text>

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CommentRow item={item} onLike={handleLike} onReply={handleReply} />
          )}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              No comments yet. Be the first!
            </Text>
          }
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {replyTo && (
            <View style={[styles.replyBanner, { backgroundColor: colors.surface ?? '#f3f4f6' }]}>
              <Text style={[styles.replyBannerText, { color: colors.textSecondary }]}>
                Replying to @{replyTo.username}
              </Text>
              <TouchableOpacity onPress={() => { setReplyTo(null); setText(''); }}>
                <Text style={[styles.replyBannerClose, { color: colors.primary }]}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface ?? '#f3f4f6' }]}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textSecondary}
              value={text}
              onChangeText={(t) => { setText(t); if (error) setError(null); }}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!text.trim() || loading}
              style={[styles.sendBtn, { opacity: text.trim() && !loading ? 1 : 0.4 }]}
            >
              <Text style={[styles.sendText, { color: colors.primary }]}>
                {loading ? '…' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '72%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  commentRowReply: {
    marginLeft: 36,
    marginTop: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commentBody: { flex: 1 },
  commentText: { fontSize: 13.5, lineHeight: 19 },
  commentUser: { fontWeight: '700' },
  commentMeta: { flexDirection: 'row', gap: 14, marginTop: 4 },
  commentTime: { fontSize: 11 },
  replyBtn: { fontSize: 11, fontWeight: '600' },
  commentLike: { alignItems: 'center', paddingLeft: 8, paddingTop: 2 },
  commentLikeCount: { fontSize: 10, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  replyBannerText: { fontSize: 12 },
  replyBannerClose: { fontSize: 14, fontWeight: '700', paddingLeft: 10 },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderTopWidth: 0.5,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: { paddingHorizontal: 6 },
  sendText: { fontSize: 14, fontWeight: '700' },
});
