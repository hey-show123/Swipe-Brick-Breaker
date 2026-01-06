import React, { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from './GameCanvas';
import { StartScreen } from './screens/StartScreen';
import { GameHUD } from './hud/GameHUD';
import { GameOverScreen } from './screens/GameOverScreen';
import { SettingsModal } from './screens/SettingsModal';
import { ShopModal } from './screens/ShopModal';
import { RankingModal } from './screens/RankingModal';
import bgCyber from '../assets/bg_cyber.png';
import { PauseMenu } from './screens/PauseMenu';

type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export const GameScreen: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('MENU');
    const [activeModal, setActiveModal] = useState<'NONE' | 'SETTINGS' | 'SHOP' | 'RANK'>('NONE');
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [balls, setBalls] = useState(1);

    // Key to force re-mounting of canvas to reset engine
    const [gameId, setGameId] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem('sbb_best_score');
        if (saved) {
            setBestScore(parseInt(saved, 10));
        }
    }, []);

    const handleStart = () => {
        setScore(0);
        setLevel(1);
        setBalls(1);
        setGameId(prev => prev + 1); // Reset Canvas
        setGameState('PLAYING');
    };

    const handleMetricUpdate = useCallback((newScore: number, newLevel: number, newBalls: number) => {
        setScore(newScore);
        setLevel(newLevel);
        setBalls(newBalls);

        if (newScore > bestScore) {
            setBestScore(newScore);
            localStorage.setItem('sbb_best_score', newScore.toString());
        }
    }, [bestScore]);

    const handleGameOver = useCallback((finalScore: number) => {
        // Ensure score is captured (though metric update usually happens before)
        if (finalScore > bestScore) {
            setBestScore(finalScore);
            localStorage.setItem('sbb_best_score', finalScore.toString());
        }
        setGameState('GAMEOVER');
    }, [bestScore]);

    const handleRetry = () => {
        handleStart();
    };

    const handleResume = () => {
        setGameState('PLAYING');
    };

    const handleHome = () => {
        setGameState('MENU');
    };

    const handleShare = async () => {
        const shareData = {
            title: 'Swipe Brick Breaker',
            text: `I scored ${score} in Swipe Brick Breaker! Can you beat me?`,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Share canceled');
            }
        } else {
            // Fallback for desktop/unsupported
            try {
                await navigator.clipboard.writeText(`I scored ${score} in Swipe Brick Breaker! Play now: ${window.location.href}`);
                alert('Copied to clipboard!');
            } catch (err) {
                // Ignore
            }
        }
    };

    const handlePause = () => {
        if (gameState === 'PLAYING') {
            setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
            setGameState('PLAYING');
        }
    };

    return (
        <div className="relative w-full h-full md:h-[800px] md:max-w-[480px] mx-auto bg-black shadow-2xl overflow-hidden md:rounded-3xl border border-white/10 ring-8 ring-black">

            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                <img
                    src={bgCyber}
                    alt="Background"
                    className="w-full h-full object-cover opacity-100"
                />

                {/* Floating Sparkles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full animate-sparkle"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${2 + Math.random() * 2}s`,
                            }}
                        />
                    ))}
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={`glow-${i}`}
                            className="absolute w-2 h-2 bg-cyan-400 rounded-full animate-float blur-sm"
                            style={{
                                left: `${10 + Math.random() * 80}%`,
                                top: `${20 + Math.random() * 60}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${6 + Math.random() * 4}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Game Layer */}
            {(gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'GAMEOVER') && (
                <div className={`absolute inset-0 transition-opacity duration-1000 ${gameState === 'GAMEOVER' ? 'opacity-50' : 'opacity-100'}`}>
                    <GameCanvas
                        key={gameId}
                        onMetricUpdate={handleMetricUpdate}
                        onGameOver={handleGameOver}
                        isPaused={gameState === 'PAUSED'}
                    />
                </div>
            )}

            {/* UI Layers */}
            {gameState === 'PLAYING' && (
                <GameHUD
                    score={score}
                    highScore={bestScore}
                    ballCount={balls}
                    level={level}
                    onPause={handlePause}
                />
            )}

            {gameState === 'MENU' && (
                <StartScreen
                    onStart={handleStart}
                    onShop={() => setActiveModal('SHOP')}
                    onRank={() => setActiveModal('RANK')}
                    onSettings={() => setActiveModal('SETTINGS')}
                />
            )}

            {gameState === 'PAUSED' && (
                <PauseMenu
                    score={score}
                    onResume={handleResume}
                    onHome={handleHome}
                    onRestart={handleRetry}
                />
            )}

            {gameState === 'GAMEOVER' && (
                <GameOverScreen
                    score={score}
                    highScore={bestScore}
                    onRetry={handleRetry}
                    onHome={handleHome}
                    onShare={handleShare}
                />
            )}

            {/* Modals */}
            <SettingsModal isOpen={activeModal === 'SETTINGS'} onClose={() => setActiveModal('NONE')} />
            <ShopModal isOpen={activeModal === 'SHOP'} onClose={() => setActiveModal('NONE')} />
            <RankingModal isOpen={activeModal === 'RANK'} onClose={() => setActiveModal('NONE')} />
        </div>
    );
};
