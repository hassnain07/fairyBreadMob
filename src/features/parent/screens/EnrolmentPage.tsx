import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { dataClient } from '@/lib/data/client';

const STEPS = ['Parent Info', 'Child Info', 'Agreements', 'Signature', 'Complete'];

export function EnrolmentPage({ route }: any) {
  const { childId } = route.params || {};
  const { familyId } = useAuth();
  const [step, setStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Parent info
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  // Child info
  const [childName, setChildName] = useState('');
  const [dob, setDob] = useState('');
  const [childPhone, setChildPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Agreements
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedMediaConsent, setAgreedMediaConsent] = useState(false);

  // Signature
  const [signature, setSignature] = useState<{ x: number; y: number }[] | null>(null);

  const { data: child, isLoading: childLoading } = useQuery({
    queryKey: ['child', childId],
    queryFn: () => childId ? dataClient.getChildren?.(familyId || '').then(children => children.find(c => c.id === childId)) : Promise.resolve(null),
    enabled: !!childId && !!familyId,
  });

  const { data: documents = {} } = useQuery({
    queryKey: ['documents'],
    queryFn: () => dataClient.getDocuments?.() || Promise.resolve({}),
  });

  const completeEnrolmentMutation = useMutation({
    mutationFn: async () => {
      if (!childId) throw new Error('No child selected');
      const result = await dataClient.completeEnrolment?.(childId, {
        parent_name: parentName,
        parent_phone: parentPhone,
        parent_email: parentEmail,
        child_name: childName,
        dob,
        child_phone: childPhone,
        medical_notes: medicalNotes,
        signature_data: signature,
      } as any);
      return result;
    },
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // Navigate back or to parent dashboard
      }, 2500);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to complete enrolment');
    },
  });

  const handleNext = () => {
    if (step === 0) {
      if (!parentName.trim() || !parentEmail.trim()) {
        Alert.alert('Missing info', 'Parent name and email are required');
        return;
      }
    }
    if (step === 1) {
      if (!childName.trim() || !dob.trim()) {
        Alert.alert('Missing info', 'Child name and date of birth are required');
        return;
      }
    }
    if (step === 2) {
      if (!agreedTerms || !agreedPrivacy || !agreedMediaConsent) {
        Alert.alert('Accept agreements', 'You must agree to all terms to continue');
        return;
      }
    }
    if (step === 3) {
      if (!signature || signature.length === 0) {
        Alert.alert('Sign here', 'Please provide your signature');
        return;
      }
    }
    if (step === 4) {
      completeEnrolmentMutation.mutate();
      return;
    }
    setStep(Math.min(step + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const isStepValid = () => {
    switch (step) {
      case 0: return !!parentName && !!parentEmail;
      case 1: return !!childName && !!dob;
      case 2: return agreedTerms && agreedPrivacy && agreedMediaConsent;
      case 3: return signature && signature.length > 0;
      default: return true;
    }
  };

  if (childLoading) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.contentPadding}>
          <Skeleton height={40} borderRadius={radius.card} />
          <Skeleton height={60} borderRadius={radius.card} style={{ marginTop: space.lg }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentPadding}>
        <StepIndicator steps={STEPS} currentStep={step} />

        <Text style={[type.h1, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>
          {STEPS[step]}
        </Text>

        {/* Step 0: Parent Info */}
        {step === 0 && (
          <View>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              Tell us about the parent/guardian:
            </Text>

            <View style={styles.formGroup}>
              <Text style={[type.small, { color: colors.ink, marginBottom: space.sm }]}>
                Full Name *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Jane Smith"
                value={parentName}
                onChangeText={setParentName}
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[type.small, { color: colors.ink, marginBottom: space.sm }]}>
                Email *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="jane@example.com"
                value={parentEmail}
                onChangeText={setParentEmail}
                keyboardType="email-address"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[type.small, { color: colors.ink, marginBottom: space.sm }]}>
                Phone (optional)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="+61 2 9555 0123"
                value={parentPhone}
                onChangeText={setParentPhone}
                keyboardType="phone-pad"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>
        )}

        {/* Step 1: Child Info */}
        {step === 1 && (
          <View>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              Update {child?.givenName}'s information:
            </Text>

            <View style={styles.formGroup}>
              <Text style={[type.small, { color: colors.ink, marginBottom: space.sm }]}>
                Full Name *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Tom Smith"
                value={childName}
                onChangeText={setChildName}
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[type.small, { color: colors.ink, marginBottom: space.sm }]}>
                Date of Birth (YYYY-MM-DD) *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="2015-06-15"
                value={dob}
                onChangeText={setDob}
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[type.small, { color: colors.ink, marginBottom: space.sm }]}>
                Phone (optional)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="+61 2 9555 0123"
                value={childPhone}
                onChangeText={setChildPhone}
                keyboardType="phone-pad"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[type.small, { color: colors.ink, marginBottom: space.sm }]}>
                Medical or Learning Notes (optional)
              </Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Any allergies, disabilities, or learning considerations..."
                value={medicalNotes}
                onChangeText={setMedicalNotes}
                multiline
                numberOfLines={4}
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>
        )}

        {/* Step 2: Agreements */}
        {step === 2 && (
          <View>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              Please read and agree to our terms:
            </Text>

            {/* Terms of Service */}
            <TouchableOpacity
              style={[styles.agreementBox, agreedTerms && styles.agreementBoxChecked]}
              onPress={() => setAgreedTerms(!agreedTerms)}
            >
              <View style={styles.checkbox}>
                {agreedTerms && <CheckCircle size={20} color={colors.pink} />}
              </View>
              <View style={{ flex: 1, marginLeft: space.md }}>
                <Text style={[type.h3, { color: colors.ink }]}>
                  Terms of Service *
                </Text>
                <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                  I agree to the terms and conditions of the Fairybread tutoring program.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Privacy Policy */}
            <TouchableOpacity
              style={[styles.agreementBox, agreedPrivacy && styles.agreementBoxChecked]}
              onPress={() => setAgreedPrivacy(!agreedPrivacy)}
            >
              <View style={styles.checkbox}>
                {agreedPrivacy && <CheckCircle size={20} color={colors.pink} />}
              </View>
              <View style={{ flex: 1, marginLeft: space.md }}>
                <Text style={[type.h3, { color: colors.ink }]}>
                  Privacy Policy *
                </Text>
                <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                  I agree to the collection and use of personal information as described.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Media Consent */}
            <TouchableOpacity
              style={[styles.agreementBox, agreedMediaConsent && styles.agreementBoxChecked]}
              onPress={() => setAgreedMediaConsent(!agreedMediaConsent)}
            >
              <View style={styles.checkbox}>
                {agreedMediaConsent && <CheckCircle size={20} color={colors.pink} />}
              </View>
              <View style={{ flex: 1, marginLeft: space.md }}>
                <Text style={[type.h3, { color: colors.ink }]}>
                  Media & Photography Consent *
                </Text>
                <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>
                  I consent to photos and videos for educational purposes only.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Signature */}
        {step === 3 && (
          <View>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              Provide your digital signature:
            </Text>
            <View style={[styles.signatureBox, shadow.card as object]}>
              <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginBottom: space.lg }]}>
                Signature placeholder (implement with react-native-signature-canvas)
              </Text>
              <View style={styles.signaturePlaceholder}>
                <Text style={[type.h3, { color: colors.muted }]}>
                  ___________________________________
                </Text>
              </View>
            </View>
            <Button
              variant="outlined"
              onPress={() => setSignature([{ x: 0, y: 0 }])}
              style={{ marginTop: space.lg }}
            >
              Draw signature
            </Button>
          </View>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <View style={[styles.reviewCard, shadow.card as object]}>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
              Ready to enrol?
            </Text>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              {childName} will be enrolled as soon as you complete this form. An admin will review and confirm shortly.
            </Text>

            <View style={{ gap: space.md }}>
              <View style={styles.summaryItem}>
                <Text style={[type.caption, { color: colors.muted }]}>Parent</Text>
                <Text style={[type.h3, { color: colors.ink }]}>{parentName}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[type.caption, { color: colors.muted }]}>Child</Text>
                <Text style={[type.h3, { color: colors.ink }]}>{childName}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[type.caption, { color: colors.muted }]}>DOB</Text>
                <Text style={[type.h3, { color: colors.ink }]}>{dob}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          variant="secondary"
          label="Back"
          onPress={handleBack}
          disabled={step === 0}
        />
        <Button
          label={step === STEPS.length - 1 ? 'Complete' : 'Next →'}
          onPress={handleNext}
          disabled={!isStepValid() || completeEnrolmentMutation.isPending}
        />
      </View>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successBox}>
            <Text style={[type.h2, { color: colors.ink, textAlign: 'center', marginBottom: space.lg }]}>
              ✓ Enrolment Complete!
            </Text>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
              {childName} is now enrolled. An admin will review and confirm within 24 hours.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  contentPadding: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  formGroup: {
    marginBottom: space.lg,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    fontSize: 16,
    color: colors.ink,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  agreementBox: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'flex-start',
  },
  agreementBoxChecked: {
    backgroundColor: '#EAF8F6',
    borderColor: colors.teal,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureBox: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signaturePlaceholder: {
    alignItems: 'center',
  },
  reviewCard: {
    backgroundColor: '#EAF8F6',
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  summaryItem: {
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  footer: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBox: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.xl,
    alignItems: 'center',
    marginHorizontal: space.lg,
  },
});
