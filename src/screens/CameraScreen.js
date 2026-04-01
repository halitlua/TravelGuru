import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HF_API_TOKEN } from '@env';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');
const FRAME_SIZE = width * 0.72;

/**
 * FIXED: Read image file directly and send to HF API
 */
async function detectLandmark(photoUri) {
  try {
    // 1. Read file as base64 using legacy API
    const base64Data = await FileSystem.readAsStringAsync(photoUri, {
      encoding: 'base64', 
    });

    console.log('Sending to HF API...');
    const response = await fetch(
      'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_API_TOKEN}`,
        },
        // Send base64 data as body
        body: base64Data,
      }
    );

    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);

    if (data && data.length > 0) {
      const top = data[0];
      const label = top.label.replace(/_/g, ' ');
      const confidence = Math.round(top.score * 100);
      return {
        name: label,
        confidence,
        location: 'Identified Location',
        description: `This looks like ${label} (${confidence}% match).`,
      };
    }
    return null;
  } catch (err) {
    console.error('HF Error:', err);
    throw err;
  }
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const cameraRef = useRef(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  // Animation: Scanning Line
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

  // Animation: Pulse Frame
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
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    setResult(null);
    resultAnim.setValue(0);

    try {
      // Take photo and send URI directly
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });

      const detected = await detectLandmark(photo.uri);

      if (detected) {
        setResult(detected);
        Animated.spring(resultAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }).start();
      } else {
        Alert.alert('No Result', 'Could not identify. Try again with a clearer view.');
      }
    } catch (err) {
      Alert.alert('Scan Failed', 'Network error. Please check your connection and API token.');
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setResult(null);
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
        <Text style={styles.permText}>
          TravelGuru needs your camera to identify landmarks around you.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" />

      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Overlay Mask */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayBottom} />
      <View style={styles.overlayLeft} />
      <View style={styles.overlayRight} />

      <View style={styles.topBar}>
        <Text style={styles.topTitle}>TravelGuru</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

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
          </View>
        )}
      </View>

      {/* Result Card */}
      {result && (
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
          <Text style={styles.resultDesc} numberOfLines={3}>{result.description}</Text>
          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.actionBtn}><Text>🔊 Audio</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}><Text>🗺️ Navigate</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.rescanBtn} onPress={handleReset}>
            <Text style={styles.rescanText}>↩ Scan Again</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Bottom Scan Button */}
      {!result && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.scanBtn, scanning && styles.scanBtnActive]}
            onPress={handleScan}
            disabled={scanning}
          >
            <Text style={styles.scanBtnIcon}>{scanning ? '⏳' : '📷'}</Text>
          </TouchableOpacity>
          <Text style={styles.scanHint}>{scanning ? 'Analyzing...' : 'Tap to identify'}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ... (Your Styles remain mostly the same)
const OVERLAY_SIZE = (height - FRAME_SIZE) / 2;
const SIDE_OVERLAY = (width - FRAME_SIZE) / 2;
const CORNER = 24;
const BORDER = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, height: OVERLAY_SIZE, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: OVERLAY_SIZE, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayLeft: { position: 'absolute', top: OVERLAY_SIZE, left: 0, width: SIDE_OVERLAY, height: FRAME_SIZE, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayRight: { position: 'absolute', top: OVERLAY_SIZE, right: 0, width: SIDE_OVERLAY, height: FRAME_SIZE, backgroundColor: 'rgba(0,0,0,0.6)' },
  topBar: { position: 'absolute', top: 60, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  topTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,0,0,0.2)', padding: 5, borderRadius: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'red', marginRight: 5 },
  liveText: { color: 'red', fontSize: 10, fontWeight: 'bold' },
  frameWrap: { position: 'absolute', top: OVERLAY_SIZE, left: SIDE_OVERLAY, width: FRAME_SIZE, height: FRAME_SIZE },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff' },
  cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER },
  cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#fff' },
  aimWrap: { alignItems: 'center', marginTop: 10 },
  aimText: { color: '#fff', fontSize: 14 },
  resultCard: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 15, padding: 20 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  resultName: { fontSize: 20, fontWeight: 'bold' },
  resultLocation: { color: '#666' },
  confidenceBadge: { backgroundColor: '#e6fffa', padding: 5, borderRadius: 5 },
  confidenceText: { color: '#38b2ac', fontWeight: 'bold' },
  resultDesc: { marginVertical: 10, color: '#444' },
  resultActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, backgroundColor: '#f0f0f0', padding: 10, borderRadius: 5, alignItems: 'center', marginHorizontal: 5 },
  rescanBtn: { marginTop: 10, alignItems: 'center' },
  rescanText: { color: '#888' },
  bottomBar: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  scanBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  scanBtnActive: { backgroundColor: '#ccc' },
  scanBtnIcon: { fontSize: 30 },
  scanHint: { color: '#fff', marginTop: 10 },
  permContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  permEmoji: { fontSize: 50 },
  permTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginVertical: 10 },
  permText: { color: '#ccc', textAlign: 'center', marginBottom: 20 },
  permBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 10 },
  permBtnText: { fontWeight: 'bold' },
});