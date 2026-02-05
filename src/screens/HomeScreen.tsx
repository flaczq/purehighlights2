import React from 'react';
import { View, Text, Switch, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar, Image } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import MatchListScreen from './MatchListScreen';
import { useSettings } from '../context/SettingsContext';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';
import { AD_BANNER } from '@env';

const Tab = createMaterialTopTabNavigator();

const leagues = [
    { name: 'ENG', label: 'Premier League', query: 'England', icon: require('../../assets/premier_league_icon.png') },
    { name: 'ESP', label: 'La Liga', query: 'Spain', icon: require('../../assets/la_liga_icon.png') },
    { name: 'GER', label: 'Bundesliga', query: 'Germany', icon: require('../../assets/bundesliga_icon.png') },
    { name: 'ITA', label: 'Serie A', query: 'Italy', icon: require('../../assets/serie_a_icon.png') },
    { name: 'FRA', label: 'Ligue 1', query: 'France', icon: require('../../assets/ligue_1_icon.png') },
    { name: 'UCL', label: 'Champions League', query: 'Champions League', icon: require('../../assets/champions_league_icon.png') },
];

export default function HomeScreen() {
    const isDev = Constants.expoConfig?.extra?.APP_VARIANT !== 'production';
    const adBanner = Constants.expoConfig?.extra?.AD_BANNER || AD_BANNER;
    const { isSpoilerFree, toggleSpoilerFree } = useSettings();

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pure Highlights 2.0</Text>
                <View style={styles.spoilerContainer}>
                    <Text style={styles.spoilerText}>Spoiler Free</Text>
                    <Switch
                        value={isSpoilerFree}
                        onValueChange={toggleSpoilerFree}
                        trackColor={{ false: "#767577", true: "#81b0ff" }}
                        thumbColor={isSpoilerFree ? "#2196f3" : "#f4f3f4"}
                    />
                </View>
            </View>

            <Tab.Navigator
                screenOptions={{
                    tabBarScrollEnabled: true,
                    tabBarItemStyle: { width: 'auto', paddingHorizontal: 10 },
                    tabBarStyle: { backgroundColor: '#1a1a1a' },
                    tabBarLabelStyle: { fontSize: 12, fontWeight: '600', textTransform: 'none', marginTop: 5 },
                    tabBarActiveTintColor: '#2196f3',
                    tabBarInactiveTintColor: '#cccccc',
                    tabBarIndicatorStyle: { backgroundColor: '#2196f3', height: 3 },
                    tabBarShowIcon: true,
                }}
            >
                {leagues.map((league) => (
                    <Tab.Screen
                        key={league.name}
                        name={league.name}
                        component={MatchListScreen}
                        initialParams={{ league: league.query }}
                        options={{
                            tabBarLabel: league.label,
                            tabBarIcon: ({ focused }) => (
                                <View style={{
                                    width: 32,
                                    height: 32,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: 16,
                                    backgroundColor: league.name == 'UCL' || league.name == 'ENG' ? 'white' : 'transparent', // White background so some logos pop
                                    padding: 2,
                                    opacity: focused ? 1 : 0.7
                                }}>
                                    <Image
                                        source={league.icon}
                                        style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                    />
                                </View>
                            )
                        }}
                    />
                ))}
            </Tab.Navigator>
            <View style={{ alignItems: 'center' }}>
                <BannerAd
                    unitId={Constants.expoConfig?.extra?.AD_BANNER}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1a1a1a',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    spoilerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    spoilerText: {
        color: 'white',
        fontSize: 14,
    },
});
