import React from 'react';
import { Pause, Layers, Hash } from 'lucide-react';
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

            {/* Top Row: Score & Pause */}
            <div className="flex items-start justify-between">

                {/* Score Capsule */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl shadow-xl hover:bg-black/50 transition-colors">
                        <div className="p-1.5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
                            <Hash className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Score</span>
                            <CountUp value={score} className="font-['Rajdhani'] font-bold text-3xl text-white tracking-tight" />
                        </div>
                    </div>
                    {/* Best Score Tag */}
                    <div className="ml-4 px-3 py-1 bg-black/20 rounded-b-xl border-x border-b border-white/5 backdrop-blur-sm self-start">
                        <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                            BEST: {Math.max(score, highScore).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Pause Button (Interactive) */}
                <button
                    onClick={onPause}
                    className="pointer-events-auto p-3 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl hover:bg-white/10 active:scale-95 transition-all shadow-lg group"
                >
                    <Pause className="w-6 h-6 text-white group-hover:text-cyan-400 transition-colors" />
                </button>
            </div>

            {/* Middle Row (Level & Balls) - Positioned slightly lower/inset */}
            <div className="flex flex-col items-end gap-3 mt-4">

                {/* Level Badge */}
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/30 border border-white/5 backdrop-blur-md">
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">LEVEL</span>
                    <span className="font-['Rajdhani'] font-bold text-2xl text-white">{level}</span>
                    <div className="p-1 rounded bg-purple-500/20">
                        <Layers className="w-3 h-3 text-purple-400" />
                    </div>
                </div>

                {/* Ball Counter */}
                <div className="flex items-center gap-2">
                    <span className="text-xl font-['Rajdhani'] font-bold text-white tabular-nums">x{ballCount}</span>
                    <div className="h-0.5 w-8 bg-gradient-to-r from-blue-500 to-transparent" />
                </div>

            </div>
        </div>
    );
};
