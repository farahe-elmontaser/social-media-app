import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface AdItem {
  id: string;
  title: string;
  mediaUrl: string;
  caption: string;
  ctaUrl: string;
  sponsorName: string;
}

interface Props {
  ad: AdItem;
}

export default function AdCard({ ad }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.sponsorBadge, { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}>
            <Text style={[styles.sponsorInitial, { color: colors.primary }]}>
              {ad.sponsorName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.sponsorName, { color: colors.text }]}>{ad.sponsorName}</Text>
            <Text style={[styles.sponsoredLabel, { color: colors.textSecondary }]}>Sponsorisé</Text>
          </View>
        </View>
        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.more, { color: colors.text }]}>•••</Text>
        </TouchableOpacity>
      </View>

      {/* Media */}
      <Image
        source={{ uri: ad.mediaUrl }}
        style={[styles.media, { backgroundColor: colors.surface }]}
        resizeMode="cover"
      />

      {/* Body */}
      <View style={styles.body}>
        {ad.caption ? (
          <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>
            {ad.caption}
          </Text>
        ) : null}

        <View style={[styles.ctaRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.ctaLabel, { color: colors.textSecondary }]}>En savoir plus</Text>
          <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.ctaBtnText}>{ad.title}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sponsorBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorInitial: { fontSize: 15, fontWeight: '700' },
  sponsorName: { fontSize: 13.5, fontWeight: '600' },
  sponsoredLabel: { fontSize: 11, marginTop: 1 },
  more: { fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  media: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75 },
  body: { paddingHorizontal: 14, paddingBottom: 12 },
  caption: { fontSize: 13, marginTop: 8, marginBottom: 8, lineHeight: 18 },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    paddingTop: 10,
    marginTop: 4,
  },
  ctaLabel: { fontSize: 12 },
  ctaBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 6,
  },
  ctaBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
