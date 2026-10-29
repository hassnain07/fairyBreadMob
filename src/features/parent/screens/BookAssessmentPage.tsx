/**
 * BookAssessmentPage — 7-step wizard matching the web portal exactly.
 *
 * Steps: Child → Date → Time → Summary → Payment → Upload → Done
 *
 * Data flow mirrors web:
 *  - getChildren        → step 1 child picker
 *  - getSettings        → assessment_booking config (slots, weekdays, lead_days, horizon_days, closures)
 *  - getFamily          → reference_code for bank-transfer ref
 *  - getPriceQuote      → amount / GST / total for step 4-5
 *  - submitPayment      → type:'assessment' intent with proof blob
 *  - invalidates qk.payments + qk.assessments on success
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProofPicker, type ProofFile } from '@/components/ui/ProofPicker';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ParentMoreStackParamList } from '@/app/navigation/types';

type Props = NativeStackScreenProps<ParentMoreStackParamList, 'BookAssessment'>;

/* ─────────────────────── helpers ─────────────────────────────── */

const STEP_LABELS = ['Child', 'Date', 'Time', 'Summary', 'Payment', 'Upload', 'Done'];
const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toTimeLabel(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Build a sorted list of available Date objects from settings config */
function buildAvailableDates(
  weekdays: number[],
  leadDays: number,
  horizonDays: number,
  closures: string[],
): Date[] {
  const dates: Date[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(today.getDate() + leadDays);
  const end   = new Date(today); end.setDate(today.getDate() + horizonDays);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso   = d.toISOString().slice(0, 10);
    const jsDay = d.getDay();                          // 0=Sun
    const isoDay = jsDay === 0 ? 7 : jsDay;            // 1=Mon…7=Sun
    if (weekdays.includes(isoDay) && !closures.includes(iso)) {
      dates.push(new Date(d));
    }
  }
  return dates;
}

/* ─────────────────────── sub-components ──────────────────────── */

/** Pill-style step indicator strip */
function StepStrip({ step }: { step: number }) {
  return (
    <View style={ss.strip}>
      {STEP_LABELS.map((label, i) => {
        const done   = step > i + 1;
        const active = step === i + 1;
        return (
          <React.Fragment key={label}>
            <View style={ss.stepItem}>
              <View style={[ss.stepDot,
                done   && ss.stepDotDone,
                active && ss.stepDotActive,
              ]}>
                {done
                  ? <Check size={10} color="#fff" />
                  : <Text style={[ss.stepNum, active && ss.stepNumActive]}>{i + 1}</Text>
                }
              </View>
              <Text style={[ss.stepLabel, active && ss.stepLabelActive]}>{label}</Text>
            </View>
            {i < STEP_LABELS.length - 1 && (
              <View style={[ss.connector, done && ss.connectorDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/* ─────────────────────── main component ──────────────────────── */

export function BookAssessmentPage({ navigation }: Props) {
  const { familyId } = useAuth();
  const queryClient  = useQueryClient();

  /* wizard state */
  const [step,            setStep]            = useState(1);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedDate,    setSelectedDate]    = useState<Date | null>(null);
  const [selectedSlot,    setSelectedSlot]    = useState('');
  const [proofFile,       setProofFile]       = useState<ProofFile | undefined>();
  const [proofError,      setProofError]      = useState('');
  const [submitError,     setSubmitError]     = useState('');

  /* calendar nav */
  const [calOffset, setCalOffset] = useState(0); // months from first available

  /* ── queries ── */
  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: qk.children(familyId ?? ''),
    queryFn:  () => dataClient.getChildren(familyId!),
    enabled:  !!familyId,
  });

  const { data: settings = {} } = useQuery({
    queryKey: qk.settings,
    queryFn:  () => dataClient.getSettings(),
  });

  const { data: family } = useQuery({
    queryKey: qk.family(familyId ?? ''),
    queryFn:  () => dataClient.getFamily(familyId!),
    enabled:  !!familyId,
  });

  const { data: quote } = useQuery({
    queryKey: qk.quote('assessment', familyId ?? ''),
    queryFn:  () => dataClient.getPriceQuote('assessment', familyId!),
    enabled:  !!familyId,
  });

  /* ── derived from settings ── */
  const cfg         = (settings as any)?.assessment_booking ?? {};
  const slots:    string[] = cfg.slots      ?? ['15:30', '16:30', '17:00'];
  const weekdays: number[] = cfg.weekdays   ?? [1, 2, 3, 4, 5];
  const leadDays: number   = cfg.lead_days  ?? 2;
  const horizonDays: number= cfg.horizon_days ?? 42;
  const closures: string[] = (settings as any)?.closures ?? [];
  const bank               = (settings as any)?.public_info?.bank ?? {};
  const refCode            = (family as any)?.reference_code ?? familyId ?? '';

  const availableDates = useMemo(
    () => buildAvailableDates(weekdays, leadDays, horizonDays, closures),
    [weekdays, leadDays, horizonDays, closures],
  );
  const availableSet = useMemo(
    () => new Set(availableDates.map(d => d.toISOString().slice(0, 10))),
    [availableDates],
  );

  /* calendar month derived from calOffset */
  const firstAvail = availableDates[0];
  const lastAvail  = availableDates[availableDates.length - 1];
  const baseYear   = firstAvail?.getFullYear() ?? new Date().getFullYear();
  const baseMon    = firstAvail?.getMonth()    ?? new Date().getMonth();
  const calDate    = new Date(baseYear, baseMon + calOffset, 1);
  const calYear    = calDate.getFullYear();
  const calMon     = calDate.getMonth();

  const canPrevCal = firstAvail
    ? calYear > firstAvail.getFullYear() || calMon > firstAvail.getMonth()
    : false;
  const canNextCal = lastAvail
    ? calYear < lastAvail.getFullYear() || calMon < lastAvail.getMonth()
    : false;

  function calCells(): (Date | null)[] {
    const first    = new Date(calYear, calMon, 1);
    const startPad = first.getDay(); // 0=Sun
    const daysInM  = new Date(calYear, calMon + 1, 0).getDate();
    const cells: (Date | null)[] = Array(startPad).fill(null);
    for (let d = 1; d <= daysInM; d++) cells.push(new Date(calYear, calMon, d));
    return cells;
  }

  /* selected child */
  const selectedChild = children.find(c => c.id === selectedChildId) ?? children[0];

  /* ── submit ── */
  const { mutate: submitAssessment, isPending } = useMutation({
    mutationFn: () => {
      if (!proofFile || !selectedDate || !selectedSlot || !selectedChild) {
        throw new Error('Missing required fields');
      }
      const dateStr = selectedDate.toISOString().slice(0, 10);
      const blob    = { uri: proofFile.uri, name: proofFile.name, type: 'image/jpeg' } as unknown as Blob;
      return dataClient.submitPayment({
        type:         'assessment',
        familyId:     familyId!,
        childId:      selectedChild.id,
        date:         dateStr,
        time:         selectedSlot,
        proof:        blob,
        reference:    `${refCode}-ASSESS`,
        amount_cents: quote?.amount_cents ?? 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.payments(familyId ?? '') });
      queryClient.invalidateQueries({ queryKey: qk.assessments(familyId ?? '') });
      setStep(7);
    },
    onError: (e: any) => setSubmitError(e?.message ?? 'Submission failed. Please try again.'),
  });

  function handleSubmit() {
    if (!proofFile) { setProofError('Please attach your proof of payment.'); return; }
    setProofError('');
    submitAssessment();
  }

  function resetWizard() {
    setStep(1);
    setSelectedChildId('');
    setSelectedDate(null);
    setSelectedSlot('');
    setProofFile(undefined);
    setProofError('');
    setSubmitError('');
    setCalOffset(0);
  }

  const firstName = selectedChild?.givenName ?? selectedChild?.name?.split(' ')[0] ?? '—';

  /* ═══════════════════════════════════════════════════════════════
     STEP 7 — SUCCESS
  ═══════════════════════════════════════════════════════════════ */
  if (step === 7) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.successContent}>
        <View style={s.successMark}>
          <Text style={s.successStar}>✦</Text>
        </View>
        <Text style={s.successTitle}>Assessment Booked!</Text>
        <Text style={s.successSub}>
          {firstName}'s learning journey is about to begin.
        </Text>

        <View style={[s.card, shadow.card as object, { marginTop: 24 }]}>
          <SummaryRow label="Child"   value={selectedChild?.name ?? '—'} />
          {selectedDate && (
            <SummaryRow
              label="Date"
              value={selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            />
          )}
          <SummaryRow label="Time"  value={toTimeLabel(selectedSlot)} />
          <View style={s.divider} />
          <SummaryRow
            label="Payment status"
            value="Pending verification"
            valueStyle={{ color: colors.status.pending.fg, fontWeight: '700' }}
          />
        </View>

        <Button
          label="Back to assessments"
          icon={ArrowRight}
          onPress={() => { resetWizard(); navigation.goBack(); }}
          fullWidth
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     WIZARD FRAME
  ═══════════════════════════════════════════════════════════════ */
  return (
    <View style={s.container}>
      {/* Step strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.stripScroll}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        <StepStrip step={step} />
      </ScrollView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── STEP 1: Child ── */}
        {step === 1 && (
          <StepCard eyebrow="Step 1 · Select child" title="Who is this assessment for?">
            {loadingChildren
              ? <Skeleton height={64} borderRadius={12} />
              : children.length === 0
              ? <Text style={s.mutedText}>No children on your account yet. Add a child first.</Text>
              : children.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.selectRow, (selectedChildId === c.id || (!selectedChildId && c.id === children[0]?.id)) && s.selectRowActive]}
                  onPress={() => setSelectedChildId(c.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.childAvatar, { backgroundColor: colors.avatar.pink.bg }]}>
                    <Text style={[s.childInitials, { color: colors.avatar.pink.fg }]}>{c.initials}</Text>
                  </View>
                  <View style={s.selectRowText}>
                    <Text style={[s.selectRowName, (selectedChildId === c.id || (!selectedChildId && c.id === children[0]?.id)) && s.selectRowNameActive]}>
                      {c.name}
                    </Text>
                    <Text style={[s.selectRowMeta, (selectedChildId === c.id || (!selectedChildId && c.id === children[0]?.id)) && s.selectRowMetaActive]}>
                      {c.year}{c.school ? ` · ${c.school}` : ''}
                    </Text>
                  </View>
                  {(selectedChildId === c.id || (!selectedChildId && c.id === children[0]?.id)) && (
                    <Check size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
          </StepCard>
        )}

        {/* ── STEP 2: Date (calendar) ── */}
        {step === 2 && (
          <StepCard eyebrow="Step 2 · Select date" title="Pick a day that works">
            {availableDates.length === 0 ? (
              <Text style={s.mutedText}>No available dates right now. Please contact us.</Text>
            ) : (
              <View style={s.calendarWrap}>
                {/* Month nav */}
                <View style={s.calHead}>
                  <TouchableOpacity
                    onPress={() => setCalOffset(o => o - 1)}
                    disabled={!canPrevCal}
                    style={[s.calNavBtn, !canPrevCal && { opacity: 0.25 }]}
                  >
                    <ChevronLeft size={18} color={colors.ink} />
                  </TouchableOpacity>
                  <Text style={s.calMonthLabel}>
                    {MONTH_NAMES[calMon]} {calYear}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCalOffset(o => o + 1)}
                    disabled={!canNextCal}
                    style={[s.calNavBtn, !canNextCal && { opacity: 0.25 }]}
                  >
                    <ChevronRight size={18} color={colors.ink} />
                  </TouchableOpacity>
                </View>

                {/* Day-of-week headers */}
                <View style={s.calWeekRow}>
                  {DAY_NAMES.map(n => (
                    <Text key={n} style={s.calWeekLabel}>{n}</Text>
                  ))}
                </View>

                {/* Day cells */}
                <View style={s.calGrid}>
                  {calCells().map((d, i) => {
                    if (!d) return <View key={`empty-${i}`} style={s.calCell} />;
                    const iso       = d.toISOString().slice(0, 10);
                    const avail     = availableSet.has(iso);
                    const isSel     = selectedDate?.toISOString().slice(0, 10) === iso;
                    return (
                      <TouchableOpacity
                        key={iso}
                        style={[
                          s.calCell,
                          avail && s.calCellAvail,
                          isSel  && s.calCellSel,
                          !avail && s.calCellDisabled,
                        ]}
                        onPress={() => avail && setSelectedDate(d)}
                        disabled={!avail}
                        activeOpacity={avail ? 0.75 : 1}
                      >
                        <Text style={[
                          s.calCellText,
                          isSel   && s.calCellTextSel,
                          !avail  && s.calCellTextDisabled,
                        ]}>
                          {d.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {selectedDate && (
              <View style={s.selectedDateBanner}>
                <Check size={14} color={colors.pink} />
                <Text style={s.selectedDateText}>
                  {selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>
            )}
          </StepCard>
        )}

        {/* ── STEP 3: Time ── */}
        {step === 3 && (
          <StepCard eyebrow="Step 3 · Select time" title="What time suits you?">
            {slots.map((slot: string) => (
              <TouchableOpacity
                key={slot}
                style={[s.slotRow, selectedSlot === slot && s.slotRowActive]}
                onPress={() => setSelectedSlot(slot)}
                activeOpacity={0.8}
              >
                <Clock3 size={16} color={selectedSlot === slot ? '#fff' : colors.muted} />
                <Text style={[s.slotLabel, selectedSlot === slot && s.slotLabelActive]}>
                  {toTimeLabel(slot)}
                </Text>
                <View style={[s.slotBadge, selectedSlot === slot && s.slotBadgeActive]}>
                  {selectedSlot === slot
                    ? <Check size={12} color="#fff" />
                    : <Text style={s.slotBadgeText}>Available</Text>
                  }
                </View>
              </TouchableOpacity>
            ))}
          </StepCard>
        )}

        {/* ── STEP 4: Summary ── */}
        {step === 4 && (
          <StepCard eyebrow="Step 4 · Booking summary" title="Does this look right?">
            <View style={[s.card, { marginTop: 0 }]}>
              <SummaryRow label="Child"  value={selectedChild?.name ?? '—'} />
              {selectedDate && (
                <SummaryRow
                  label="Date"
                  value={selectedDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                />
              )}
              <SummaryRow label="Time"  value={toTimeLabel(selectedSlot)} />
              {quote && (
                <>
                  <View style={s.divider} />
                  <SummaryRow
                    label="Total"
                    value={`${formatMoney(quote.total_cents)} AUD`}
                    valueStyle={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}
                  />
                </>
              )}
            </View>
          </StepCard>
        )}

        {/* ── STEP 5: Payment ── */}
        {step === 5 && quote && (
          <StepCard eyebrow="Step 5 · Payment" title="Confirm your booking">
            {/* Invoice breakdown */}
            <View style={[s.card, { marginTop: 0 }]}>
              <View style={s.payRow}>
                <Text style={s.payLabel}>Initial Learning Assessment</Text>
                <Text style={s.payValue}>{formatMoney(quote.amount_cents)}</Text>
              </View>
              <View style={s.payRow}>
                <Text style={s.payLabel}>GST (10%)</Text>
                <Text style={s.payValue}>{formatMoney(quote.gst_cents)}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.payRow}>
                <Text style={[s.payLabel, { fontWeight: '700', color: colors.ink }]}>Total</Text>
                <Text style={[s.payValue, { fontWeight: '800', color: colors.ink, fontSize: 16 }]}>
                  {formatMoney(quote.total_cents)} AUD
                </Text>
              </View>
            </View>

            {/* Bank details */}
            <View style={[s.bankCard, shadow.card as object]}>
              <View style={s.bankHead}>
                <CircleDollarSign size={16} color={colors.teal} />
                <Text style={s.bankHeadText}>Bank transfer details</Text>
              </View>
              <BankRow label="Account name"   value={bank.account_name ?? '—'} />
              <BankRow label="BSB"            value={bank.bsb          ?? '—'} />
              <BankRow label="Account number" value={bank.account      ?? '—'} />
              <BankRow label="Reference"      value={`${refCode}-ASSESS`} highlight />
            </View>

            <Text style={s.bankNote}>
              Please make the transfer and keep your receipt — you'll upload it in the next step.
            </Text>
          </StepCard>
        )}

        {/* ── STEP 6: Upload proof ── */}
        {step === 6 && (
          <StepCard eyebrow="Step 6 · Upload proof" title="Share your receipt">
            <ProofPicker
              onSelect={(f) => { setProofFile(f); setProofError(''); }}
              selectedFile={proofFile}
              prompt="Please upload your payment receipt."
              helper="Upload a screenshot or PDF of your bank transfer confirmation."
            />
            {proofError ? (
              <Text style={s.errorText}>{proofError}</Text>
            ) : null}
            {submitError ? (
              <Text style={s.errorText}>{submitError}</Text>
            ) : null}
          </StepCard>
        )}

        {/* Sidebar summary (steps 2-6) */}
        {step >= 2 && step <= 6 && (
          <View style={[s.summaryAside, shadow.card as object]}>
            <Text style={s.asideLabel}>Your booking</Text>
            <Text style={s.asideTitle}>Initial Learning Assessment</Text>
            <SummaryRow label="Child"  value={selectedChild?.name ?? '—'} small />
            {selectedDate && (
              <SummaryRow
                label="Date"
                value={selectedDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                small
              />
            )}
            {selectedSlot && (
              <SummaryRow label="Time" value={toTimeLabel(selectedSlot)} small />
            )}
            {quote && (
              <>
                <View style={s.divider} />
                <SummaryRow
                  label="Total"
                  value={`${formatMoney(quote.total_cents)} AUD`}
                  small
                  valueStyle={{ color: colors.ink, fontWeight: '700' }}
                />
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Fixed footer nav ── */}
      <View style={s.footer}>
        <Button
          label="Back"
          variant="secondary"
          icon={ChevronLeft}
          onPress={() => setStep(s => s - 1)}
          disabled={step === 1}
          style={{ flex: 1 }}
        />

        {step < 6 ? (
          <Button
            label="Continue"
            icon={ArrowRight}
            onPress={() => {
              if (step === 1 && !selectedChildId && children.length > 0) {
                setSelectedChildId(children[0].id);
              }
              setStep(s => s + 1);
            }}
            disabled={
              (step === 1 && children.length === 0) ||
              (step === 2 && !selectedDate)          ||
              (step === 3 && !selectedSlot)
            }
            style={{ flex: 2 }}
          />
        ) : (
          <Button
            label={isPending ? 'Submitting…' : 'Submit proof'}
            icon={ArrowRight}
            onPress={handleSubmit}
            loading={isPending}
            disabled={isPending}
            style={{ flex: 2 }}
          />
        )}
      </View>
    </View>
  );
}

/* ─────────────────────── small helpers ───────────────────────── */

function StepCard({
  eyebrow, title, children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.stepCard}>
      <Text style={s.stepEyebrow}>{eyebrow}</Text>
      <Text style={s.stepTitle}>{title}</Text>
      <View style={{ gap: 10, marginTop: 16 }}>{children}</View>
    </View>
  );
}

function SummaryRow({
  label, value, small, valueStyle,
}: {
  label: string;
  value: string;
  small?: boolean;
  valueStyle?: object;
}) {
  return (
    <View style={s.summaryRow}>
      <Text style={[s.summaryLabel, small && { fontSize: 11 }]}>{label}</Text>
      <Text style={[s.summaryValue, small && { fontSize: 12 }, valueStyle]}>{value}</Text>
    </View>
  );
}

function BankRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={s.bankRow}>
      <Text style={s.bankLabel}>{label}</Text>
      <Text style={[s.bankValue, highlight && { color: colors.teal, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

/* ─────────────────────── styles ──────────────────────────────── */

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF7' },
  scroll:    { flex: 1 },
  content:   { padding: 16, gap: 14, paddingBottom: 24 },

  /* Step strip */
  stripScroll: { borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.card },

  /* Step card */
  stepCard: {
    backgroundColor: colors.card, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: colors.line,
  },
  stepEyebrow: { fontSize: 10, fontWeight: '700', color: colors.mutedSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  stepTitle:   { fontSize: 18, fontWeight: '700', color: colors.ink },
  mutedText:   { fontSize: 13, color: colors.muted, lineHeight: 18 },

  /* Child select row */
  selectRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface2, borderRadius: 12,
    padding: 14, borderWidth: 1.5, borderColor: colors.line,
  },
  selectRowActive: { backgroundColor: colors.pink, borderColor: colors.pink },
  childAvatar:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  childInitials:{ fontSize: 13, fontWeight: '700' },
  selectRowText:{ flex: 1 },
  selectRowName:{ fontSize: 14, fontWeight: '700', color: colors.ink },
  selectRowNameActive: { color: '#fff' },
  selectRowMeta:{ fontSize: 12, color: colors.muted, marginTop: 1 },
  selectRowMetaActive: { color: 'rgba(255,255,255,0.8)' },

  /* Calendar */
  calendarWrap: { gap: 4 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  calNavBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  calMonthLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
  calWeekRow: { flexDirection: 'row' },
  calWeekLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: colors.mutedSoft, paddingVertical: 6 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2, alignItems: 'center', justifyContent: 'center' },
  calCellAvail: {},
  calCellSel: {},
  calCellDisabled: {},
  calCellText: { fontSize: 13, color: colors.ink, width: 32, height: 32, textAlign: 'center', lineHeight: 32, borderRadius: 16 },
  calCellTextSel: { backgroundColor: colors.pink, color: '#fff', overflow: 'hidden' },
  calCellTextDisabled: { color: colors.line },

  selectedDateBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.pinkSoft, borderRadius: 10, padding: 10, marginTop: 4,
  },
  selectedDateText: { fontSize: 13, fontWeight: '600', color: colors.pink },

  /* Time slots */
  slotRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface2, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: colors.line,
  },
  slotRowActive: { backgroundColor: colors.pink, borderColor: colors.pink },
  slotLabel:     { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  slotLabelActive: { color: '#fff' },
  slotBadge: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  slotBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  slotBadgeText:   { fontSize: 11, color: colors.muted, fontWeight: '600' },

  /* Summary aside */
  summaryAside: {
    backgroundColor: colors.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: colors.line,
  },
  asideLabel: { fontSize: 10, fontWeight: '700', color: colors.mutedSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  asideTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 12 },

  /* Generic card */
  card: {
    backgroundColor: colors.card, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: colors.line, gap: 0,
  },

  /* Summary rows */
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  summaryLabel:{ fontSize: 13, color: colors.muted },
  summaryValue:{ fontSize: 13, color: colors.ink, fontWeight: '600', textAlign: 'right', flexShrink: 1, marginLeft: 8 },
  divider:     { height: 1, backgroundColor: colors.line, marginVertical: 8 },

  /* Payment */
  payRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  payLabel: { fontSize: 13, color: colors.muted },
  payValue: { fontSize: 13, color: colors.ink, fontWeight: '600' },

  /* Bank card */
  bankCard: {
    backgroundColor: '#EDF8F8', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#BDE8E5',
  },
  bankHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bankHeadText: { fontSize: 13, fontWeight: '700', color: colors.teal },
  bankRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.line },
  bankLabel:{ fontSize: 12, color: colors.muted },
  bankValue:{ fontSize: 12, color: colors.ink, fontWeight: '600' },
  bankNote: { fontSize: 12, color: colors.muted, lineHeight: 17, marginTop: 4 },

  errorText: { fontSize: 13, color: colors.error.fg, fontWeight: '600', marginTop: 4 },

  /* Footer */
  footer: {
    flexDirection: 'row', gap: 10,
    padding: 16, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: colors.line,
    backgroundColor: colors.card,
  },

  /* Success screen */
  successContent: { padding: 24, alignItems: 'center', paddingBottom: 48 },
  successMark: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successStar:  { fontSize: 30, color: colors.pink },
  successTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: 8 },
  successSub:   { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});

/* step strip styles separate to avoid bloat */
const ss = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone:   { backgroundColor: colors.status.success.fg },
  stepDotActive: { backgroundColor: colors.pink },
  stepNum:       { fontSize: 10, fontWeight: '700', color: colors.muted },
  stepNumActive: { color: '#fff' },
  stepLabel:     { fontSize: 9, color: colors.muted, fontWeight: '500' },
  stepLabelActive:{ color: colors.pink, fontWeight: '700' },
  connector: { width: 20, height: 2, backgroundColor: colors.line, marginHorizontal: 2, marginBottom: 12 },
  connectorDone: { backgroundColor: colors.status.success.fg },
});
