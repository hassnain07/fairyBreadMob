import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Ticket,
} from 'lucide-react-native';
import { colors, space, type } from '@/theme';
import type { AdminTabParamList } from './types';
import { AdminHomeScreen }      from '@/features/admin/screens/AdminHomeScreen';
import { AdminBookingsPage }    from '@/features/admin/screens/AdminBookingsPage';
import { AdminPaymentsPage }    from '@/features/admin/screens/AdminPaymentsPage';
import { AdminMessagesStack }   from './AdminMessages';
import { AdminMoreStack }        from './AdminMore';
import { AppHeader }             from '@/components/layout/AppHeader';

const Tab = createBottomTabNavigator<AdminTabParamList>();

/** Build the header for admin tab screens — pink accent for admin role. */
function makeHeader(navigation: any) {
  return (props: any) => (
    <AppHeader
      {...props}
      onNotifications={() => navigation.navigate('AdminMore')}
      onAccount={() => navigation.navigate('AdminMore')}
    />
  );
}

export function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        header: makeHeader(navigation),

        tabBarStyle:             styles.tabBar,
        tabBarLabelStyle:        styles.tabBarLabel,
        tabBarIconStyle:         styles.tabBarIcon,
        tabBarActiveTintColor:   colors.pink,
        tabBarInactiveTintColor: colors.muted,
      })}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} /> }}
      />
      <Tab.Screen
        name="AdminBookings"
        component={AdminBookingsPage}
        options={{ title: 'Bookings', tabBarIcon: ({ color, size }) => <Ticket size={size} color={color} /> }}
      />
      <Tab.Screen
        name="AdminPayments"
        component={AdminPaymentsPage}
        options={{ title: 'Payments', tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} /> }}
      />
      <Tab.Screen
        name="AdminMessages"
        component={AdminMessagesStack}
        options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} /> }}
      />
      <Tab.Screen
        name="AdminMore"
        component={AdminMoreStack}
        options={{
          headerShown: false,  // More stack manages its own header
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
    marginTop: 4,
  },
  tabBarIcon: {
    marginBottom: 4,
  },
});
