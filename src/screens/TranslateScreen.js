// src/screens/TranslateScreen.js

import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import { colors } from '../theme/colors';

const LANGUAGES = [
  { name: 'English', code: 'en', flag: '🇬🇧' },
  { name: 'Filipino', code: 'tl', flag: '🇵🇭' },
  { name: 'Italian', code: 'it', flag: '🇮🇹' },
  { name: 'Spanish', code: 'es', flag: '🇪🇸' },
  { name: 'French', code: 'fr', flag: '🇫🇷' },
  { name: 'Japanese', code: 'ja', flag: '🇯🇵' },
  { name: 'Korean', code: 'ko', flag: '🇰🇷' },
  { name: 'Chinese', code: 'zh', flag: '🇨🇳' },
  { name: 'Arabic', code: 'ar', flag: '🇸🇦' },
  { name: 'German', code: 'de', flag: '🇩🇪' },
];

const RECENT_INIT = [
  { original: 'Hello, where is the park?', translation: 'Ciao, dov\'è il parco?', fromFlag: '🇬🇧', toFlag: '🇮🇹' },
  { original: 'How much does this cost?', translation: '¿Cuánto cuesta esto?', fromFlag: '🇬🇧', toFlag: '🇪🇸' },
  { original: 'Thank you very much', translation: 'Merci beaucoup', fromFlag: '🇬🇧', toFlag: '🇫🇷' },
];

async function translateText(text, fromCode, toCode) {
  if (!text?.trim()) throw new Error('Please enter text to translate');

  // MyMemory free API — no key needed, reliable
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromCode}|${toCode}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('MyMemory failed');
    const data = await response.json();
    // MyMemory returns 200 even on errors, check responseStatus
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    throw new Error(data.responseDetails || 'Translation failed');
  } catch (err) {
    throw new Error('Translation failed. Please check your connection and try again.');
  }
}



export default function TranslateScreen() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [fromLang, setFromLang] = useState(LANGUAGES[0]);
  const [toLang, setToLang] = useState(LANGUAGES[2]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recent, setRecent] = useState(RECENT_INIT);
  const [selectingFrom, setSelectingFrom] = useState(false);
  const [selectingTo, setSelectingTo] = useState(false);

  const [isListening, setIsListening] = useState(false);

  const handleTranslate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult('');
    try {
      const translated = await translateText(input, fromLang.code, toLang.code);
      setResult(translated);
      setRecent(prev => [
        { original: input, translation: translated, fromFlag: fromLang.flag, toFlag: toLang.flag },
        ...prev.filter(r => r.original !== input).slice(0, 4),
      ]);
    } catch (err) {
      Alert.alert('Translation failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);
    setInput(result);
    setResult(input);
  };

  const handleListen = async (text, langCode) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    try {
      setIsSpeaking(true);
      const speechLangCode = langCode === 'tl' ? 'fil-PH' : langCode;
      await Speech.speak(text, {
        language: speechLangCode,
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => {
          setIsSpeaking(false);
          Alert.alert('Speech Error', 'Could not play audio for this language');
        },
      });
    } catch (err) {
      setIsSpeaking(false);
      Alert.alert('Speech Error', err.message);
    }
  };

  const handleRecentTap = (item) => {
    setInput(item.original);
    setResult(item.translation);
  };



  // FIX 2: Voice input — only show the alert when starting, not when stopping
  const handleVoiceInput = async () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    setIsListening(true);
    Alert.alert(
      'Voice Input',
      'Speak clearly in ' + fromLang.name + '. This feature requires native speech recognition setup.',
      [{ text: 'OK', onPress: () => setIsListening(false) }]
    );
  };



  // Language picker
  if (selectingFrom || selectingTo) {
    const isFrom = selectingFrom;
    return (
      <View style={styles.pickerContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>
            Select {isFrom ? 'source' : 'target'} language
          </Text>
          <TouchableOpacity onPress={() => { setSelectingFrom(false); setSelectingTo(false); }}>
            <Text style={styles.pickerClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.pickerRow,
                (isFrom ? fromLang.code : toLang.code) === lang.code && styles.pickerRowActive,
              ]}
              onPress={() => {
                if (isFrom) setFromLang(lang);
                else setToLang(lang);
                setSelectingFrom(false);
                setSelectingTo(false);
              }}
            >
              <Text style={styles.pickerFlag}>{lang.flag}</Text>
              <Text style={styles.pickerLangName}>{lang.name}</Text>
              {(isFrom ? fromLang.code : toLang.code) === lang.code && (
                <Text style={styles.pickerCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Translate</Text>
        <Text style={styles.headerSub}>Translate text to any language</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Language selector */}
        <View style={styles.langSelector}>
          <TouchableOpacity style={styles.langBtn} onPress={() => setSelectingFrom(true)}>
            <Text style={styles.langBtnFlag}>{fromLang.flag}</Text>
            <Text style={styles.langBtnName}>{fromLang.name}</Text>
            <Text style={styles.langBtnArrow}>▾</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
            <Text style={styles.swapIcon}>⇄</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.langBtn} onPress={() => setSelectingTo(true)}>
            <Text style={styles.langBtnFlag}>{toLang.flag}</Text>
            <Text style={styles.langBtnName}>{toLang.name}</Text>
            <Text style={styles.langBtnArrow}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Input box */}
        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <Text style={styles.inputLang}>{fromLang.flag} {fromLang.name}</Text>
            {input.length > 0 && (
              <TouchableOpacity onPress={() => { setInput(''); setResult(''); }}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={`Type in ${fromLang.name}...`}
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.inputFooter}>
            {input.length > 0 && (
              <TouchableOpacity
                style={styles.listenBtn}
                onPress={() => handleListen(input, fromLang.code)}
              >
                <Text style={styles.listenBtnText}>🔊 Listen</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.voiceBtn, isListening && styles.voiceBtnActive]}
              onPress={handleVoiceInput}
            >
              <Text style={styles.voiceBtnText}>{isListening ? '⏹' : '🎤'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.translateBtn, (!input.trim() || loading) && styles.btnDisabled]}
              onPress={handleTranslate}
              disabled={!input.trim() || loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.translateBtnText}>Translate →</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Result box */}
        {result ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultLang}>{toLang.flag} {toLang.name}</Text>
            </View>
            <Text style={styles.resultText}>{result}</Text>
            <View style={styles.resultFooter}>
              <TouchableOpacity
                style={[styles.listenBtn, styles.listenBtnResult]}
                onPress={() => handleListen(result, toLang.code)}
              >
                <Text style={styles.listenBtnText}>
                  {isSpeaking ? '⏹ Stop' : '🔊 Listen'}
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        ) : (
          <View style={styles.emptyResult}>
            <Text style={styles.emptyResultText}>Translation will appear here</Text>
          </View>
        )}

        {/* Quick phrases */}
        <Text style={styles.sectionTitle}>Quick Phrases</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {[
            'Hello!',
            'Thank you',
            'Where is the bathroom?',
            'How much does this cost?',
            'I need help',
            'Do you speak English?',
          ].map((phrase, i) => (
            <TouchableOpacity
              key={i}
              style={styles.phraseChip}
              onPress={() => { setInput(phrase); setResult(''); }}
            >
              <Text style={styles.phraseChipText}>{phrase}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recent */}
        <Text style={styles.sectionTitle}>Recent</Text>
        {recent.map((item, i) => (
          <TouchableOpacity key={i} style={styles.recentRow} onPress={() => handleRecentTap(item)}>
            <View style={styles.recentFlags}>
              <Text style={styles.recentFlag}>{item.fromFlag}</Text>
              <Text style={styles.recentArrow}>→</Text>
              <Text style={styles.recentFlag}>{item.toFlag}</Text>
            </View>
            <View style={styles.recentInfo}>
              <Text style={styles.recentOriginal} numberOfLines={1}>{item.original}</Text>
              <Text style={styles.recentTranslation} numberOfLines={1}>{item.translation}</Text>
            </View>
            <TouchableOpacity onPress={() => handleListen(item.translation, toLang.code)}>
              <Text style={styles.recentListen}>🔊</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },

  // Header
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.sand },
  headerTitle: { fontFamily: 'Syne_800ExtraBold', fontSize: 26, color: colors.ink },
  headerSub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.muted, marginTop: 4 },

  // Language selector
  langSelector: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.sand, gap: 10,
  },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 6, borderWidth: 1, borderColor: colors.sandDark,
  },
  langBtnFlag: { fontSize: 18 },
  langBtnName: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.ink },
  langBtnArrow: { fontSize: 12, color: colors.muted },
  swapBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.terra,
    alignItems: 'center', justifyContent: 'center',
  },
  swapIcon: { fontSize: 16, color: '#fff' },

  // Input card
  inputCard: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  inputLang: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.muted },
  clearBtn: { fontSize: 16, color: colors.muted },
  input: {
    fontFamily: 'DMSans_400Regular', fontSize: 16,
    color: colors.ink, minHeight: 80,
    textAlignVertical: 'top',
  },
  inputFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  listenBtn: {
    backgroundColor: colors.sandDark, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  listenBtnResult: { backgroundColor: colors.jadePale },
  listenBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.inkMid },
  voiceBtn: { backgroundColor: colors.sandDark, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  voiceBtnActive: { backgroundColor: colors.terra },
  voiceBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.inkMid },
  translateBtn: {
    backgroundColor: colors.terra, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  btnDisabled: { opacity: 0.5 },
  translateBtnText: { fontFamily: 'Syne_700Bold', fontSize: 13, color: '#fff' },

  // Result card
  resultCard: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: colors.inkMid, borderRadius: 16,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  resultHeader: { marginBottom: 10 },
  resultLang: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: 'rgba(245,239,224,0.6)' },
  resultText: {
    fontFamily: 'Syne_700Bold', fontSize: 20,
    color: colors.sand, lineHeight: 28, marginBottom: 14,
  },
  resultFooter: { flexDirection: 'row', gap: 10 },
  copyBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  copyBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.sand },
  emptyResult: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: colors.sandDark, borderRadius: 16,
    padding: 24, alignItems: 'center',
  },
  emptyResultText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.muted },

  // Quick phrases
  sectionTitle: {
    fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.ink,
    paddingHorizontal: 20, marginBottom: 12, marginTop: 8,
  },
  phraseChip: {
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.sandDark,
  },
  phraseChipText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.inkMid },

  // Recent
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 20,
    borderRadius: 12, padding: 12, marginBottom: 8, gap: 12,
  },
  recentFlags: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  recentFlag: { fontSize: 16 },
  recentArrow: { fontSize: 10, color: colors.muted },
  recentInfo: { flex: 1 },
  recentOriginal: { fontFamily: 'Syne_700Bold', fontSize: 13, color: colors.ink },
  recentTranslation: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.muted, marginTop: 2 },
  recentListen: { fontSize: 20 },

  // Language picker
  pickerContainer: { flex: 1, backgroundColor: colors.screenBg },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: colors.sand,
  },
  pickerTitle: { fontFamily: 'Syne_800ExtraBold', fontSize: 20, color: colors.ink },
  pickerClose: { fontSize: 20, color: colors.muted },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.sandDark,
    backgroundColor: '#fff',
  },
  pickerRowActive: { backgroundColor: colors.jadePale },
  pickerFlag: { fontSize: 28 },
  pickerLangName: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.ink },
  pickerCheck: { fontSize: 18, color: colors.jade, fontWeight: 'bold' },


});