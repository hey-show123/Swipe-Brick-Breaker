import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const THEMES = [
    { id: 'cyan', name: 'Cyber Cyan', color: '#06b6d4' },
    { id: 'purple', name: 'Neon Purple', color: '#a855f7' },
    { id: 'green', name: 'Toxic Green', color: '#22c55e' },
    { id: 'orange', name: 'Magma', color: '#f97316' },
];

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose }) => {
    const [selectedTheme, setSelectedTheme] = useState('cyan');

    useEffect(() => {
        const saved = localStorage.getItem('sbb_theme');
        if (saved) {
            setSelectedTheme(saved);
        }
    }, [isOpen]);

    const handleSelect = (id: string) => {
        setSelectedTheme(id);
        localStorage.setItem('sbb_theme', id);
        // Dispatch custom event for same-tab listeners
        window.dispatchEvent(new CustomEvent('sbb_theme_change', { detail: id }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="BALL THEME">
            <div className="grid grid-cols-2 gap-3">
                {THEMES.map((theme) => (
                    <button
                        key={theme.id}
                        onClick={() => handleSelect(theme.id)}
                        className={clsx(
                            "relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95",
                            selectedTheme === theme.id
                                ? "bg-white/10 border-white/40 ring-2 ring-cyan-400/50"
                                : "bg-white/5 border-white/5 hover:bg-white/10"
                        )}
                    >
                        {/* Preview Circle */}
                        <div
                            className="w-12 h-12 rounded-full shadow-lg"
                            style={{
                                backgroundColor: theme.color,
                                boxShadow: `0 0 20px ${theme.color}60`
                            }}
                        />

                        <span className="text-sm font-bold text-gray-300">{theme.name}</span>

                        {selectedTheme === theme.id && (
                            <div className="absolute top-2 right-2 p-1 bg-cyan-500 rounded-full text-white">
                                <Check className="w-3 h-3" />
                            </div>
                        )}
                    </button>
                ))}
            </div>
            <p className="mt-6 text-center text-xs text-gray-500">
                More themes coming soon!
            </p>
        </Modal>
    );
};
