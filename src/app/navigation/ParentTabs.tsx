import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  CalendarDays,
  Ticket,
  MessageCircle,
  Menu,
} from 'lucide-react-native';
import { colors, space, type } from '@/theme';
import type { ParentTabParamList } from './types';
import { BookClassPage }          from '@/features/parent/screens/BookClassPage';
import { BookingsPage }           from '@/features/parent/screens/BookingsPage';
import { ParentMoreStack }        from './ParentMore';
import { ParentMessagesStack }    from './ParentMessages';
import { ParentHomeScreen }       from '@/features/parent/screens/ParentHomeScreen';
import { AppHeader }              from '@/components/layout/AppHeader';

const Tab = createBottomTabNavigator<ParentTabParamList>();

/**
 * Build the header renderer for a given tab screen.
 * `navigation` here is the bottom-tab navigator's navigation object.
 * We navigate into the ParentMore stack to reach Notifications / Account.
 */
function makeHeader(navigation: any) {
  return (props: any) => (
    <AppHeader
      {...props}
      onNotifications={() =>
        navigation.navigate('ParentMore', { screen: 'Notifications' })
      }
      onAccount={() =>
        navigation.navigate('ParentMore', { screen: 'Account' })
      }
    />
  );
}

export function ParentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        // Custom header for every tab screen
        headerShown: true,
        header: makeHeader(navigation),

        tabBarStyle:           styles.tabBar,
        tabBarLabelStyle:      styles.tabBarLabel,
        tabBarIconStyle:       styles.tabBarIcon,
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.muted,
      })}
    >
      <Tab.Screen
        name="ParentHome"
        component={ParentHomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Book"
        component={BookClassPage}
        options={{
          title: 'Book',
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsPage}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Ticket size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ParentMessagesStack}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ParentMore"
        component={ParentMoreStack}
        options={{
          // The More stack handles its own safe-area top padding —
          // hide the shared header here so it doesn't double-stack.
          headerShown: false,
          title: 'More',
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor:  colors.line,
    borderTopWidth:  1,
    height:          60 + space.md,
    paddingBottom:   space.md,
  },
  tabBarLabel: {
    ...type.caption,
    color:     colors.muted,
    marginTop: 4,
  },
  tabBarIcon: {
    marginBottom: 4,
  },
});
