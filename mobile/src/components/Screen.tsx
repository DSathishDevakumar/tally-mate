import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { colors } from "../theme/theme";

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

/** Consistent page background + optional scroll/keyboard handling for form screens. */
export function Screen({ children, scroll = false, padded = true, style, contentContainerStyle }: Readonly<ScreenProps>) {
  if (scroll) {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={[styles.flex, { backgroundColor: colors.background }, style]}
          contentContainerStyle={[padded && styles.padded, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return <View style={[styles.flex, { backgroundColor: colors.background }, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: 20 },
});
