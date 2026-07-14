"use client";

type Props = {
  label: string;
  confirmText: string;
  onConfirm: () => void;
  className?: string;
};

export function ConfirmButton({ label, confirmText, onConfirm, className }: Props) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (window.confirm(confirmText)) {
          onConfirm();
        }
      }}
    >
      {label}
    </button>
  );
}
