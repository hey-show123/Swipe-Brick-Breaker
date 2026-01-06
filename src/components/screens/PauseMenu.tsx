import React from 'react'; // v18
import { Play, Home, RotateCcw } from 'lucide-react';
import { GlassButton } from '../common/GlassButton';

interface PauseMenuProps {
    score: number;
    onResume: () => void;
    onHome: () => void;
    onRestart: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ score, onResume, onHome, onRestart }) => {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="flex flex-col items-center w-full max-w-sm gap-6 p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl">

                {/* Header */}
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-black italic text-white tracking-widest uppercase mb-1 drop-shadow-md">
                        PAUSED
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-cyan-400 font-mono">
                        <span className="text-sm opacity-80">CURRENT SCORE</span>
                        <span className="text-xl font-bold">{score.toLocaleString()}</span>
                    </div>
                </div>

                <div className="w-16 h-1 bg-white/10 rounded-full" />

                {/* Actions */}
                <div className="w-full flex flex-col gap-3">
                    <GlassButton
                        onClick={onResume}
                        size="lg"
                        fullWidth
                        icon={<Play className="w-5 h-5 fill-current" />}
                        className="bg-cyan-500/20 border-cyan-500/30 hover:bg-cyan-500/30 font-bold"
                    >
                        RESUME
                    </GlassButton>

                    <GlassButton
                        onClick={onRestart}
                        fullWidth
                        icon={<RotateCcw className="w-5 h-5" />}
                        variant="secondary"
                    >
                        RESTART
                    </GlassButton>

                    <GlassButton
                        onClick={onHome}
                        fullWidth
                        icon={<Home className="w-5 h-5" />}
                        variant="secondary"
                    >
                        QUIT TO TITLE
                    </GlassButton>
                </div>
            </div>
        </div>
    );
};
