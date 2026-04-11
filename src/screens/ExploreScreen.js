// src/screens/ExploreScreen.js

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { getRecentScans, getStats, toggleSaved, isSaved, subscribe } from '../store';
import landmarks from '../data/landmarks.json';

const DISCOVER = [
  { emoji: '🍕', label: 'Food & Dining', keywords: ['food', 'dining', 'restaurant', 'cuisine', 'market', 'eat'] },
  { emoji: '🏨', label: 'Hotels',         keywords: ['hotel', 'lodge', 'inn', 'resort', 'accommodation'] },
  { emoji: '🎭', label: 'Culture',        keywords: ['historical', 'historic', 'heritage', 'museum', 'monument', 'fortress', 'church', 'shrine', 'temple', 'park', 'garden', 'art'] },
  { emoji: '🛍️', label: 'Shopping',      keywords: ['shopping', 'mall', 'market', 'bazaar', 'store'] },
];

// Matches only against `type` field, which is consistent and category-meaningful
function filterLandmarksByCategory(category) {
  const kws = category.keywords;
  return landmarks.filter(l => {
    const haystack = (l.type || '').toLowerCase();
    return kws.some(kw => haystack.includes(kw));
  });
}

export default function ExploreScreen() {
  const [recentScans, setRecentScans] = useState(getRecentScans());
  const [stats, setStats] = useState(getStats());
  const [savedState, setSavedState] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [filteredLandmarks, setFilteredLandmarks] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      setRecentScans(getRecentScans());
      setStats(getStats());
    }, [])
  );

  useEffect(() => {
    const unsub = subscribe(() => {
      setRecentScans(getRecentScans());
      setStats(getStats());
    });
    return unsub;
  }, []);

  const handleToggleSave = (name) => {
    toggleSaved(name);
    setSavedState(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleCategoryPress = (category) => {
    if (activeCategory?.label === category.label) {
      // Tap active category again to deselect
      setActiveCategory(null);
      setFilteredLandmarks([]);
    } else {
      setActiveCategory(category);
      setFilteredLandmarks(filterLandmarksByCategory(category));
    }
  };

  const nearbyLandmarks = recentScans.length > 0
    ? recentScans.map(s => s.landmark)
    : landmarks.slice(0, 5);

  const displayLandmarks = activeCategory ? filteredLandmarks : nearbyLandmarks;
  const sectionTitle = activeCategory
    ? `${activeCategory.emoji} ${activeCategory.label}`
    : recentScans.length > 0 ? 'Recently Scanned' : 'Featured Landmarks';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.location}>Explore 🌍</Text>
        </View>
        <View style={styles.statsRow}>
          {[
            { label: 'Scanned',   value: String(stats.scanned) },
            { label: 'Countries', value: String(stats.countries) },
            { label: 'Saved',     value: String(stats.saved) },
          ].map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Discover section */}
        <Text style={styles.sectionTitle}>Discover</Text>
        <View style={styles.discoverGrid}>
          {DISCOVER.map((item, i) => {
            const isActive = activeCategory?.label === item.label;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.discoverCard, isActive && styles.discoverCardActive]}
                onPress={() => handleCategoryPress(item)}
                activeOpacity={0.75}
              >
                <Text style={styles.discoverEmoji}>{item.emoji}</Text>
                <Text style={[styles.discoverLabel, isActive && styles.discoverLabelActive]}>
                  {item.label}
                </Text>
                {isActive && <View style={styles.discoverActiveDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Landmarks section — changes based on active category */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          {activeCategory && (
            <TouchableOpacity onPress={() => { setActiveCategory(null); setFilteredLandmarks([]); }}>
              <Text style={styles.clearFilter}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {displayLandmarks.length === 0 ? (
          <View style={styles.emptyScans}>
            <Text style={styles.emptyScansEmoji}>{activeCategory?.emoji || '📷'}</Text>
            <Text style={styles.emptyScansText}>
              {activeCategory
                ? `No landmarks found for "${activeCategory.label}".`
                : 'No scans yet. Point your camera at a landmark!'}
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {displayLandmarks.map((item, idx) => (
              <View key={idx} style={styles.card}>
                <View style={styles.cardImage}>
                  <Text style={styles.cardEmoji}>{item.emoji || '📍'}</Text>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={() => handleToggleSave(item.name)}
                  >
                    <Text style={{ fontSize: 16 }}>
                      {isSaved(item.name) ? '❤️' : '🤍'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardLocation} numberOfLines={1}>{item.location}</Text>
                  {item.type && (
                    <View style={styles.cardTypeBadge}>
                      <Text style={styles.cardTypeText}>{item.type}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Recent scans — hidden when a category filter is active */}
        {!activeCategory && (
          <>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            {recentScans.length === 0 ? (
              <View style={styles.emptyScans}>
                <Text style={styles.emptyScansEmoji}>📷</Text>
                <Text style={styles.emptyScansText}>No scans yet. Point your camera at a landmark!</Text>
              </View>
            ) : (
              <View style={styles.recentList}>
                {recentScans.map((item, i) => (
                  <View key={i} style={styles.recentRow}>
                    <View style={styles.recentIcon}>
                      <Text style={{ fontSize: 20 }}>{item.landmark.emoji || '📍'}</Text>
                    </View>
                    <View style={styles.recentInfo}>
                      <Text style={styles.recentName}>{item.landmark.name}</Text>
                      <Text style={styles.recentTime}>{item.time}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleToggleSave(item.landmark.name)}>
                      <Text style={{ fontSize: 18 }}>{isSaved(item.landmark.name) ? '❤️' : '🤍'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

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
  statsRow: { flexDirection: 'row', gap: 24 },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: 'Syne_800ExtraBold', fontSize: 22, color: colors.sand },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(245,239,224,0.5)', marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
    marginTop: 24, marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.ink,
    paddingHorizontal: 20, marginTop: 24, marginBottom: 14,
  },
  clearFilter: {
    fontFamily: 'DMSans_500Medium', fontSize: 12,
    color: colors.terra, paddingRight: 0,
  },
  discoverGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, gap: 12,
  },
  discoverCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    borderWidth: 2, borderColor: 'transparent',
  },
  discoverCardActive: {
    borderColor: colors.terra,
    backgroundColor: colors.terraPale,
  },
  discoverEmoji: { fontSize: 32, marginBottom: 8 },
  discoverLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.ink },
  discoverLabelActive: { color: colors.terra, fontFamily: 'DMSans_500Medium' },
  discoverActiveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.terra, marginTop: 6,
  },
  card: {
    width: 140, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardImage: {
    height: 100, backgroundColor: colors.inkMid,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  cardEmoji: { fontSize: 40 },
  saveBtn: { position: 'absolute', top: 8, right: 8 },
  cardInfo: { padding: 10 },
  cardName: { fontFamily: 'Syne_700Bold', fontSize: 12, color: colors.ink },
  cardLocation: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: colors.muted, marginTop: 2 },
  cardTypeBadge: {
    marginTop: 6, backgroundColor: colors.terraPale,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  cardTypeText: { fontFamily: 'DMSans_500Medium', fontSize: 9, color: colors.terra },
  emptyScans: {
    alignItems: 'center', paddingVertical: 24,
    marginHorizontal: 20, backgroundColor: colors.sandDark,
    borderRadius: 16, gap: 8,
  },
  emptyScansEmoji: { fontSize: 32 },
  emptyScansText: {
    fontFamily: 'DMSans_400Regular', fontSize: 13,
    color: colors.muted, textAlign: 'center', paddingHorizontal: 16,
  },
  recentList: { paddingHorizontal: 20, gap: 10 },
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    padding: 12, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  recentIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.terraPale,
    alignItems: 'center', justifyContent: 'center',
  },
  recentInfo: { flex: 1 },
  recentName: { fontFamily: 'Syne_700Bold', fontSize: 13, color: colors.ink },
  recentTime: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.muted, marginTop: 2 },
});