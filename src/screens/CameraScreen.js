// src/screens/CameraScreen.js

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, StatusBar, Alert, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';
import landmarks from '../data/landmarks.json';
import { setCurrentLandmark } from './VoiceScreen';

const { width, height } = Dimensions.get('window');
const FRAME_SIZE = width * 0.72;

// ── Your Teachable Machine model URL ────────────────────────────
const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/NoUercEoc/';

// ── Match result to landmarks.json ──────────────────────────────
function getLandmarkData(predictedLabel) {
  if (!predictedLabel) return null;
  const clean = predictedLabel.toLowerCase().trim();
  return landmarks.find(l =>
    l.name.toLowerCase().includes(clean) ||
    clean.includes(l.name.toLowerCase()) ||
    l.tags?.some(tag => clean.includes(tag))
  ) || {
    name: predictedLabel,
    location: 'Unknown Location',
    year: 'Unknown',
    type: 'Landmark',
    emoji: '📍',
    shortDescription: `Identified as ${predictedLabel}.`,
    fullHistory: `This appears to be ${predictedLabel} based on visual recognition.`,
    funFacts: [],
    visitingHours: 'N/A',
    ticketPrice: 'N/A',
  };
}

// ── Teachable Machine inference via WebView ──────────────────────
const TM_INFERENCE_HTML = (modelUrl, base64) => `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@teachablemachine/image@latest/dist/teachablemachine-image.min.js"></script>
</head>
<body>
<script>
async function run() {
  try {
    const modelURL = "${modelUrl}model.json";
    const metadataURL = "${modelUrl}metadata.json";
    const model = await tmImage.load(modelURL, metadataURL);

    const img = new Image();
    img.onload = async function() {
      const predictions = await model.predict(img);
      const top = predictions.reduce((a, b) => a.probability > b.probability ? a : b);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        success: true,
        label: top.className,
        confidence: Math.round(top.probability * 100),
        all: predictions.map(p => ({ label: p.className, confidence: Math.round(p.probability * 100) }))
      }));
    };
    img.src = "data:image/jpeg;base64,${base64}";
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ success: false, error: e.message }));
  }
}
run();
</script>
</body>
</html>
`;

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [inferenceHTML, setInferenceHTML] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const cameraRef = useRef(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleScan = async () => {
    if (scanning || !cameraRef.current) return;
    setScanning(true);
    setResult(null);
    setInferenceHTML(null);
    resultAnim.setValue(0);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: true,
        skipProcessing: true,
      });

      // Trigger WebView inference
      setInferenceHTML(TM_INFERENCE_HTML(MODEL_URL, photo.base64));
    } catch (err) {
      Alert.alert('Error', 'Could not take photo. Try again.');
      setScanning(false);
    }
  };

  const handleInferenceMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setInferenceHTML(null);

      if (data.success) {
        const landmarkData = getLandmarkData(data.label);

        // Set the scanned landmark so VoiceScreen knows what to answer about
        setCurrentLandmark(landmarkData);

        setResult({
          ...landmarkData,
          confidence: data.confidence,
          allPredictions: data.all,
        });

        Animated.spring(resultAnim, {
          toValue: 1, tension: 60, friction: 8, useNativeDriver: true,
        }).start();
      } else {
        Alert.alert('Could not identify', 'Try pointing at a clearer view of the landmark.');
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setShowDetails(false);
    resultAnim.setValue(0);
  };

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_SIZE - 4],
  });

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permContainer]}>
        <Text style={styles.permEmoji}>📷</Text>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permText}>TravelGuru needs your camera to identify landmarks.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Hidden WebView for TM inference */}
      {inferenceHTML && (
        <WebView
          style={styles.hiddenWebView}
          source={{ html: inferenceHTML }}
          javaScriptEnabled
          onMessage={handleInferenceMessage}
          originWhitelist={['*']}
        />
      )}

      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View style={styles.overlayTop} />
      <View style={styles.overlayBottom} />
      <View style={styles.overlayLeft} />
      <View style={styles.overlayRight} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>TravelGuru</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Scan frame */}
      <View style={styles.frameWrap}>
        <Animated.View style={[styles.frame, { transform: [{ scale: pulseAnim }] }]}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          {scanning && (
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY: scanLineTranslateY }] }]}
            />
          )}
        </Animated.View>
        {!result && (
          <View style={styles.aimWrap}>
            <Text style={styles.aimText}>
              {scanning ? '🔍 Identifying landmark...' : 'Aim at any landmark'}
            </Text>
            {scanning && <Text style={styles.aimSub}>Running AI model...</Text>}
          </View>
        )}
      </View>

      {/* Result card */}
      {result && !showDetails && (
        <Animated.View
          style={[
            styles.resultCard,
            {
              opacity: resultAnim,
              transform: [{
                translateY: resultAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              }],
            },
          ]}
        >
          <View style={styles.resultHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName} numberOfLines={1}>{result.name}</Text>
              <Text style={styles.resultLocation}>📍 {result.location}</Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{result.confidence}%</Text>
            </View>
          </View>

          <View style={styles.yearBadge}>
            <Text style={styles.yearText}>{result.emoji} {result.year} · {result.type}</Text>
          </View>

          <Text style={styles.resultDesc} numberOfLines={2}>
            {result.shortDescription}
          </Text>

          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowDetails(true)}>
              <Text style={styles.actionBtnText}>📖 Full History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>🗺️ Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAlt]} onPress={handleReset}>
              <Text style={[styles.actionBtnText, { color: colors.terra }]}>↩ Rescan</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Full details modal */}
      {result && showDetails && (
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsName}>{result.emoji} {result.name}</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.detailsLocation}>📍 {result.location} · {result.year}</Text>

            <Text style={styles.sectionLabel}>History</Text>
            <Text style={styles.detailsText}>{result.fullHistory}</Text>

            {result.funFacts?.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Fun Facts</Text>
                {result.funFacts.map((fact, i) => (
                  <View key={i} style={styles.factRow}>
                    <Text style={styles.factBullet}>•</Text>
                    <Text style={styles.factText}>{fact}</Text>
                  </View>
                ))}
              </>
            )}

            <View style={styles.infoRow}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>🕐 Hours</Text>
                <Text style={styles.infoValue}>{result.visitingHours}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>🎟️ Ticket</Text>
                <Text style={styles.infoValue}>{result.ticketPrice}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.rescanBtn} onPress={handleReset}>
              <Text style={styles.rescanText}>↩ Scan Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Scan button */}
      {!result && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.scanBtn, scanning && styles.scanBtnActive]}
            onPress={handleScan}
            disabled={scanning}
            activeOpacity={0.85}
          >
            <View style={styles.scanBtnInner}>
              <Text style={styles.scanBtnIcon}>{scanning ? '⏳' : '📷'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.scanHint}>{scanning ? 'Analyzing...' : 'Tap to identify'}</Text>
        </View>
      )}
    </View>
  );
}

const OVERLAY_SIZE = (height - FRAME_SIZE) / 2;
const SIDE_OVERLAY = (width - FRAME_SIZE) / 2;
const CORNER = 24;
const BORDER = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  hiddenWebView: { width: 0, height: 0, position: 'absolute' },
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, height: OVERLAY_SIZE, backgroundColor: 'rgba(26,18,8,0.75)' },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: OVERLAY_SIZE, backgroundColor: 'rgba(26,18,8,0.75)' },
  overlayLeft: { position: 'absolute', top: OVERLAY_SIZE, left: 0, width: SIDE_OVERLAY, height: FRAME_SIZE, backgroundColor: 'rgba(26,18,8,0.75)' },
  overlayRight: { position: 'absolute', top: OVERLAY_SIZE, right: 0, width: SIDE_OVERLAY, height: FRAME_SIZE, backgroundColor: 'rgba(26,18,8,0.75)' },
  topBar: { position: 'absolute', top: 48, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  topTitle: { fontFamily: 'Syne_800ExtraBold', fontSize: 18, color: colors.sand },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(200,98,42,0.25)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(200,98,42,0.4)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.terra },
  liveText: { fontFamily: 'Syne_700Bold', fontSize: 10, color: colors.terra, letterSpacing: 1 },
  frameWrap: { position: 'absolute', top: OVERLAY_SIZE, left: SIDE_OVERLAY, width: FRAME_SIZE, height: FRAME_SIZE, alignItems: 'center' },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE, position: 'relative' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.terra },
  cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: 4 },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.terra, opacity: 0.8 },
  aimWrap: { alignItems: 'center', marginTop: 16 },
  aimText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(245,239,224,0.8)', letterSpacing: 0.5 },
  aimSub: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(245,239,224,0.5)', marginTop: 4 },
  resultCard: { position: 'absolute', bottom: 100, left: 16, right: 16, backgroundColor: colors.sand, borderRadius: 20, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  resultName: { fontFamily: 'Syne_800ExtraBold', fontSize: 20, color: colors.ink },
  resultLocation: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  confidenceBadge: { backgroundColor: colors.jadePale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  confidenceText: { fontFamily: 'Syne_700Bold', fontSize: 12, color: colors.jade },
  yearBadge: { backgroundColor: colors.terraPale, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  yearText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.terra },
  resultDesc: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.inkMid, lineHeight: 20, marginBottom: 14 },
  resultActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, backgroundColor: colors.sandDark, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionBtnAlt: { backgroundColor: colors.terraPale },
  actionBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.inkMid },
  detailsCard: { position: 'absolute', bottom: 0, left: 0, right: 0, top: height * 0.15, backgroundColor: colors.sand, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 16 },
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailsName: { fontFamily: 'Syne_800ExtraBold', fontSize: 20, color: colors.ink, flex: 1 },
  closeBtn: { fontSize: 18, color: colors.muted, paddingLeft: 12 },
  detailsLocation: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.muted, marginBottom: 16 },
  sectionLabel: { fontFamily: 'Syne_700Bold', fontSize: 12, color: colors.terra, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  detailsText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.inkMid, lineHeight: 22 },
  factRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  factBullet: { fontFamily: 'Syne_700Bold', fontSize: 14, color: colors.terra },
  factText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.inkMid, flex: 1, lineHeight: 20 },
  infoRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  infoBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  infoLabel: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.muted, marginBottom: 4 },
  infoValue: { fontFamily: 'Syne_700Bold', fontSize: 12, color: colors.ink },
  rescanBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  rescanText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.muted },
  bottomBar: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', gap: 10 },
  scanBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.terra, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(245,239,224,0.3)', shadowColor: colors.terra, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  scanBtnActive: { backgroundColor: colors.inkMid },
  scanBtnInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  scanBtnIcon: { fontSize: 24 },
  scanHint: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(245,239,224,0.6)' },
  permContainer: { backgroundColor: colors.ink, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permEmoji: { fontSize: 48, marginBottom: 16 },
  permTitle: { fontFamily: 'Syne_800ExtraBold', fontSize: 22, color: colors.sand, marginBottom: 12 },
  permText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  permBtn: { backgroundColor: colors.terra, borderRadius: 50, paddingVertical: 14, paddingHorizontal: 32 },
  permBtnText: { fontFamily: 'Syne_700Bold', fontSize: 13, color: colors.white },
});