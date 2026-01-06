import React, { useEffect, useState } from 'react';
import { RefreshCw, Home, Trophy, Share2 } from 'lucide-react';
import { GlassButton } from '../common/GlassButton';

interface GameOverScreenProps {
    score: number;
    highScore: number;
    onRetry: () => void;
    onHome: () => void;
    onShare: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, highScore, onRetry, onHome, onShare }) => {
    const isNewRecord = score > highScore;
    const [displayScore, setDisplayScore] = useState(0);

    // Score counting effect
    useEffect(() => {
        let start = 0;
        const end = score;
        const duration = 1500;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4);

            setDisplayScore(Math.floor(start + (end - start) * ease));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [score]);

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-xl p-6">

            {/* Content Container */}
            <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-500">

                {/* Header */}
                <div className="text-sm font-bold text-gray-500 tracking-[0.3em] uppercase mb-8">
                    Game Over
                </div>

                {/* Score Card */}
                <div className="relative w-full bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10 rounded-3xl p-8 mb-8 flex flex-col items-center shadow-2xl">
                    {isNewRecord && (
                        <div className="absolute -top-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg animate-bounce">
                            NEW RECORD!
                        </div>
                    )}

                    <div className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-2">
                        Total Score
                    </div>
                    <div className="text-6xl font-black text-white tabular-nums tracking-tighter mb-4 drop-shadow-xl bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
                        {displayScore}
                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium text-gray-400 bg-black/20 px-4 py-2 rounded-xl">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span>Best: {Math.max(score, highScore)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="w-full flex flex-col gap-3">
                    <GlassButton
                        onClick={onRetry}
                        fullWidth
                        size="lg"
                        icon={<RefreshCw className="w-5 h-5" />}
                        className="shadow-xl shadow-cyan-900/20"
                    >
                        TRY AGAIN
                    </GlassButton>

                    <div className="grid grid-cols-2 gap-3">
                        <GlassButton
                            onClick={onHome}
                            variant="secondary"
                            icon={<Home className="w-5 h-5" />}
                        >
                            Home
                        </GlassButton>
                        <GlassButton
                            onClick={onShare}
                            variant="secondary"
                            icon={<Share2 className="w-5 h-5" />}
                        >
                            Share
                        </GlassButton>
                    </div>
                </div>
            </div>
        </div>
    );
};
