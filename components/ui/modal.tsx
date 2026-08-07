"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

function Modal({ open, onOpenChange, title, description, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-care-charcoal/40 backdrop-blur-[2px] animate-fade-in z-40" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-full max-w-md rounded-card-lg bg-white p-6 shadow-lg border border-care-cream",
            "focus:outline-none",
            className
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <Dialog.Title className="text-h3 text-care-charcoal">{title}</Dialog.Title>
            <Dialog.Close className="text-care-muted hover:text-care-charcoal transition-colors rounded-lg p-1 -mt-1 -mr-1">
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          {description && (
            <Dialog.Description className="text-sm text-care-muted mb-4">
              {description}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { Modal };
