// src/navigation/MainTabs.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { colors } from '../theme/colors';

import CameraScreen from '../screens/CameraScreen';
import NavigateScreen from '../screens/NavigateScreen';
import VoiceScreen from '../screens/VoiceScreen';
import TranslateScreen from '../screens/TranslateScreen';
import ExploreScreen from '../screens/ExploreScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ emoji, label, focused }) => (
  <View style={{ alignItems: 'center', paddingTop: 4 }}>
    <Text style={{ fontSize: 18 }}>{emoji}</Text>
    <Text
      style={{
        fontSize: 10,
        marginTop: 2,
        color: focused ? colors.terra : colors.muted,
        fontWeight: focused ? '600' : '400',
      }}
    >
      {label}
    </Text>
    {focused && (
      <View
        style={{
          width: 4, height: 4, borderRadius: 2,
          backgroundColor: colors.terra, marginTop: 2,
        }}
      />
    )}
  </View>
);

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: 'rgba(0,0,0,0.08)',
          borderTopWidth: 0.5,
          height: 64,
          paddingBottom: 8,
        },
      }}
    >
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📷" label="Scan" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Navigate"
        component={NavigateScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🗺️" label="Navigate" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Voice"
        component={VoiceScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🎙️" label="Guru" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Translate"
        component={TranslateScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌐" label="Translate" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🧭" label="Explore" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
