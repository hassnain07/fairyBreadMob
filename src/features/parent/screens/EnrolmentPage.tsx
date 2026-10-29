import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataClient } from '@/lib/data/client';
import type { Child } from '@/types/family';
import type { ParentMoreStackProps } from '@/app/navigation/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = ['Parent', 'Child', 'Terms', 'Signature', 'Complete'] as const;
const REFERRAL_OPTIONS = ['Word of mouth', 'Google', 'Social media', 'School newsletter', 'Other'];

// ── Field component ───────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  hint?: string;
  readOnly?: boolean;
}

function Field({
  label, value, onChange, placeholder, required,
  keyboardType = 'default', multiline, hint, readOnly,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}{required && <Text style={{ color: colors.pink }}> *</Text>}
      </Text>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      <TextInput
        style={[styles.input, multiline && styles.inputMulti, readOnly && styles.inputReadOnly]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        editable={!readOnly}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionDiv}>
      <Text style={styles.sectionDivTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionDivSub}>{subtitle}</Text>}
    </View>
  );
}

// ── Agreement check row ───────────────────────────────────────────────────────

interface AgreementRowProps {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AgreementRow({ checked, onToggle, children }: AgreementRowProps) {
  return (
    <TouchableOpacity style={[styles.agreementRow, checked && styles.agreementRowChecked]} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.checkCircle, checked && styles.checkCircleChecked]}>
        {checked && <Check size={13} color="#fff" strokeWidth={3} />}
      </View>
      <Text style={[styles.agreementText, checked && { color: colors.ink }]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

// ── DocLink — opens URL from settings or shows alert ─────────────────────────

function DocLink({ docUrl, label, onPress }: { docUrl?: string; label: string; onPress: () => void }) {
  return (
    <Text style={styles.docLink} onPress={onPress}>{label}</Text>
  );
}

// ── Child picker ──────────────────────────────────────────────────────────────

interface ChildPickerProps {
  children: Child[];
  selected: Child | null;
  onSelect: (c: Child) => void;
}

function ChildPicker({ children, selected, onSelect }: ChildPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Select child <Text style={{ color: colors.pink }}>*</Text></Text>
      <TouchableOpacity style={styles.picker} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <Text style={[styles.pickerText, !selected && { color: colors.muted }]}>
          {selected ? selected.name : '— Choose a child —'}
        </Text>
        <ChevronDown size={16} color={colors.muted} />
      </TouchableOpacity>
      {open && (
        <View style={styles.pickerDropdown}>
          {children.length === 0 ? (
            <Text style={[type.small, { color: colors.muted, padding: space.md }]}>No children on your account yet.</Text>
          ) : (
            children.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.pickerOption, selected?.id === c.id && styles.pickerOptionSelected]}
                onPress={() => { onSelect(c); setOpen(false); }}
              >
                <Text style={[type.small, { color: selected?.id === c.id ? colors.teal : colors.ink, fontWeight: selected?.id === c.id ? '600' : '400' }]}>
                  {c.name}
                </Text>
                {selected?.id === c.id && <Check size={14} color={colors.teal} />}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

// ── Referral picker ───────────────────────────────────────────────────────────

function ReferralPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>How did you hear about us?</Text>
      <TouchableOpacity style={styles.picker} onPress={() => setOpen(v => !v)} activeOpacity={0.8}>
        <Text style={styles.pickerText}>{value}</Text>
        <ChevronDown size={16} color={colors.muted} />
      </TouchableOpacity>
      {open && (
        <View style={styles.pickerDropdown}>
          {REFERRAL_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.pickerOption, value === opt && styles.pickerOptionSelected]}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text style={[type.small, { color: value === opt ? colors.teal : colors.ink, fontWeight: value === opt ? '600' : '400' }]}>
                {opt}
              </Text>
              {value === opt && <Check size={14} color={colors.teal} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Progress bar stepper ──────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  return (
    <View style={styles.stepper}>
      {STEPS.map((s, i) => {
        const done    = i + 1 < step;
        const current = i + 1 === step;
        return (
          <React.Fragment key={s}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, done && styles.stepDotDone, current && styles.stepDotCurrent]}>
                {done
                  ? <Check size={11} color="#fff" strokeWidth={3} />
                  : <Text style={[styles.stepNum, current && { color: '#fff' }]}>{i + 1}</Text>
                }
              </View>
              <Text style={[styles.stepLabel, (done || current) && { color: colors.ink, fontWeight: '600' }]}>
                {s}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EnrolmentPage({ navigation }: ParentMoreStackProps<'Enrolment'>) {
  const { familyId } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [enrolError, setEnrolError] = useState('');

  // Step 1 — Parent
  const [parent, setParent] = useState({
    familyName: '', givenName: '', relationship: '', address: '',
    email: '', phone1: '', phone2: '',
    emergencyName: '', emergencyRelationship: '', emergencyPhone: '',
  });
  const setP = (k: keyof typeof parent) => (v: string) => setParent(p => ({ ...p, [k]: v }));

  // Step 2 — Child
  const [selectedChildId, setSelectedChildId] = useState('');
  const [childDetails, setChildDetails] = useState({
    familyName: '', givenName: '', preferredName: '', year: '', school: '', concern: '',
  });
  const setC = (k: keyof typeof childDetails) => (v: string) => setChildDetails(d => ({ ...d, [k]: v }));

  // Step 3 — Terms
  const [referral, setReferral]                   = useState('Word of mouth');
  const [agreedToTerms, setAgreedToTerms]         = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy]     = useState(false);
  const [agreedToTrampoline, setAgreedToTrampoline] = useState(false);

  // Step 4 — Signature
  const [signature, setSignature] = useState('');
  const signatureDate = new Date().toLocaleDateString('en-AU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  // Queries
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['children', familyId],
    queryFn: () => dataClient.getChildren(familyId!),
    enabled: !!familyId,
    staleTime: 5 * 60_000,
  });

  const { data: docs = {} as Record<string, string> } = useQuery({
    queryKey: ['documents'],
    queryFn:  () => dataClient.getDocuments(),
    staleTime: 10 * 60_000,
  });

  const selectedChild = children.find(c => c.id === selectedChildId) ?? null;

  function selectChild(c: Child) {
    setSelectedChildId(c.id);
    setChildDetails({
      familyName:    c.familyName ?? '',
      givenName:     c.givenName ?? '',
      preferredName: c.preferredName ?? '',
      year:          c.year ?? '',
      school:        c.school ?? '',
      concern:       c.concern ?? '',
    });
  }

  function openDoc(key: string, fallback: string) {
    const url = docs[key];
    if (url) Linking.openURL(url).catch(() => Alert.alert('Error', `Could not open ${fallback}.`));
    else     Alert.alert(fallback, `${fallback} has not been uploaded yet. Please contact us.`);
  }

  // Validation
  const canStep2 = !!selectedChild && childDetails.givenName.trim().length > 0;
  const canStep3 = agreedToTerms && agreedToPrivacy && agreedToTrampoline;
  const canStep4 = signature.trim().length > 2;

  const firstName =
    childDetails.preferredName.trim() ||
    childDetails.givenName.trim() ||
    selectedChild?.name.split(' ')[0] ||
    'your child';

  // Mutation
  const enrol = useMutation({
    mutationFn: () => {
      if (!selectedChild) throw new Error('No child selected');
      return dataClient.completeEnrolment(selectedChild.id, {
        child: {
          given_name:     childDetails.givenName.trim(),
          family_name:    childDetails.familyName.trim()    || undefined,
          preferred_name: childDetails.preferredName.trim() || undefined,
          year_level:     childDetails.year    || undefined,
          school:         childDetails.school  || undefined,
          concern:        childDetails.concern || undefined,
        },
        parent: {
          given_name:              parent.givenName.trim()              || undefined,
          family_name:             parent.familyName.trim()             || undefined,
          relationship:            parent.relationship                  || undefined,
          address:                 parent.address                       || undefined,
          phone1:                  parent.phone1                        || undefined,
          phone2:                  parent.phone2                        || undefined,
          emergency_name:          parent.emergencyName                 || undefined,
          emergency_relationship:  parent.emergencyRelationship         || undefined,
          emergency_phone:         parent.emergencyPhone                || undefined,
        },
        referral,
        signature:         signature.trim(),
        agreed_terms:      agreedToTerms,
        agreed_privacy:    agreedToPrivacy,
        agreed_trampoline: agreedToTrampoline,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['children', familyId] });
      setEnrolError('');
      setStep(5);
    },
    onError: (e: any) => setEnrolError(e?.message ?? 'Failed to complete enrolment. Please try again.'),
  });

  // ── Loading ───────────────────────────────────────────────────────────────

  if (childrenLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[type.eyebrow, { color: colors.pink }]}>Enrolment</Text>
          <Text style={[type.h2, { color: colors.ink }]}>Let's make it official.</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Skeleton height={52} borderRadius={radius.card} style={{ marginBottom: space.md }} />
          <Skeleton height={52} borderRadius={radius.card} style={{ marginBottom: space.md }} />
          <Skeleton height={52} borderRadius={radius.card} />
        </ScrollView>
      </View>
    );
  }

  // ── Complete / step 5 ─────────────────────────────────────────────────────

  if (step === 5) {
    const parentFirst = parent.givenName.trim() || 'there';
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={[styles.content, { alignItems: 'center', justifyContent: 'center', flex: 1 }]}>
          <View style={styles.completeIcon}>
            <Check size={32} color="#fff" strokeWidth={2.5} />
          </View>
          <Text style={[type.h1, { color: colors.ink, textAlign: 'center', marginBottom: space.sm }]}>
            All set, {parentFirst}.
          </Text>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginBottom: space.xl }]}>
            {firstName}'s enrolment is complete. We can't wait to see them shine. ✨
          </Text>
          <Button
            label="Explore classes"
            variant="primary"
            icon={ArrowRight}
            onPress={() => navigation.navigate('MoreHub')}
            fullWidth
          />
          <View style={{ height: space.md }} />
          <Button
            label="Back to More"
            variant="ghost"
            onPress={() => navigation.navigate('MoreHub')}
            fullWidth
          />
        </ScrollView>
      </View>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Page header ────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={[type.eyebrow, { color: colors.pink, marginBottom: 2 }]}>A few lovely details</Text>
          <Text style={[type.h2, { color: colors.ink }]}>Let's make it official.</Text>
          <Text style={[type.small, { color: colors.muted, marginTop: 4 }]}>
            {selectedChild
              ? `We'll use these details to set up ${firstName}'s enrolment.`
              : "We'll use these details to set up your child's enrolment."}
          </Text>
        </View>
      </View>

      {/* ── Stepper ─────────────────────────────────────────── */}
      <Stepper step={step} />

      {/* ── Form card ───────────────────────────────────────── */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, shadow.card]}>

          {/* ──────────────── STEP 1: Parent ──────────────────── */}
          {step === 1 && (
            <>
              <Text style={styles.stepEyebrow}>Enrolling Parent / Guardian</Text>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.xs }]}>Tell us about you</Text>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Field label="Family name" value={parent.familyName} onChange={setP('familyName')} placeholder="Smith" />
                </View>
                <View style={styles.formHalf}>
                  <Field label="Given name" value={parent.givenName} onChange={setP('givenName')} placeholder="Jane" />
                </View>
              </View>
              <Field label="Relationship to student" value={parent.relationship} onChange={setP('relationship')} placeholder="e.g. Mother, Father, Guardian" />
              <Field label="Address" value={parent.address} onChange={setP('address')} placeholder="Street address" />
              <Field label="Email" value={parent.email} onChange={setP('email')} placeholder="your@email.com" keyboardType="email-address" />
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Field label="Phone 1" value={parent.phone1} onChange={setP('phone1')} placeholder="04xx xxx xxx" keyboardType="phone-pad" />
                </View>
                <View style={styles.formHalf}>
                  <Field label="Phone 2" value={parent.phone2} onChange={setP('phone2')} placeholder="Optional" keyboardType="phone-pad" />
                </View>
              </View>

              <SectionDivider title="Emergency Contact Details" subtitle="If parent or guardian cannot be contacted" />

              <Field label="Name" value={parent.emergencyName} onChange={setP('emergencyName')} placeholder="Full name" />
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Field label="Relationship to child" value={parent.emergencyRelationship} onChange={setP('emergencyRelationship')} placeholder="e.g. Grandparent" />
                </View>
                <View style={styles.formHalf}>
                  <Field label="Mobile / Phone" value={parent.emergencyPhone} onChange={setP('emergencyPhone')} placeholder="04xx xxx xxx" keyboardType="phone-pad" />
                </View>
              </View>
            </>
          )}

          {/* ──────────────── STEP 2: Child ───────────────────── */}
          {step === 2 && (
            <>
              <Text style={styles.stepEyebrow}>Student personal details</Text>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.xs }]}>Who are we enrolling?</Text>
              <Text style={[type.small, { color: colors.muted, marginBottom: space.lg }]}>
                Select a child from your account, then confirm or fill in their details.
              </Text>

              <ChildPicker children={children} selected={selectedChild} onSelect={selectChild} />

              {!selectedChild && children.length === 0 && (
                <View style={styles.noChildBox}>
                  <Text style={[type.small, { color: colors.muted }]}>
                    No children found on your account.{' '}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('MyChildren')}>
                    <Text style={[type.small, { color: colors.pink, fontWeight: '600' }]}>Add a child first →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedChild && (
                <>
                  <View style={styles.formRow}>
                    <View style={styles.formHalf}>
                      <Field label="Family name" value={childDetails.familyName} onChange={setC('familyName')} placeholder="Smith" />
                    </View>
                    <View style={styles.formHalf}>
                      <Field label="Given name" required value={childDetails.givenName} onChange={setC('givenName')} placeholder="Tom" />
                    </View>
                  </View>
                  <Field label="Preferred name" value={childDetails.preferredName} onChange={setC('preferredName')} placeholder="What they like to be called" />
                  <Field label="Grade at school this year" value={childDetails.year} onChange={setC('year')} placeholder="e.g. Year 4" />
                  <Field label="School currently attending" value={childDetails.school} onChange={setC('school')} placeholder="School name" />
                  <Field label="Parents / School concern" value={childDetails.concern} onChange={setC('concern')} placeholder="Describe any learning concerns or areas you'd like us to focus on…" multiline />
                </>
              )}
            </>
          )}

          {/* ──────────────── STEP 3: Terms ───────────────────── */}
          {step === 3 && (
            <>
              <Text style={styles.stepEyebrow}>Agreements &amp; consents</Text>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.xs }]}>Almost there!</Text>
              <Text style={[type.small, { color: colors.muted, marginBottom: space.lg }]}>
                Please read and agree to the following before completing enrolment.
              </Text>

              <ReferralPicker value={referral} onChange={setReferral} />

              <View style={{ gap: space.md, marginTop: space.sm }}>
                <AgreementRow checked={agreedToTerms} onToggle={() => setAgreedToTerms(v => !v)}>
                  I have read and agree to the{' '}
                  <Text style={styles.docLink} onPress={() => openDoc('terms', 'Terms & Conditions')}>
                    Fairybread &amp; Fractions Terms &amp; Conditions
                  </Text>
                </AgreementRow>

                <AgreementRow checked={agreedToPrivacy} onToggle={() => setAgreedToPrivacy(v => !v)}>
                  I have read and agree to the{' '}
                  <Text style={styles.docLink} onPress={() => openDoc('privacy', 'Privacy Policy')}>
                    Fairybread &amp; Fractions Privacy Policy
                  </Text>
                </AgreementRow>

                <AgreementRow checked={agreedToTrampoline} onToggle={() => setAgreedToTrampoline(v => !v)}>
                  I have read and accept the{' '}
                  <Text style={styles.docLink} onPress={() => openDoc('mini_trampoline', 'Mini Trampoline Consent Form')}>
                    Mini Trampoline Consent Form
                  </Text>
                </AgreementRow>
              </View>
            </>
          )}

          {/* ──────────────── STEP 4: Signature ───────────────── */}
          {step === 4 && (
            <>
              <Text style={styles.stepEyebrow}>Signature</Text>
              <Text style={[type.h3, { color: colors.ink, marginBottom: space.xs }]}>Sign on the dotted line</Text>
              <Text style={[type.small, { color: colors.muted, marginBottom: space.xl }]}>
                Type your full name below to confirm {firstName}'s enrolment.
              </Text>

              {/* Signature field */}
              <View style={styles.signatureWrap}>
                <TextInput
                  style={styles.signatureInput}
                  value={signature}
                  onChangeText={setSignature}
                  placeholder="Type your full name"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                />
                <View style={styles.signatureLine} />
              </View>

              <Text style={styles.signatureNote}>
                By signing, you confirm you've read and agreed to the Terms &amp; Conditions, Privacy Policy and Mini Trampoline Consent Form.
              </Text>

              <View style={[styles.field, { marginTop: space.md }]}>
                <Text style={styles.fieldLabel}>Date</Text>
                <TextInput
                  style={[styles.input, styles.inputReadOnly]}
                  value={signatureDate}
                  editable={false}
                />
              </View>

              {enrolError !== '' && (
                <View style={styles.errorBox}>
                  <Text style={[type.small, { color: colors.error.fg }]}>{enrolError}</Text>
                </View>
              )}
            </>
          )}

        </View>
      </ScrollView>

      {/* ── Footer nav ─────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <Button
          label="Back"
          variant="ghost"
          onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()}
          style={{ flex: 1 }}
        />
        <Button
          label={step === 4 ? (enrol.isPending ? 'Saving…' : 'Complete enrolment') : 'Continue'}
          variant="primary"
          icon={step === 4 ? undefined : ArrowRight}
          loading={enrol.isPending}
          disabled={
            step === 2 ? !canStep2 :
            step === 3 ? !canStep3 :
            step === 4 ? !canStep4 || enrol.isPending :
            false
          }
          onPress={() => {
            if (step < 4) setStep(s => s + 1);
            else          enrol.mutate();
          }}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.paper },
  flex:   { flex: 1 },

  // header
  header: {
    paddingHorizontal: space.lg,
    paddingVertical:   space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor:   colors.paper,
  },

  // stepper
  stepper: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.line,
    alignItems:      'center',
    justifyContent:  'center',
  },
  stepDotDone: {
    backgroundColor: colors.green,
    borderColor:     colors.green,
  },
  stepDotCurrent: {
    backgroundColor: colors.pink,
    borderColor:     colors.pink,
  },
  stepNum: {
    fontSize:   10,
    fontWeight: '700',
    color:      colors.muted,
  },
  stepLabel: {
    fontSize:   9,
    fontWeight: '500',
    color:      colors.muted,
    letterSpacing: 0.3,
  },
  stepLine: {
    flex:            1,
    height:          1.5,
    backgroundColor: colors.line,
    marginBottom:    12, // align with dot centre
  },
  stepLineDone: {
    backgroundColor: colors.green,
  },

  // scroll content
  content: {
    paddingHorizontal: space.lg,
    paddingTop:        space.lg,
  },

  // card
  card: {
    backgroundColor: colors.card,
    borderRadius:    radius.card,
    padding:         space.lg,
    borderWidth:     1,
    borderColor:     colors.line,
  },

  // step eyebrow
  stepEyebrow: {
    fontSize:      10,
    fontWeight:    '700',
    color:         colors.pink,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:  space.xs,
  },

  // form layout
  formRow: {
    flexDirection: 'row',
    gap:           space.md,
  },
  formHalf: { flex: 1 },

  // field
  field: {
    marginBottom: space.md,
  },
  fieldLabel: {
    fontSize:     12,
    fontWeight:   '600',
    color:        colors.ink,
    marginBottom: 5,
  },
  fieldHint: {
    fontSize:     11,
    color:        colors.muted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    paddingHorizontal: space.md,
    paddingVertical:   Platform.OS === 'ios' ? 11 : space.sm,
    fontSize:        15,
    color:           colors.ink,
    borderWidth:     1,
    borderColor:     colors.line,
    minHeight:       44,
  },
  inputMulti: {
    minHeight:         88,
    paddingTop:        space.md,
    textAlignVertical: 'top',
  },
  inputReadOnly: {
    backgroundColor: colors.paper,
    color:           colors.muted,
  },

  // section divider
  sectionDiv: {
    borderTopWidth:    1,
    borderTopColor:    colors.line,
    marginVertical:    space.lg,
    paddingTop:        space.md,
  },
  sectionDivTitle: {
    fontSize:      12,
    fontWeight:    '700',
    color:         colors.ink,
    marginBottom:  2,
  },
  sectionDivSub: {
    fontSize:  11,
    color:     colors.muted,
  },

  // agreement row
  agreementRow: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    padding:         space.md,
    borderWidth:     1,
    borderColor:     colors.line,
    gap:             space.md,
  },
  agreementRowChecked: {
    backgroundColor: colors.tealSoft,
    borderColor:     colors.teal,
  },
  checkCircle: {
    width:           22,
    height:          22,
    borderRadius:    11,
    borderWidth:     1.5,
    borderColor:     colors.line,
    backgroundColor: colors.card,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
    marginTop:       1,
  },
  checkCircleChecked: {
    backgroundColor: colors.teal,
    borderColor:     colors.teal,
  },
  agreementText: {
    flex:       1,
    fontSize:   13,
    color:      colors.muted,
    lineHeight: 19,
  },
  docLink: {
    color:      colors.teal,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // picker
  picker: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    backgroundColor:   colors.surface,
    borderRadius:      radius.md,
    paddingHorizontal: space.md,
    paddingVertical:   Platform.OS === 'ios' ? 11 : space.sm,
    borderWidth:       1,
    borderColor:       colors.line,
    minHeight:         44,
  },
  pickerText: {
    fontSize: 15,
    color:    colors.ink,
  },
  pickerDropdown: {
    backgroundColor: colors.card,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.line,
    marginTop:       4,
    overflow:        'hidden',
  },
  pickerOption: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: space.md,
    paddingVertical:   space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pickerOptionSelected: {
    backgroundColor: colors.tealSoft,
  },
  noChildBox: {
    flexDirection:   'row',
    flexWrap:        'wrap',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    padding:         space.md,
    marginBottom:    space.md,
  },

  // signature
  signatureWrap: {
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.line,
    paddingHorizontal: space.md,
    paddingTop:      space.md,
    paddingBottom:   4,
    marginBottom:    space.sm,
  },
  signatureInput: {
    fontSize:   22,
    fontStyle:  'italic',
    color:      colors.ink,
    minHeight:  52,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    paddingVertical: space.sm,
  },
  signatureLine: {
    height:          1,
    backgroundColor: colors.muted,
    marginHorizontal: space.sm,
    marginBottom:    space.sm,
    opacity:         0.4,
  },
  signatureNote: {
    fontSize:   12,
    color:      colors.muted,
    lineHeight: 17,
    marginBottom: space.md,
  },

  // error
  errorBox: {
    backgroundColor: colors.error.bg,
    borderRadius:    radius.md,
    padding:         space.md,
    marginTop:       space.sm,
    borderWidth:     1,
    borderColor:     colors.error.border,
  },

  // footer
  footer: {
    flexDirection:    'row',
    gap:              space.md,
    paddingHorizontal: space.lg,
    paddingTop:       space.md,
    borderTopWidth:   1,
    borderTopColor:   colors.line,
    backgroundColor:  colors.card,
  },

  // complete screen
  completeIcon: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: colors.green,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    space.xl,
    ...Platform.select({
      ios:     { shadowColor: colors.green, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 6 },
    }),
  },
});
