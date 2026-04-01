import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

export default function ProfileScreen({ navigation }) {
  const [audioNarration, setAudioNarration] = useState(true);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [offlineMode, setOfflineMode] = useState(true);

  const SettingRow = ({ icon, label, sub, hasToggle, value, onToggle, hasChevron, badge }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sub && <Text style={styles.settingSub}>{sub}</Text>}
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {hasToggle && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.sandDark, true: colors.jade }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.sandDark}
        />
      )}
      {hasChevron && <Text style={styles.chevron}>›</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        {/* Hero */}
        <LinearGradient
          colors={[colors.jade, colors.jadeLight]}
          style={styles.hero}
        >
          <View style={styles.heroDecor} />
          {/* Back / close */}
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>MR</Text>
          </View>
        </View>

        {/* Name */}
        <View style={styles.nameWrap}>
          <Text style={styles.name}>Marco Rossi</Text>
          <Text style={styles.handle}>@marco · Explorer since 2024</Text>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          {[
            { num: '24', label: 'Scans' },
            { num: '6', label: 'Countries' },
            { num: '3', label: 'Saved' },
            { num: '40', label: 'Languages' },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statNum}>{s.num}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="🔊"
              label="Audio Narration"
              sub="Auto-play on scan"
              hasToggle
              value={audioNarration}
              onToggle={setAudioNarration}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="🌐"
              label="Language"
              sub="English (US)"
              hasChevron
            />
            <View style={styles.divider} />
            <SettingRow
              icon="📴"
              label="Offline Mode"
              sub="Download maps & data"
              hasToggle
              value={offlineMode}
              onToggle={setOfflineMode}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="♿"
              label="Large Text Mode"
              sub="Increase readability"
              hasToggle
              value={largeText}
              onToggle={setLargeText}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="🔆"
              label="High Contrast"
              sub="Better visibility"
              hasToggle
              value={highContrast}
              onToggle={setHighContrast}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsCard}>
            <SettingRow icon="⭐" label="Upgrade to Pro" badge="PRO" hasChevron />
            <View style={styles.divider} />
            <SettingRow icon="🔒" label="Privacy Settings" hasChevron />
            <View style={styles.divider} />
            <SettingRow icon="💬" label="Send Feedback" hasChevron />
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  hero: {
    height: 110,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecor: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -24,
    right: -24,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: -30,
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.sand,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    fontFamily: 'Syne_800ExtraBold',
    fontSize: 18,
    color: colors.terra,
  },
  nameWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: colors.ink,
  },
  handle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.muted,
    marginTop: 3,
  },
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: 'Syne_800ExtraBold',
    fontSize: 18,
    color: colors.terra,
  },
  statLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingLeft: 2,
  },
  settingsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  settingIcon: {
    width: 32,
    height: 32,
    backgroundColor: colors.screenBg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.ink,
  },
  settingSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  chevron: {
    fontSize: 18,
    color: colors.muted,
    lineHeight: 22,
  },
  badge: {
    backgroundColor: colors.terra,
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  badgeText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 9,
    color: colors.white,
    letterSpacing: 0.8,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.sandDark,
    marginLeft: 58,
  },
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#FEE8E0',
  },
  signOutText: {
    fontFamily: 'Syne_600SemiBold',
    fontSize: 13,
    color: '#C0392B',
  },
});