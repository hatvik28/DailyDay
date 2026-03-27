"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error("Dialog components must be used within Dialog");
  }
  return ctx;
}

type DialogPanelContextValue = {
  titleId: string;
  descriptionId: string;
  setTitlePresent: (present: boolean) => void;
  setDescriptionPresent: (present: boolean) => void;
};

const DialogPanelContext = React.createContext<DialogPanelContextValue | null>(null);

function useDialogPanelContext() {
  const ctx = React.useContext(DialogPanelContext);
  if (!ctx) {
    throw new Error("Dialog panel components must be used within DialogContent");
  }
  return ctx;
}

type DialogProps = {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
};

function Dialog({ children, open: openProp, onOpenChange, defaultOpen = false }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const value = React.useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

function DialogTrigger({
  className,
  children,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { setOpen } = useDialogContext();
  return (
    <button
      type="button"
      className={cn(className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) {
          setOpen(true);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function DialogContent({
  className,
  children,
  onClick,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: React.ComponentProps<"dialog">) {
  const { open, setOpen } = useDialogContext();
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const [titlePresent, setTitlePresent] = React.useState(false);
  const [descriptionPresent, setDescriptionPresent] = React.useState(false);

  const panelValue = React.useMemo(
    () => ({
      titleId,
      descriptionId,
      setTitlePresent,
      setDescriptionPresent,
    }),
    [titleId, descriptionId]
  );

  React.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) {
        el.showModal();
      }
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  React.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => setOpen(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [setOpen]);

  function handleBackdropClose(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) {
      dialogRef.current?.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-describedby={ariaDescribedBy ?? (descriptionPresent ? descriptionId : undefined)}
      aria-labelledby={ariaLabelledBy ?? (titlePresent ? titleId : undefined)}
      className={cn(
        "fixed inset-0 z-50 m-auto max-h-[min(90vh,100%)] w-full max-w-lg rounded-lg border border-border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-black/40",
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) {
          handleBackdropClose(e);
        }
      }}
      {...props}
    >
      <DialogPanelContext.Provider value={panelValue}>
        <div
          className="max-h-[min(90vh,100%)] overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </DialogPanelContext.Provider>
    </dialog>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
  );
}

function DialogTitle({ className, id, ...props }: React.ComponentProps<"h2">) {
  const { titleId, setTitlePresent } = useDialogPanelContext();

  React.useLayoutEffect(() => {
    setTitlePresent(true);
    return () => setTitlePresent(false);
  }, [setTitlePresent]);

  return (
    <h2
      id={id ?? titleId}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, id, ...props }: React.ComponentProps<"p">) {
  const { descriptionId, setDescriptionPresent } = useDialogPanelContext();

  React.useLayoutEffect(() => {
    setDescriptionPresent(true);
    return () => setDescriptionPresent(false);
  }, [setDescriptionPresent]);

  return (
    <p
      id={id ?? descriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
