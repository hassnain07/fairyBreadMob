import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Calendar } from 'lucide-react-native';
import { colors, type, space, radius, shadow } from '@/theme';
import { useAuth } from '@/app/_providers';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { ProofPicker, type ProofFile } from '@/components/ui/ProofPicker';
import { dataClient } from '@/lib/data/client';

const STEPS = ['Child', 'Date', 'Time', 'Summary', 'Payment', 'Upload', 'Done'];

export function BookAssessmentPage({ navigation }: any) {
  const { familyId } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer'>('cod');
  const [proofFile, setProofFile] = useState<ProofFile | undefined>();
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['children', familyId],
    queryFn: () => dataClient.getChildren?.(familyId || '') || Promise.resolve([]),
    enabled: !!familyId,
  });

  const enrolledChildren = children.filter(c => c.enrolled);
  const selectedChild = children.find(c => c.id === selectedChildId);

  const createAssessmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChildId || !selectedDate || !selectedTime) {
        throw new Error('Missing required fields');
      }
      const result = await dataClient.createTeacherAssessments?.([
        { childId: selectedChildId, date: selectedDate, time: selectedTime }
      ]);
      return result?.[0];
    },
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigation.goBack();
      }, 2500);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to book assessment');
    },
  });

  const handleNext = () => {
    if (step === 0 && !selectedChildId) {
      Alert.alert('Select child', 'Please select a child to assess');
      return;
    }
    if (step === 1 && !selectedDate) {
      Alert.alert('Select date', 'Please select an assessment date');
      return;
    }
    if (step === 2 && !selectedTime) {
      Alert.alert('Select time', 'Please select an assessment time');
      return;
    }
    if (step === 5 && paymentMethod === 'bank_transfer' && !proofFile) {
      Alert.alert('Upload proof', 'Please upload proof of bank transfer');
      return;
    }
    if (step === 6) {
      createAssessmentMutation.mutate();
    } else {
      setStep(Math.min(step + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const timeSlots = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // 7 days ahead
    return d;
  };

  const isStepValid = () => {
    switch (step) {
      case 0: return !!selectedChildId;
      case 1: return !!selectedDate;
      case 2: return !!selectedTime;
      case 5: return paymentMethod === 'cod' || !!proofFile;
      default: return true;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.contentPadding}
        scrollEnabled={step !== 5}
      >
        <StepIndicator steps={STEPS} currentStep={step} />

        <Text style={[type.h1, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>
          {STEPS[step]}
        </Text>

        {/* Step 0: Child */}
        {step === 0 && (
          <View>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              Select which child to assess:
            </Text>
            {childrenLoading ? (
              <Skeleton height={60} borderRadius={radius.card} />
            ) : enrolledChildren.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={[type.small, { color: colors.muted, textAlign: 'center' }]}>
                  No enrolled children. Complete enrolment first.
                </Text>
              </View>
            ) : (
              <View style={{ gap: space.md }}>
                {enrolledChildren.map(child => (
                  <TouchableOpacity
                    key={child.id}
                    style={[
                      styles.optionCard,
                      selectedChildId === child.id && styles.optionCardActive,
                    ]}
                    onPress={() => setSelectedChildId(child.id)}
                  >
                    <View>
                      <Text style={[type.h3, { color: selectedChildId === child.id ? '#fff' : colors.ink }]}>
                        {child.givenName} {child.familyName}
                      </Text>
                      <Text style={[type.small, { color: selectedChildId === child.id ? 'rgba(255,255,255,0.8)' : colors.muted, marginTop: space.xs }]}>
                        Enrolled
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Step 1: Date */}
        {step === 1 && (
          <View>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              Choose a date for {selectedChild?.givenName}'s assessment (at least 7 days away):
            </Text>
            <TouchableOpacity style={[styles.dateInput, shadow.card as object]}>
              <Calendar size={20} color={colors.pink} />
              <Text style={[type.h3, { color: colors.ink, marginLeft: space.md, flex: 1 }]}>
                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-AU', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Tap to select date'}
              </Text>
            </TouchableOpacity>
            <Text style={[type.caption, { color: colors.muted, marginTop: space.md }]}>
              Min date: {getMinDate().toLocaleDateString('en-AU')}
            </Text>
          </View>
        )}

        {/* Step 2: Time */}
        {step === 2 && (
          <View>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              Select a time for the assessment on {new Date(selectedDate).toLocaleDateString('en-AU', { weekday: 'long' })}:
            </Text>
            <View style={{ gap: space.md }}>
              {timeSlots.map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.timeSlot,
                    selectedTime === slot && styles.timeSlotActive,
                  ]}
                  onPress={() => setSelectedTime(slot)}
                >
                  <Text style={[type.h3, { color: selectedTime === slot ? '#fff' : colors.ink }]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <View style={[styles.summaryCard, shadow.card as object]}>
            <View style={styles.summaryRow}>
              <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase' }]}>
                Child
              </Text>
              <Text style={[type.h3, { color: colors.ink, marginTop: space.xs }]}>
                {selectedChild?.givenName} {selectedChild?.familyName}
              </Text>
            </View>

            <View style={[styles.summaryRow, { marginTop: space.lg, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.lg }]}>
              <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase' }]}>
                Date & Time
              </Text>
              <Text style={[type.h3, { color: colors.ink, marginTop: space.xs }]}>
                {new Date(selectedDate).toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: 'short' })}
              </Text>
              <Text style={[type.h3, { color: colors.pink, marginTop: space.xs }]}>
                {selectedTime}
              </Text>
            </View>

            <View style={[styles.summaryRow, { marginTop: space.lg, paddingTopWidth: 1, paddingTopColor: colors.line, paddingTop: space.lg }]}>
              <Text style={[type.caption, { color: colors.muted, textTransform: 'uppercase' }]}>
                Type
              </Text>
              <Text style={[type.h3, { color: colors.ink, marginTop: space.xs }]}>
                Initial Assessment
              </Text>
            </View>
          </View>
        )}

        {/* Step 4: Payment Method */}
        {step === 4 && (
          <View>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              Assessment fee: <Text style={[type.h2, { color: colors.pink }]}>$50</Text>
            </Text>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              How would you like to pay?
            </Text>
            <View style={{ gap: space.md }}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'cod' && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod('cod')}
              >
                <Text style={[type.h3, { color: paymentMethod === 'cod' ? '#fff' : colors.ink }]}>
                  💵 Cash on Delivery
                </Text>
                <Text style={[type.small, { color: paymentMethod === 'cod' ? 'rgba(255,255,255,0.8)' : colors.muted, marginTop: space.xs }]}>
                  Pay when your child is assessed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'bank_transfer' && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod('bank_transfer')}
              >
                <Text style={[type.h3, { color: paymentMethod === 'bank_transfer' ? '#fff' : colors.ink }]}>
                  🏦 Bank Transfer
                </Text>
                <Text style={[type.small, { color: paymentMethod === 'bank_transfer' ? 'rgba(255,255,255,0.8)' : colors.muted, marginTop: space.xs }]}>
                  Upload proof after transfer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 5: Upload Proof (if bank transfer) */}
        {step === 5 && (
          <View>
            {paymentMethod === 'bank_transfer' ? (
              <View>
                <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
                  Upload proof of your bank transfer:
                </Text>
                <ProofPicker value={proofFile} onChange={setProofFile} />
                {proofFile && (
                  <View style={[styles.proofBox, { marginTop: space.lg }]}>
                    <Text style={[type.small, { color: colors.ink }]}>
                      ✓ {proofFile.name}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
                  No proof needed. You'll pay cash when the assessment happens.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <View style={[styles.reviewCard, shadow.card as object]}>
            <Text style={[type.h3, { color: colors.ink, marginBottom: space.lg }]}>
              Ready to book?
            </Text>
            <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
              {selectedChild?.givenName}'s initial assessment is scheduled for {new Date(selectedDate).toLocaleDateString('en-AU')} at {selectedTime}.
            </Text>
            {paymentMethod === 'bank_transfer' && (
              <Text style={[type.small, { color: colors.muted }]}>
                Proof of payment uploaded: {proofFile?.name}
              </Text>
            )}
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
          label={step === STEPS.length - 1 ? 'Book assessment' : 'Next →'}
          onPress={handleNext}
          disabled={!isStepValid() || createAssessmentMutation.isPending}
        />
      </View>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successBox}>
            <Text style={[type.h2, { color: colors.ink, textAlign: 'center', marginBottom: space.lg }]}>
              ✓ Assessment Booked!
            </Text>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>
              {selectedChild?.givenName}'s assessment is confirmed. You'll receive updates via email.
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
  scroll: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 2,
    borderColor: colors.line,
  },
  optionCardActive: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  timeSlot: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
  },
  timeSlotActive: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  paymentOption: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 2,
    borderColor: colors.line,
  },
  paymentOptionActive: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  dateInput: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  summaryRow: {
    marginBottom: space.md,
  },
  reviewCard: {
    backgroundColor: '#EAF8F6',
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  proofBox: {
    backgroundColor: '#EDF9EF',
    borderRadius: radius.card,
    padding: space.lg,
    borderWidth: 1,
    borderColor: '#C9EBCE',
  },
  emptyBox: {
    paddingVertical: space.xl,
    alignItems: 'center',
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
