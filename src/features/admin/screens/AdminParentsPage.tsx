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
import { Check, ChevronRight, Minus, Plus, Search, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { TermGatingState } from '@/types/term';
import type { Family } from '@/types/family';

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOURS = ['pink', 'teal', 'yellow', 'orange', 'green', 'magenta'] as const;

const GATING_LABEL: Record<TermGatingState, string> = {
  NO_TERM_EVER: 'No term',
  ACTIVE_TERM:  'Active term',
  TERM_EXPIRED: 'Term expired',
};

const GATING_STYLE: Record<TermGatingState, { bg: string; fg: string }> = {
  NO_TERM_EVER: { bg: colors.status.neutral.bg,  fg: colors.status.neutral.fg  },
  ACTIVE_TERM:  { bg: colors.status.success.bg,  fg: colors.status.success.fg  },
  TERM_EXPIRED: { bg: colors.status.danger.bg,   fg: colors.status.danger.fg   },
};

const PAY_STYLE: Record<string, { bg: string; fg: string }> = {
  paid:     { bg: colors.status.success.bg, fg: colors.status.success.fg },
  pending:  { bg: colors.status.pending.bg, fg: colors.status.pending.fg },
  failed:   { bg: colors.status.danger.bg,  fg: colors.status.danger.fg  },
  rejected: { bg: colors.status.danger.bg,  fg: colors.status.danger.fg  },
};

const AVATAR_MAP: Record<string, { bg: string; fg: string }> = {
  pink:    { bg: colors.avatar.pink.bg,    fg: colors.avatar.pink.fg    },
  teal:    { bg: colors.avatar.teal.bg,    fg: colors.avatar.teal.fg    },
  yellow:  { bg: colors.avatar.yellow.bg,  fg: colors.avatar.yellow.fg  },
  orange:  { bg: colors.avatar.orange.bg,  fg: colors.avatar.orange.fg  },
  green:   { bg: colors.avatar.green.bg,   fg: colors.avatar.green.fg   },
  magenta: { bg: colors.avatar.magenta.bg, fg: colors.avatar.magenta.fg },
};

function avColor(index: number) {
  return AVATAR_MAP[COLOURS[index % COLOURS.length]];
}

function formatMoney(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

// ── Row item ──────────────────────────────────────────────────────────────────

type FamilyRow = Family & {
  gatingState: TermGatingState;
  creditsRemaining: number;
  lastPaymentStatus: string;
  childCount: number;
  colorIdx: number;
};

function FamilyCard({ item, onPress }: { item: FamilyRow; onPress: () => void }) {
  const av = avColor(item.colorIdx);
  const gs = GATING_STYLE[item.gatingState];
  const ps = item.lastPaymentStatus !== 'none' ? PAY_STYLE[item.lastPaymentStatus] : null;
  const initials = item.parent_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity style={[styles.familyCard, shadow.card]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.famAvatar, { backgroundColor: av.bg }]}>
        <Text style={[styles.famAvatarText, { color: av.fg }]}>{initials}</Text>
      </View>
      <View style={styles.famBody}>
        <Text style={styles.famName}>{item.parent_name}</Text>
        <Text style={styles.famEmail}>{item.email ?? '—'}</Text>
        <Text style={styles.famMeta}>{item.childCount} child{item.childCount !== 1 ? 'ren' : ''}</Text>
      </View>
      <View style={styles.famRight}>
        <View style={[styles.gatingBadge, { backgroundColor: gs.bg }]}>
          <Text style={[styles.gatingText, { color: gs.fg }]}>{GATING_LABEL[item.gatingState]}</Text>
        </View>
        {item.gatingState === 'ACTIVE_TERM' && (
          <Text style={styles.famCredits}>{item.creditsRemaining} cr</Text>
        )}
        {ps && (
          <View style={[styles.gatingBadge, { backgroundColor: ps.bg }]}>
            <Text style={[styles.gatingText, { color: ps.fg }]}>
              {item.lastPaymentStatus.charAt(0).toUpperCase() + item.lastPaymentStatus.slice(1)}
            </Text>
          </View>
        )}
        <ChevronRight size={14} color={colors.mutedSoft} />
      </View>
    </TouchableOpacity>
  );
}

// ── Detail sheet ──────────────────────────────────────────────────────────────

function DetailSheet({ familyRow, onClose }: { familyRow: FamilyRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustError, setAdjustError] = useState('');

  const { data: children = [] } = useQuery({
    queryKey: qk.children(familyRow.id),
    queryFn:  () => dataClient.getChildren(familyRow.id),
    staleTime: 60_000,
  });

  const { data: terms = [] } = useQuery({
    queryKey: qk.terms(familyRow.id),
    queryFn:  () => dataClient.getTerms(familyRow.id),
    staleTime: 30_000,
  });

  const { data: payments = [] } = useQuery({
    queryKey: qk.payments(familyRow.id),
    queryFn:  () => dataClient.getPayments(familyRow.id),
    staleTime: 30_000,
  });

  const activeTerm = terms.find(t => new Date(t.end_date) > new Date());

  const { mutate: adjust, isPending: adjusting } = useMutation({
    mutationFn: () => {
      const delta = parseInt(adjustDelta, 10);
      if (isNaN(delta) || delta === 0 || !adjustNote.trim() || !activeTerm) throw new Error('invalid_input');
      return dataClient.adminAdjustCredits(activeTerm.id, delta, adjustNote.trim());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.terms(familyRow.id) });
      qc.invalidateQueries({ queryKey: ['gating', familyRow.id] });
      setShowAdjust(false);
      setAdjustDelta('');
      setAdjustNote('');
      setAdjustError('');
    },
    onError: (e: any) => setAdjustError(e?.message ?? 'Failed to adjust credits.'),
  });

  const av = avColor(familyRow.colorIdx);
  const initials = familyRow.parent_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const gs = GATING_STYLE[familyRow.gatingState];
  const lastPayment = payments[0];

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
        <View style={styles.sheetHandle} />

        {/* Header */}
        <View style={styles.sheetHead}>
          <View style={[styles.sheetAvatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.sheetAvatarText, { color: av.fg }]}>{initials}</Text>
          </View>
          <View style={styles.sheetHeadText}>
            <Text style={styles.sheetName}>{familyRow.parent_name}</Text>
            <Text style={styles.sheetEmail}>{familyRow.email ?? '—'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Detail rows */}
          <View style={styles.detailTable}>
            {familyRow.phone ? <DetailRow label="Phone" value={familyRow.phone} /> : null}
            <DetailRow label="Reference" value={familyRow.reference_code} />
            <DetailRow label="Children" value={children.map(c => c.name).join(', ') || '—'} />
            <View style={[styles.detailRow, styles.detailRowBorder]}>
              <Text style={styles.detailLabel}>Term status</Text>
              <View style={[styles.gatingBadge, { backgroundColor: gs.bg }]}>
                <Text style={[styles.gatingText, { color: gs.fg }]}>{GATING_LABEL[familyRow.gatingState]}</Text>
              </View>
            </View>
            {activeTerm && (
              <DetailRow
                label="Term"
                value={`${activeTerm.term_label ?? 'Active'} · ends ${new Date(activeTerm.end_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`}
              />
            )}
            {lastPayment && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last payment</Text>
                {(() => {
                  const ps = PAY_STYLE[lastPayment.status] ?? { bg: colors.surface, fg: colors.muted };
                  return (
                    <View style={[styles.gatingBadge, { backgroundColor: ps.bg }]}>
                      <Text style={[styles.gatingText, { color: ps.fg }]}>
                        {lastPayment.status.charAt(0).toUpperCase() + lastPayment.status.slice(1)}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}
          </View>

          {/* Adjust credits */}
          {activeTerm && !showAdjust && (
            <Button label="Adjust credits" variant="soft" onPress={() => { setShowAdjust(true); setAdjustError(''); }} />
          )}

          {activeTerm && showAdjust && (
            <View style={styles.adjustWrap}>
              <Text style={styles.adjustLabel}>Adjust credits <Text style={{ color: colors.pink }}>(note required)</Text></Text>
              <View style={styles.adjustRow}>
                <View style={styles.deltaWrap}>
                  <TouchableOpacity
                    style={styles.deltaBtn}
                    onPress={() => setAdjustDelta(d => String((parseInt(d || '0', 10) || 0) - 1))}
                    hitSlop={8}
                  >
                    <Minus size={14} color={colors.ink} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.deltaInput}
                    value={adjustDelta}
                    onChangeText={setAdjustDelta}
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    keyboardType="numbers-and-punctuation"
                    textAlign="center"
                  />
                  <TouchableOpacity
                    style={styles.deltaBtn}
                    onPress={() => setAdjustDelta(d => String((parseInt(d || '0', 10) || 0) + 1))}
                    hitSlop={8}
                  >
                    <Plus size={14} color={colors.ink} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.deltaNote, { flex: 1 }]}
                  value={adjustNote}
                  onChangeText={setAdjustNote}
                  placeholder="Reason (required)"
                  placeholderTextColor={colors.muted}
                />
              </View>
              {adjustError ? <View style={styles.errorBox}><Text style={styles.errorText}>{adjustError}</Text></View> : null}
              <View style={styles.adjustActions}>
                <Button label="Cancel" variant="ghost" onPress={() => setShowAdjust(false)} style={{ flex: 1 }} />
                <Button
                  label={adjusting ? 'Saving…' : 'Apply'}
                  variant="primary"
                  icon={Check}
                  loading={adjusting}
                  disabled={adjusting || !adjustDelta.trim() || !adjustNote.trim()}
                  onPress={() => adjust()}
                  style={{ flex: 2 }}
                />
              </View>
            </View>
          )}

          <View style={{ height: space.xl }} />
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.detailRow, styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminParentsPage() {
  const qc = useQueryClient();
  const [search,       setSearch]       = useState('');
  const [refreshing,   setRefreshing]   = useState(false);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);

  const { data: families = [], isLoading } = useQuery({
    queryKey: qk.families,
    queryFn:  () => dataClient.getAllFamilies(),
    staleTime: 60_000,
  });

  const rows: FamilyRow[] = useMemo(() =>
    families.map((f, i) => ({
      ...f,
      gatingState:       ((f as any).gating_state  ?? 'NO_TERM_EVER') as TermGatingState,
      creditsRemaining:  (f as any).credits_remaining ?? 0,
      lastPaymentStatus: (f as any).last_payment_status ?? 'none',
      childCount:        (f as any).child_count ?? f.children?.length ?? 0,
      colorIdx:          i,
    })),
    [families]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.parent_name.toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const selected = selectedId ? rows.find(r => r.id === selectedId) ?? null : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.families });
    setRefreshing(false);
  };

  return (
    <View style={styles.root}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Search size={15} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search parents…"
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

      {/* List */}
      {isLoading ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={84} borderRadius={radius.card} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.id}
          renderItem={({ item }) => <FamilyCard item={item} onPress={() => setSelectedId(item.id)} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>{rows.length === 0 ? 'No families yet.' : 'No parents match your search.'}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelectedId(null)}>
        {selected && (
          <DetailSheet familyRow={selected} onClose={() => setSelectedId(null)} />
        )}
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  searchWrap: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.line,
    gap: space.sm, minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: space.sm },

  listContent: { paddingHorizontal: space.lg, paddingBottom: space.huge, gap: space.md },
  emptyWrap: { alignItems: 'center', paddingVertical: space.xxl },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },

  // family card
  familyCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.card, borderRadius: radius.card, padding: space.md,
    borderWidth: 1, borderColor: colors.line,
  },
  famAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  famAvatarText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  famBody: { flex: 1, minWidth: 0 },
  famName: { fontFamily: 'DMSans-Bold', fontSize: 14, color: colors.ink },
  famEmail: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },
  famMeta:  { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.mutedSoft, marginTop: 1 },
  famRight: { alignItems: 'flex-end', gap: space.xs },
  famCredits: { fontFamily: 'DMSans-Bold', fontSize: 11, color: colors.teal },
  gatingBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  gatingText: { fontFamily: 'DMSans-Bold', fontSize: 9 },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '90%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.lg, borderBottomWidth: 1, borderBottomColor: colors.line, marginBottom: space.lg },
  sheetAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sheetAvatarText: { fontSize: 16, fontWeight: '700' },
  sheetHeadText: { flex: 1 },
  sheetName:  { fontFamily: 'DMSans-Bold',    fontSize: 17, color: colors.ink },
  sheetEmail: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, marginTop: 2 },

  // detail table
  detailTable: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, marginBottom: space.lg, gap: space.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.sm },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  detailLabel: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },
  detailValue: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink, textAlign: 'right', flex: 1, marginLeft: space.md },

  // adjust credits
  adjustWrap: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, gap: space.md, marginBottom: space.lg, borderWidth: 1, borderColor: colors.line },
  adjustLabel: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.ink },
  adjustRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  deltaWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  deltaBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  deltaInput: { width: 48, height: 44, textAlign: 'center', fontSize: 15, color: colors.ink, fontWeight: '700' },
  deltaNote: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.line, fontSize: 14, color: colors.ink, minHeight: 44 },
  adjustActions: { flexDirection: 'row', gap: space.md },

  errorBox: { backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.error.border },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },
});
