// src/screens/ExploreScreen.js

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';

const LANDMARKS = [
  { id: 1, name: 'Pantheon', location: 'Rome, Italy', distance: '280m', emoji: '🏛️', scanned: true, time: 'Today, 9:14 AM' },
  { id: 2, name: 'Trevi Fountain', location: 'Rome, Italy', distance: '510m', emoji: '⛲', scanned: false },
  { id: 3, name: 'Piazza Navona', location: 'Rome, Italy', distance: '890m', emoji: '🗿', scanned: false },
  { id: 4, name: 'Colosseum', location: 'Rome, Italy', distance: '1.2km', emoji: '🏟️', scanned: true, time: 'Yesterday, 3:42 PM' },
  { id: 5, name: 'Vatican Museums', location: 'Vatican City', distance: '2.3km', emoji: '🎨', scanned: false },
];

const RECENT = LANDMARKS.filter(l => l.scanned);

const STATS = [
  { label: 'Scanned', value: '24' },
  { label: 'Countries', value: '6' },
  { label: 'Saved', value: '3' },
];

export default function ExploreScreen() {
  const [saved, setSaved] = useState([]);

  const toggleSave = (id) => {
    setSaved(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning, Marco</Text>
          <Text style={styles.location}>Explore Rome 🇮🇹</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Nearby landmarks */}
        <Text style={styles.sectionTitle}>Nearby Landmarks</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        >
          {LANDMARKS.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardImage}>
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{item.distance}</Text>
                </View>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => toggleSave(item.id)}
                >
                  <Text style={{ fontSize: 16 }}>
                    {saved.includes(item.id) ? '❤️' : '🤍'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardLocation}>{item.location}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Recent scans */}
        <Text style={styles.sectionTitle}>Recent Scans</Text>
        <View style={styles.recentList}>
          {RECENT.map((item) => (
            <TouchableOpacity key={item.id} style={styles.recentRow}>
              <View style={styles.recentIcon}>
                <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentName}>{item.name}</Text>
                <Text style={styles.recentTime}>{item.time}</Text>
              </View>
              <Text style={styles.replayBtn}>▶ Replay</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Discover section */}
        <Text style={styles.sectionTitle}>Discover</Text>
        <View style={styles.discoverGrid}>
          {[
            { emoji: '🍕', label: 'Food & Dining' },
            { emoji: '🏨', label: 'Hotels' },
            { emoji: '🎭', label: 'Culture' },
            { emoji: '🛍️', label: 'Shopping' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.discoverCard}>
              <Text style={styles.discoverEmoji}>{item.emoji}</Text>
              <Text style={styles.discoverLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  header: {
    backgroundColor: colors.ink,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24,
  },
  greeting: {
    fontFamily: 'DMSans_400Regular', fontSize: 13,
    color: 'rgba(245,239,224,0.5)', marginBottom: 4,
  },
  location: {
    fontFamily: 'Syne_800ExtraBold', fontSize: 24,
    color: colors.sand, marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row', gap: 24,
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontFamily: 'Syne_800ExtraBold', fontSize: 22, color: colors.sand,
  },
  statLabel: {
    fontFamily: 'DMSans_400Regular', fontSize: 11,
    color: 'rgba(245,239,224,0.5)', marginTop: 2,
  },
  sectionTitle: {
    fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.ink,
    paddingHorizontal: 20, marginTop: 24, marginBottom: 14,
  },
  card: {
    width: 140, backgroundColor: '#fff',
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardImage: {
    height: 100, backgroundColor: colors.inkMid,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  cardEmoji: { fontSize: 40 },
  cardBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(26,18,8,0.7)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  cardBadgeText: {
    fontFamily: 'DMSans_500Medium', fontSize: 10, color: '#fff',
  },
  saveBtn: {
    position: 'absolute', top: 8, right: 8,
  },
  cardInfo: { padding: 10 },
  cardName: {
    fontFamily: 'Syne_700Bold', fontSize: 12, color: colors.ink,
  },
  cardLocation: {
    fontFamily: 'DMSans_400Regular', fontSize: 10,
    color: colors.muted, marginTop: 2,
  },
  recentList: { paddingHorizontal: 20, gap: 10 },
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    padding: 12, gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  recentIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.terraPale,
    alignItems: 'center', justifyContent: 'center',
  },
  recentInfo: { flex: 1 },
  recentName: {
    fontFamily: 'Syne_700Bold', fontSize: 13, color: colors.ink,
  },
  recentTime: {
    fontFamily: 'DMSans_400Regular', fontSize: 11,
    color: colors.muted, marginTop: 2,
  },
  replayBtn: {
    fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.terra,
  },
  discoverGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, gap: 12,
  },
  discoverCard: {
    width: '47%', backgroundColor: '#fff',
    borderRadius: 14, padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  discoverEmoji: { fontSize: 32, marginBottom: 8 },
  discoverLabel: {
    fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.ink,
  },
});
