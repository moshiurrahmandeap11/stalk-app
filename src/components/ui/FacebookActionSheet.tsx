import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export interface ActionSheetItem {
  id: string;
  label: string;
  subLabel?: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  destructive?: boolean;
  onPress: () => void;
}

export interface FacebookActionSheetProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  actions: ActionSheetItem[];
  onClose: () => void;
  cancelLabel?: string;
}

export const FacebookActionSheet: React.FC<FacebookActionSheetProps> = ({
  visible,
  title,
  subtitle,
  actions,
  onClose,
  cancelLabel = "Cancel",
}) => {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.sheetContainer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              {/* Drag Handle Indicator */}
              <View style={styles.handleWrapper}>
                <View style={styles.handle} />
              </View>

              {/* Title & Subtitle Header */}
              {(title || subtitle) && (
                <View style={styles.header}>
                  {title && <Text style={styles.title}>{title}</Text>}
                  {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
              )}

              {/* Actions List */}
              <View style={styles.actionsList}>
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  const isDestructive = action.destructive;
                  const iconColor = isDestructive ? "#EF4444" : "#1E293B";
                  const textColor = isDestructive ? "#EF4444" : "#0F172A";

                  return (
                    <TouchableOpacity
                      key={action.id || index}
                      style={[
                        styles.actionRow,
                        index < actions.length - 1 && styles.actionDivider,
                      ]}
                      activeOpacity={0.65}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onClose();
                        // Execute action after modal dismissal
                        setTimeout(() => {
                          action.onPress();
                        }, 120);
                      }}
                    >
                      {Icon && (
                        <View
                          style={[
                            styles.iconBox,
                            isDestructive && styles.destructiveIconBox,
                          ]}
                        >
                          <Icon size={20} color={iconColor} />
                        </View>
                      )}
                      <View style={styles.actionTextWrapper}>
                        <Text style={[styles.actionLabel, { color: textColor }]}>
                          {action.label}
                        </Text>
                        {action.subLabel && (
                          <Text style={styles.actionSubLabel}>
                            {action.subLabel}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.selectionAsync();
                  onClose();
                }}
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  handleWrapper: {
    alignItems: "center",
    paddingVertical: 6,
  },
  handle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  header: {
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  actionsList: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    marginVertical: 10,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  destructiveIconBox: {
    backgroundColor: "#FEE2E2",
  },
  actionTextWrapper: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  actionSubLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  cancelButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 6,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
});

