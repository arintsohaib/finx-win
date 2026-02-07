
'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { X, ZoomIn, ZoomOut, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, useAnimation } from 'framer-motion';

interface ImageLightboxProps {
    src: string;
    alt: string;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ImageLightbox({ src, alt, trigger, open, onOpenChange }: ImageLightboxProps) {
    const [zoom, setZoom] = React.useState(1);
    const [isOpen, setIsOpen] = React.useState(false);
    const controls = useAnimation();
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Handle controlled vs uncontrolled state
    const isControlled = open !== undefined;
    const show = isControlled ? open : isOpen;
    const setShow = isControlled ? onOpenChange! : setIsOpen;

    const handleZoomIn = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setZoom((prev: number) => Math.min(prev + 0.5, 4));
    };

    const handleZoomOut = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setZoom((prev: number) => {
            const newZoom = Math.max(prev - 0.5, 1);
            if (newZoom === 1) {
                controls.start({ x: 0, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } });
            }
            return newZoom;
        });
    };

    const handleReset = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setZoom(1);
        controls.start({ x: 0, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } });
    };

    // Reset zoom and position when closed
    React.useEffect(() => {
        if (!show) {
            setZoom(1);
            controls.set({ x: 0, y: 0 });
        }
    }, [show, controls]);

    return (
        <Dialog open={show} onOpenChange={setShow}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

            <DialogContent className="z-[200] max-w-[100vw] max-h-[100vh] w-screen h-screen top-0 bottom-0 left-0 right-0 p-0 bg-transparent border-none shadow-none flex items-center justify-center overflow-hidden translate-x-0 translate-y-0 sm:translate-y-0 sm:top-0 sm:max-h-screen">
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/90">
                    {/* Controls */}
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full bg-black/50 hover:bg-black/70 text-white border-none"
                            onClick={handleZoomIn}
                            title="Zoom In"
                        >
                            <ZoomIn className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full bg-black/50 hover:bg-black/70 text-white border-none"
                            onClick={handleZoomOut}
                            title="Zoom Out"
                        >
                            <ZoomOut className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full bg-black/50 hover:bg-black/70 text-white border-none"
                            onClick={handleReset}
                            title="Reset View"
                        >
                            <RotateCcw className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full bg-black/50 hover:bg-black/70 text-white border-none"
                            asChild
                            title="Download"
                        >
                            <a href={src} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-5 w-5" />
                            </a>
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="rounded-full opacity-80 hover:opacity-100"
                            onClick={() => setShow(false)}
                            title="Close"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Image Container - This provides the draggable viewport */}
                    <div
                        ref={containerRef}
                        className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
                    >
                        <motion.div
                            animate={controls}
                            drag={zoom > 1}
                            dragConstraints={containerRef}
                            dragElastic={0}
                            dragMomentum={false}
                            style={{
                                scale: zoom,
                                cursor: zoom > 1 ? 'grab' : 'default'
                            }}
                            whileTap={{ cursor: 'grabbing' }}
                            className="relative flex items-center justify-center"
                        >
                            <img
                                src={src}
                                alt={alt}
                                draggable={false}
                                className="object-contain max-w-[95vw] max-h-[95vh] pointer-events-none select-none"
                            />
                        </motion.div>
                    </div>

                    {/* Hint for mobile */}
                    {zoom > 1 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/40 backdrop-blur-sm rounded-full text-white/70 text-xs pointer-events-none select-none">
                            Drag to pan
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
