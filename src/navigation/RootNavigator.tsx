import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import VideoPlayerScreen from '../screens/VideoPlayerScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
                name="Player"
                component={VideoPlayerScreen}
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom'
                }}
            />
        </Stack.Navigator>
    );
}
