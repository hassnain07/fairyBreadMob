import React, { useMemo, useState } from 'react';
import {
  FlatList,
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, ChevronRight } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ClassBooking, BookingStatus } from '@/types/booking';

// ── Constants ────────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Confirmed', 'Waiting list', 'Cancelled'] as const;
type Filter = typeof FILTERS[number];

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const STATUS_STYLE: Record<BookingStatus, { bg: string; fg: string; label: string }> = {
  confirmed:        { bg: colors.status.success.bg, fg: colors.status.success.fg, label: 'Confirmed' },
  waiting_list:     { bg: colors.status.pending.bg,  fg: colors.status.pending.fg,  label: 'Waiting list' },
  pending_payment:  { bg: colors.status.pending.bg,  fg: colors.status.pending.fg,  label: 'Awaiting payment' },
  cancelled:        { bg: colors.status.danger.bg,   fg: colors.status.danger.fg,   label: 'Cancelled' },
};

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({ booking, onCancel }: { booking: ClassBooking; onCancel: () => void }) {
  const session = booking.session;
  const child = booking.child;
  const d = session ? new Date(session.starts_at) : null;
  const ss = STATUS_STYLE[booking.status];

  const timeStr = d
    ? d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

  const dateStr = d
    ? `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
    : '—';

  return (
    <View style={[styles.card, shadow.card]}>
      {/* Date block */}
      {d && (
        <View style={styles.dateBlock}>
          <Text style={styles.dateDay}>{DAYS[d.getDay()]}</Text>
          <Text style={styles.dateNum}>{d.getDate()}</Text>
          <Text style={styles.dateMon}>{MONTHS[d.getMonth()]}</Text>
        </View>
      )}

      {/* Main info */}
      <View style={styles.cardBody}>
        <Text style={styles.cardSubject}>{session?.subject ?? '—'}</Text>
        {timeStr && (
          <Text style={styles.cardMeta}>{timeStr}</Text>
        )}
        <Text style={styles.cardMeta}>
          {session?.teacher_name ?? '—'} · {child?.name ?? '—'}
        </Text>
      </View>

      {/* Right: badges + action */}
      <View style={styles.cardRight}>
        <View style={[styles.sourceBadge, booking.source === 'term_credit' && styles.sourceBadgeTeal]}>
          <Text style={[styles.sourceText, booking.source === 'term_credit' && { color: colors.teal }]}>
            {booking.source === 'term_credit' ? 'Term credit' : 'Individual'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
          <Text style={[styles.statusText, { color: ss.fg }]}>{ss.label}</Text>
        </View>
        {booking.status === 'confirmed' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
            <ChevronRight size={12} color={colors.status.danger.fg} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Cancel sheet ──────────────────────────────────────────────────────────────

function CancelSheet({
  visible, restoring, onToggleRestore, onConfirm, onClose, cancelling, error,
}: {
  visible: boolean;
  restoring: boolean;
  onToggleRestore: () => void;
  onConfirm: () => void;
  onClose: () => void;
  cancelling: boolean;
  error: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Cancel booking?</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sheetDesc}>Choose whether to return the family's class credit.</Text>

          {/* Restore credit toggle */}
          <TouchableOpacity style={styles.toggleRow} onPress={onToggleRestore} activeOpacity={0.7}>
            <View style={[styles.toggleTrack, restoring && styles.toggleTrackOn]}>
              <View style={[styles.toggleThumb, restoring && styles.toggleThumbOn]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Return credit to family</Text>
              <Text style={styles.toggleSub}>{restoring ? 'Credit will be restored' : 'Credit will not be restored'}</Text>
            </View>
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.sheetFooter}>
            <Button label="Keep booking" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button label={cancelling ? 'Cancelling…' : 'Yes, cancel'} variant="danger" loading={cancelling} disabled={cancelling} onPress={onConfirm} style={{ flex: 2 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminBookingsPage() {
  const qc = useQueryClient();
  const [filter,          setFilter]        = useState<Filter>('All');
  const [search,          setSearch]        = useState('');
  const [refreshing,      setRefreshing]    = useState(false);
  const [cancellingId,    setCancellingId]  = useState<string | null>(null);
  const [restoreCredit,   setRestoreCredit] = useState(true);
  const [cancelError,     setCancelError]   = useState('');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: qk.allBookings,
    queryFn:  () => dataClient.getAllBookings(),
    staleTime: 30_000,
  });

  const { mutate: cancelBooking, isPending: cancelling } = useMutation({
    mutationFn: (id: string) => dataClient.cancelBooking(id, { restoreCredit }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.allBookings });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['terms'] });
      qc.invalidateQueries({ queryKey: qk.sessions() });
      setCancellingId(null);
      setCancelError('');
    },
    onError: (e: any) => setCancelError(e?.message ?? 'Failed to cancel booking.'),
  });

  const counts: Record<Filter, number> = useMemo(() => ({
    All:           bookings.length,
    Confirmed:     bookings.filter(b => b.status === 'confirmed').length,
    'Waiting list': bookings.filter(b => b.status === 'waiting_list').length,
    Cancelled:      bookings.filter(b => b.status === 'cancelled').length,
  }), [bookings]);

  const filtered = useMemo(() => {
    let list = bookings;
    if (filter === 'Confirmed')     list = list.filter(b => b.status === 'confirmed');
    else if (filter === 'Waiting list') list = list.filter(b => b.status === 'waiting_list');
    else if (filter === 'Cancelled')    list = list.filter(b => b.status === 'cancelled');

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        (b.child?.name ?? '').toLowerCase().includes(q) ||
        (b.session?.subject ?? '').toLowerCase().includes(q) ||
        (b.session?.teacher_name ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, filter, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.allBookings });
    setRefreshing(false);
  };

  const openCancel = (id: string) => {
    setCancellingId(id);
    setRestoreCredit(true);
    setCancelError('');
  };

  const renderItem = ({ item }: { item: ClassBooking }) => (
    <BookingCard booking={item} onCancel={() => openCancel(item.id)} />
  );

  return (
    <View style={styles.root}>
      {/* ── Search ────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Search size={15} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student, subject or tutor…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.muted}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <X size={14} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter chips ──────────────────────────────── */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => { setFilter(f); setSearch(''); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, filter === f && { color: '#fff' }]}>{f}</Text>
              <View style={[styles.filterCount, filter === f && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={[styles.filterCountText, filter === f && { color: '#fff' }]}>{counts[f]}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── List ──────────────────────────────────────── */}
      <View style={{ flex: 1 }}>
        {isLoading ? (
          <View style={styles.listContent}>
            {[1, 2, 3].map(i => <Skeleton key={i} height={92} borderRadius={radius.card} />)}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={b => b.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No bookings found.</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* ── Cancel sheet ──────────────────────────────── */}
      <CancelSheet
        visible={!!cancellingId}
        restoring={restoreCredit}
        onToggleRestore={() => setRestoreCredit(v => !v)}
        onConfirm={() => cancellingId && cancelBooking(cancellingId)}
        onClose={() => { setCancellingId(null); setCancelError(''); }}
        cancelling={cancelling}
        error={cancelError}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  // search
  searchWrap: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.line,
    gap: space.sm, minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: space.sm },

  // filter chips — fixed-height wrapper prevents reflow when active tab changes
  filterWrap: {
    flexShrink: 0,
    height: 52,
    justifyContent: 'center',
  },
  filterRow: { paddingHorizontal: space.lg, gap: space.sm, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    paddingHorizontal: space.md, paddingVertical: space.xs,
    borderRadius: radius.pill, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line, flexShrink: 0,
  },
  filterChipActive: { backgroundColor: colors.pink, borderColor: colors.pink },
  filterText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.muted },
  filterCount: {
    backgroundColor: colors.surface, borderRadius: radius.pill,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterCountText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: colors.muted, lineHeight: 11 },

  // list
  listContent: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.huge, gap: space.md },
  emptyWrap: { alignItems: 'center', paddingVertical: space.xxl },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, textAlign: 'center' },

  // booking card
  card: {
    flexDirection: 'row', gap: space.md, alignItems: 'stretch',
    backgroundColor: colors.card, borderRadius: radius.card, padding: space.md,
    borderWidth: 1, borderColor: colors.line,
  },
  dateBlock: {
    width: 46, borderRadius: radius.md, paddingVertical: space.xs,
    backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dateDay: { fontFamily: 'DMSans-Bold', fontSize: 8, color: colors.avatar.pink.fg, letterSpacing: 0.5 },
  dateNum: { fontFamily: 'DMSans-Bold', fontSize: 18, color: colors.avatar.pink.fg, lineHeight: 20 },
  dateMon: { fontFamily: 'DMSans-Bold', fontSize: 8, color: colors.avatar.pink.fg, letterSpacing: 0.5 },
  cardBody: { flex: 1, justifyContent: 'center' },
  cardSubject: { fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.ink },
  cardMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: space.xs, justifyContent: 'center' },
  sourceBadge: {
    backgroundColor: colors.surface, borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.line,
  },
  sourceBadgeTeal: { backgroundColor: colors.tealSoft, borderColor: colors.teal },
  sourceText: { fontFamily: 'DMSans-Bold', fontSize: 9, color: colors.muted },
  statusBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontFamily: 'DMSans-Bold', fontSize: 9 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cancelBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.status.danger.fg },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '80%',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  sheetTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.ink },
  sheetDesc: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: space.lg },

  // toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.line, padding: 2, justifyContent: 'flex-start' },
  toggleTrackOn: { backgroundColor: colors.pink },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.ink },
  toggleSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },

  // error
  errorBox: { backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.error.border, marginBottom: space.md },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },

  // sheet footer
  sheetFooter: { flexDirection: 'row', gap: space.md, paddingBottom: space.xl },
});
