'use client';

import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
    title: string;
    description?: string;
}

interface StepsProps {
    steps: Step[];
    currentstep: number; // 0-indexed
    className?: string;
}

export function Steps({ steps, currentstep, className }: StepsProps) {
    return (
        <div className={cn("relative flex flex-col md:flex-row justify-between gap-4", className)}>
            {/* Progress Bar Background (Desktop) */}
            <div className="absolute top-4 left-0 w-full h-0.5 bg-muted hidden md:block -z-10" />

            {steps.map((step, index) => {
                const isCompleted = index < currentstep;
                const isCurrent = index === currentstep;
                const isPending = index > currentstep;

                return (
                    <div key={index} className="flex flex-col items-center flex-1 relative">
                        {/* Step Circle */}
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center border-2 bg-background transition-colors",
                                isCompleted && "border-primary bg-primary text-primary-foreground",
                                isCurrent && "border-primary text-primary",
                                isPending && "border-muted text-muted-foreground"
                            )}
                        >
                            {isCompleted ? <Check className="w-4 h-4" /> : <span>{index + 1}</span>}
                        </div>

                        {/* Step Text */}
                        <div className="mt-2 text-center">
                            <h3 className={cn("text-sm font-medium", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                                {step.title}
                            </h3>
                            {step.description && (
                                <p className="text-xs text-muted-foreground hidden md:block mt-0.5">
                                    {step.description}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
