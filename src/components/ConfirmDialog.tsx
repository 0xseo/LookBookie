import { DesignDialog } from './AppDialog';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <DesignDialog
      visible={visible}
      title={title}
      message={message}
      actions={[
        { label: cancelLabel, variant: 'cancel', onPress: onCancel },
        {
          label: confirmLabel,
          variant: destructive ? 'destructive' : 'primary',
          onPress: onConfirm,
        },
      ]}
      onDismiss={onCancel}
    />
  );
}
