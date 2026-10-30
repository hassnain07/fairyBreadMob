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
import { BookOpen, Check, Edit3, Plus, X } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { dataClient } from '@/lib/data/client';
import { qk } from '@/lib/data/queryKeys';
import type { Program } from '@/types/teacher';

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOURS = ['pink', 'yellow', 'teal', 'orange', 'green', 'magenta'] as const;
type Colour = typeof COLOURS[number];

const COLOR_MAP: Record<Colour, { bg: string; fg: string }> = {
  pink:    { bg: colors.avatar.pink.bg,    fg: colors.avatar.pink.fg    },
  yellow:  { bg: colors.avatar.yellow.bg,  fg: colors.avatar.yellow.fg  },
  teal:    { bg: colors.avatar.teal.bg,    fg: colors.avatar.teal.fg    },
  orange:  { bg: colors.avatar.orange.bg,  fg: colors.avatar.orange.fg  },
  green:   { bg: colors.avatar.green.bg,   fg: colors.avatar.green.fg   },
  magenta: { bg: colors.avatar.magenta.bg, fg: colors.avatar.magenta.fg },
};

function programColor(color: string | undefined): { bg: string; fg: string } {
  return COLOR_MAP[(color ?? 'pink') as Colour] ?? COLOR_MAP.pink;
}

type ProgramForm = { name: string; description: string; color: Colour; is_active: boolean };
const EMPTY_FORM: ProgramForm = { name: '', description: '', color: 'pink', is_active: true };

// ── Program card ──────────────────────────────────────────────────────────────

function ProgramCard({ program, onEdit }: { program: Program; onEdit: () => void }) {
  const { bg, fg } = programColor(program.color);
  return (
    <View style={[styles.programCard, shadow.card, !program.is_active && styles.programCardInactive]}>
      <View style={styles.programCardHead}>
        <View style={[styles.programIcon, { backgroundColor: bg }]}>
          <BookOpen size={18} color={fg} strokeWidth={2} />
        </View>
        <View style={styles.programInfo}>
          <Text style={styles.programName}>{program.name}</Text>
          <Text style={[styles.programStatus, { color: program.is_active ? colors.status.success.fg : colors.muted }]}>
            {program.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <TouchableOpacity onPress={onEdit} hitSlop={12} style={styles.editBtn}>
          <Edit3 size={16} color={colors.muted} />
        </TouchableOpacity>
      </View>
      {program.description ? (
        <Text style={styles.programDesc}>{program.description}</Text>
      ) : null}
    </View>
  );
}

// ── Program form sheet ────────────────────────────────────────────────────────

function ProgramFormSheet({ editing, programs, onClose }: {
  editing: Program | null;
  programs: Program[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const defaultColor = COLOURS[programs.length % COLOURS.length];
  const [form, setForm] = useState<ProgramForm>(
    editing
      ? { name: editing.name, description: editing.description ?? '', color: (editing.color ?? 'pink') as Colour, is_active: editing.is_active }
      : { ...EMPTY_FORM, color: defaultColor }
  );
  const [formError, setFormError] = useState('');

  const { mutate: upsert, isPending: saving } = useMutation({
    mutationFn: () => dataClient.upsertProgram({
      id:          editing?.id,
      name:        form.name.trim(),
      description: form.description.trim() || undefined,
      color:       form.color,
      is_active:   form.is_active,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.programs }); onClose(); },
    onError: (e: any) => setFormError(e?.message ?? 'Failed to save program.'),
  });

  function handleSubmit() {
    if (!form.name.trim()) { setFormError('Program name is required.'); return; }
    setFormError('');
    upsert();
  }

  const { bg, fg } = programColor(form.color);

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View style={[styles.sheetIconWrap, { backgroundColor: bg }]}>
            <BookOpen size={20} color={fg} strokeWidth={2} />
          </View>
          <Text style={styles.sheetTitle}>{editing ? 'Edit program' : 'Add program'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={{ marginLeft: 'auto' }}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ gap: space.md }}>
            {/* Name */}
            <View>
              <Text style={styles.fieldLabel}>Program name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="e.g. Science"
                placeholderTextColor={colors.muted}
                autoFocus={!editing}
              />
            </View>

            {/* Description */}
            <View>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 11 }]}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="e.g. Hands-on science for curious minds"
                placeholderTextColor={colors.muted}
                multiline
              />
            </View>

            {/* Colour */}
            <View>
              <Text style={styles.fieldLabel}>Colour</Text>
              <View style={styles.colourRow}>
                {COLOURS.map(c => {
                  const { bg: cbg, fg: cfg } = COLOR_MAP[c];
                  const isActive = form.color === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colourDot, { backgroundColor: cbg }, isActive && styles.colourDotActive]}
                      onPress={() => setForm(f => ({ ...f, color: c }))}
                      activeOpacity={0.8}
                    >
                      {isActive && <Check size={14} color={cfg} strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Active toggle */}
            <TouchableOpacity style={styles.checkRow} onPress={() => setForm(f => ({ ...f, is_active: !f.is_active }))} activeOpacity={0.7}>
              <View style={[styles.checkbox, form.is_active && styles.checkboxActive]}>
                {form.is_active && <Check size={11} color="#fff" strokeWidth={3} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkLabel}>Active</Text>
                <Text style={styles.checkSub}>Visible to teachers and parents</Text>
              </View>
            </TouchableOpacity>

            {formError ? <View style={styles.errorBox}><Text style={styles.errorText}>{formError}</Text></View> : null}

            <View style={styles.sheetFooter}>
              <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <Button label={saving ? 'Saving…' : 'Save'} variant="primary" icon={Check} loading={saving} disabled={saving} onPress={handleSubmit} style={{ flex: 2 }} />
            </View>
            <View style={{ height: space.xl }} />
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AdminProgramsPage() {
  const qc = useQueryClient();
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<Program | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: qk.programs,
    queryFn:  () => dataClient.getPrograms(),
    staleTime: 5 * 60_000,
  });

  const activeCount = useMemo(() => programs.filter(p => p.is_active).length, [programs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: qk.programs });
    setRefreshing(false);
  };

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(p: Program) {
    setEditing(p);
    setShowForm(true);
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pink} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Action row */}
        <View style={styles.actionRow}>
          <Button label="Add program" variant="primary" icon={Plus} onPress={openAdd} />
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={{ gap: space.md }}>
            {[1, 2, 3].map(i => <Skeleton key={i} height={88} borderRadius={radius.card} />)}
          </View>
        )}

        {/* Empty */}
        {!isLoading && programs.length === 0 && (
          <View style={styles.emptyCard}>
            <BookOpen size={28} color={colors.muted} />
            <Text style={[type.h3, { color: colors.ink, marginTop: space.md }]}>No programs yet</Text>
            <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.sm, marginBottom: space.lg }]}>
              Click "Add program" to get started.
            </Text>
            <Button label="Add program" variant="primary" icon={Plus} onPress={openAdd} />
          </View>
        )}

        {/* Program cards */}
        {!isLoading && programs.map(p => (
          <ProgramCard key={p.id} program={p} onEdit={() => openEdit(p)} />
        ))}
      </ScrollView>

      {/* Form sheet */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <ProgramFormSheet
          editing={editing}
          programs={programs}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },

  actionRow: { alignItems: 'flex-end' },

  // program card
  programCard: { backgroundColor: colors.card, borderRadius: radius.card, padding: space.lg, borderWidth: 1, borderColor: colors.line, gap: space.sm },
  programCardInactive: { opacity: 0.55 },
  programCardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  programIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  programInfo: { flex: 1 },
  programName: { fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.ink },
  programStatus: { fontFamily: 'DMSans-Regular', fontSize: 12, marginTop: 2 },
  editBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  programDesc: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.muted, lineHeight: 18 },

  emptyCard: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.xl, alignItems: 'center' },

  // sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: space.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  sheetIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.ink },

  fieldLabel: { fontFamily: 'DMSans-Bold', fontSize: 12, color: colors.ink, marginBottom: 5 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, borderWidth: 1, borderColor: colors.line, fontSize: 15, color: colors.ink, minHeight: 46 },

  colourRow: { flexDirection: 'row', gap: space.md },
  colourDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  colourDotActive: { borderWidth: 2.5, borderColor: colors.ink },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  checkboxActive: { backgroundColor: colors.pink, borderColor: colors.pink },
  checkLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.ink },
  checkSub:   { fontFamily: 'DMSans-Regular',  fontSize: 12, color: colors.muted, marginTop: 2 },

  errorBox: { backgroundColor: colors.error.bg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.error.border },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error.fg },
  sheetFooter: { flexDirection: 'row', gap: space.md },
});
