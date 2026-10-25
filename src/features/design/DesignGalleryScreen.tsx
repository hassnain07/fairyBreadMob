import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  Button,
  Card,
  Pill,
  Avatar,
  Progress,
  Input,
  Toggle,
  Checkbox,
  StatCard,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import {
  Calendar,
  Users,
  BarChart3,
  CircleDollarSign,
  Package,
  TrendingUp,
  AlertCircle,
} from 'lucide-react-native';
import { colors, type, space, radius } from '@/theme';
import { formatMoney } from '@/lib/utils/money';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={[type.h3, { color: colors.ink, marginBottom: space.md }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function DesignGalleryScreen({ onClose }: { onClose: () => void }) {
  const [toggleValue, setToggleValue] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [progressValue, setProgressValue] = useState(0.65);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[type.display, { color: colors.ink, marginBottom: space.md }]}>
          🎨 Design Gallery
        </Text>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.lg }]}>
          All components in multiple states
        </Text>
        <Pressable
          onPress={onClose}
          style={[
            styles.closeButton,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text style={[type.button, { color: colors.ink }]}>← Back</Text>
        </Pressable>
      </View>

      {/* Buttons */}
      <Section title="Buttons">
        <View style={styles.flexRow}>
          <Button label="Primary" variant="primary" style={styles.flex1} />
          <Button label="Secondary" variant="secondary" style={styles.flex1} />
        </View>
        <View style={[styles.flexRow, { marginTop: space.md }]}>
          <Button label="Soft" variant="soft" style={styles.flex1} />
          <Button label="Ghost" variant="ghost" style={styles.flex1} />
        </View>
        <Button
          label="Danger"
          variant="danger"
          onPress={() => {}}
          style={{ marginTop: space.md }}
        />
        <Button
          label="Loading"
          loading
          variant="primary"
          onPress={() => {}}
          style={{ marginTop: space.md }}
        />
        <Button
          label="Disabled"
          disabled
          variant="primary"
          onPress={() => {}}
          style={{ marginTop: space.md }}
        />
        <Button
          label="With Icon"
          icon={Calendar}
          variant="primary"
          onPress={() => {}}
          style={{ marginTop: space.md }}
        />
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <Card>
          <Text style={[type.h3, { color: colors.ink, marginBottom: space.sm }]}>
            Default Card
          </Text>
          <Text style={[type.body, { color: colors.muted }]}>
            White card with border and shadow
          </Text>
        </Card>
        <Card accent="pink" style={{ marginTop: space.md }}>
          <Text style={[type.h3, { color: colors.ink, marginBottom: space.sm }]}>
            Pink Accent
          </Text>
          <Text style={[type.body, { color: colors.muted }]}>
            Card with left border accent
          </Text>
        </Card>
        <Card accent="teal" onPress={() => {}} style={{ marginTop: space.md }}>
          <Text style={[type.h3, { color: colors.ink, marginBottom: space.sm }]}>
            Pressable Card
          </Text>
          <Text style={[type.body, { color: colors.muted }]}>
            Tap me for feedback
          </Text>
        </Card>
      </Section>

      {/* Pills */}
      <Section title="Pills / Badges">
        <View style={styles.pillRow}>
          <Pill label="Success" variant="success" />
          <Pill label="Pending" variant="pending" />
          <Pill label="Danger" variant="danger" />
        </View>
        <View style={[styles.pillRow, { marginTop: space.md }]}>
          <Pill label="Info" variant="info" />
          <Pill label="Neutral" variant="neutral" />
        </View>
        <View style={[styles.pillRow, { marginTop: space.md }]}>
          <Pill label="✓ Success" icon={TrendingUp} variant="success" />
          <Pill label="Pending 🕒" variant="pending" />
        </View>
      </Section>

      {/* Avatars */}
      <Section title="Avatars">
        <View style={styles.flexRow}>
          {(['pink', 'teal', 'yellow', 'orange', 'green', 'magenta'] as const).map((acc) => (
            <View key={acc} style={{ alignItems: 'center', gap: space.sm }}>
              <Avatar initials="JT" accent={acc} size={44} />
              <Text style={[type.caption, { color: colors.muted }]}>{acc}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.flexRow, { marginTop: space.xl }]}>
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <Avatar initials="AB" accent="pink" size={32} />
            <Text style={[type.caption, { color: colors.muted }]}>32</Text>
          </View>
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <Avatar initials="CD" accent="teal" size={56} />
            <Text style={[type.caption, { color: colors.muted }]}>56</Text>
          </View>
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <Avatar initials="EF" accent="orange" size={64} />
            <Text style={[type.caption, { color: colors.muted }]}>64</Text>
          </View>
        </View>
        <View style={[styles.flexRow, { marginTop: space.xl }]}>
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <Avatar initials="GH" accent="yellow" variant="round" size={44} />
            <Text style={[type.caption, { color: colors.muted }]}>round</Text>
          </View>
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <Avatar initials="IJ" accent="magenta" variant="square" size={44} />
            <Text style={[type.caption, { color: colors.muted }]}>square</Text>
          </View>
        </View>
      </Section>

      {/* Progress */}
      <Section title="Progress Bars">
        <View style={styles.progressStack}>
          <View style={styles.progressRow}>
            <Text style={[type.caption, { color: colors.mutedSoft, width: 50 }]}>
              25%
            </Text>
            <View style={styles.flex1}>
              <Progress value={0.25} color={colors.pink} />
            </View>
          </View>
          <View style={[styles.progressRow, { marginTop: space.md }]}>
            <Text style={[type.caption, { color: colors.mutedSoft, width: 50 }]}>
              65%
            </Text>
            <View style={styles.flex1}>
              <Progress value={progressValue} color={colors.teal} />
            </View>
          </View>
          <View style={[styles.progressRow, { marginTop: space.md }]}>
            <Text style={[type.caption, { color: colors.mutedSoft, width: 50 }]}>
              100%
            </Text>
            <View style={styles.flex1}>
              <Progress value={1} color={colors.green} />
            </View>
          </View>
        </View>
      </Section>

      {/* Inputs */}
      <Section title="Inputs">
        <Input
          label="Email Address"
          placeholder="your@email.com"
          value={inputValue}
          onChangeText={setInputValue}
          testID="email-input"
        />
        <Input
          label="Password"
          variant="password"
          placeholder="••••••••"
          containerStyle={{ marginTop: space.lg }}
        />
        <Input
          label="Error State"
          placeholder="This has an error"
          error="This field is required"
          containerStyle={{ marginTop: space.lg }}
        />
        <Input
          label="Helper Text"
          placeholder="With helper text"
          helperText="This is a helpful hint"
          containerStyle={{ marginTop: space.lg }}
        />
      </Section>

      {/* Toggle */}
      <Section title="Toggles">
        <View style={styles.row}>
          <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
            Enable notifications
          </Text>
          <Toggle
            value={toggleValue}
            onValueChange={setToggleValue}
          />
        </View>
        <View style={[styles.row, { marginTop: space.lg }]}>
          <Text style={[type.body, { color: colors.muted }]}>
            Disabled toggle
          </Text>
          <Toggle value={false} disabled />
        </View>
      </Section>

      {/* Checkbox */}
      <Section title="Checkboxes">
        <View style={styles.row}>
          <Checkbox
            checked={checkboxValue}
            onToggle={setCheckboxValue}
          />
          <Text style={[type.body, { color: colors.ink, flex: 1 }]}>
            I agree to the terms and conditions
          </Text>
        </View>
        <View style={[styles.row, { marginTop: space.lg }]}>
          <Checkbox checked={true} disabled />
          <Text style={[type.body, { color: colors.muted, flex: 1 }]}>
            Disabled (checked)
          </Text>
        </View>
      </Section>

      {/* Stat Cards */}
      <Section title="Stat Cards">
        <View style={styles.statGrid}>
          <StatCard
            icon={Users}
            label="Active Students"
            value="24"
            accent="pink"
          />
          <StatCard
            icon={Calendar}
            label="Classes Today"
            value="5"
            accent="teal"
          />
        </View>
        <View style={[styles.statGrid, { marginTop: space.md }]}>
          <StatCard
            icon={CircleDollarSign}
            label="Revenue (this month)"
            value={formatMoney(125000)}
            accent="yellow"
          />
          <StatCard
            icon={Package}
            label="Orders"
            value="18"
            accent="orange"
          />
        </View>
      </Section>

      {/* Empty State */}
      <Section title="Empty States">
        <EmptyState
          icon={AlertCircle}
          title="No data found"
          description="Try adjusting your filters"
          actionLabel="Reset Filters"
          onAction={() => {}}
          accentColor={colors.teal}
        />
      </Section>

      {/* Skeletons */}
      <Section title="Skeletons">
        <Skeleton width="100%" height={20} />
        <Skeleton width="80%" height={20} style={{ marginTop: space.md }} />
        <View style={[styles.flexRow, { marginTop: space.lg }]}>
          <Skeleton width={44} height={44} borderRadius={22} />
          <View style={{ flex: 1, marginLeft: space.md }}>
            <Skeleton width="100%" height={16} />
            <Skeleton width="70%" height={16} style={{ marginTop: space.sm }} />
          </View>
        </View>
      </Section>

      {/* Typography Showcase */}
      <Section title="Typography">
        <Text style={[type.display, { color: colors.ink }]}>
          Display (40px)
        </Text>
        <Text style={[type.h1, { color: colors.ink, marginTop: space.lg }]}>
          H1 Heading (28px)
        </Text>
        <Text style={[type.h2, { color: colors.ink, marginTop: space.md }]}>
          H2 Heading (22px)
        </Text>
        <Text style={[type.h3, { color: colors.ink, marginTop: space.md }]}>
          H3 Heading (17px)
        </Text>
        <Text style={[type.body, { color: colors.ink, marginTop: space.md }]}>
          Body text (15px) — The quick brown fox jumps over the lazy dog.
        </Text>
        <Text style={[type.small, { color: colors.muted, marginTop: space.md }]}>
          Small text (13px) — Secondary or supporting information.
        </Text>
        <Text style={[type.caption, { color: colors.mutedSoft, marginTop: space.md }]}>
          CAPTION TEXT (12px) — LABELS AND EYEBROWS
        </Text>
      </Section>

      {/* Colors Showcase */}
      <Section title="Colors">
        <View style={styles.colorGrid}>
          {Object.entries(colors).map(([name, value]) => {
            if (typeof value !== 'string') return null;
            return (
              <View key={name} style={{ alignItems: 'center', marginBottom: space.lg }}>
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: radius.md,
                    backgroundColor: value,
                    borderWidth: value === '#FFFDF9' ? 1 : 0,
                    borderColor: colors.line,
                    marginBottom: space.sm,
                  }}
                />
                <Text style={[type.caption, { color: colors.muted, textAlign: 'center' }]}>
                  {name}
                </Text>
                <Text style={[type.small, { color: colors.mutedSoft, textAlign: 'center', fontSize: 10 }]}>
                  {value}
                </Text>
              </View>
            );
          })}
        </View>
      </Section>

      {/* Spacing Guide */}
      <Section title="Spacing">
        <View>
          {Object.entries(space).map(([name, value]) => (
            <View key={name} style={[styles.row, { marginBottom: space.md }]}>
              <Text style={[type.caption, { color: colors.mutedSoft, width: 60 }]}>
                {name} ({value}px)
              </Text>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    height: 20,
                    backgroundColor: colors.pink,
                    width: value * 2,
                    borderRadius: radius.sm,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </Section>

      <View style={{ height: space.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  contentContainer: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
  },
  header: {
    marginBottom: space.xxl,
  },
  closeButton: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  section: {
    marginBottom: space.xxl,
  },
  flexRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  pillRow: {
    flexDirection: 'row',
    gap: space.md,
    flexWrap: 'wrap',
  },
  progressStack: {
    gap: space.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  statGrid: {
    flexDirection: 'row',
    gap: space.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
