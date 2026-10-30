import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Calendar,
  MessageSquare,
  Search,
  Target,
  User,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ClassBooking } from '@/types/booking';
import type { Child } from '@/types/family';

// ── Types ─────────────────────────────────────────────────────────────────────

type StudentRow = {
  child:     Pick<Child, 'id' | 'name' | 'initials'> & Partial<Child>;
  subject:   string;
  day:       string;
  source:    string;
};

// ── Student profile sheet ────────────────────────────────────────────────────

function ProfileSheet({ child, booking, onClose }: {
  child:   StudentRow['child'];
  booking: ClassBooking | undefined;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  type ProfileSection = { icon: React.ComponentType<any>; title: string; content: React.ReactNode };
  const sections: ProfileSection[] = [];

  if ((child as Child).subjects?.length) {
    sections.push({
      icon: BookOpen, title: 'Learning areas',
      content: (
        <View style={styles.tagRow}>
          {(child as Child).subjects!.map(s => (
            <View key={s} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>
          ))}
        </View>
      ),
    });
  }
  if ((child as Child).preferredDays?.length) {
    sections.push({
      icon: Calendar, title: 'Preferred days',
      content: (
        <View style={styles.tagRow}>
          {(child as Child).preferredDays!.map(d => (
            <View key={d} style={[styles.tag, styles.tagTeal]}><Text style={[styles.tagText, { color: colors.teal }]}>{d}</Text></View>
          ))}
        </View>
      ),
    });
  }
  if ((child as Child).goals) {
    sections.push({ icon: Target, title: 'Learning goals',
      content: <Text style={styles.profilePara}>{(child as Child).goals}</Text> });
  }
  if ((child as Child).notes) {
    sections.push({ icon: MessageSquare, title: 'About this student',
      content: <Text style={styles.profilePara}>{(child as Child).notes}</Text> });
  }
  if ((child as Child).preferredTutor) {
    sections.push({
      icon: User, title: 'Preferences',
      content: (
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Preferred tutor</Text>
          <Text style={styles.prefValue}>{(child as Child).preferredTutor}</Text>
        </View>
      ),
    });
  }

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.xl) }]} onPress={e => e.stopPropagation()}>
        <View style={styles.sheetHandle} />

        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.drawerAvatar}>
            <Text style={styles.drawerAvatarText}>{child.initials ?? child.name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.drawerHeaderText}>
            <Text style={styles.drawerName}>{child.name}</Text>
            {booking?.session && (
              <Text style={styles.drawerSub}>
                {booking.session.subject} · {new Date(booking.session.starts_at).toLocaleDateString('en-AU', { weekday: 'long' })}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {sections.length === 0 ? (
            <Text style={[styles.emptyText, { padding: space.lg }]}>No profile details on file yet.</Text>
          ) : (
            sections.map(({ icon: Icon, title, content }, i) => (
              <View key={title} style={[styles.profileSection, i < sections.length - 1 && styles.profileSectionBorder]}>
                <View style={styles.profileSectionTitle}>
                  <Icon size={14} color={colors.muted} />
                  <Text style={styles.profileSectionTitleText}>{title}</Text>
                </View>
                {content}
              </View>
            ))
          )}
          <View style={{ height: space.xl }} />
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function TeacherStudentsPage() {
  const { teacherId } = useAuth();
  const qc = useQueryClient();
  const [search,          setSearch]          = useState('');
  const [selectedChild,   setSelectedChild]   = useState<StudentRow['child'] | null>(null);
  const [refreshing,      setRefreshing]      = useState(false);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: qk.teacherBookings,
    queryFn:  () => dataClient.getBookingsForTeacher(),
    enabled:  !!teacherId,
    staleTime: 2 * 60_000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.teacherBookings });
    setRefreshing(false);
  };

  const confirmedBookings = bookings.filter((b: ClassBooking) => b.status === 'confirmed');

  const rows: StudentRow[] = useMemo(() => {
    const seen = new Set<string>();
    return confirmedBookings
      .filter(b => b.child)
      .filter(b => { if (seen.has(b.child_id)) return false; seen.add(b.child_id); return true; })
      .map(b => ({
        child:   b.child!,
        subject: b.session?.subject ?? '—',
        day:     b.session ? new Date(b.session.starts_at).toLocaleDateString('en-AU', { weekday: 'long' }) : '—',
        source:  b.source === 'term_credit' ? 'Term credit' : 'Individual',
      }));
  }, [confirmedBookings]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => r.child.name.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q));
  }, [rows, search]);

  const selectedBooking = selectedChild
    ? confirmedBookings.find(b => b.child?.id === selectedChild.id)
    : undefined;

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.teal} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>My students</Text>
        <Text style={styles.pageSub}>Students enrolled across your classes.</Text>

        {/* Search */}
        <View style={styles.searchRow}>
          <Search size={15} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student or subject…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.muted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <X size={14} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {isLoading ? (
          <View style={{ gap: space.md }}>
            <Skeleton height={72} borderRadius={radius.card} />
            <Skeleton height={72} borderRadius={radius.card} />
            <Skeleton height={72} borderRadius={radius.card} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {rows.length === 0 ? 'No students enrolled in your classes yet.' : 'No students match your search.'}
            </Text>
          </View>
        ) : (
          <View style={[styles.listCard, shadow.card]}>
            {filtered.map((row, i) => (
              <TouchableOpacity
                key={row.child.id}
                style={[styles.row, i < filtered.length - 1 && styles.rowBorder]}
                onPress={() => setSelectedChild(row.child)}
                activeOpacity={0.7}
              >
                <View style={styles.rowAvatar}>
                  <Text style={styles.rowAvatarText}>{row.child.initials ?? row.child.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{row.child.name}</Text>
                  <Text style={styles.rowSub}>{row.subject} · {row.day}</Text>
                </View>
                <View style={[styles.sourceBadge, row.source === 'Term credit' && styles.sourceBadgeTeal]}>
                  <Text style={[styles.sourceBadgeText, row.source === 'Term credit' && { color: colors.teal }]}>
                    {row.source}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: space.xl }} />
      </ScrollView>

      {/* Profile sheet */}
      <Modal visible={!!selectedChild} transparent animationType="slide" onRequestClose={() => setSelectedChild(null)}>
        {selectedChild && (
          <ProfileSheet child={selectedChild} booking={selectedBooking} onClose={() => setSelectedChild(null)} />
        )}
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },

  pageTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: colors.ink, letterSpacing: -0.3 },
  pageSub:   { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, marginTop: 4 },

  // search
  searchRow: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   colors.card,
    borderRadius:      radius.md,
    paddingHorizontal: space.md,
    borderWidth:       1,
    borderColor:       colors.line,
    gap:               space.sm,
    minHeight:         44,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: space.sm },

  // list card
  listCard: {
    backgroundColor: colors.card,
    borderRadius:    radius.card,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     colors.line,
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: space.md,
    paddingVertical:   space.md,
    gap:               space.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowAvatar: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: colors.pinkSoft,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  rowAvatarText: { fontFamily: 'DMSans-Bold', fontSize: 13, color: colors.avatar.pink.fg },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.ink },
  rowSub:  { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },

  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      radius.pill,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.line,
    flexShrink:        0,
  },
  sourceBadgeTeal: { backgroundColor: colors.tealSoft, borderColor: colors.teal },
  sourceBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.muted },

  emptyWrap: { alignItems: 'center', paddingVertical: space.xl },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, textAlign: 'center' },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor:    colors.paper,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    maxHeight:          '88%',
    paddingHorizontal:  space.lg,
    paddingTop:         space.sm,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line,
    alignSelf: 'center', marginBottom: space.lg,
  },
  drawerHeader: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             space.md,
    paddingBottom:   space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom:    space.md,
  },
  drawerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  drawerAvatarText: { fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.avatar.pink.fg },
  drawerHeaderText: { flex: 1 },
  drawerName: { fontFamily: 'DMSans-Bold', fontSize: 17, color: colors.ink },
  drawerSub:  { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, marginTop: 2 },

  profileSection: { paddingVertical: space.md },
  profileSectionBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  profileSectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  profileSectionTitleText: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  profilePara: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.ink, lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: {
    paddingHorizontal: space.md, paddingVertical: space.xs,
    backgroundColor: colors.pinkSoft, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.avatar.pink.bg,
  },
  tagTeal: { backgroundColor: colors.tealSoft, borderColor: colors.teal },
  tagText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.avatar.pink.fg },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prefLabel: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },
  prefValue: { fontFamily: 'DMSans-Bold',    fontSize: 13, color: colors.ink },
});
