import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle, RotateCcw, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { AttendanceRecord, ClassBooking } from '@/types/booking';
import type { ClassSession } from '@/types/teacher';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function sessionLabel(s: ClassSession) {
  const d = new Date(s.starts_at);
  const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${s.subject} · ${DAYS[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('en-AU', { month: 'short' })} · ${time}`;
}

type MarkStatus = 'present' | 'absent';

// ── Session picker ────────────────────────────────────────────────────────────

function SessionPicker({ sessions, selectedId, onSelect }: {
  sessions: ClassSession[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = sessions.find(s => s.id === selectedId);

  return (
    <View style={styles.pickerWrap}>
      <Text style={styles.pickerLabel}>Session</Text>
      <TouchableOpacity style={styles.picker} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <Text style={styles.pickerText} numberOfLines={1}>
          {selected ? sessionLabel(selected) : 'Select a session…'}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.pickerDropdown}>
          {sessions.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.pickerOption, s.id === selectedId && styles.pickerOptionActive]}
              onPress={() => { onSelect(s.id); setOpen(false); }}
            >
              <Text style={[type.small, { color: s.id === selectedId ? colors.teal : colors.ink, fontWeight: s.id === selectedId ? '600' : '400' }]}>
                {sessionLabel(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Student row ───────────────────────────────────────────────────────────────

function StudentRow({ name, initials, status, onMark }: {
  name: string; initials: string;
  status: MarkStatus | undefined;
  onMark: (s: MarkStatus) => void;
}) {
  return (
    <View style={[styles.studentRow, status === 'present' && styles.studentPresent, status === 'absent' && styles.studentAbsent]}>
      <View style={[styles.avatar, status === 'present' && { backgroundColor: colors.status.success.bg }, status === 'absent' && { backgroundColor: colors.status.danger.bg }]}>
        <Text style={[styles.avatarText, status === 'present' && { color: colors.status.success.fg }, status === 'absent' && { color: colors.status.danger.fg }]}>
          {initials || name.slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.studentName, status === 'present' && { color: colors.status.success.fg }, status === 'absent' && { color: colors.status.danger.fg }]}>
        {name}
      </Text>
      <View style={styles.markBtns}>
        <TouchableOpacity
          style={[styles.markBtn, status === 'present' && styles.markBtnPresent]}
          onPress={() => onMark('present')}
          activeOpacity={0.75}
        >
          <Check size={14} color={status === 'present' ? '#fff' : colors.status.success.fg} strokeWidth={3} />
          <Text style={[styles.markBtnText, status === 'present' && { color: '#fff' }]}>Present</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.markBtn, status === 'absent' && styles.markBtnAbsent]}
          onPress={() => onMark('absent')}
          activeOpacity={0.75}
        >
          <X size={14} color={status === 'absent' ? '#fff' : colors.status.danger.fg} strokeWidth={3} />
          <Text style={[styles.markBtnText, { color: status === 'absent' ? '#fff' : colors.status.danger.fg }]}>Absent</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AttendancePage() {
  const { teacherId } = useAuth();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState('');
  const [statuses,   setStatuses]   = useState<Record<string, MarkStatus>>({});
  const [saved,      setSaved]      = useState(false);
  const [saveError,  setSaveError]  = useState('');

  const twoWeeksAgo = useMemo(() => new Date(Date.now() - 14 * 86_400_000).toISOString(), []);
  const oneWeekAhead = useMemo(() => new Date(Date.now() + 7 * 86_400_000).toISOString(), []);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: qk.sessions({ teacherId, from: twoWeeksAgo, to: oneWeekAhead }),
    queryFn: () => dataClient.getUpcomingSessions({ teacherId: teacherId ?? undefined, from: twoWeeksAgo, to: oneWeekAhead }),
    enabled: !!teacherId,
    staleTime: 60_000,
  });

  // Auto-select first session
  useEffect(() => {
    if (sessions.length > 0 && !selectedId) setSelectedId(sessions[0].id);
  }, [sessions, selectedId]);

  const activeSession = sessions.find(s => s.id === selectedId);

  // Load existing attendance to pre-fill
  const { data: existingRecords = [] } = useQuery({
    queryKey: qk.attendance(selectedId),
    queryFn:  () => dataClient.getAttendance(selectedId),
    enabled:  !!selectedId,
  });

  useEffect(() => {
    if (!existingRecords.length) return;
    const map: Record<string, MarkStatus> = {};
    existingRecords.forEach((r: AttendanceRecord) => {
      if (r.status === 'present' || r.status === 'absent') map[r.child_id] = r.status;
    });
    setStatuses(map);
  }, [existingRecords]);

  // Teacher's confirmed bookings for this session
  const { data: bookings = [] } = useQuery({
    queryKey: qk.teacherBookings,
    queryFn:  () => dataClient.getBookingsForTeacher(),
    enabled:  !!teacherId,
    staleTime: 2 * 60_000,
  });

  const sessionBookings = bookings.filter(
    (b: ClassBooking) => b.class_session_id === selectedId && b.status === 'confirmed'
  );

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => dataClient.saveAttendance(
      selectedId,
      Object.entries(statuses).map(([childId, status]) => ({ childId, status }))
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.attendance(selectedId) });
      setSaved(true); setSaveError('');
    },
    onError: (e: any) => setSaveError(e?.message ?? 'Failed to save attendance.'),
  });

  function handleReset() { setStatuses({}); setSaved(false); setSaveError(''); }
  function handleSessionChange(id: string) { setSelectedId(id); setStatuses({}); setSaved(false); setSaveError(''); }

  // ── Saved state ───────────────────────────────────────────────────────────
  if (saved) {
    return (
      <View style={[styles.root, styles.savedWrap]}>
        <View style={styles.savedIcon}>
          <CheckCircle size={36} color={colors.status.success.fg} />
        </View>
        <Text style={styles.savedTitle}>Attendance saved</Text>
        {activeSession && (
          <Text style={styles.savedSub}>
            {activeSession.subject} · {new Date(activeSession.starts_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        )}
        <Button label="Mark another session" variant="soft" icon={RotateCcw} onPress={handleReset} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Take attendance</Text>
        <Text style={styles.pageSub}>Mark who attended this session.</Text>

        {/* Session picker */}
        {sessionsLoading ? (
          <Skeleton height={52} borderRadius={radius.md} />
        ) : sessions.length === 0 ? (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: space.xl }]}>
            <Text style={styles.emptyText}>No sessions found in the past 2 weeks or upcoming week.</Text>
          </View>
        ) : (
          <SessionPicker sessions={sessions} selectedId={selectedId} onSelect={handleSessionChange} />
        )}

        {/* Session details + student list */}
        {activeSession && (
          <View style={[styles.card, shadow.card]}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionSubject}>{activeSession.subject}</Text>
              <Text style={styles.sessionDate}>
                {new Date(activeSession.starts_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })} · {sessionBookings.length} student{sessionBookings.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {saveError !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{saveError}</Text>
              </View>
            )}

            {sessionBookings.length === 0 ? (
              <Text style={styles.emptyText}>No confirmed bookings for this session.</Text>
            ) : (
              <View style={{ gap: space.sm }}>
                {sessionBookings.map(b => {
                  const child = b.child;
                  if (!child) return null;
                  return (
                    <StudentRow
                      key={child.id}
                      name={child.name}
                      initials={child.initials ?? child.name.slice(0, 2)}
                      status={statuses[child.id]}
                      onMark={status => setStatuses({ ...statuses, [child.id]: status })}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      {activeSession && sessionBookings.length > 0 && (
        <View style={styles.footer}>
          <Button label="Reset" variant="ghost" icon={RotateCcw} onPress={handleReset} style={{ flex: 1 }} />
          <Button
            label={isPending ? 'Saving…' : 'Save Attendance'}
            variant="primary"
            icon={Check}
            loading={isPending}
            disabled={Object.keys(statuses).length === 0}
            onPress={() => save()}
            style={{ flex: 2 }}
          />
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },

  pageTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 24, color: colors.ink, letterSpacing: -0.3 },
  pageSub:   { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, marginTop: 4 },

  card: {
    backgroundColor: colors.card,
    borderRadius:    radius.card,
    padding:         space.lg,
    borderWidth:     1,
    borderColor:     colors.line,
    gap:             space.md,
  },
  sessionHeader: { gap: 2 },
  sessionSubject: { fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.ink },
  sessionDate:    { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.muted },

  // session picker
  pickerWrap: { gap: 6 },
  pickerLabel: { fontFamily: 'DMSans-Bold', fontSize: 11, color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  picker: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    backgroundColor:   colors.card,
    borderRadius:      radius.md,
    paddingHorizontal: space.md,
    paddingVertical:   space.md,
    borderWidth:       1,
    borderColor:       colors.line,
    minHeight:         48,
  },
  pickerText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.ink, flex: 1 },
  pickerDropdown: {
    backgroundColor: colors.card,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.line,
    overflow:        'hidden',
    marginTop:       4,
  },
  pickerOption: {
    paddingHorizontal: space.md,
    paddingVertical:   space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pickerOptionActive: { backgroundColor: colors.tealSoft },

  // student row
  studentRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            space.md,
    backgroundColor: colors.surface,
    borderRadius:   radius.md,
    padding:        space.sm,
    borderWidth:    1,
    borderColor:    colors.line,
  },
  studentPresent: { backgroundColor: colors.status.success.bg, borderColor: '#C9EBCE' },
  studentAbsent:  { backgroundColor: colors.status.danger.bg,  borderColor: '#FFD2B9' },
  avatar: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: colors.pinkSoft,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  avatarText: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.avatar.pink.fg },
  studentName: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.ink, flex: 1 },

  markBtns: { flexDirection: 'row', gap: space.xs },
  markBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    paddingHorizontal: space.sm,
    paddingVertical:   space.xs,
    borderRadius:      radius.pill,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.line,
  },
  markBtnPresent: { backgroundColor: colors.status.success.fg, borderColor: colors.status.success.fg },
  markBtnAbsent:  { backgroundColor: colors.status.danger.fg,  borderColor: colors.status.danger.fg  },
  markBtnText: { fontFamily: 'DMSans-Bold', fontSize: 11, color: colors.muted },

  // error
  errorBox: {
    backgroundColor: colors.error.bg,
    borderRadius:    radius.md,
    padding:         space.md,
    borderWidth:     1,
    borderColor:     colors.error.border,
  },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },

  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: space.sm },

  // saved
  savedWrap: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg },
  savedIcon: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: colors.status.success.bg,
    alignItems:      'center',
    justifyContent:  'center',
  },
  savedTitle: { fontFamily: 'DMSans-Bold', fontSize: 22, color: colors.ink, textAlign: 'center' },
  savedSub:   { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.muted, textAlign: 'center' },

  footer: {
    flexDirection:     'row',
    gap:               space.md,
    padding:           space.lg,
    borderTopWidth:    1,
    borderTopColor:    colors.line,
    backgroundColor:   colors.card,
  },
});
