import { Turtle } from "lucide-react-native";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AlertButton,
  type AlertOptions,
} from "react-native";

import { COLORS } from "../../constants/colors";

type DialogRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

export type DesignDialogAction = {
  label: string;
  variant?: "primary" | "cancel" | "destructive";
  onPress: () => void;
};

type DesignDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  actions: DesignDialogAction[];
  onDismiss?: () => void;
};

let nextDialogId = 1;
let dialogListener: ((request: DialogRequest) => void) | null = null;
let pendingDialogs: DialogRequest[] = [];

export const AppAlert = {
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) {
    const request: DialogRequest = {
      id: nextDialogId,
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: "확인" }],
      options,
    };

    nextDialogId += 1;

    if (dialogListener) {
      dialogListener(request);
      return;
    }

    pendingDialogs.push(request);
  },
};

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialogs, setDialogs] = useState<DialogRequest[]>([]);
  const closingDialogIds = useRef(new Set<number>());
  const currentDialog = dialogs[0];

  useEffect(() => {
    const receiveDialog = (request: DialogRequest) => {
      setDialogs((current) => [...current, request]);
    };

    dialogListener = receiveDialog;

    if (pendingDialogs.length > 0) {
      const queuedDialogs = pendingDialogs;
      pendingDialogs = [];
      setDialogs((current) => [...queuedDialogs, ...current]);
    }

    return () => {
      if (dialogListener === receiveDialog) {
        dialogListener = null;
      }
    };
  }, []);

  const closeDialog = (button?: AlertButton, dismissed = false) => {
    if (!currentDialog) {
      return;
    }

    const closingDialog = currentDialog;

    if (closingDialogIds.current.has(closingDialog.id)) {
      return;
    }

    closingDialogIds.current.add(closingDialog.id);
    setDialogs((current) =>
      current.filter((dialog) => dialog.id !== closingDialog.id)
    );

    setTimeout(() => {
      try {
        button?.onPress?.();

        if (dismissed) {
          closingDialog.options?.onDismiss?.();
        }
      } finally {
        closingDialogIds.current.delete(closingDialog.id);
      }
    }, 0);
  };

  const cancelButton = currentDialog?.buttons.find(
    (button) => button.style === "cancel"
  );
  const canDismiss = Boolean(
    currentDialog && (currentDialog.options?.cancelable || cancelButton)
  );

  return (
    <>
      {children}
      <DesignDialog
        visible={Boolean(currentDialog)}
        title={currentDialog?.title ?? ""}
        message={currentDialog?.message}
        actions={(currentDialog?.buttons ?? []).map((button) => ({
          label: button.text ?? "확인",
          variant:
            button.style === "destructive"
              ? "destructive"
              : button.style === "cancel"
                ? "cancel"
                : "primary",
          onPress: () => closeDialog(button),
        }))}
        onDismiss={
          canDismiss
            ? () => closeDialog(cancelButton, true)
            : undefined
        }
      />
    </>
  );
}

export function DesignDialog({
  visible,
  title,
  message,
  actions,
  onDismiss,
}: DesignDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss ?? (() => undefined)}
    >
      <View style={styles.backdrop}>
        {onDismiss ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            accessibilityLabel="대화상자 닫기"
          />
        ) : null}
        <View
          style={styles.dialog}
          accessibilityRole="alert"
          accessibilityViewIsModal
        >
          <View style={styles.titleRow}>
            <View style={styles.mascotShell}>
              <Turtle color={COLORS.primary} size={25} strokeWidth={2.2} />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            {actions.map((action, index) => {
              const isCancel = action.variant === "cancel";
              const isDestructive = action.variant === "destructive";

              return (
                <Pressable
                  key={`${action.label}-${index}`}
                  onPress={action.onPress}
                  style={[
                    styles.button,
                    isCancel && styles.cancelButton,
                    isDestructive && styles.destructiveButton,
                  ]}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.cancelButtonText,
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.overlay,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 16,
  },
  titleRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mascotShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  actions: { flexDirection: "row", gap: 8 },
  button: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  destructiveButton: { backgroundColor: COLORS.danger },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    color: COLORS.surface,
  },
  cancelButtonText: { color: COLORS.primary },
});
