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
  CalendarOff,
  Check,
  ChevronDown,
  Edit3,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { ClassSlot, ClassSlotInput } from '@/types/teacher';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS_ISO: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
  5: 'Friday', 6: 'Saturday', 7: 'Sunday',
};
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6];

const ACCENT_MAP: Record<string, { bg: string; fg: string }> = {
  pink:    { bg: colors.pinkSoft,   fg: colors.avatar.pink.fg    },
  teal:    { bg: colors.tealSoft,   fg: colors.avatar.teal.fg    },
  yellow:  { bg: colors.yellowSoft, fg: colors.avatar.yellow.fg  },
  orange:  { bg: colors.orangeSoft, fg: colors.avatar.orange.fg  },
  green:   { bg: colors.greenSoft,  fg: colors.avatar.green.fg   },
  magenta: { bg: '#F8E3F2',          fg: colors.magenta           },
};
function slotAccent(color: string) { return ACCENT_MAP[color] ?? ACCENT_MAP.pink; }

function formatMoney(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

type SlotForm = {
  program_id: string; teacher_id: string; day_of_week: string;
  start_time: string; duration_minutes: string; capacity: string; price_cents: string;
};
const EMPTY_SLOT: SlotForm = {
  program_id: '', teacher_id: '', day_of_week: '1',
  start_time: '15:30', duration_minutes: '60', capacity: '15', price_cents: '5000',
};

// ── Dropdown ──────────────────────────────────────────────────────────────────

function DropDown({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View>
      <Text style={sty.fieldLabel}>{label}</Text>
      <TouchableOpacity style={sty.picker} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <Text style={[sty.pickerText, !selected && { color: colors.muted }]}>
          {selected?.label ?? '— select —'}
        </Text>
        <ChevronDown size={15} color={colors.muted} />
      </TouchableOpacity>
      {open && (
        <View style={sty.dropList}>
          {options.map(o => (
            <TouchableOpacity key={o.value} style={[sty.dropOption, o.value === value && sty.dropOptionActive]} onPress={() => { onChange(o.value); setOpen(false); }} activeOpacity={0.7}>
              <Text style={[type.small, { color: o.value === value ? colors.pink : colors.ink, fontWeight: o.value === value ? '600' : '400' }]}>{o.label}</Text>
              {o.value === value && <Check size={13} color={colors.pink} strokeWidth={3} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View>
      <Text style={sty.fieldLabel}>{label}</Text>
      <TextInput style={sty.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType} />
    </View>
  );
}

// ── Slot form sheet ───────────────────────────────────────────────────────────

function SlotFormSheet({
  editingSlot, programs, teachers, viewingTermId, onClose,
}: {
  editingSlot: ClassSlot | null;
  programs: any[];
  teachers: any[];
  viewingTermId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<SlotForm>(
    editingSlot ? {
      program_id: editingSlot.program_id, teacher_id: editingSlot.teacher_id,
      day_of_week: String(editingSlot.day_of_week), start_time: editingSlot.start_time,
      duration_minutes: String(editingSlot.duration_minutes), capacity: String(editingSlot.capacity),
      price_cents: String(editingSlot.price_cents ?? 5000),
    } : { ...EMPTY_SLOT, program_id: programs[0]?.id ?? '', teacher_id: teachers[0]?.id ?? '' }
  );
  const [slotError, setSlotError] = useState('');

  const setF = (k: keyof SlotForm) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const { mutate: createSlot, isPending: creating } = useMutation({
    mutationFn: () => dataClient.createClassSlot({
      program_id: form.program_id, teacher_id: form.teacher_id,
      day_of_week: Number(form.day_of_week), start_time: form.start_time,
      duration_minutes: Number(form.duration_minutes), capacity: Number(form.capacity),
      price_cents: Number(form.price_cents),
      school_term_id: viewingTermId ?? undefined,
    } as ClassSlotInput),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.classSlots }); qc.invalidateQueries({ queryKey: qk.sessions() }); onClose(); },
    onError: (e: any) => setSlotError(e?.message ?? 'Failed to create class.'),
  });

  const { mutate: updateSlot, isPending: updating } = useMutation({
    mutationFn: () => dataClient.updateClassSlot(editingSlot!.id, {
      program_id: form.program_id, teacher_id: form.teacher_id,
      day_of_week: Number(form.day_of_week), start_time: form.start_time,
      duration_minutes: Number(form.duration_minutes), capacity: Number(form.capacity),
      price_cents: Number(form.price_cents),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.classSlots }); qc.invalidateQueries({ queryKey: qk.sessions() }); onClose(); },
    onError: (e: any) => setSlotError(e?.message ?? 'Failed to update class.'),
  });

  function handleSubmit() {
    if (!form.program_id) { setSlotError('Please select a program.'); return; }
    if (!form.teacher_id) { setSlotError('Please select a teacher.'); return; }
    if (!form.start_time)  { setSlotError('Start time is required.'); return; }
    const cap = Number(form.capacity);
    if (!cap || cap < 1) { setSlotError('Capacity must be at least 1.'); return; }
    setSlotError('');
    editingSlot ? updateSlot() : createSlot();
  }

  const programOptions = programs.map(p => ({ label: p.name, value: p.id }));
  const teacherOptions = teachers.map(t => ({ label: t.name, value: t.id }));
  const dayOptions = DAY_OPTIONS.map(d => ({ label: DAYS_ISO[d], value: String(d) }));
  const isPending = creating || updating;

  return (
    <Pressable style={sty.backdrop} onPress={onClose}>
      <Pressable style={sty.sheet} onPress={e => e.stopPropagation()}>
        <View style={sty.sheetHandle} />
        <View style={sty.sheetHeader}>
          <View style={sty.sheetIconWrap}><Plus size={20} color={colors.pink} /></View>
          <Text style={sty.sheetTitle}>{editingSlot ? 'Edit class' : 'Add a class'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={{ marginLeft: 'auto' }}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ gap: space.md }}>
            <DropDown label="Program"    value={form.program_id}   options={programOptions} onChange={setF('program_id')} />
            <DropDown label="Teacher"    value={form.teacher_id}   options={teacherOptions} onChange={setF('teacher_id')} />
            <DropDown label="Day"        value={form.day_of_week}  options={dayOptions}     onChange={setF('day_of_week')} />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}><Field label="Start time (24h)" value={form.start_time} onChange={setF('start_time')} placeholder="e.g. 15:30" /></View>
              <View style={{ flex: 1 }}><Field label="Duration (min)" value={form.duration_minutes} onChange={setF('duration_minutes')} keyboardType="numeric" /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1 }}><Field label="Capacity" value={form.capacity} onChange={setF('capacity')} keyboardType="numeric" /></View>
              <View style={{ flex: 1 }}><Field label="Price (cents)" value={form.price_cents} onChange={setF('price_cents')} placeholder="5000 = $50" keyboardType="numeric" /></View>
            </View>
            {slotError ? <View style={sty.errorBox}><Text style={sty.errorText}>{slotError}</Text></View> : null}
            <View style={sty.sheetFooter}>
              <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <Button label={isPending ? 'Saving…' : editingSlot ? 'Save changes' : 'Add class'} variant="primary" icon={Check} loading={isPending} disabled={isPending} onPress={handleSubmit} style={{ flex: 2 }} />
            </View>
            <View style={{ height: space.xl }} />
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminTimetablePage() {
  const qc = useQueryClient();
  const [refreshing,   setRefreshing]   = useState(false);
  const [editingSlot,  setEditingSlot]  = useState<ClassSlot | null>(null);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [cancelFuture, setCancelFuture] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');
  const [cancelSessionId, setCancelSessionId] = useState<string | null>(null);
  const [cancelReason,    setCancelReason]    = useState('');
  const [cancelSessionError, setCancelSessionError] = useState('');

  const { data: slots = [], isLoading } = useQuery({
    queryKey: qk.classSlots,
    queryFn:  () => dataClient.getClassSlots(),
    staleTime: 60_000,
  });

  const { data: teachers = [] } = useQuery({ queryKey: qk.teachers, queryFn: () => dataClient.getTeachers(), staleTime: 5 * 60_000 });
  const { data: programs = [] } = useQuery({ queryKey: qk.programs,  queryFn: () => dataClient.getPrograms(), staleTime: 5 * 60_000 });

  const weekAhead = useMemo(() => new Date(Date.now() + 7 * 86_400_000).toISOString(), []);
  const { data: sessions = [] } = useQuery({
    queryKey: qk.sessions({ to: weekAhead }),
    queryFn:  () => dataClient.getUpcomingSessions({ to: weekAhead, from: new Date().toISOString() }),
    staleTime: 60_000,
  });

  const activeSlots = slots.filter(s => s.is_active);

  // Group by day_of_week
  const byDay = useMemo(() => {
    const map = new Map<number, ClassSlot[]>();
    DAY_OPTIONS.forEach(d => { if (activeSlots.some(s => s.day_of_week === d)) map.set(d, []); });
    activeSlots.forEach(s => { const arr = map.get(s.day_of_week); if (arr) arr.push(s); });
    return map;
  }, [activeSlots]);

  const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t]));
  const programMap = Object.fromEntries(programs.map(p => [p.id, p]));

  const { mutate: deactivate, isPending: deactivating } = useMutation({
    mutationFn: () => dataClient.deactivateClassSlot(deactivateId!, cancelFuture),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.classSlots });
      qc.invalidateQueries({ queryKey: qk.sessions() });
      qc.invalidateQueries({ queryKey: qk.allBookings });
      setDeactivateId(null); setDeactivateError('');
    },
    onError: (e: any) => setDeactivateError(e?.message ?? 'Failed to deactivate.'),
  });

  const { mutate: cancelSes, isPending: cancellingSession } = useMutation({
    mutationFn: () => dataClient.cancelSession(cancelSessionId!, cancelReason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.sessions() });
      qc.invalidateQueries({ queryKey: qk.allBookings });
      setCancelSessionId(null); setCancelReason(''); setCancelSessionError('');
    },
    onError: (e: any) => setCancelSessionError(e?.message ?? 'Failed to cancel session.'),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.classSlots });
    await qc.invalidateQueries({ queryKey: qk.sessions() });
    setRefreshing(false);
  };

  return (
    <View style={sty.root}>
      <ScrollView
        contentContainerStyle={sty.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Action row */}
        <View style={sty.actionRow}>
          <Button label="Add class" variant="primary" icon={Plus} onPress={() => { setEditingSlot(null); setShowSlotForm(true); }} />
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={{ gap: space.md }}>
            {[1, 2].map(i => <Skeleton key={i} height={120} borderRadius={radius.card} />)}
          </View>
        )}

        {/* Empty */}
        {!isLoading && activeSlots.length === 0 && (
          <View style={sty.emptyCard}>
            <CalendarOff size={28} color={colors.muted} />
            <Text style={[type.h3, { color: colors.ink, marginTop: space.md }]}>No classes yet</Text>
            <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.sm }]}>
              Tap "Add class" to build the timetable.
            </Text>
          </View>
        )}

        {/* Day groups */}
        {!isLoading && Array.from(byDay.entries()).map(([day, daySlots]) => {
          const sorted = [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
          return (
            <View key={day} style={sty.dayGroup}>
              <Text style={sty.dayLabel}>{DAYS_ISO[day]}</Text>
              <View style={{ gap: space.md }}>
                {sorted.map(slot => {
                  const program = programMap[slot.program_id];
                  const teacher = teacherMap[slot.teacher_id];
                  const color = program?.color ?? slot.teacher_color ?? 'pink';
                  const { bg, fg } = slotAccent(color);
                  const nextSession = sessions.find(s => s.class_id === slot.id);
                  const teacherInitials = teacher?.initials ?? teacher?.name.slice(0, 2).toUpperCase() ?? '??';

                  return (
                    <View key={slot.id} style={[sty.slotCard, shadow.card, { borderLeftColor: fg }]}>
                      {/* Top row */}
                      <View style={sty.slotTop}>
                        <View style={[sty.subjectChip, { backgroundColor: bg }]}>
                          <Text style={[sty.subjectChipText, { color: fg }]}>{slot.subject.toUpperCase()}</Text>
                        </View>
                        <Text style={sty.slotTime}>{slot.start_time}</Text>
                      </View>

                      {/* Teacher row */}
                      <View style={sty.slotTeacherRow}>
                        <View style={[sty.teacherAvatar, { backgroundColor: ACCENT_MAP[teacher?.color ?? 'pink']?.bg ?? colors.pinkSoft }]}>
                          <Text style={[sty.teacherAvatarText, { color: ACCENT_MAP[teacher?.color ?? 'pink']?.fg ?? colors.avatar.pink.fg }]}>{teacherInitials}</Text>
                        </View>
                        <Text style={sty.teacherName}>{teacher?.name ?? '—'}</Text>
                      </View>

                      {/* Meta */}
                      <View style={sty.slotMeta}>
                        <Text style={sty.slotMetaText}>
                          {slot.next_booked_count}/{slot.capacity} booked
                          {slot.price_cents != null ? `  ·  ${formatMoney(slot.price_cents)}` : ''}
                        </Text>
                      </View>

                      {/* Actions */}
                      <View style={sty.slotActions}>
                        <TouchableOpacity style={sty.actionBtn} onPress={() => { setEditingSlot(slot); setShowSlotForm(true); }} hitSlop={6}>
                          <Edit3 size={14} color={colors.muted} />
                          <Text style={sty.actionBtnText}>Edit</Text>
                        </TouchableOpacity>
                        {nextSession && (
                          <TouchableOpacity style={sty.actionBtn} onPress={() => { setCancelSessionId(nextSession.id); setCancelReason(''); setCancelSessionError(''); }} hitSlop={6}>
                            <CalendarOff size={14} color={colors.muted} />
                            <Text style={sty.actionBtnText}>Cancel session</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[sty.actionBtn, sty.actionBtnDanger]} onPress={() => { setDeactivateId(slot.id); setCancelFuture(false); setDeactivateError(''); }} hitSlop={6}>
                          <Trash2 size={14} color={colors.status.danger.fg} />
                          <Text style={[sty.actionBtnText, { color: colors.status.danger.fg }]}>Deactivate</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Slot form sheet ── */}
      <Modal visible={showSlotForm} transparent animationType="slide" onRequestClose={() => setShowSlotForm(false)}>
        <SlotFormSheet
          editingSlot={editingSlot}
          programs={programs}
          teachers={teachers}
          viewingTermId={null}
          onClose={() => { setShowSlotForm(false); setEditingSlot(null); }}
        />
      </Modal>

      {/* ── Deactivate confirm ── */}
      <Modal visible={!!deactivateId} transparent animationType="slide" onRequestClose={() => setDeactivateId(null)}>
        <Pressable style={sty.backdrop} onPress={() => setDeactivateId(null)}>
          <Pressable style={sty.sheet} onPress={e => e.stopPropagation()}>
            <View style={sty.sheetHandle} />
            <View style={sty.sheetHeader}>
              <Text style={sty.sheetTitle}>Deactivate this class?</Text>
              <TouchableOpacity onPress={() => setDeactivateId(null)} hitSlop={12} style={{ marginLeft: 'auto' }}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={sty.sheetDesc}>No new sessions will be generated. Existing bookings are not automatically cancelled unless you choose the option below.</Text>

            {/* Cancel future checkbox */}
            <TouchableOpacity style={sty.checkRow} onPress={() => setCancelFuture(v => !v)} activeOpacity={0.7}>
              <View style={[sty.checkbox, cancelFuture && sty.checkboxActive]}>
                {cancelFuture && <Check size={11} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={sty.checkLabel}>Cancel all upcoming sessions and notify families</Text>
            </TouchableOpacity>

            {deactivateError ? <View style={sty.errorBox}><Text style={sty.errorText}>{deactivateError}</Text></View> : null}
            <View style={sty.sheetFooter}>
              <Button label="Keep it" variant="ghost" onPress={() => setDeactivateId(null)} style={{ flex: 1 }} />
              <Button label={deactivating ? 'Deactivating…' : 'Yes, deactivate'} variant="danger" loading={deactivating} disabled={deactivating} onPress={() => deactivate()} style={{ flex: 2 }} />
            </View>
            <View style={{ height: space.xl }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Cancel session ── */}
      <Modal visible={!!cancelSessionId} transparent animationType="slide" onRequestClose={() => setCancelSessionId(null)}>
        <Pressable style={sty.backdrop} onPress={() => setCancelSessionId(null)}>
          <Pressable style={sty.sheet} onPress={e => e.stopPropagation()}>
            <View style={sty.sheetHandle} />
            <View style={sty.sheetHeader}>
              <Text style={sty.sheetTitle}>Cancel this session?</Text>
              <TouchableOpacity onPress={() => setCancelSessionId(null)} hitSlop={12} style={{ marginLeft: 'auto' }}>
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={sty.sheetDesc}>All families booked into this session will be notified.</Text>

            <Text style={sty.fieldLabel}>Reason (optional)</Text>
            <TextInput
              style={sty.input}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="e.g. Public holiday"
              placeholderTextColor={colors.muted}
            />

            {cancelSessionError ? <View style={[sty.errorBox, { marginTop: space.md }]}><Text style={sty.errorText}>{cancelSessionError}</Text></View> : null}
            <View style={[sty.sheetFooter, { marginTop: space.md }]}>
              <Button label="Keep it" variant="ghost" onPress={() => setCancelSessionId(null)} style={{ flex: 1 }} />
              <Button label={cancellingSession ? 'Cancelling…' : 'Yes, cancel session'} variant="danger" loading={cancellingSession} disabled={cancellingSession} onPress={() => cancelSes()} style={{ flex: 2 }} />
            </View>
            <View style={{ height: space.xl }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sty = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.huge },

  actionRow: { alignItems: 'flex-end' },

  // day groups
  dayGroup: { gap: space.sm },
  dayLabel: { fontFamily: 'DMSans-Bold', fontSize: 11, color: colors.mutedSoft, letterSpacing: 1.2, textTransform: 'uppercase' },

  // slot card
  slotCard: {
    backgroundColor: colors.card, borderRadius: radius.card, padding: space.md,
    borderWidth: 1, borderColor: colors.line, borderLeftWidth: 4, gap: space.sm,
  },
  slotTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subjectChip: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill },
  subjectChipText: { fontFamily: 'DMSans-Bold', fontSize: 11, letterSpacing: 0.5 },
  slotTime: { fontFamily: 'DMSans-Bold', fontSize: 13, color: colors.ink },
  slotTeacherRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  teacherAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  teacherAvatarText: { fontSize: 9, fontWeight: '700' },
  teacherName: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.ink },
  slotMeta: {},
  slotMetaText: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.muted },
  slotActions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  actionBtnDanger: { borderColor: colors.status.danger.bg },
  actionBtnText: { fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.muted },

  emptyCard: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.xl, alignItems: 'center', gap: space.sm },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  sheetIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.ink },
  sheetDesc: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: space.lg },

  // form
  fieldLabel: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.ink, marginBottom: 5 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, borderWidth: 1, borderColor: colors.line, fontSize: 15, color: colors.ink, minHeight: 46 },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, borderWidth: 1, borderColor: colors.line, minHeight: 46 },
  pickerText: { fontFamily: 'DMSans-Regular', fontSize: 15, color: colors.ink },
  dropList: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', marginTop: 4 },
  dropOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  dropOptionActive: { backgroundColor: colors.pinkSoft },

  // deactivate
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginBottom: space.md },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxActive: { backgroundColor: colors.pink, borderColor: colors.pink },
  checkLabel: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.ink, flex: 1, lineHeight: 20 },

  errorBox: { backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.error.border },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },
  sheetFooter: { flexDirection: 'row', gap: space.md },
});
