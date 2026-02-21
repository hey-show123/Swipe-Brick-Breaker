import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './GameCanvas';
import type { GameCanvasHandle } from './GameCanvas';
import { StartScreen } from './screens/StartScreen';
import { GameHUD } from './hud/GameHUD';
import { GameOverScreen } from './screens/GameOverScreen';
import { SettingsModal } from './screens/SettingsModal';
import { ShopModal } from './screens/ShopModal';
import { RankingModal } from './screens/RankingModal';
import bgCyber from '../assets/bg_cyber.png';
import { PauseMenu } from './screens/PauseMenu';
import { adMobService } from '../services/AdMobService';
import type { GameSnapshot } from '../game/types';

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

    // Ad-related state
    const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
    const [continueUsed, setContinueUsed] = useState(false);
    const [showingAd, setShowingAd] = useState(false);

    const canvasRef = useRef<GameCanvasHandle>(null);

    // Initialize AdMob
    useEffect(() => {
        adMobService.initialize();
    }, []);

    // Show/hide banner based on game state
    useEffect(() => {
        if (gameState === 'MENU' || gameState === 'GAMEOVER') {
            adMobService.showBanner();
        } else {
            adMobService.hideBanner();
        }
    }, [gameState]);

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
        setSnapshot(null);
        setContinueUsed(false);
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

    const handleGameOver = useCallback(async (finalScore: number) => {
        // Ensure score is captured
        if (finalScore > bestScore) {
            setBestScore(finalScore);
            localStorage.setItem('sbb_best_score', finalScore.toString());
        }

        // Take snapshot before transitioning to game over (for continue feature)
        try {
            if (canvasRef.current) {
                const snap = canvasRef.current.getSnapshot();
                setSnapshot(snap);
            }
        } catch {
            // Snapshot may fail if engine is in bad state - continue without it
        }

        // Show interstitial ad (every 3rd game over)
        setShowingAd(true);
        await adMobService.showInterstitialIfReady();
        setShowingAd(false);

        setGameState('GAMEOVER');
    }, [bestScore]);

    const handleContinue = useCallback(async () => {
        if (!snapshot || continueUsed) return;

        setShowingAd(true);
        const rewarded = await adMobService.showRewarded();
        setShowingAd(false);

        if (rewarded && canvasRef.current) {
            canvasRef.current.restoreFromSnapshot(snapshot);
            setContinueUsed(true);
            setSnapshot(null);
            setGameState('PLAYING');
        }
    }, [snapshot, continueUsed]);

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

    const canContinue = !!snapshot && !continueUsed && !showingAd;

    return (
        <div className="relative w-full h-full xl:h-[800px] xl:max-w-[480px] mx-auto bg-black shadow-2xl overflow-hidden xl:rounded-3xl border border-white/10 ring-8 ring-black">

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
                        ref={canvasRef}
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
                    onContinue={handleContinue}
                    canContinue={canContinue}
                />
            )}

            {/* Ad Loading Overlay */}
            {showingAd && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
                    <div className="text-white text-lg font-bold animate-pulse">Loading...</div>
                </div>
            )}

            {/* Modals */}
            <SettingsModal isOpen={activeModal === 'SETTINGS'} onClose={() => setActiveModal('NONE')} />
            <ShopModal isOpen={activeModal === 'SHOP'} onClose={() => setActiveModal('NONE')} />
            <RankingModal isOpen={activeModal === 'RANK'} onClose={() => setActiveModal('NONE')} />
        </div>
    );
};
