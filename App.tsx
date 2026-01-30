import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';
import RootNavigator from './src/navigation/RootNavigator';
import { SettingsProvider } from './src/context/SettingsContext';

export default function App() {
    useEffect(() => {
        mobileAds()
            .initialize()
            .then(adapterStatuses => {
                // Initialization complete!
            });
    }, []);

    return (
        <SafeAreaProvider>
            <SettingsProvider>
                <NavigationContainer>
                    <RootNavigator />
                    <StatusBar style="light" />
                </NavigationContainer>
            </SettingsProvider>
        </SafeAreaProvider>
    );
}
