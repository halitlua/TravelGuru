// src/screens/VoiceScreen.js

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ScrollView, StatusBar, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { GROQ_API_KEY } from '@env';
import { colors } from '../theme/colors';
import landmarks from '../data/landmarks.json';

let CURRENT_LANDMARK = landmarks[0];

export function setCurrentLandmark(landmark) {
  CURRENT_LANDMARK = landmark;
}

function getAnswer(transcript, landmark) {
  if (!landmark) {
    return "Please scan a landmark first using the camera, then ask me about it!";
  }

  const text = transcript.toLowerCase();

  if (text.includes('what is') || text.includes('what\'s this') || text.includes('tell me about') || text.includes('what place')) {
    return `This is ${landmark.name}, located in ${landmark.location}. ${landmark.shortDescription}`;
  }
  if (text.includes('how old') || text.includes('when was') || text.includes('what year') || text.includes('built')) {
    return `${landmark.name} dates back to ${landmark.year}. It is a ${landmark.type}.`;
  }
  if (text.includes('history') || text.includes('tell me more') || text.includes('background') || text.includes('story')) {
    return landmark.fullHistory;
  }
  if (text.includes('fun fact') || text.includes('interesting') || text.includes('did you know') || text.includes('facts')) {
    if (landmark.funFacts?.length > 0) {
      return `Here are some interesting facts about ${landmark.name}: ${landmark.funFacts.join('. ')}`;
    }
    return `I don't have fun facts for ${landmark.name} yet.`;
  }
  if (text.includes('open') || text.includes('close') || text.includes('visit') || text.includes('hours') || text.includes('time')) {
    return `${landmark.name} is open ${landmark.visitingHours}.`;
  }
  if (text.includes('ticket') || text.includes('price') || text.includes('fee') || text.includes('how much') || text.includes('entrance') || text.includes('cost')) {
    return `The entrance fee for ${landmark.name} is ${landmark.ticketPrice}.`;
  }
  if (text.includes('where') || text.includes('location') || text.includes('address') || text.includes('how to get')) {
    return `${landmark.name} is located in ${landmark.location}. Coordinates: ${landmark.coordinates.lat}, ${landmark.coordinates.lng}.`;
  }

  return `You asked: "${transcript}". I can answer questions about ${landmark.name} such as its history, visiting hours, ticket price, fun facts, and location. Try asking "What is this place?" or "Tell me the history."`;
}

async function transcribeAudio(uri) {
  // 1. Build a standard FormData object
  const formData = new FormData();
  
  // Append the audio file (React Native natively supports passing a uri like this)
  formData.append('file', {
    uri: uri,
    name: 'voice_query.m4a',
    type: 'audio/m4a',
  });
  
  // Append Groq required parameters
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'en');

  // 2. Send using standard fetch
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      // fetch automatically adds the Content-Type header with the correct boundary
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Transcription failed');
  }

  return data.text;
}

const TIMEOUT_MS = 12000; // 12 seconds before showing Try Again

export default function VoiceScreen() {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [lastUri, setLastUri] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentLandmark, setCurrentLandmarkState] = useState(CURRENT_LANDMARK);
  const scrollRef = useRef(null);
  const timeoutRef = useRef(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wave1 = useRef(new Animated.Value(0.3)).current;
  const wave2 = useRef(new Animated.Value(0.3)).current;
  const wave3 = useRef(new Animated.Value(0.3)).current;
  const wave4 = useRef(new Animated.Value(0.3)).current;
  const wave5 = useRef(new Animated.Value(0.3)).current;

  useFocusEffect(
    React.useCallback(() => {
      setCurrentLandmarkState(CURRENT_LANDMARK);
      return () => {};
    }, [])
  );

  useEffect(() => {
    return () => {
      Speech.stop();
      clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const waves = [wave1, wave2, wave3, wave4, wave5];
    const animations = waves.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 100),
          Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, [isRecording]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    if (isRecording) pulse.start();
    else { pulse.stop(); pulseAnim.setValue(1); }
    return () => pulse.stop();
  }, [isRecording]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [history]);

  const processAudio = async (uri) => {
    setIsProcessing(true);
    setTimedOut(false);

    // Start timeout countdown
    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
      setIsProcessing(false);
    }, TIMEOUT_MS);

    try {
      const transcript = await transcribeAudio(uri);

      // If already timed out by the time we get a response, ignore it
      clearTimeout(timeoutRef.current);
      if (timedOut) return;

      const answer = getAnswer(transcript, currentLandmark);
      setHistory(prev => [...prev, { question: transcript, answer }]);

      setIsSpeaking(true);
      Speech.speak(answer, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (err) {
      clearTimeout(timeoutRef.current);
      if (!timedOut) {
        Alert.alert('Error', `Could not process voice: ${err.message}`);
      }
    } finally {
      clearTimeout(timeoutRef.current);
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission needed', 'Microphone access is required for voice queries.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setTimedOut(false);
    } catch (err) {
      Alert.alert('Error', 'Could not start recording. Try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setLastUri(uri);

      // CRITICAL: Turn off recording mode so the AI's reply plays through the loud speaker!
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      await processAudio(uri);
    } catch (err) {
      Alert.alert('Error', `Could not stop recording: ${err.message}`);
    }
  };

  const handleRetry = async () => {
    if (!lastUri) return;
    setTimedOut(false);
    await processAudio(lastUri);
  };

  const handleMicPress = () => {
    if (isRecording) stopRecording();
    else if (!isProcessing && !timedOut) startRecording();
  };

  const handleStopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  const handleQuickQuestion = (question) => {
    const answer = getAnswer(question, currentLandmark);
    setHistory(prev => [...prev, { question, answer }]);
    setIsSpeaking(true);
    Speech.speak(answer, {
      language: 'en',
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const getStatusText = () => {
    if (isRecording) return 'Listening... tap to stop';
    if (isProcessing) return 'Processing your voice...';
    if (timedOut) return 'Taking too long. Try again?';
    if (isSpeaking) return 'Speaking... tap to stop';
    return 'Tap the mic to ask';
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Guru Guide</Text>
            <Text style={styles.headerSub}>Ask anything about your landmark</Text>
          </View>
          {history.length > 0 && (
            <TouchableOpacity onPress={handleClearHistory} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {currentLandmark && (
          <View style={styles.landmarkBadge}>
            <Text style={styles.landmarkBadgeEmoji}>{currentLandmark.emoji}</Text>
            <Text style={styles.landmarkBadgeName}>{currentLandmark.name}</Text>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.history}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎙️</Text>
            <Text style={styles.emptyText}>
              Tap the mic and ask anything about{'\n'}
              <Text style={{ color: colors.terra, fontFamily: 'Syne_700Bold' }}>
                {currentLandmark?.name || 'the landmark'}
              </Text>
            </Text>
          </View>
        )}
        {history.map((item, i) => (
          <View key={i}>
            <View style={styles.questionBubble}>
              <Text style={styles.questionText}>🗣 {item.question}</Text>
            </View>
            <View style={styles.answerBubble}>
              <Text style={styles.answerLabel}>🤖 TravelGuru</Text>
              <Text style={styles.answerText}>{item.answer}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Wave visualizer */}
      <View style={styles.visualizer}>
        {isRecording && (
          <View style={styles.waveRow}>
            {[wave1, wave2, wave3, wave4, wave5].map((anim, i) => (
              <Animated.View
                key={i}
                style={[styles.waveBar, { transform: [{ scaleY: anim }] }]}
              />
            ))}
          </View>
        )}
        <Text style={[styles.statusText, timedOut && styles.statusTextWarning]}>
          {getStatusText()}
        </Text>
      </View>

      {/* Try Again button — shown on timeout */}
      {timedOut && (
        <View style={styles.retryWrap}>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryBtnText}>🔄 Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retryBtnAlt} onPress={() => { setTimedOut(false); }}>
            <Text style={styles.retryBtnAltText}>Record New</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mic button */}
      {!timedOut && (
        <View style={styles.micWrap}>
          {isRecording && (
            <Animated.View style={[styles.micRing, { transform: [{ scale: pulseAnim }] }]} />
          )}
          <TouchableOpacity
            style={[
              styles.micBtn,
              isRecording && styles.micBtnRecording,
              isProcessing && styles.micBtnProcessing,
              isSpeaking && styles.micBtnSpeaking,
            ]}
            onPress={isSpeaking ? handleStopSpeaking : handleMicPress}
            activeOpacity={0.85}
            disabled={isProcessing}
          >
            <Text style={styles.micIcon}>
              {isProcessing ? '⏳' : isRecording ? '⏹' : isSpeaking ? '🔊' : '🎙️'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick questions */}
      {!isRecording && !isProcessing && !timedOut && (
        <View style={styles.quickWrap}>
          <Text style={styles.quickLabel}>Quick questions:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              'What is this place?',
              'Tell me the history',
              'How old is it?',
              'What are the visiting hours?',
              'How much is the ticket?',
              'Tell me fun facts',
            ].map((q, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickChip}
                onPress={() => handleQuickQuestion(q)}
              >
                <Text style={styles.quickChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  header: { paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16 },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitle: { fontFamily: 'Syne_800ExtraBold', fontSize: 26, color: colors.sand },
  headerSub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.muted, marginTop: 4 },
  clearBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  clearBtnText: { fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.muted },
  landmarkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.inkMid, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(200,98,42,0.3)',
  },
  landmarkBadgeEmoji: { fontSize: 16 },
  landmarkBadgeName: { fontFamily: 'Syne_700Bold', fontSize: 12, color: colors.terra },
  history: { flex: 1, paddingHorizontal: 20 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: {
    fontFamily: 'DMSans_400Regular', fontSize: 14,
    color: colors.muted, textAlign: 'center', lineHeight: 24,
  },
  questionBubble: {
    alignSelf: 'flex-end', backgroundColor: colors.terra,
    borderRadius: 16, borderBottomRightRadius: 4,
    padding: 12, marginBottom: 8, maxWidth: '80%',
  },
  questionText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#fff' },
  answerBubble: {
    alignSelf: 'flex-start', backgroundColor: colors.inkMid,
    borderRadius: 16, borderBottomLeftRadius: 4,
    padding: 14, marginBottom: 16, maxWidth: '90%',
  },
  answerLabel: { fontFamily: 'Syne_700Bold', fontSize: 10, color: colors.terra, marginBottom: 6, letterSpacing: 1 },
  answerText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.sand, lineHeight: 20 },
  visualizer: { alignItems: 'center', paddingVertical: 12 },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  waveBar: { width: 4, height: 32, borderRadius: 2, backgroundColor: colors.terra },
  statusText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.muted, letterSpacing: 0.5 },
  statusTextWarning: { color: '#E8A838' },

  // Retry UI
  retryWrap: { alignItems: 'center', paddingBottom: 20, gap: 12 },
  retryBtn: {
    backgroundColor: colors.terra, borderRadius: 50,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  retryBtnText: { fontFamily: 'Syne_700Bold', fontSize: 14, color: '#fff' },
  retryBtnAlt: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 50,
    paddingVertical: 10, paddingHorizontal: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  retryBtnAltText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.muted },

  micWrap: { alignItems: 'center', paddingBottom: 16 },
  micRing: {
    position: 'absolute', width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(200,98,42,0.15)',
  },
  micBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.terra,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.terra, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  micBtnRecording: { backgroundColor: '#8B3A15' },
  micBtnProcessing: { backgroundColor: colors.inkMid },
  micBtnSpeaking: { backgroundColor: colors.jade },
  micIcon: { fontSize: 28 },
  quickWrap: { paddingHorizontal: 20, paddingBottom: 24 },
  quickLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.muted, marginBottom: 10 },
  quickChip: {
    backgroundColor: colors.inkMid, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  quickChipText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.sand },
});