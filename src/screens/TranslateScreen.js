// src/screens/TranslateScreen.js

import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme/colors';

const LANGUAGES = ['English', 'Italian', 'Spanish', 'French', 'Japanese', 'Arabic', 'Filipino'];

const LANG_FLAGS = {
  English: '🇬🇧', Italian: '🇮🇹', Spanish: '🇪🇸',
  French: '🇫🇷', Japanese: '🇯🇵', Arabic: '🇸🇦', Filipino: '🇵🇭',
};

const LANG_CODES = {
  English: 'en', Italian: 'it', Spanish: 'es',
  French: 'fr', Japanese: 'ja', Arabic: 'ar', Filipino: 'tl',
};

const RECENT_INIT = [
  { original: 'USCITA', translation: 'EXIT / WAY OUT', flag: '🇮🇹' },
  { original: 'MERCI', translation: 'Thank you', flag: '🇫🇷' },
  { original: 'ENTRADA', translation: 'ENTRANCE', flag: '🇪🇸' },
];

// ── LibreTranslate (free, reliable, no limits) ────────────────────
async function translateText(text, targetLang) {
  if (!text?.trim()) throw new Error('No text to translate');
  const langCode = LANG_CODES[targetLang] || 'en';

  try {
    const res = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: langCode,
      }),
    });

    if (!res.ok) throw new Error('Request failed');

    const data = await res.json();

    if (!data.translatedText) throw new Error('Empty translation returned');

    return {
      original: text,
      detectedLang: data.detectedLanguage?.language?.toUpperCase() || 'AUTO',
      translation: data.translatedText,
      pronunciation: null,
      context: null,
    };
  } catch (err) {
    throw new Error('Translation failed. Please try again.');
  }
}

// ── OCR.space API ─────────────────────────────────────────────────
async function extractTextFromImage(imageUri) {
  const formData = new FormData();

  formData.append('file', {
    uri: imageUri,
    name: 'scan.jpg',
    type: 'image/jpeg',
  });

  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '1');

  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        apikey: 'helloworld', // replace with your free key from ocr.space/ocrapi/freekey
      },
      body: formData,
    });

    const rawText = await response.text();

    if (rawText.includes('<html') || rawText.includes('503')) {
      throw new Error('The OCR server is currently overloaded. Please try again.');
    }

    const data = JSON.parse(rawText);

    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage?.[0] || 'OCR failed to read the image.');
    }

    const text = data.ParsedResults?.[0]?.ParsedText?.trim();
    if (!text) throw new Error('No readable text found in image.');

    return text;
  } catch (error) {
    throw new Error(error.message);
  }
}

// ── Component ─────────────────────────────────────────────────────
export default function TranslateScreen() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [targetLang, setTargetLang] = useState('English');
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState(RECENT_INIT);
  const [showCamera, setShowCamera] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const handleTranslate = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await translateText(text, targetLang);
      setResult(res);
      setInput(res.original || text);
      addRecent(res.original || text, res.translation, LANG_FLAGS[targetLang] || '🌐');
    } catch (err) {
      Alert.alert('Translation failed', err.message || 'Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera access needed', 'Please allow camera access to scan text.');
        return;
      }
    }
    setShowCamera(true);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        exif: false,
        skipProcessing: false,
      });

      setShowCamera(false);
      setCapturing(false);
      setLoading(true);
      setResult(null);

      const extractedText = await extractTextFromImage(photo.uri);
      await handleTranslate(extractedText);
    } catch (err) {
      Alert.alert('Scan failed', err.message || 'Could not scan or translate.');
    } finally {
      setCapturing(false);
      setLoading(false);
    }
  };

  const addRecent = (original, translation, flag) => {
    setRecent(prev => [
      { original, translation, flag },
      ...prev.filter(r => r.original !== original).slice(0, 4),
    ]);
  };

  const handleRecent = (item) => {
    setInput(item.original);
    handleTranslate(item.original);
  };

  if (showCamera) {
    return (
      <View style={styles.cameraScreen}>
        <StatusBar barStyle="light-content" />
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={styles.overlay}>
          <View style={styles.camTopBar}>
            <TouchableOpacity style={styles.camClose} onPress={() => setShowCamera(false)}>
              <Text style={styles.camCloseTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.camTitle}>Point at text</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.frameHint}>
            <View style={styles.frameBox}>
              <View style={[styles.frameCorner, styles.frameTL]} />
              <View style={[styles.frameCorner, styles.frameTR]} />
              <View style={[styles.frameCorner, styles.frameBL]} />
              <View style={[styles.frameCorner, styles.frameBR]} />
            </View>
            <Text style={styles.frameLabel}>Align text within the frame</Text>
          </View>
          <View style={styles.camBottom}>
            <Text style={styles.camHint}>→ Translating to {targetLang}</Text>
            <TouchableOpacity
              style={[styles.captureBtn, capturing && styles.captureBtnDisabled]}
              onPress={handleCapture}
              disabled={capturing}
            >
              {capturing
                ? <ActivityIndicator color="#fff" size="small" />
                : <View style={styles.captureInner} />
              }
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Translate</Text>
        <Text style={styles.headerSub}>Type or scan text to translate instantly</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        <View style={styles.langRow}>
          <View style={styles.langBox}>
            <Text style={styles.langFlag}>🌐</Text>
            <Text style={styles.langName}>Auto</Text>
          </View>
          <View style={styles.arrowBox}>
            <Text style={styles.arrow}>→</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langScroll}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langChip, targetLang === lang && styles.langChipActive]}
                onPress={() => setTargetLang(lang)}
              >
                <Text style={[styles.langChipText, targetLang === lang && styles.langChipTextActive]}>
                  {LANG_FLAGS[lang]} {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type text to translate..."
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            onSubmitEditing={() => handleTranslate()}
          />
          <TouchableOpacity
            style={[styles.translateBtn, loading && styles.btnDisabled]}
            onPress={() => handleTranslate()}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.translateBtnText}>Go</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.scanBtn} onPress={handleOpenCamera} disabled={loading}>
          <Text style={styles.scanBtnText}>📷  Point camera at text</Text>
        </TouchableOpacity>

        {loading && !result && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.terra} />
            <Text style={styles.loadingText}>Reading & translating…</Text>
          </View>
        )}

        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.fromBox}>
                <Text style={styles.fromFlag}>🌐</Text>
                <Text style={styles.fromLang}>ORIGINAL TEXT ({result.detectedLang.toUpperCase()})</Text>
              </View>
              <Text style={styles.originalText} numberOfLines={3}>
                {result.original || input}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.translationBox}>
              <Text style={styles.translationLabel}>
                TRANSLATION · {targetLang.toUpperCase()} {LANG_FLAGS[targetLang]}
              </Text>
              <Text style={styles.translationText}>{result.translation}</Text>
              {result.pronunciation && (
                <Text style={styles.pronunciation}>🔊 {result.pronunciation}</Text>
              )}
            </View>
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>🔊 Pronounce</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleTranslate(result.original)}>
                <Text style={styles.actionBtnText}>🔄 Retranslate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAlt]} onPress={() => { setResult(null); setInput(''); }}>
                <Text style={[styles.actionBtnText, { color: colors.terra }]}>✕ Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Recent Translations</Text>
        {recent.map((item, i) => (
          <TouchableOpacity key={i} style={styles.recentRow} onPress={() => handleRecent(item)}>
            <View style={styles.recentFlag}>
              <Text style={{ fontSize: 20 }}>{item.flag}</Text>
            </View>
            <View style={styles.recentInfo}>
              <Text style={styles.recentOriginal} numberOfLines={1}>{item.original}</Text>
              <Text style={styles.recentTranslation} numberOfLines={1}>{item.translation}</Text>
            </View>
            <Text style={styles.recentReplay}>▶ Replay</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  camTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  camClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  camCloseTxt: { fontSize: 18, color: '#fff' },
  camTitle: { fontFamily: 'Syne_700Bold', fontSize: 17, color: '#fff' },
  frameHint: { alignItems: 'center', gap: 16 },
  frameBox: { width: 260, height: 160, position: 'relative' },
  frameCorner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderWidth: 3 },
  frameTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  frameTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  frameBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  frameBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  frameLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  camBottom: { alignItems: 'center', gap: 16, paddingBottom: 40 },
  camHint: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.terra, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  captureBtnDisabled: { opacity: 0.6 },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.sand },
  headerTitle: { fontFamily: 'Syne_800ExtraBold', fontSize: 26, color: colors.ink },
  headerSub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.muted, marginTop: 4 },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 8, backgroundColor: colors.sand },
  langBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.sandDark, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  langFlag: { fontSize: 16 },
  langName: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.ink },
  arrowBox: { paddingHorizontal: 4 },
  arrow: { fontSize: 18, color: colors.muted },
  langScroll: { flex: 1 },
  langChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, backgroundColor: colors.sandDark },
  langChipActive: { backgroundColor: colors.terra },
  langChipText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.inkMid },
  langChipTextActive: { color: '#fff' },
  inputWrap: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.sand },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.ink, borderWidth: 1, borderColor: colors.sandDark },
  translateBtn: { backgroundColor: colors.terra, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', minWidth: 60, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  translateBtnText: { fontFamily: 'Syne_700Bold', fontSize: 13, color: '#fff' },
  scanBtn: { marginHorizontal: 20, marginBottom: 16, backgroundColor: colors.jadePale, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.jade },
  scanBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.jade },
  loadingCard: { marginHorizontal: 20, marginBottom: 16, backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.muted },
  resultCard: { marginHorizontal: 20, marginBottom: 20, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  resultHeader: { backgroundColor: colors.inkMid, padding: 16 },
  fromBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  fromFlag: { fontSize: 16 },
  fromLang: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  originalText: { fontFamily: 'Syne_800ExtraBold', fontSize: 24, color: colors.sand },
  divider: { height: 1, backgroundColor: colors.sandDark },
  translationBox: { padding: 16 },
  translationLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 6 },
  translationText: { fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.ink, marginBottom: 6 },
  pronunciation: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.muted },
  resultActions: { flexDirection: 'row', gap: 8, padding: 16, paddingTop: 0 },
  actionBtn: { flex: 1, backgroundColor: colors.sandDark, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionBtnAlt: { backgroundColor: colors.terraPale },
  actionBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.inkMid },
  sectionTitle: { fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.ink, paddingHorizontal: 20, marginBottom: 12 },
  recentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12 },
  recentFlag: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.sandDark, alignItems: 'center', justifyContent: 'center' },
  recentInfo: { flex: 1 },
  recentOriginal: { fontFamily: 'Syne_700Bold', fontSize: 13, color: colors.ink },
  recentTranslation: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.muted, marginTop: 2 },
  recentReplay: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.terra },
});