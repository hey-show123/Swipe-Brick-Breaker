import React from 'react';
import { Pause, Hash } from 'lucide-react';
import { CountUp } from '../common/CountUp';

interface GameHUDProps {
    score: number;
    highScore: number;
    ballCount: number;
    level: number;
    onPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ score, highScore, ballCount, level, onPause }) => {
    return (
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-4 pt-12">

            {/* Header Area: Score (Left), Info (Center), Pause (Right) */}
            <div className="flex items-center justify-between gap-2">

                {/* Score Section (Left) */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl shadow-lg">
                        <Hash className="w-3 h-3 text-cyan-400" />
                        <CountUp value={score} className="font-['Rajdhani'] font-bold text-xl text-white tabular-nums" />
                    </div>
                </div>

                {/* Center Info (Level & Balls) */}
                <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-lg">
                        <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                            <span className="text-[9px] font-bold text-purple-300 uppercase tracking-wider">LV</span>
                            <span className="font-['Rajdhani'] font-bold text-xl text-white leading-none">{level}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-lg font-['Rajdhani'] font-bold text-white tabular-nums leading-none">x{ballCount}</span>
                        </div>
                    </div>
                </div>

                {/* Pause Button (Right) */}
                <div className="flex justify-end min-w-[120px]">
                    <button
                        onClick={onPause}
                        className="pointer-events-auto p-2.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl hover:bg-white/10 active:scale-95 transition-all shadow-lg group"
                    >
                        <Pause className="w-5 h-5 text-white group-hover:text-cyan-400 transition-colors" />
                    </button>
                </div>

            </div>

            {/* High Score Sub-tag */}
            <div className="flex justify-start mt-1 ml-2">
                <span className="text-[9px] text-gray-500 font-medium tracking-widest uppercase">
                    Best: {Math.max(score, highScore).toLocaleString()}
                </span>
            </div>
        </div>
    );
};
