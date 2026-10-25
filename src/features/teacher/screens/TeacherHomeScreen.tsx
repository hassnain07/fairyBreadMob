import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, type, space } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';

export function TeacherHomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View>
        <Text style={[type.h1, { color: colors.ink, marginBottom: space.sm }]}>
          Good morning, {user?.firstName}
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.xxl }]}>
          Here's your schedule for today.
        </Text>

        <View style={styles.card}>
          <Text style={[type.h3, { color: colors.ink, marginBottom: space.md }]}>
            Teacher Dashboard
          </Text>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
            Logged in as: {user?.email}
          </Text>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
            Role: {user?.role}
          </Text>

          <Button
            label="Sign Out"
            variant="danger"
            onPress={signOut}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
