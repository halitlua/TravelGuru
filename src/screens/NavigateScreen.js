// src/screens/NavigateScreen.js

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Animated, Dimensions,
  ActivityIndicator, Platform, PanResponder,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';

const { height } = Dimensions.get('window');

// ── Sheet snap points (distance from top of screen) ──────────────
const SNAP = {
  collapsed: height * 0.78,  // map mostly visible, sheet peeking
  half:      height * 0.52,  // default — balanced
  expanded:  height * 0.18,  // full list
};

// ─── Helpers ─────────────────────────────────────────────────────

function getLandmarkEmoji(tags) {
  if (tags.tourism === 'museum') return '🏛️';
  if (tags.tourism === 'monument') return '🗿';
  if (tags.tourism === 'attraction') return '⭐';
  if (tags.tourism === 'artwork') return '🎨';
  if (tags.tourism === 'viewpoint') return '🔭';
  if (tags.historic === 'castle') return '🏰';
  if (tags.historic === 'ruins') return '🏚️';
  if (tags.historic === 'monument') return '🗿';
  if (tags.historic === 'memorial') return '🕊️';
  if (tags.amenity === 'place_of_worship') return '⛪';
  if (tags.leisure === 'park') return '🌳';
  if (tags.natural === 'peak') return '⛰️';
  return '📍';
}

function getLandmarkType(tags) {
  if (tags.tourism === 'museum') return 'Museum';
  if (tags.tourism === 'monument') return 'Monument';
  if (tags.tourism === 'attraction') return 'Attraction';
  if (tags.tourism === 'artwork') return 'Artwork';
  if (tags.tourism === 'viewpoint') return 'Viewpoint';
  if (tags.historic === 'castle') return 'Castle';
  if (tags.historic === 'ruins') return 'Historic Ruins';
  if (tags.historic === 'monument') return 'Monument';
  if (tags.historic === 'memorial') return 'Memorial';
  if (tags.amenity === 'place_of_worship') return 'Place of Worship';
  if (tags.leisure === 'park') return 'Park';
  return 'Landmark';
}

function getLandmarkCategory(tags) {
  if (tags.tourism === 'museum' || tags.historic) return 'history';
  if (tags.tourism === 'attraction' || tags.tourism === 'viewpoint') return 'attraction';
  if (tags.leisure === 'park' || tags.natural) return 'nature';
  if (tags.amenity === 'place_of_worship') return 'culture';
  return 'attraction';
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const meters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (meters < 1000) return { text: `${Math.round(meters)}m`, meters, minutes: Math.round(meters / 80) };
  return { text: `${(meters / 1000).toFixed(1)}km`, meters, minutes: Math.round(meters / 80) };
}

function getBearing(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  const deg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ─── Overpass API ────────────────────────────────────────────────

async function fetchNearbyLandmarks(lat, lng, radius = 2000) {
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"~"museum|monument|attraction|artwork|viewpoint"](around:${radius},${lat},${lng});
      node["historic"~"castle|ruins|monument|memorial"](around:${radius},${lat},${lng});
      node["amenity"="place_of_worship"]["name"](around:${radius},${lat},${lng});
      node["leisure"="park"]["name"](around:${radius},${lat},${lng});
    );
    out body 20;
  `;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  const data = await res.json();
  return data.elements
    .filter(el => el.tags?.name)
    .map(el => {
      const dist = getDistance(lat, lng, el.lat, el.lon);
      return {
        id: el.id,
        name: el.tags.name,
        type: getLandmarkType(el.tags),
        emoji: getLandmarkEmoji(el.tags),
        category: getLandmarkCategory(el.tags),
        lat: el.lat,
        lng: el.lon,
        distance: dist.text,
        meters: dist.meters,
        time: `${dist.minutes} min`,
      };
    })
    .sort((a, b) => a.meters - b.meters)
    .slice(0, 12);
}

// ─── Map HTML ────────────────────────────────────────────────────

function buildMapHTML(userLat, userLng, landmarks, selected) {
  const markerJS = landmarks.map(p => `
    L.marker([${p.lat},${p.lng}],{
      icon:L.divIcon({
        className:'',
        html:'<div style="background:${selected?.id === p.id ? '#1a73e8' : '#fff'};border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,0.18);border:2px solid ${selected?.id === p.id ? '#1a73e8' : '#ddd'}">${p.emoji}</div>',
        iconSize:[36,36],iconAnchor:[18,18]
      })
    }).addTo(map).on('click',function(){
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'select',id:${p.id}}));
    });
  `).join('');

  const routeJS = selected ? `
    if(window._route) map.removeLayer(window._route);
    window._route=L.polyline([[${userLat},${userLng}],[${selected.lat},${selected.lng}]],{
      color:'#1a73e8',weight:4,opacity:0.8,dashArray:'8,12'
    }).addTo(map);
    map.fitBounds([[${userLat},${userLng}],[${selected.lat},${selected.lng}]],{
      paddingTopLeft:[40,100],paddingBottomRight:[40,60]
    });
  ` : `map.setView([${userLat},${userLng}],15);`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%;background:#f0ede8}
    .leaflet-tile-pane{filter:saturate(0.65) brightness(1.05)}
  </style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false});
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd',opacity:0.55}).addTo(map);

L.circle([${userLat},${userLng}],{radius:50,color:'#1a73e8',fillColor:'#1a73e8',fillOpacity:0.07,weight:1,opacity:0.25}).addTo(map);

L.marker([${userLat},${userLng}],{
  icon:L.divIcon({
    className:'',
    html:'<div style="width:22px;height:22px;background:#1a73e8;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(26,115,232,0.55)"></div>',
    iconSize:[22,22],iconAnchor:[11,11]
  }),zIndexOffset:1000
}).addTo(map);

${markerJS}
${routeJS}

function onMsg(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='recenter') map.setView([d.lat,d.lng],15,{animate:true});
  }catch(err){}
}
document.addEventListener('message',onMsg);
window.addEventListener('message',onMsg);
</script>
</body>
</html>`;
}

// ─── Category filters ────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all',        label: 'All',         emoji: '🗺️' },
  { key: 'attraction', label: 'Attractions',  emoji: '⭐' },
  { key: 'history',    label: 'History',      emoji: '🏛️' },
  { key: 'nature',     label: 'Nature',       emoji: '🌳' },
  { key: 'culture',    label: 'Culture',      emoji: '⛪' },
];

// ─── Main Component ──────────────────────────────────────────────

export default function NavigateScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [landmarks, setLandmarks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const webViewRef = useRef(null);
  const locationSub = useRef(null);
  const headingSub = useRef(null);

  // ── Draggable sheet with PanResponder ──
  const sheetY = useRef(new Animated.Value(SNAP.half)).current;
  const lastSnap = useRef(SNAP.half);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        sheetY.stopAnimation(v => { lastSnap.current = v; });
        sheetY.setOffset(lastSnap.current);
        sheetY.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        const next = lastSnap.current + g.dy;
        if (next >= SNAP.expanded && next <= SNAP.collapsed) {
          sheetY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        sheetY.flattenOffset();
        const cur = lastSnap.current + g.dy;
        let target;
        if (g.vy < -0.5) target = SNAP.expanded;
        else if (g.vy > 0.5) target = SNAP.collapsed;
        else {
          const nearest = Object.values(SNAP)
            .map(s => ({ s, d: Math.abs(cur - s) }))
            .sort((a, b) => a.d - b.d)[0].s;
          target = nearest;
        }
        lastSnap.current = target;
        Animated.spring(sheetY, {
          toValue: target, tension: 70, friction: 13, useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const snapSheet = (point) => {
    lastSnap.current = SNAP[point];
    Animated.spring(sheetY, {
      toValue: SNAP[point], tension: 70, friction: 13, useNativeDriver: false,
    }).start();
  };

  // ── Nav banner: animate height (no render when empty) ──
  const bannerH = useRef(new Animated.Value(0)).current;
  const bannerOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selected) {
      Animated.parallel([
        Animated.spring(bannerH, { toValue: 72, tension: 65, friction: 11, useNativeDriver: false }),
        Animated.timing(bannerOp, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
      snapSheet('half');
    } else {
      Animated.parallel([
        Animated.spring(bannerH, { toValue: 0, tension: 65, friction: 11, useNativeDriver: false }),
        Animated.timing(bannerOp, { toValue: 0, duration: 150, useNativeDriver: false }),
      ]).start();
    }
  }, [selected]);

  // ── Init location + landmarks ──
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        let lat, lng;
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        } else {
          lat = 14.5995; lng = 120.9842; // Manila fallback
        }
        setUserLocation({ lat, lng });
        const nearby = await fetchNearbyLandmarks(lat, lng);
        setLandmarks(nearby);
      } catch {
        setError('Could not load landmarks. Check your connection.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Live GPS watch ──
  useEffect(() => {
    if (!userLocation) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 8 },
        (loc) => setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
      );
      headingSub.current = await Location.watchHeadingAsync((h) =>
        setHeading(Math.round(h.trueHeading || h.magHeading || 0))
      );
    })();
    return () => { locationSub.current?.remove(); headingSub.current?.remove(); };
  }, [!!userLocation]);

  const handleSelect = useCallback((place) => {
    setSelected(prev => prev?.id === place.id ? null : place);
  }, []);

  const handleMapMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'select') {
        const found = landmarks.find(l => l.id === msg.id);
        if (found) handleSelect(found);
      }
    } catch {}
  }, [landmarks, handleSelect]);

  const handleRecenter = () => {
    if (!userLocation) return;
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'recenter', lat: userLocation.lat, lng: userLocation.lng })
    );
  };

  const filtered = activeCategory === 'all'
    ? landmarks
    : landmarks.filter(l => l.category === activeCategory);

  const dirText = selected && userLocation
    ? getBearing(userLocation.lat, userLocation.lng, selected.lat, selected.lng)
    : '';

  // ─── Loading / Error ─────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.centered}>
        <View style={s.loadCard}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={s.loadTitle}>Finding your location</Text>
          <Text style={s.loadSub}>Discovering nearby landmarks…</Text>
        </View>
      </View>
    );
  }
  if (error) {
    return (
      <View style={s.centered}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>⚠️</Text>
        <Text style={s.errText}>{error}</Text>
      </View>
    );
  }

  const mapHTML = userLocation
    ? buildMapHTML(userLocation.lat, userLocation.lng, landmarks, selected)
    : '';

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Full-screen map behind everything ── */}
      <View style={StyleSheet.absoluteFill}>
        {userLocation && (
          <WebView
            ref={webViewRef}
            source={{ html: mapHTML }}
            style={StyleSheet.absoluteFill}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            onMessage={handleMapMessage}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* ── Map controls (top layer) ── */}
      <View style={s.gpsBadge}>
        <View style={s.gpsDot} />
        <Text style={s.gpsText}>Live GPS</Text>
      </View>

      <View style={s.mapControls}>
        <TouchableOpacity style={s.mapBtn} onPress={handleRecenter}>
          <Text style={{ fontSize: 20 }}>◎</Text>
        </TouchableOpacity>
        <View style={s.mapBtn}>
          <Text style={[s.compassN, { transform: [{ rotate: `${-heading}deg` }] }]}>N</Text>
        </View>
      </View>

      {/* ── Waze-style floating nav card — ONLY shows when a place is selected ── */}
      <Animated.View
        style={[s.navCard, { height: bannerH, opacity: bannerOp }]}
        pointerEvents={selected ? 'auto' : 'none'}
      >
        {selected && (
          <View style={s.navInner}>
            <View style={s.navEmojiWrap}>
              <Text style={{ fontSize: 22 }}>{selected.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.navName} numberOfLines={1}>{selected.name}</Text>
              <Text style={s.navSub}>
                Head <Text style={s.navDir}>{dirText}</Text>
                {'  ·  '}{selected.distance}{'  ·  '}~{selected.time} walk
              </Text>
            </View>
            <TouchableOpacity style={s.navEnd} onPress={() => setSelected(null)}>
              <Text style={s.navEndTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* ── Draggable Bottom Sheet ── */}
      <Animated.View style={[s.sheet, { top: sheetY }]}>

        {/* Drag handle — PanResponder attached here */}
        <View style={s.dragZone} {...panResponder.panHandlers}>
          <View style={s.handle} />

          {/* Sheet header */}
          <View style={s.sheetHead}>
            <View>
              <Text style={s.sheetTitle}>Nearby</Text>
              <Text style={s.sheetSub}>{filtered.length} places · sorted by distance</Text>
            </View>
            <View style={s.liveRow}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>Updating</Text>
            </View>
          </View>

          {/* Category filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catWrap}
            style={{ maxHeight: 44, marginBottom: 10 }}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[s.chip, activeCategory === cat.key && s.chipOn]}
                onPress={() => setActiveCategory(cat.key)}
              >
                <Text style={s.chipEmoji}>{cat.emoji}</Text>
                <Text style={[s.chipLbl, activeCategory === cat.key && s.chipLblOn]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Scrollable list */}
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 36 }}>🔍</Text>
            <Text style={s.emptyTxt}>No landmarks in this category nearby.</Text>
          </View>
        ) : (
          <ScrollView
            style={s.list}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {filtered.map((place, idx) => {
              const on = selected?.id === place.id;
              return (
                <TouchableOpacity
                  key={place.id}
                  style={[s.card, on && s.cardOn]}
                  onPress={() => handleSelect(place)}
                  activeOpacity={0.78}
                >
                  <View style={[s.rank, on && s.rankOn]}>
                    <Text style={[s.rankTxt, on && s.rankTxtOn]}>{idx + 1}</Text>
                  </View>
                  <View style={[s.cardEmoji, on && s.cardEmojiOn]}>
                    <Text style={{ fontSize: 22 }}>{place.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName} numberOfLines={1}>{place.name}</Text>
                    <Text style={s.cardType}>{place.type}</Text>
                  </View>
                  <View style={s.cardRight}>
                    <Text style={[s.cardDist, on && s.cardDistOn]}>{place.distance}</Text>
                    <Text style={s.cardTime}>{place.time}</Text>
                    <View style={[s.goBtn, on && s.goBtnOn]}>
                      <Text style={[s.goTxt, on && s.goTxtOn]}>{on ? '✓' : '→'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const BLUE = '#1a73e8';
const BLUE_PALE = '#e8f0fe';
const INK = '#1c1c1e';
const MUTED = '#8e8e93';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0ede8' },

  // Loading / error
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f7' },
  loadCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 32,
    alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
  },
  loadTitle: { fontFamily: 'Syne_700Bold', fontSize: 16, color: INK, marginTop: 8 },
  loadSub: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: MUTED },
  errText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: MUTED, textAlign: 'center', paddingHorizontal: 32 },

  // Map overlays
  gpsBadge: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.93)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, zIndex: 20,
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34c759' },
  gpsText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: INK },
  mapControls: {
    position: 'absolute', top: Platform.OS === 'ios' ? 52 : 32, right: 16,
    gap: 8, zIndex: 20,
  },
  mapBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  compassN: { fontFamily: 'Syne_700Bold', fontSize: 14, color: '#ff3b30' },

  // Floating nav card — Waze style, only shows when navigating
  navCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    left: 12, right: 12,
    backgroundColor: BLUE,
    borderRadius: 18, overflow: 'hidden',
    zIndex: 25,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  navInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  navEmojiWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  navName: { fontFamily: 'Syne_700Bold', fontSize: 14, color: '#fff', marginBottom: 3 },
  navSub: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  navDir: { fontFamily: 'Syne_700Bold', color: '#fff' },
  navEnd: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  navEndTxt: { fontSize: 14, color: '#fff', fontFamily: 'Syne_700Bold' },

  // Sheet
  sheet: {
    position: 'absolute', left: 0, right: 0,
    bottom: -60,                         // overshoot so rounded corners hide off-screen
    backgroundColor: '#f2f2f7',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 16,
    zIndex: 15,
  },
  dragZone: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    backgroundColor: '#f2f2f7', zIndex: 2,
    paddingBottom: 4,
  },
  handle: {
    width: 36, height: 4, backgroundColor: '#c7c7cc',
    borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 14,
  },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 12,
  },
  sheetTitle: { fontFamily: 'Syne_800ExtraBold', fontSize: 22, color: INK },
  sheetSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: MUTED, marginTop: 2 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34c759' },
  liveTxt: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#34c759' },

  // Category chips
  catWrap: { paddingHorizontal: 20, gap: 8, paddingRight: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#e5e5ea',
  },
  chipOn: { backgroundColor: BLUE, borderColor: BLUE },
  chipEmoji: { fontSize: 13 },
  chipLbl: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: INK },
  chipLblOn: { color: '#fff' },

  // List
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyTxt: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: MUTED, textAlign: 'center' },

  // Cards
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  cardOn: { borderColor: BLUE, backgroundColor: '#fafcff' },
  rank: {
    position: 'absolute', top: 8, left: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#f2f2f7',
    alignItems: 'center', justifyContent: 'center',
  },
  rankOn: { backgroundColor: BLUE },
  rankTxt: { fontFamily: 'Syne_700Bold', fontSize: 9, color: MUTED },
  rankTxtOn: { color: '#fff' },
  cardEmoji: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#f2f2f7',
    alignItems: 'center', justifyContent: 'center',
  },
  cardEmojiOn: { backgroundColor: BLUE_PALE },
  cardName: { fontFamily: 'Syne_700Bold', fontSize: 14, color: INK },
  cardType: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: MUTED, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardDist: { fontFamily: 'Syne_700Bold', fontSize: 13, color: INK },
  cardDistOn: { color: BLUE },
  cardTime: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: MUTED },
  goBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f2f2f7',
    alignItems: 'center', justifyContent: 'center',
  },
  goBtnOn: { backgroundColor: BLUE },
  goTxt: { fontSize: 13, color: MUTED },
  goTxtOn: { color: '#fff', fontFamily: 'Syne_700Bold' },
});