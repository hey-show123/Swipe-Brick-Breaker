import React from 'react';
import { Play, Settings, ShoppingBag, Trophy } from 'lucide-react';
import { GlassButton } from '../common/GlassButton';

interface StartScreenProps {
    onStart: () => void;
    onShop: () => void;
    onRank: () => void;
    onSettings: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onShop, onRank, onSettings }) => {
    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-between py-20 pb-32 overflow-hidden">
            {/* Dynamic Background Layer */}


            {/* Header Content */}
            <div className="relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-top-10 duration-1000">


                <h1 className="text-center relative flex flex-col items-center gap-1">
                    <div className="text-6xl md:text-8xl font-black font-['Rajdhani'] italic text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-400 tracking-tighter leading-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] transform -skew-x-6">
                        SWIPE
                    </div>
                    <div className="text-4xl md:text-5xl font-black font-['Rajdhani'] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 tracking-widest drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                        BRICK BREAKER
                    </div>
                </h1>
            </div>

            {/* Main Action Area */}
            <div className="relative z-10 w-full max-w-xs flex flex-col gap-6 px-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">

                {/* Play Button - Hero */}
                <GlassButton
                    onClick={onStart}
                    size="lg"
                    fullWidth
                    icon={<Play className="w-6 h-6 fill-current" />}
                    className="shadow-[0_0_40px_rgba(6,182,212,0.2)] hover:shadow-[0_0_60px_rgba(6,182,212,0.4)]"
                >
                    PLAY NOW
                </GlassButton>

                {/* Secondary Actions Grid */}
                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={onShop}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md active:scale-95 transition-all hover:bg-white/10 group"
                    >
                        <div className="p-2 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                            <ShoppingBag className="w-5 h-5 text-purple-300" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 tracking-wider">SHOP</span>
                    </button>

                    <button
                        onClick={onRank}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md active:scale-95 transition-all hover:bg-white/10 group"
                    >
                        <div className="p-2 rounded-xl bg-yellow-500/20 group-hover:bg-yellow-500/30 transition-colors">
                            <Trophy className="w-5 h-5 text-yellow-300" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 tracking-wider">RANK</span>
                    </button>

                    <button
                        onClick={onSettings}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md active:scale-95 transition-all hover:bg-white/10 group"
                    >
                        <div className="p-2 rounded-xl bg-gray-500/20 group-hover:bg-gray-500/30 transition-colors">
                            <Settings className="w-5 h-5 text-gray-300" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 tracking-wider">SET</span>
                    </button>
                </div>
            </div>


        </div>
    );
};
