import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { apiGet, apiPost } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShareContact {
  id: string;
  username: string;
  avatar: string;
  score: number;
}

interface Props {
  postId: string | null;
  postImage?: string;
  postCaption?: string;
  postUsername?: string;
  visible: boolean;
  onClose: () => void;
}

// ─── External share platforms ─────────────────────────────────────────────────

const EXTERNAL_APPS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' as const, color: '#25D366' },
  { id: 'facebook', label: 'Facebook', icon: 'logo-facebook' as const, color: '#1877F2' },
  { id: 'snapchat', label: 'Snapchat', icon: 'logo-snapchat' as const, color: '#FFFC00' },
  { id: 'more',     label: 'More',     icon: 'share-outline' as const,  color: '#6B7280' },
];

function buildShareLink(postId: string): string {
  return `sharely://post/${postId}`;
}

async function shareExternal(appId: string, postId: string, postUsername?: string): Promise<void> {
  const link = buildShareLink(postId);
  const text = `Check out this post from @${postUsername ?? 'someone'} on Sharely 👉 ${link}`;

  if (appId === 'more') {
    await Share.share({ message: text, url: link });
    return;
  }

  const urls: Record<string, string> = {
    whatsapp: `whatsapp://send?text=${encodeURIComponent(text)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    snapchat: `snapchat://`,
  };

  const url = urls[appId];
  if (!url) return;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // App not installed — fall back to system share sheet
    await Share.share({ message: text });
  }
}

// ─── Contact row ──────────────────────────────────────────────────────────────

function ContactRow({
  contact,
  sent,
  sending,
  onSend,
}: {
  contact: ShareContact;
  sent: boolean;
  sending: boolean;
  onSend: (id: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.contactRow}>
      <Image source={{ uri: contact.avatar }} style={styles.contactAvatar} />
      <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
        {contact.username}
      </Text>
      <TouchableOpacity
        style={[
          styles.sendBtn,
          sent
            ? { backgroundColor: colors.border }
            : { backgroundColor: colors.primary },
        ]}
        onPress={() => !sent && !sending && onSend(contact.id)}
        disabled={sent || sending}
        activeOpacity={0.75}
      >
        <Text style={[styles.sendBtnText, { color: sent ? colors.textSecondary : '#fff' }]}>
          {sent ? 'Sent ✓' : sending ? '…' : 'Send'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── ShareSheet ───────────────────────────────────────────────────────────────

export default function ShareSheet({
  postId,
  postImage,
  postCaption,
  postUsername,
  visible,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [search, setSearch] = useState('');
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);

  const filtered = search.trim()
    ? contacts.filter((c) =>
        c.username.toLowerCase().includes(search.toLowerCase()),
      )
    : contacts;

  const loadSuggestions = useCallback(() => {
    apiGet<ShareContact[]>('/posts/share-suggestions')
      .then(setContacts)
      .catch(() => setContacts([]));
  }, []);

  useEffect(() => {
    if (visible) {
      loadSuggestions();
      setSentIds(new Set());
      setSearch('');
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, loadSuggestions, slideAnim]);

  const handleSend = async (receiverId: string) => {
    if (!postId || sendingId) return;
    setSendingId(receiverId);
    try {
      await apiPost(`/posts/${postId}/share`, { receiverId });
      setSentIds((prev) => new Set([...prev, receiverId]));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSendingId(null);
    }
  };

  const handleExternal = async (appId: string) => {
    if (!postId) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await shareExternal(appId, postId, postUsername);
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

        {/* Header with post preview */}
        <View style={styles.header}>
          {postImage ? (
            <Image source={{ uri: postImage }} style={styles.postThumb} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Share</Text>
            {postCaption ? (
              <Text style={[styles.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                {postCaption}
              </Text>
            ) : null}
          </View>
        </View>

        {/* External apps row */}
        <View style={[styles.externalRow, { borderBottomColor: colors.border }]}>
          {EXTERNAL_APPS.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={styles.externalBtn}
              onPress={() => handleExternal(app.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.externalIconWrap, { backgroundColor: app.color + '1A' }]}>
                <Ionicons name={app.icon} size={26} color={app.color} />
              </View>
              <Text style={[styles.externalLabel, { color: colors.textSecondary }]}>
                {app.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section title */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Send to a friend
        </Text>

        {/* Search bar */}
        <View style={[styles.searchRow, { backgroundColor: colors.surface ?? '#f3f4f6' }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search following…"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Contact list */}
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ContactRow
              contact={item}
              sent={sentIds.has(item.id)}
              sending={sendingId === item.id}
              onSend={handleSend}
            />
          )}
          contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 32 : 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {search ? 'No results.' : 'Follow people to send them posts.'}
            </Text>
          }
        />
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
    height: '75%',
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
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  postThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  caption: {
    fontSize: 12,
    marginTop: 2,
  },
  externalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    marginBottom: 14,
  },
  externalBtn: {
    alignItems: 'center',
    gap: 6,
  },
  externalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  externalLabel: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  contactName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
  },
  sendBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 30,
  },
});
