import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import { useAuth } from '@/app/_providers';
import { colors, type } from '@/theme';
import { formatMoney } from '@/lib/utils/money';
import { computeGatingState } from '@/lib/utils/termUtils';

export function DebugDataScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const familyId = user?.familyId ?? '';

  // Fetch children
  const childrenQuery = useQuery({
    queryKey: qk.children(familyId),
    queryFn: () => dataClient.getChildren(familyId),
    enabled: !!familyId,
  });

  // Fetch terms
  const termsQuery = useQuery({
    queryKey: qk.terms(familyId),
    queryFn: () => dataClient.getTerms(familyId),
    enabled: !!familyId,
  });

  // Fetch gating
  const gatingQuery = useQuery({
    queryKey: ['gating', familyId],
    queryFn: () => dataClient.getGating(familyId),
    enabled: !!familyId,
  });

  // Fetch sessions
  const sessionsQuery = useQuery({
    queryKey: qk.sessions(),
    queryFn: () =>
      dataClient.getUpcomingSessions({
        from: new Date().toISOString(),
        to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
  });

  const gatingState = termsQuery.data ? computeGatingState(termsQuery.data) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
        <Text style={[type.h1, { color: colors.ink, marginBottom: 8 }]}>
          📊 Debug: Data Layer
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: 24 }]}>
          Testing children, gating, sessions
        </Text>

        {/* Children */}
        <Text style={[type.h2, { color: colors.ink, marginBottom: 12, marginTop: 16 }]}>
          👶 Children ({childrenQuery.data?.length ?? 0})
        </Text>
        {childrenQuery.isLoading && <ActivityIndicator color={colors.pink} size="small" />}
        {childrenQuery.isError && (
          <Text style={[type.body, { color: colors.status.danger.fg }]}>
            Error: {childrenQuery.error?.message}
          </Text>
        )}
        {childrenQuery.data?.map((child) => (
          <View
            key={child.id}
            style={{
              backgroundColor: colors.card,
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              borderLeftWidth: 4,
              borderLeftColor: colors.pink,
            }}
          >
            <Text style={[type.bodyStrong, { color: colors.ink }]}>
              {child.name} ({child.initials})
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              Year {child.year}, {child.school}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              Enrolled: {child.enrolled ? '✓' : '✗'}
            </Text>
          </View>
        ))}

        {/* Terms & Gating */}
        <Text style={[type.h2, { color: colors.ink, marginBottom: 12, marginTop: 16 }]}>
          🏫 Terms & Gating
        </Text>
        {termsQuery.isLoading && <ActivityIndicator color={colors.pink} size="small" />}
        {termsQuery.isError && (
          <Text style={[type.body, { color: colors.status.danger.fg }]}>
            Error: {termsQuery.error?.message}
          </Text>
        )}
        {gatingQuery.data && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Text style={[type.bodyStrong, { color: colors.ink }]}>
              Gating: {gatingQuery.data.state}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              Active Term: {gatingQuery.data.active_term_id || '(none)'}
            </Text>
            {gatingQuery.data.end_date && (
              <Text style={[type.caption, { color: colors.muted }]}>
                Ends: {new Date(gatingQuery.data.end_date).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}
        {termsQuery.data?.map((term) => (
          <View
            key={term.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Text style={[type.bodyStrong, { color: colors.ink }]}>
              {term.term_label || 'Term'} ({term.status})
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              {new Date(term.start_date).toLocaleDateString()} →{' '}
              {new Date(term.end_date).toLocaleDateString()}
            </Text>
          </View>
        ))}

        {/* Sessions */}
        <Text style={[type.h2, { color: colors.ink, marginBottom: 12, marginTop: 16 }]}>
          📅 Upcoming Sessions (next 30 days: {sessionsQuery.data?.length ?? 0})
        </Text>
        {sessionsQuery.isLoading && <ActivityIndicator color={colors.pink} size="small" />}
        {sessionsQuery.isError && (
          <Text style={[type.body, { color: colors.status.danger.fg }]}>
            Error: {sessionsQuery.error?.message}
          </Text>
        )}
        {sessionsQuery.data?.slice(0, 5).map((session) => (
          <View
            key={session.id}
            style={{
              backgroundColor: colors.card,
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Text style={[type.bodyStrong, { color: colors.ink }]}>
              {session.subject} ({session.teacher_name})
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              {new Date(session.starts_at).toLocaleString('en-AU', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={[type.caption, { color: colors.muted }]}>
              Spaces: {session.spaces_left} / {session.capacity}
            </Text>
          </View>
        ))}

        {/* formatMoney test */}
        <Text style={[type.h2, { color: colors.ink, marginBottom: 12, marginTop: 16 }]}>
          💰 formatMoney Test
        </Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <Text style={[type.caption, { color: colors.muted, marginBottom: 4 }]}>
            58300 cents:
          </Text>
          <Text style={[type.bodyStrong, { color: colors.ink }]}>
            {formatMoney(58300)}
          </Text>
        </View>

        {/* termUtils test */}
        <Text style={[type.h2, { color: colors.ink, marginBottom: 12, marginTop: 16 }]}>
          🧮 computeGatingState Test
        </Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 24 }}>
          <Text style={[type.caption, { color: colors.muted, marginBottom: 4 }]}>
            Computed from {termsQuery.data?.length ?? 0} terms:
          </Text>
          <Text style={[type.bodyStrong, { color: colors.ink }]}>
            {gatingState || 'Loading...'}
          </Text>
        </View>

        {/* Back button */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.surface,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
            marginVertical: 12,
            marginBottom: 32,
          }}
          onPress={onBack}
        >
          <Text style={[type.button, { color: colors.ink }]}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
