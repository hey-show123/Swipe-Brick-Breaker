import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Volume2, VolumeX, Vibrate, ZapOff } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    // Local state for settings (In a real app, use Context or Props from Root)
    // For now, simple localStorage reads/writes on mount/change
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('sbb_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            setSoundEnabled(parsed.sound);
            setHapticsEnabled(parsed.haptics);
        }
    }, [isOpen]);

    const saveSettings = (sound: boolean, haptics: boolean) => {
        setSoundEnabled(sound);
        setHapticsEnabled(haptics);
        localStorage.setItem('sbb_settings', JSON.stringify({ sound, haptics }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="SETTINGS">
            <div className="flex flex-col gap-4">
                {/* Sound Toggle */}
                <button
                    onClick={() => saveSettings(!soundEnabled, hapticsEnabled)}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${soundEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-700/50 text-gray-500'}`}>
                            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </div>
                        <span className="font-medium text-gray-200">Sound Effects</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${soundEnabled ? 'bg-cyan-500' : 'bg-gray-700'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                </button>

                {/* Haptics Toggle */}
                <button
                    onClick={() => saveSettings(soundEnabled, !hapticsEnabled)}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${hapticsEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700/50 text-gray-500'}`}>
                            {hapticsEnabled ? <Vibrate className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
                        </div>
                        <span className="font-medium text-gray-200">Haptics</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${hapticsEnabled ? 'bg-purple-500' : 'bg-gray-700'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${hapticsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                </button>


            </div>
        </Modal>
    );
};
