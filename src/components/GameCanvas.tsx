import React, { useEffect, useRef, useState } from 'react';
import { Engine } from '../game/Engine';

interface GameCanvasProps {
    onMetricUpdate?: (score: number, level: number, balls: number) => void;
    onGameOver?: (score: number) => void;
    isPaused?: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onMetricUpdate, onGameOver, isPaused = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const [showRecall, setShowRecall] = useState(false);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Init Engine
        const engine = new Engine(canvasRef.current);
        engineRef.current = engine;

        // Bind Callbacks
        engine.onLongTurn = (isLong) => {
            setShowRecall(isLong);
        };

        engine.onMetricUpdate = (score, level, balls) => {
            if (onMetricUpdate) onMetricUpdate(score, level, balls);
        };

        engine.onGameOver = (score) => {
            if (onGameOver) onGameOver(score);
        };

        engine.start();

        // Listen for theme changes from Shop modal (same tab - custom event)
        const handleThemeChange = () => {
            if (engineRef.current) {
                engineRef.current.refreshTheme();
            }
        };
        window.addEventListener('sbb_theme_change', handleThemeChange);

        // Listen for theme changes from other tabs (cross-tab - storage event)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'sbb_theme' && engineRef.current) {
                engineRef.current.refreshTheme();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            engine.stop();
            window.removeEventListener('sbb_theme_change', handleThemeChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Sync Pause State
    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.setPaused(isPaused);
        }
    }, [isPaused]);

    const handleRecall = () => {
        if (engineRef.current) {
            engineRef.current.recallBalls();
            setShowRecall(false);
        }
    };

    return (
        <div className="relative w-full h-full">
            <canvas ref={canvasRef} className="block w-full h-full" />

            {showRecall && (
                <button
                    onClick={handleRecall}
                    className="absolute bottom-24 right-4 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(249,115,22,0.5)] z-20 animate-bounce border border-white/20 backdrop-blur-sm hover:scale-105 active:scale-95 transition-transform"
                >
                    <span className="font-['Rajdhani'] text-lg">RECALL</span>
                    <span>⏩</span>
                </button>
            )}
        </div>
    );
};
