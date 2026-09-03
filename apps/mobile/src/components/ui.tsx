import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { BRAND } from "@pathwise/shared/brand";
import { useI18n } from "../context/I18nContext";
import { radius, tap } from "../lib/theme";

export function TenWordmark({ size = 28 }: { size?: number }) {
  const { palette } = useI18n();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline" }}>
      <Text style={{ fontSize: size, fontWeight: "800", color: palette.mark, letterSpacing: -0.6 }}>
        {BRAND.brandMark}
      </Text>
      <Text style={{ fontSize: size, fontWeight: "800", color: palette.markDot }}>.</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { palette, highContrast } = useI18n();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          shadowOpacity: highContrast ? 0 : 0.08,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  const { palette } = useI18n();
  return (
    <Text style={[styles.kicker, { color: palette.primary }]}>{children}</Text>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const { palette } = useI18n();
  return <Text style={[styles.title, { color: palette.ink }]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { palette } = useI18n();
  return <Text style={[styles.body, { color: palette.muted }, style]}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const { palette } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: palette.primary, opacity: disabled || busy ? 0.55 : pressed ? 0.88 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={palette.primaryFg} />
      ) : (
        <Text style={[styles.primaryBtnText, { color: palette.primaryFg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { palette } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryBtn,
        { borderColor: palette.border, backgroundColor: palette.surface, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.secondaryBtnText, { color: palette.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "numeric";
  multiline?: boolean;
}) {
  const { palette } = useI18n();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: palette.ink }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          { color: palette.ink, borderColor: palette.border, backgroundColor: palette.surface },
          multiline ? { minHeight: 80, paddingTop: 10 } : undefined,
        ]}
      />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  color?: string;
}) {
  const { palette } = useI18n();
  const accent = color ?? palette.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? accent : palette.accentSoft,
          borderColor: selected ? accent : palette.border,
        },
      ]}
    >
      <Text style={{ color: selected ? palette.primaryFg : palette.ink, fontWeight: "700", fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  const { palette } = useI18n();
  return (
    <View style={[styles.stat, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: palette.primary }}>{value}</Text>
      <Text style={{ fontSize: 12, color: palette.muted, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  const { palette } = useI18n();
  if (!message) return null;
  return <Text style={{ color: palette.danger, fontSize: 14, fontWeight: "600" }}>{message}</Text>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#0F172A",
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
    gap: 10,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  primaryBtn: {
    minHeight: tap,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    minHeight: tap,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  input: {
    minHeight: tap,
    borderRadius: radius.input,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  chip: {
    minHeight: tap,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stat: {
    flex: 1,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 2,
  },
});
