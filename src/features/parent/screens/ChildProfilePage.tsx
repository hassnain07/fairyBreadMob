import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextStyle,
} from 'react-native';
import { FileText, Download } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useChildById } from '../hooks/useChildById';

interface ChildProfilePageProps {
  childId: string;
  onNavigate?: (screen: string) => void;
}

export function ChildProfilePage({ childId, onNavigate }: ChildProfilePageProps) {
  const { data: child, isLoading } = useChildById(childId);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = ['Overview', 'Goals', 'Attendance', 'Sessions', 'Notes'];

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (isLoading) {
    return (
      <ScrollView style={styles.container}>
        <Skeleton height={250} borderRadius={radius.card} />
        <Skeleton height={150} borderRadius={radius.md} style={{ marginTop: space.lg }} />
      </ScrollView>
    );
  }

  if (!child) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[type.body, { color: colors.muted }]}>Child not found</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Banner */}
      <View style={[styles.banner, shadow.card as object]}>
        <View style={styles.bannerContent}>
          <Avatar initials={child.initials} size={64} />
          <View style={styles.bannerText}>
            <Text style={[type.eyebrow, { color: colors.pink, marginBottom: space.xs } as TextStyle]}>
              Student profile
            </Text>
            <Text style={[type.h2, { color: colors.ink, marginBottom: space.xs } as TextStyle]}>
              {child.name}
            </Text>
            <Text style={[type.small, { color: colors.muted } as TextStyle]}>
              {child.year} · {child.school}
            </Text>
          </View>
        </View>

        <View style={styles.bannerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              // Download summary PDF
            }}
          >
            <Download size={18} color={colors.ink} />
            <Text style={[type.small, { color: colors.ink, fontWeight: '600' }]}>
              Download
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigate?.('Reports')}
          >
            <FileText size={18} color={colors.pink} />
            <Text style={[type.small, { color: colors.pink, fontWeight: '600' }]}>
              View report →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Simple Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(index)}
              style={[
                styles.tabButton,
                selectedTab === index && styles.tabButtonActive,
              ]}
            >
              <Text
                style={[
                  type.small,
                  {
                    color: selectedTab === index ? colors.pink : colors.muted,
                    fontWeight: selectedTab === index ? '600' : '400',
                  } as TextStyle,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {selectedTab === 0 && (
          // Overview
          <View style={[styles.card, shadow.card as object]}>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
              Overview
            </Text>
            <View style={styles.field}>
              <Text style={[type.caption, { color: colors.mutedSoft }]}>Given name</Text>
              <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]}>
                {child.givenName}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={[type.caption, { color: colors.mutedSoft }]}>Family name</Text>
              <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]}>
                {child.familyName}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={[type.caption, { color: colors.mutedSoft }]}>Year level</Text>
              <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]}>
                {child.year}
              </Text>
            </View>
            {child.school && (
              <View style={styles.field}>
                <Text style={[type.caption, { color: colors.mutedSoft }]}>School</Text>
                <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]}>
                  {child.school}
                </Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 1 && (
          // Goals
          <View style={[styles.card, shadow.card as object]}>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
              Learning goals
            </Text>
            {child.goals ? (
              <Text style={[type.body, { color: colors.ink }]}>{child.goals}</Text>
            ) : (
              <Text style={[type.body, { color: colors.muted }]}>
                No learning goals on file yet.
              </Text>
            )}
          </View>
        )}

        {selectedTab === 2 && (
          // Attendance
          <View style={[styles.card, shadow.card as object]}>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
              Attendance
            </Text>
            <Text style={[type.body, { color: colors.muted }]}>
              Attendance records will appear here once {child.givenName} books classes.
            </Text>
          </View>
        )}

        {selectedTab === 3 && (
          // Sessions
          <View style={[styles.card, shadow.card as object]}>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
              Sessions
            </Text>
            <Text style={[type.body, { color: colors.muted }]}>
              Upcoming and past sessions will appear here.
            </Text>
          </View>
        )}

        {selectedTab === 4 && (
          // Notes
          <View style={[styles.card, shadow.card as object]}>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
              Notes
            </Text>
            {child.notes ? (
              <Text style={[type.body, { color: colors.ink }]}>{child.notes}</Text>
            ) : (
              <Text style={[type.body, { color: colors.muted }]}>
                No notes on file yet.
              </Text>
            )}
          </View>
        )}
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
    gap: space.lg,
  },
  banner: {
    backgroundColor: '#FFF1F5',
    borderRadius: radius.card,
    padding: space.lg,
  },
  bannerContent: {
    flexDirection: 'row',
    gap: space.lg,
    marginBottom: space.lg,
  },
  bannerText: {
    flex: 1,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: space.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabsContainer: {
    marginVertical: space.lg,
  },
  tabButton: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginRight: space.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.pink,
  },
  tabContent: {
    marginBottom: space.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  field: {
    marginBottom: space.lg,
  },
});
