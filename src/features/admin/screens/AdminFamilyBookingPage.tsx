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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDollarSign,
  CreditCard,
  Plus,
  Search,
  Ticket,
  Users,
  X,
} from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import { TermCreditMeter } from '@/components/domain/TermCreditMeter';
import type { Child, Family } from '@/types/family';
import type { ClassSession } from '@/types/teacher';

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'family' | 'action' | 'book-class' | 'term-purchase' | 'done';
type DoneState = { type: 'term' | 'class-credit' | 'class-individual'; familyName: string; childName?: string; subject?: string };

function formatMoney(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

const SUBJECT_COLOR: Record<string, { bg: string; fg: string }> = {
  Mathematics: { bg: colors.pinkSoft,   fg: colors.avatar.pink.fg   },
  English:     { bg: colors.tealSoft,   fg: colors.avatar.teal.fg   },
  Reading:     { bg: colors.orangeSoft, fg: colors.avatar.orange.fg },
};
const defaultColor = { bg: colors.yellowSoft, fg: colors.avatar.yellow.fg };

// ── Success / done ────────────────────────────────────────────────────────────

function DoneView({ state, onMore, onReset }: { state: DoneState; onMore: () => void; onReset: () => void }) {
  const title = state.type === 'term' ? 'Term activated!' : 'Class booked!';
  const msg =
    state.type === 'term'
      ? `${state.familyName}'s account is now active for this term.`
      : state.type === 'class-credit'
      ? `${state.childName}'s ${state.subject} class confirmed using a term credit.`
      : `${state.childName}'s ${state.subject} class confirmed and recorded as paid.`;

  return (
    <View style={s.doneWrap}>
      <View style={s.doneIcon}>
        <Check size={32} color={colors.status.success.fg} strokeWidth={2.5} />
      </View>
      <Text style={s.doneTitle}>{title}</Text>
      <Text style={s.doneMsg}>{msg}</Text>
      <View style={s.doneActions}>
        <Button label={`Do more for ${state.familyName.split(' ')[0]}`} variant="primary" icon={ArrowRight} onPress={onMore} fullWidth />
        <Button label="Start over" variant="soft" onPress={onReset} fullWidth />
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminFamilyBookingPage({ navigation }: any) {
  const qc = useQueryClient();

  const [step,               setStep]              = useState<Step>('family');
  const [familyId,           setFamilyId]          = useState('');
  const [selectedChild,      setSelectedChild]     = useState<Child | null>(null);
  const [bookingMode,        setBookingMode]       = useState<'term' | 'individual'>('term');
  const [confirmSession,    setConfirmSession]    = useState<ClassSession | null>(null);
  const [done,              setDone]              = useState<DoneState | null>(null);
  const [search,            setSearch]            = useState('');
  const [mutError,         setMutError]          = useState('');

  // Add child / family modals
  const [showAddChild,   setShowAddChild]   = useState(false);
  const [showAddFamily,  setShowAddFamily]  = useState(false);
  const [newChild,       setNewChild]       = useState({ givenName: '', familyName: '', year: 'Year 5', school: '' });
  const [newFamily,      setNewFamily]      = useState({ parentName: '', email: '', phone: '' });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: families = [], isLoading: loadingFamilies } = useQuery({
    queryKey: qk.families,
    queryFn:  () => dataClient.getAllFamilies(),
    staleTime: 60_000,
  });

  const { data: children = [] } = useQuery({
    queryKey: qk.children(familyId),
    queryFn:  () => dataClient.getChildren(familyId),
    enabled:  !!familyId,
    staleTime: 30_000,
  });

  const { data: gating } = useQuery({
    queryKey: ['gating', familyId],
    queryFn:  () => dataClient.getGating(familyId),
    enabled:  !!familyId,
    staleTime: 30_000,
  });

  const { data: terms = [] } = useQuery({
    queryKey: qk.terms(familyId),
    queryFn:  () => dataClient.getTerms(familyId),
    enabled:  !!familyId,
    staleTime: 30_000,
  });

  const weekTo = useMemo(() => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10), []);
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: qk.sessions({ to: weekTo }),
    queryFn:  () => dataClient.getUpcomingSessions({ to: weekTo, from: new Date().toISOString() }),
    enabled:  step === 'book-class',
    staleTime: 30_000,
  });

  const { data: quote } = useQuery({
    queryKey: qk.quote('term', familyId),
    queryFn:  () => dataClient.getPriceQuote('term', familyId),
    enabled:  !!familyId && step === 'term-purchase',
    staleTime: 60_000,
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const enrolledChildren = children.filter(c => c.enrolled);
  const activeTerm = terms.find(t => new Date(t.end_date) > new Date());
  const gatingState = gating?.state ?? 'NO_TERM_EVER';
  const family: Family | undefined = families.find(f => f.id === familyId);
  const familyName = family?.parent_name ?? familyId;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const purchaseTermMut = useMutation({
    mutationFn: () => dataClient.adminRecordPayment({ familyId, type: 'term' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.terms(familyId) });
      qc.invalidateQueries({ queryKey: ['gating', familyId] });
      qc.invalidateQueries({ queryKey: qk.allPayments });
      qc.invalidateQueries({ queryKey: qk.adminStats });
      setDone({ type: 'term', familyName });
      setStep('done');
    },
    onError: (e: any) => setMutError(e?.message ?? 'Failed to activate term.'),
  });

  const bookClassMut = useMutation({
    mutationFn: async (session: ClassSession) => {
      if (!selectedChild) throw new Error('No child selected');
      if (bookingMode === 'term') {
        return dataClient.bookClassSession(selectedChild.id, session.id);
      }
      return dataClient.adminRecordPayment({
        familyId, type: 'individual_class', childId: selectedChild.id, sessionId: session.id,
      });
    },
    onSuccess: (_, session) => {
      qc.invalidateQueries({ queryKey: qk.terms(familyId) });
      qc.invalidateQueries({ queryKey: ['gating', familyId] });
      qc.invalidateQueries({ queryKey: qk.bookings(familyId) });
      qc.invalidateQueries({ queryKey: qk.allBookings });
      qc.invalidateQueries({ queryKey: qk.sessions() });
      setDone({
        type: bookingMode === 'term' ? 'class-credit' : 'class-individual',
        familyName, childName: selectedChild?.name, subject: session.subject,
      });
      setConfirmSession(null);
      setStep('done');
    },
    onError: (e: any) => setMutError(e?.message ?? 'Failed to book class.'),
  });

  const addChildMut = useMutation({
    mutationFn: () => dataClient.addChild(familyId, {
      givenName: newChild.givenName.trim(), familyName: newChild.familyName.trim(),
      year: newChild.year, school: newChild.school,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.children(familyId) });
      setShowAddChild(false);
      setNewChild({ givenName: '', familyName: '', year: 'Year 5', school: '' });
    },
    onError: (e: any) => setMutError(e?.message ?? 'Failed to add child.'),
  });

  const markEnrolledMut = useMutation({
    mutationFn: (childId: string) => dataClient.adminMarkEnrolled(childId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.children(familyId) }),
    onError: (e: any) => setMutError(e?.message ?? 'Failed to enrol.'),
  });

  const createFamilyMut = useMutation({
    mutationFn: () => dataClient.createFamily({
      parentName: newFamily.parentName.trim(),
      email: newFamily.email.trim() || undefined,
      phone: newFamily.phone.trim() || undefined,
    }),
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: qk.families });
      setFamilyId(f.id);
      setShowAddFamily(false);
      setNewFamily({ parentName: '', email: '', phone: '' });
      setStep('action');
    },
    onError: (e: any) => setMutError(e?.message ?? 'Failed to create family.'),
  });

  function reset() {
    setStep('family'); setFamilyId(''); setSelectedChild(null);
    setBookingMode('term'); setDone(null); setMutError(''); setSearch('');
  }

  const filteredFamilies = families.filter(f =>
    !search.trim() || f.parent_name.toLowerCase().includes(search.toLowerCase()) || f.reference_code.toLowerCase().includes(search.toLowerCase())
  );

  // ═══ DONE ════════════════════════════════════════════════════════════════
  if (step === 'done' && done) {
    return (
      <ScrollView style={s.root} contentContainerStyle={{ flex: 1 }}>
        <DoneView
          state={done}
          onMore={() => { setStep('action'); setDone(null); }}
          onReset={reset}
        />
      </ScrollView>
    );
  }

  // ═══ TERM PURCHASE ═════════════════════════════════════════════════════════
  if (step === 'term-purchase') {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        <BackBar title={`Purchase term — ${familyName}`} onBack={() => setStep('action')} />

        <View style={[s.card, shadow.card]}>
          <Text style={s.cardEyebrow}>Admin — on behalf of {familyName}</Text>
          <Text style={s.cardTitle}>10-week term package</Text>

          {quote && (
            <View style={s.invoice}>
              <View style={s.invoiceLine}><Text style={s.invoiceLabel}>10-week term</Text><Text style={s.invoiceValue}>{formatMoney(quote.base_cents)}</Text></View>
              {quote.registration_cents > 0 && (
                <View style={s.invoiceLine}><Text style={s.invoiceLabel}>Registration fee</Text><Text style={s.invoiceValue}>{formatMoney(quote.registration_cents)}</Text></View>
              )}
              <View style={s.divider} />
              <View style={s.invoiceLine}><Text style={s.invoiceLabel}>Subtotal</Text><Text style={s.invoiceValue}>{formatMoney(quote.amount_cents)}</Text></View>
              <View style={s.invoiceLine}><Text style={s.invoiceLabel}>GST (10%)</Text><Text style={s.invoiceValue}>{formatMoney(quote.gst_cents)}</Text></View>
              <View style={s.divider} />
              <View style={s.invoiceLine}><Text style={s.invoiceTotal}>Total</Text><Text style={s.invoiceTotalValue}>{formatMoney(quote.total_cents)} AUD</Text></View>
            </View>
          )}

          <View style={s.noteBox}>
            <CircleDollarSign size={15} color={colors.teal} />
            <Text style={s.noteText}>This will immediately activate a new term for {familyName}. All sessions will be auto-booked for enrolled children.</Text>
          </View>

          {mutError ? <ErrorBox msg={mutError} /> : null}

          <View style={s.rowActions}>
            <Button label="Cancel" variant="ghost" onPress={() => setStep('action')} style={{ flex: 1 }} />
            <Button label={purchaseTermMut.isPending ? 'Processing…' : 'Confirm & activate'} variant="primary" icon={Check} loading={purchaseTermMut.isPending} disabled={purchaseTermMut.isPending} onPress={() => purchaseTermMut.mutate()} style={{ flex: 2 }} />
          </View>
        </View>
      </ScrollView>
    );
  }

  // ═══ BOOK CLASS ═══════════════════════════════════════════════════════════
  if (step === 'book-class') {
    return (
      <ScrollView style={s.root} contentContainerStyle={[s.content, { paddingBottom: space.huge }]}>
        <BackBar title={`Book a class — ${familyName}`} onBack={() => setStep('action')} />

        {/* Child selector */}
        <View style={[s.card, shadow.card]}>
          <Text style={s.cardEyebrow}>Select child</Text>
          {enrolledChildren.length === 0 && <Text style={s.emptyInline}>No enrolled children.</Text>}
          <View style={s.childSwitcher}>
            {enrolledChildren.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[s.childChip, selectedChild?.id === c.id && s.childChipActive]}
                onPress={() => setSelectedChild(c)}
                activeOpacity={0.7}
              >
                <View style={[s.childAvatar, selectedChild?.id === c.id && { backgroundColor: colors.pink }]}><Text style={[s.childAvatarText, selectedChild?.id === c.id && { color: '#fff' }]}>{c.initials}</Text></View>
                <Text style={[s.childChipText, selectedChild?.id === c.id && { color: colors.pink }]}>{c.givenName || c.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
            {children.filter(c => !c.enrolled).map(c => (
              <TouchableOpacity key={c.id} style={[s.childChip, { opacity: 0.5 }]} onPress={() => markEnrolledMut.mutate(c.id)} disabled={markEnrolledMut.isPending} activeOpacity={0.7}>
                <View style={s.childAvatar}><Text style={s.childAvatarText}>{c.initials}</Text></View>
                <Text style={s.childChipText}>{c.givenName} (enrol)</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.addChildChip} onPress={() => setShowAddChild(true)} activeOpacity={0.7}>
              <Plus size={14} color={colors.muted} />
              <Text style={s.addChildText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Term credit meter */}
        {activeTerm && gating?.classes_remaining != null && (
          <TermCreditMeter creditsRemaining={gating.classes_remaining} creditsTotal={10} endDate={activeTerm.end_date} />
        )}

        {/* Booking mode toggle */}
        {selectedChild && (
          <View style={s.modeWrap}>
            <Text style={s.modeLabel}>Booking method</Text>
            <TouchableOpacity
              style={[s.modeCard, bookingMode === 'term' && s.modeCardActive, gatingState !== 'ACTIVE_TERM' && { opacity: 0.5 }]}
              onPress={() => gatingState === 'ACTIVE_TERM' && setBookingMode('term')}
              disabled={gatingState !== 'ACTIVE_TERM'}
              activeOpacity={0.7}
            >
              <Ticket size={18} color={bookingMode === 'term' ? colors.pink : colors.muted} />
              <View style={{ flex: 1 }}>
                <Text style={s.modeTitle}>Term booking</Text>
                <Text style={s.modeSub}>{gatingState === 'ACTIVE_TERM' ? 'Auto-booked via term' : 'No active term'}</Text>
              </View>
              {bookingMode === 'term' && gatingState === 'ACTIVE_TERM' && <Check size={15} color={colors.pink} strokeWidth={3} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeCard, bookingMode === 'individual' && s.modeCardActive]}
              onPress={() => setBookingMode('individual')}
              activeOpacity={0.7}
            >
              <CreditCard size={18} color={bookingMode === 'individual' ? colors.pink : colors.muted} />
              <View style={{ flex: 1 }}>
                <Text style={s.modeTitle}>Individual class</Text>
                <Text style={s.modeSub}>Recorded as paid immediately</Text>
              </View>
              {bookingMode === 'individual' && <Check size={15} color={colors.pink} strokeWidth={3} />}
            </TouchableOpacity>
          </View>
        )}

        {/* Sessions */}
        {selectedChild && (
          <View style={{ gap: space.md }}>
            {loadingSessions && <Skeleton height={120} borderRadius={radius.card} />}
            {!loadingSessions && sessions.length === 0 && (
              <View style={[s.card, { alignItems: 'center', padding: space.xl }]}>
                <Text style={s.emptyInline}>No upcoming sessions available.</Text>
              </View>
            )}
            {sessions.map(session => {
              const isFull = session.spaces_left === 0;
              const canBook = !isFull && (bookingMode === 'individual' || gatingState === 'ACTIVE_TERM');
              const col = SUBJECT_COLOR[session.subject] ?? defaultColor;
              const d = new Date(session.starts_at);
              const dayName = d.toLocaleDateString('en-AU', { weekday: 'long' });
              const timeStr = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
              return (
                <View key={session.id} style={[s.classCard, shadow.card, { borderLeftColor: col.fg }]}>
                  <View style={s.classCardTop}>
                    <Text style={[s.classSubject, { color: col.fg }]}>{session.subject.toUpperCase()}</Text>
                    <Text style={[s.spaceBadge, isFull && s.spaceBadgeFull]}>{isFull ? 'FULL' : `${session.spaces_left} spaces`}</Text>
                  </View>
                  <Text style={s.classDay}>{dayName}</Text>
                  <Text style={s.classTime}>{timeStr}</Text>
                  <Text style={s.classTutor}>with {session.teacher_name}</Text>
                  {canBook ? (
                    <Button label={`Book for ${selectedChild.givenName}`} variant="primary" icon={Check} onPress={() => { setConfirmSession(session); setMutError(''); }} fullWidth />
                  ) : (
                    <Button label={isFull ? 'Class full' : 'Not available'} variant="soft" disabled fullWidth />
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  }

  // ═══ ACTION ═══════════════════════════════════════════════════════════════
  if (step === 'action') {
    return (
      <ScrollView style={s.root} contentContainerStyle={[s.content, { paddingBottom: space.huge }]}>
        <BackBar title="What would you like to do?" onBack={reset} backLabel="← Change family" />

        {/* Family summary card */}
        <View style={[s.card, shadow.card, s.familyCard]}>
          <View style={[s.famAvatar]}>
            <Text style={s.famAvatarText}>{familyName.split(' ').map(w => w[0]).join('')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.famName}>{familyName}</Text>
            <Text style={s.famSub}>
              {enrolledChildren.length} enrolled child{enrolledChildren.length !== 1 ? 'ren' : ''} ·{' '}
              {gatingState === 'ACTIVE_TERM' ? 'Active term' : gatingState === 'TERM_EXPIRED' ? 'Term expired' : 'No term'}
            </Text>
          </View>
        </View>

        {activeTerm && gating?.classes_remaining != null && (
          <TermCreditMeter creditsRemaining={gating.classes_remaining} creditsTotal={10} endDate={activeTerm.end_date} />
        )}

        {/* Action cards */}
        <TouchableOpacity style={[s.actionCard, shadow.card]} onPress={() => setStep('book-class')} activeOpacity={0.7}>
          <View style={[s.actionIcon, { backgroundColor: colors.tealSoft }]}><Ticket size={22} color={colors.teal} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.actionTitle}>Book a class</Text>
            <Text style={s.actionSub}>Reserve a spot using a term credit or individual payment.</Text>
          </View>
          <ArrowRight size={16} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionCard, shadow.card, gatingState === 'ACTIVE_TERM' && { opacity: 0.5 }]}
          onPress={() => gatingState !== 'ACTIVE_TERM' && setStep('term-purchase')}
          disabled={gatingState === 'ACTIVE_TERM'}
          activeOpacity={0.7}
        >
          <View style={[s.actionIcon, { backgroundColor: colors.pinkSoft }]}><CircleDollarSign size={22} color={colors.pink} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.actionTitle}>{gatingState === 'ACTIVE_TERM' ? 'Term already active' : 'Purchase a term'}</Text>
            <Text style={s.actionSub}>{gatingState === 'ACTIVE_TERM' ? 'Classes are auto-booked.' : 'Activate a 10-week term immediately.'}</Text>
          </View>
          <ArrowRight size={16} color={colors.muted} />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ═══ FAMILY PICKER (default) ══════════════════════════════════════════════
  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: space.huge }]}>
        {/* Action row */}
        <View style={s.actionRow}>
          <Button label="New family" variant="soft" icon={Plus} onPress={() => setShowAddFamily(true)} />
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <Search size={15} color={colors.muted} />
          <TextInput style={s.searchInput} placeholder="Search family name…" value={search} onChangeText={setSearch} placeholderTextColor={colors.muted} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}><X size={14} color={colors.muted} /></TouchableOpacity>}
        </View>

        {/* Family list */}
        <View style={[s.card, shadow.card]}>
          <Text style={s.cardEyebrow}>Select a family to manage</Text>
          {loadingFamilies ? (
            <View style={{ gap: space.sm, marginTop: space.md }}>
              {[1, 2, 3].map(i => <Skeleton key={i} height={56} borderRadius={radius.md} />)}
            </View>
          ) : filteredFamilies.length === 0 ? (
            <Text style={[s.emptyInline, { paddingVertical: space.lg }]}>No families found.</Text>
          ) : (
            <View style={{ gap: space.xs, marginTop: space.md }}>
              {filteredFamilies.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[s.famPickRow, familyId === f.id && s.famPickRowActive]}
                  onPress={() => setFamilyId(f.id)}
                  activeOpacity={0.7}
                >
                  <View style={[s.famPickAvatar, familyId === f.id && { backgroundColor: colors.pinkSoft }]}><Text style={[s.famPickAvatarText, familyId === f.id && { color: colors.pink }]}>{f.parent_name.split(' ').map(w => w[0]).join('')}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.famPickName}>{f.parent_name}</Text>
                    <Text style={s.famPickRef}>{f.reference_code}</Text>
                  </View>
                  {familyId === f.id && <Check size={16} color={colors.pink} strokeWidth={3} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ marginTop: space.lg }}>
            <Button label="Continue" variant="primary" icon={ArrowRight} disabled={!familyId} onPress={() => setStep('action')} fullWidth />
          </View>
        </View>

        {/* Info note */}
        <View style={s.infoNote}>
          <Users size={18} color={colors.teal} />
          <View style={{ flex: 1 }}>
            <Text style={s.infoNoteTitle}>Who is this for?</Text>
            <Text style={s.infoNoteText}>Use this flow to help families who contact you by phone or in person — without them needing to log in.</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Add child modal ── */}
      <Modal visible={showAddChild} transparent animationType="slide" onRequestClose={() => setShowAddChild(false)}>
        <Pressable style={s.backdrop} onPress={() => setShowAddChild(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}><Text style={s.sheetTitle}>Add child</Text><TouchableOpacity onPress={() => setShowAddChild(false)} hitSlop={12}><X size={18} color={colors.muted} /></TouchableOpacity></View>
            {mutError ? <ErrorBox msg={mutError} /> : null}
            <AddChildForm newChild={newChild} setNewChild={setNewChild} />
            <View style={s.rowActions}>
              <Button label="Cancel" variant="ghost" onPress={() => setShowAddChild(false)} style={{ flex: 1 }} />
              <Button label={addChildMut.isPending ? 'Saving…' : 'Add child'} variant="primary" icon={Check} loading={addChildMut.isPending} disabled={!newChild.givenName.trim() || addChildMut.isPending} onPress={() => addChildMut.mutate()} style={{ flex: 2 }} />
            </View>
            <View style={{ height: space.xl }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Add family modal ── */}
      <Modal visible={showAddFamily} transparent animationType="slide" onRequestClose={() => setShowAddFamily(false)}>
        <Pressable style={s.backdrop} onPress={() => setShowAddFamily(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}><Text style={s.sheetTitle}>New family</Text><TouchableOpacity onPress={() => setShowAddFamily(false)} hitSlop={12}><X size={18} color={colors.muted} /></TouchableOpacity></View>
            <Text style={s.sheetDesc}>Create a family account without portal access.</Text>
            {mutError ? <ErrorBox msg={mutError} /> : null}
            <AddFamilyForm newFamily={newFamily} setNewFamily={setNewFamily} />
            <View style={s.rowActions}>
              <Button label="Cancel" variant="ghost" onPress={() => setShowAddFamily(false)} style={{ flex: 1 }} />
              <Button label={createFamilyMut.isPending ? 'Creating…' : 'Create family'} variant="primary" icon={Check} loading={createFamilyMut.isPending} disabled={!newFamily.parentName.trim() || createFamilyMut.isPending} onPress={() => createFamilyMut.mutate()} style={{ flex: 2 }} />
            </View>
            <View style={{ height: space.xl }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Confirm booking modal ── */}
      <Modal visible={!!confirmSession} transparent animationType="slide" onRequestClose={() => setConfirmSession(null)}>
        <Pressable style={s.backdrop} onPress={() => setConfirmSession(null)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}><Text style={s.sheetTitle}>Confirm booking</Text><TouchableOpacity onPress={() => setConfirmSession(null)} hitSlop={12}><X size={18} color={colors.muted} /></TouchableOpacity></View>
            <Text style={s.sheetDesc}>Booking on behalf of <Text style={{ fontWeight: '700', color: colors.ink }}>{familyName}</Text>.</Text>
            {confirmSession && (
              <View style={s.detailTable}>
                <DetailRow label="Child" value={selectedChild?.name ?? '—'} />
                <DetailRow label="Subject" value={confirmSession.subject} />
                <DetailRow label="Date" value={new Date(confirmSession.starts_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })} />
                <DetailRow label="Time" value={new Date(confirmSession.starts_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })} />
                <DetailRow label="Tutor" value={confirmSession.teacher_name} />
                <DetailRow label="Cost" value={bookingMode === 'term' ? 'Term booking' : 'Individual — recorded as paid'} />
              </View>
            )}
            {mutError ? <ErrorBox msg={mutError} /> : null}
            <View style={s.rowActions}>
              <Button label="Cancel" variant="ghost" onPress={() => setConfirmSession(null)} style={{ flex: 1 }} />
              <Button label={bookClassMut.isPending ? 'Booking…' : 'Confirm booking'} variant="primary" icon={Check} loading={bookClassMut.isPending} disabled={bookClassMut.isPending} onPress={() => confirmSession && bookClassMut.mutate(confirmSession)} style={{ flex: 2 }} />
            </View>
            <View style={{ height: space.xl }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BackBar({ title, onBack, backLabel }: { title: string; onBack: () => void; backLabel?: string }) {
  return (
    <View style={s.backBar}>
      <TouchableOpacity onPress={onBack} hitSlop={8} style={s.backBtn}>
        <ArrowLeft size={20} color={colors.ink} strokeWidth={2} />
      </TouchableOpacity>
      <Text style={s.backBarTitle} numberOfLines={1}>{title}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return <View style={s.errorBox}><Text style={s.errorText}>{msg}</Text></View>;
}

function AddChildForm({ newChild, setNewChild }: { newChild: { givenName: string; familyName: string; year: string; school: string }; setNewChild: React.Dispatch<React.SetStateAction<{ givenName: string; familyName: string; year: string; school: string }>> }) {
  return (
    <View style={{ gap: space.md }}>
      <FieldRow>
        <TextField label="Given name" placeholder="e.g. Emma" value={newChild.givenName} onChange={v => setNewChild(s => ({ ...s, givenName: v }))} />
        <TextField label="Family name" placeholder="e.g. Johnson" value={newChild.familyName} onChange={v => setNewChild(s => ({ ...s, familyName: v }))} />
      </FieldRow>
      <FieldRow>
        <YearPicker label="Year level" value={newChild.year} onChange={v => setNewChild(s => ({ ...s, year: v }))} />
        <TextField label="School" placeholder="e.g. Riverside Primary" value={newChild.school} onChange={v => setNewChild(s => ({ ...s, school: v }))} />
      </FieldRow>
    </View>
  );
}

function AddFamilyForm({ newFamily, setNewFamily }: { newFamily: { parentName: string; email: string; phone: string }; setNewFamily: React.Dispatch<React.SetStateAction<{ parentName: string; email: string; phone: string }>> }) {
  return (
    <View style={{ gap: space.md }}>
      <TextField label="Parent name" placeholder="e.g. Rebecca Martin" value={newFamily.parentName} onChange={v => setNewFamily(s => ({ ...s, parentName: v }))} />
      <TextField label="Email (optional)" placeholder="e.g. rebecca@email.com" keyboardType="email-address" value={newFamily.email} onChange={v => setNewFamily(s => ({ ...s, email: v }))} />
      <TextField label="Phone (optional)" placeholder="e.g. 0400 123 456" keyboardType="phone-pad" value={newFamily.phone} onChange={v => setNewFamily(s => ({ ...s, phone: v }))} />
    </View>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: space.md }}>{children}</View>;
}

function TextField({ label, value, onChange, placeholder, keyboardType }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: 'default' | 'email-address' | 'phone-pad' }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} />
    </View>
  );
}

function YearPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'];
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TouchableOpacity style={s.input} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <Text style={{ fontSize: 15, color: colors.ink }}>{value}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.yearDropdown}>
          {YEARS.map(y => (
            <TouchableOpacity key={y} style={[s.yearOption, y === value && s.yearOptionActive]} onPress={() => { onChange(y); setOpen(false); }}>
              <Text style={[type.small, { color: y === value ? colors.pink : colors.ink, fontWeight: y === value ? '600' : '400' }]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, gap: space.lg },

  actionRow: { alignItems: 'flex-end' },

  // search
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.line, gap: space.sm, minHeight: 44 },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: space.sm },

  // card
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: space.lg, borderWidth: 1, borderColor: colors.line, gap: space.xs },
  cardEyebrow: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.mutedSoft, letterSpacing: 0.8, textTransform: 'uppercase' },
  cardTitle: { fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.ink, marginBottom: space.md },

  // family picker
  famPickRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.md },
  famPickRowActive: { backgroundColor: colors.pinkSoft },
  famPickAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  famPickAvatarText: { fontFamily: 'DMSans-Bold', fontSize: 13, color: colors.muted },
  famPickName: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink },
  famPickRef: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.muted, marginTop: 1 },

  // family card (action)
  familyCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  famAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  famAvatarText: { fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.avatar.pink.fg },
  famName: { fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.ink },
  famSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2 },

  // info note
  infoNote: { flexDirection: 'row', gap: space.md, padding: space.md, backgroundColor: colors.tealSoft, borderRadius: radius.md },
  infoNoteTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink },
  infoNoteText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 18 },

  // action cards
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.card, padding: space.lg, borderWidth: 1, borderColor: colors.line },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionTitle: { fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.ink },
  actionSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 },

  // back bar
  backBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  backBarTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 18, color: colors.ink, flex: 1 },

  // child switcher
  childSwitcher: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 5, borderWidth: 1, borderColor: colors.line },
  childChipActive: { backgroundColor: colors.pinkSoft, borderColor: colors.pink },
  childAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.muted },
  childChipText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.ink },
  addChildChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 5, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed' },
  addChildText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.muted },

  // booking mode
  modeWrap: { gap: space.xs },
  modeLabel: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.mutedSoft, letterSpacing: 0.8, textTransform: 'uppercase' },
  modeCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.md, padding: space.md, borderWidth: 1.5, borderColor: colors.line },
  modeCardActive: { borderColor: colors.pink, backgroundColor: colors.pinkSoft },
  modeTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.ink },
  modeSub: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.muted, marginTop: 1 },

  // class card
  classCard: { backgroundColor: colors.card, borderRadius: radius.card, padding: space.lg, borderWidth: 1, borderColor: colors.line, borderLeftWidth: 4, gap: space.xs },
  classCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  classSubject: { fontFamily: 'DMSans-Bold', fontSize: 11, letterSpacing: 0.5 },
  spaceBadge: { fontFamily: 'DMSans-Medium', fontSize: 10, color: colors.muted, backgroundColor: colors.surface, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  spaceBadgeFull: { backgroundColor: colors.status.danger.bg, color: colors.status.danger.fg },
  classDay: { fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.ink },
  classTime: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },
  classTutor: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: space.sm },

  // invoice
  invoice: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, marginVertical: space.md, gap: space.sm },
  invoiceLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceLabel: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },
  invoiceValue: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.xs },
  invoiceTotal: { fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.ink },
  invoiceTotalValue: { fontFamily: 'DMSans-Bold', fontSize: 17, color: colors.pink },

  // note
  noteBox: { flexDirection: 'row', gap: space.sm, backgroundColor: colors.tealSoft, borderRadius: radius.md, padding: space.md, marginVertical: space.md },
  noteText: { flex: 1, fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.ink, lineHeight: 18 },

  // done
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.status.success.bg, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontFamily: 'DMSans-Bold', fontSize: 24, color: colors.ink, textAlign: 'center' },
  doneMsg: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  doneActions: { width: '100%', maxWidth: 340, gap: space.md },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  sheetTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.ink },
  sheetDesc: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: space.lg },

  // detail table
  detailTable: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, marginBottom: space.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  detailLabel: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted },
  detailValue: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.ink, textAlign: 'right', flex: 1, marginLeft: space.md },

  // fields
  fieldLabel: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.ink, marginBottom: 5 },
  input: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, borderWidth: 1, borderColor: colors.line, minHeight: 46, fontSize: 15, color: colors.ink },

  yearDropdown: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, marginTop: 4, overflow: 'hidden' },
  yearOption: { paddingHorizontal: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  yearOptionActive: { backgroundColor: colors.pinkSoft },

  // error + actions
  errorBox: { backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.error.border, marginBottom: space.md },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },
  rowActions: { flexDirection: 'row', gap: space.md, marginTop: space.md, paddingBottom: space.xl },

  // inline empty
  emptyInline: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, paddingVertical: space.sm, textAlign: 'center' },
});
