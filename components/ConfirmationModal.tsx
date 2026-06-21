import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Info, Trash2, X, Loader2 } from "lucide-react";

export type ModalType = "success" | "warning" | "delete" | "info";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: React.ReactNode;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    color: "text-[var(--color-bae-green)]",
    bgColor: "bg-[var(--color-bae-green)]/10",
    buttonBg: "bg-[var(--color-bae-green)] hover:bg-[var(--color-bae-green)]/80",
    buttonText: "text-white",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-[var(--color-solar-gold)]",
    bgColor: "bg-[var(--color-solar-gold)]/10",
    buttonBg: "bg-[var(--color-solar-gold)] hover:bg-[var(--color-solar-gold)]/80",
    buttonText: "text-[var(--color-carbon-black)]",
  },
  delete: {
    icon: Trash2,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    buttonBg: "bg-red-500 hover:bg-red-600",
    buttonText: "text-white",
  },
  info: {
    icon: Info,
    color: "text-[var(--color-pro-purple)]",
    bgColor: "bg-[var(--color-pro-purple)]/10",
    buttonBg: "bg-[var(--color-pro-purple)] hover:bg-[var(--color-pro-purple)]/80",
    buttonText: "text-white",
  },
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "info",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
}) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Small delay to allow CSS transition to work
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 300); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, isLoading]);

  if (!isRendered) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={`relative w-full max-w-md transform overflow-hidden rounded-2xl bg-[var(--color-carbon-black)] border border-white/10 p-6 text-left shadow-2xl transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}
          >
            <Icon className={`h-6 w-6 ${config.color}`} aria-hidden="true" />
          </div>

          {/* Text Content */}
          <div className="mt-1 flex-1">
            <h3
              className="text-lg font-semibold leading-6 text-[var(--color-lab-white)] font-poppins"
              id="modal-title"
            >
              {title}
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-300">{message}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            className="inline-flex justify-center rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-lab-white)] hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[var(--color-pro-purple)] focus:ring-offset-2 focus:ring-offset-[var(--color-carbon-black)] transition-all disabled:opacity-50"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button
              type="button"
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-carbon-black)] transition-all disabled:opacity-70 ${config.buttonBg} ${config.buttonText}`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
