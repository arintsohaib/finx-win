
'use client';

import { Toaster, toast as hotToast, ToastBar } from 'react-hot-toast';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function EnhancedToaster() {
  return (
    <Toaster
      position="bottom-center"
      reverseOrder={false}
      gutter={12}
      containerStyle={{
        bottom: '16px',
        left: '16px',
        right: '16px',
      }}
      toastOptions={{
        // Default duration for non-specified types
        duration: 4000,
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '0.75rem',
          padding: '16px 20px',
          fontSize: '14px',
          width: '100%',
          maxWidth: 'none',
          margin: '0 auto',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        },
        // Success toasts - 4 seconds
        success: {
          duration: 4000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '2px solid hsl(142.1 76.2% 36.3%)',
            width: '100%',
            maxWidth: 'none',
          },
          iconTheme: {
            primary: 'hsl(142.1 76.2% 36.3%)',
            secondary: 'hsl(var(--primary-foreground))',
          },
        },
        // Error toasts - No auto-dismiss (stays until manually closed)
        error: {
          duration: Infinity,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '2px solid hsl(0 84.2% 60.2%)',
            width: '100%',
            maxWidth: 'none',
          },
          iconTheme: {
            primary: 'hsl(0 84.2% 60.2%)',
            secondary: 'hsl(var(--primary-foreground))',
          },
        },
        // Loading toasts - No auto-dismiss
        loading: {
          duration: Infinity,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '2px solid hsl(var(--muted))',
            width: '100%',
            maxWidth: 'none',
          },
        },
        // Custom for info/warning
        custom: {
          duration: 5000,
        },
      }}
    >
      {(t: any) => (
        <ToastBar
          toast={t}
        // The Chevron prop is not a standard prop for react-hot-toast's ToastBar.
        // If you intended to pass a custom component for the chevron,
        // you might need to customize the ToastBar's children or use a custom toast.
        // For now, I'm adding the type to the 't' parameter as per the instruction.
        // If you meant to add a Chevron component, please provide more context.
        // Chevron: ({ orientation }: { orientation?: "left" | "right" }) => (
        //   <YourChevronComponent orientation={orientation} />
        // )
        >
          {({ icon, message }: { icon: React.ReactNode; message: React.ReactNode }) => (
            <EnhancedToastContent
              toast={t}
              icon={icon}
              message={message}
            />
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}

interface EnhancedToastContentProps {
  toast: any;
  icon: React.ReactNode;
  message: React.ReactNode;
}

function EnhancedToastContent({ toast, icon, message }: EnhancedToastContentProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Don't show progress for infinite duration toasts (error, loading)
    if (toast.duration === Infinity || toast.duration === 0) {
      return;
    }

    if (isPaused || !toast.visible) {
      return;
    }

    const interval = 50; // Update every 50ms
    const decrement = (interval / toast.duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        return next <= 0 ? 0 : next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast.duration, toast.visible, isPaused]);

  const handleMouseEnter = () => {
    if (toast.duration !== Infinity && toast.duration !== 0) {
      setIsPaused(true);
      hotToast.dismiss(toast.id);
      hotToast.custom((t: any) => null, { id: toast.id, duration: Infinity });
    }
  };

  const handleMouseLeave = () => {
    if (isPaused && toast.duration !== Infinity) {
      setIsPaused(false);
      const remainingDuration = (progress / 100) * toast.duration;
      if (remainingDuration > 0) {
        setTimeout(() => hotToast.dismiss(toast.id), remainingDuration);
      }
    }
  };

  const handleClose = () => {
    hotToast.dismiss(toast.id);
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toast.visible) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast.visible]);

  return (
    <div
      className="relative flex items-start gap-3 w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        {message}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-2 -mt-1 -mr-1 p-1.5 rounded-md hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label="Close notification"
      >
        <X className="h-4 w-4 opacity-70 hover:opacity-100 transition-opacity" />
      </button>

      {/* Progress Bar (only for timed toasts) */}
      {toast.duration !== Infinity && toast.duration !== 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-md overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full transition-all duration-50 ease-linear"
            style={{
              width: `${progress}%`,
              background: getProgressColor(toast.type),
            }}
          />
        </div>
      )}
    </div>
  );
}

function getProgressColor(type: string): string {
  switch (type) {
    case 'success':
      return 'hsl(142.1 76.2% 36.3%)';
    case 'error':
      return 'hsl(0 84.2% 60.2%)';
    case 'loading':
      return 'hsl(var(--muted-foreground))';
    default:
      return 'hsl(var(--primary))';
  }
}
