import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import * as Haptics from "expo-haptics";
import { AppBottomSheetModal } from "./AppBottomSheetModal";

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
  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      showHandle={true}
      transparentBackdrop={true}
    >
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
    </AppBottomSheetModal>
  );
};

const styles = StyleSheet.create({
  actionsList: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    marginVertical: 6,
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
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
});
