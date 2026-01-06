import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    // Portal to prevent zoning issues
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className={clsx(
                    "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={clsx(
                    "relative w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 transform",
                    isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-8"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors active:scale-95"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};
