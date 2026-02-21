import { CONSTANTS } from './Constants';
import { GamePhase } from './types';
import type { Vector, GameSnapshot } from './types';
import { Vec2 } from './Vector';
import { BallEntity, BlockEntity, ItemEntity } from './Entities';
import { PhysicsSystem } from './Physics';
import { InputHandler } from './InputHandler';
import { ParticleSystem } from './Particles';
import { soundManager } from './SoundManager';

// Theme color lookup
const THEME_COLORS: { [key: string]: string } = {
    'cyan': '#06b6d4',
    'purple': '#a855f7',
    'green': '#22c55e',
    'orange': '#f97316',
};

// --- Effect Interfaces ---

interface DyingBlock {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    type: BlockEntity['type'];
    timer: number;
    maxTimer: number;
}

interface FloatingText {
    x: number;
    y: number;
    text: string;
    color: string;
    timer: number;
    maxTimer: number;
    fontSize: number;
}

interface ComboDisplay {
    count: number;
    timer: number;
    maxTimer: number;
    phase: 'pop' | 'hold' | 'fade';
}

interface ScreenFlash {
    color: string;
    timer: number;
    maxTimer: number;
}

interface LevelUpDisplay {
    level: number;
    timer: number;
    maxTimer: number;
}

export class Engine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private animationId: number | null = null;
    private lastTime: number = 0;

    // Systems
    private physics: PhysicsSystem;
    private input: InputHandler;

    // Game State
    private phase: GamePhase = GamePhase.AIMING;
    private width: number = 0;
    private height: number = 0;

    // Entities
    private balls: BallEntity[] = [];
    private blocks: BlockEntity[] = [];
    private items: ItemEntity[] = [];
    private particles: ParticleSystem;

    // Gameplay Variables
    private level: number = 1;
    private score: number = 0;
    private shakeTime: number = 0;
    private shakeMagnitude: number = 0;
    private totalBalls: number = CONSTANTS.INITIAL_BALLS;
    private ballsReturned: number = 0;
    private launchPos: { x: number, y: number } = { x: 0, y: 0 };
    private launchVector: { x: number, y: number } | null = null;
    private launchIntervalId: number | null = null;
    private turnTimer: number = 0;
    private timeScale: number = 1.0;
    private isPaused: boolean = false;
    private aimOffset: number = 0;

    // Ball Theme Color
    private ballColor: string = '#06b6d4';

    // --- Effect State ---
    private dyingBlocks: DyingBlock[] = [];
    private floatingTexts: FloatingText[] = [];
    private comboDisplay: ComboDisplay | null = null;
    private comboCount: number = 0;
    private comboTimer: number = 0;
    private screenFlashes: ScreenFlash[] = [];
    private levelUpDisplay: LevelUpDisplay | null = null;

    public onLongTurn: ((isLong: boolean) => void) | null = null;
    public onMetricUpdate: ((score: number, level: number, balls: number) => void) | null = null;
    public onGameOver: ((finalScore: number) => void) | null = null;

    // Input State
    private aimVector: Vector = { x: 0, y: 0 };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Could not get 2D context');
        this.ctx = context;

        // Init Size
        this.width = canvas.width;
        this.height = canvas.height;

        this.physics = new PhysicsSystem(this.width, this.height);
        this.input = new InputHandler(canvas);
        this.particles = new ParticleSystem();

        // Load ball theme from localStorage
        this.loadBallTheme();

        // Bind Physics Events
        this.physics.onCollision = (pos, type, color) => {
            if (type === 'DESTROY') {
                // Directional burst (main) + scatter
                const angle = Math.random() * Math.PI * 2;
                this.particles.emitDirectional(pos.x, pos.y, 8, color || '#fff', angle, Math.PI * 0.6, 180, 4);
                this.particles.emit(pos.x, pos.y, 6, color || '#fff', 100, 3);
                this.triggerShake(0.2, 6);
                soundManager.play('destroy');
            } else {
                this.particles.emit(pos.x, pos.y, 3, '#fff', 80, 2);
                soundManager.play('bounce', 0.3);
            }
        };

        // Bind Input Actions
        this.input.onAim = (_start, current) => {
            if (this.phase === GamePhase.AIMING) {
                let targetY = current.y;
                if (current.y > this.launchPos.y) {
                    targetY = this.launchPos.y - (current.y - this.launchPos.y);
                }
                let vector = { x: current.x - this.launchPos.x, y: targetY - this.launchPos.y };
                if (vector.y > -20) {
                    vector.y = -20;
                }
                const angle = Math.atan2(vector.y, vector.x);
                const minAngle = -Math.PI + 0.15;
                const maxAngle = -0.15;
                if (angle > maxAngle && angle < Math.PI / 2) {
                    vector = { x: Math.cos(maxAngle), y: Math.sin(maxAngle) };
                } else if (angle < minAngle || angle > Math.PI / 2) {
                    vector = { x: Math.cos(minAngle), y: Math.sin(minAngle) };
                }
                this.aimVector = vector;
            }
        };

        this.input.onShoot = (_start, current) => {
            if (this.phase === GamePhase.AIMING) {
                let targetY = current.y;
                if (current.y > this.launchPos.y) {
                    targetY = this.launchPos.y - (current.y - this.launchPos.y);
                }
                let vector = { x: current.x - this.launchPos.x, y: targetY - this.launchPos.y };
                if (vector.y > -20) {
                    vector.y = -20;
                }
                const mag = Vec2.mag(vector);
                if (mag > 20) {
                    const angle = Math.atan2(vector.y, vector.x);
                    const minAngle = -Math.PI + 0.15;
                    const maxAngle = -0.15;
                    let finalAngle = angle;
                    if (angle > maxAngle && angle < Math.PI / 2) finalAngle = maxAngle;
                    else if (angle < minAngle || angle > Math.PI / 2) finalAngle = minAngle;
                    const finalVector = {
                        x: Math.cos(finalAngle) * CONSTANTS.BALL_SPEED,
                        y: Math.sin(finalAngle) * CONSTANTS.BALL_SPEED
                    };
                    this.startShooting(finalVector);
                    this.aimVector = { x: 0, y: 0 };
                }
            }
        };

        this.resize();
        this.resetGame();
        window.addEventListener('resize', () => this.resize());
    }

    private resetGame() {
        this.level = 1;
        this.score = 0;
        this.totalBalls = CONSTANTS.INITIAL_BALLS;
        this.blocks = [];
        this.items = [];
        this.dyingBlocks = [];
        this.floatingTexts = [];
        this.comboDisplay = null;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.screenFlashes = [];
        this.levelUpDisplay = null;
        this.launchPos = { x: this.width / 2, y: this.height - 100 };
        this.addBlockRow();
        this.resetBalls();
    }

    private resetBalls() {
        this.balls = [];
        for (let i = 0; i < this.totalBalls; i++) {
            const ball = new BallEntity(i, this.launchPos.x, this.launchPos.y);
            ball.isActive = false;
            ball.isReturning = false;
            ball.velocity = { x: 0, y: 0 };
            this.balls.push(ball);
        }
    }

    private resize() {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.width = parent.clientWidth;
            this.height = parent.clientHeight;
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = this.width * dpr;
            this.canvas.height = this.height * dpr;
            this.ctx.scale(dpr, dpr);
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
            this.physics.updateDimensions(this.width, this.height);
            if (this.balls.length === 0 && this.width > 0) {
                this.launchPos = { x: this.width / 2, y: this.height - 100 };
                this.resetBalls();
            }
            if (this.launchPos.x > this.width) this.launchPos.x = this.width - 20;
            if (this.launchPos.y > this.height) this.launchPos.y = this.height - 50;
            this.updateBlockLayout();
        }
    }

    private updateBlockLayout() {
        const blockWidth = (this.width - (CONSTANTS.COLS + 1) * CONSTANTS.BLOCK_GAP) / CONSTANTS.COLS;
        const blockHeight = blockWidth;
        const topPadding = 100;
        this.blocks.forEach(b => {
            b.updatePosition(blockWidth, blockHeight, CONSTANTS.BLOCK_GAP, topPadding);
        });
        this.items.forEach(i => i.updatePosition(blockWidth, blockHeight, CONSTANTS.BLOCK_GAP, topPadding));
    }

    public start() {
        if (this.animationId) return;
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    public stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.input.detach();
    }

    public setPaused(paused: boolean) {
        this.isPaused = paused;
        if (!paused) {
            this.lastTime = performance.now();
        }
    }

    private loop = (timestamp: number) => {
        if (!this.lastTime) this.lastTime = timestamp;
        if (this.isPaused) {
            this.lastTime = timestamp;
            this.animationId = requestAnimationFrame(this.loop);
            return;
        }
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        if (dt > 0.1) dt = 0.1;
        this.update(dt);
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    };

    private startShooting(vector: Vector) {
        const norm = Vec2.normalize(vector);
        this.launchVector = Vec2.mul(norm, CONSTANTS.BALL_SPEED);
        this.phase = GamePhase.SHOOTING;
        this.ballsReturned = 0;
        this.turnTimer = 0;
        this.timeScale = 1.0;
        if (this.onLongTurn) this.onLongTurn(false);

        let firedCount = 0;
        if (this.launchIntervalId) clearInterval(this.launchIntervalId);

        this.launchIntervalId = window.setInterval(() => {
            if (firedCount >= this.balls.length) {
                if (this.launchIntervalId) clearInterval(this.launchIntervalId);
                return;
            }
            const ball = this.balls[firedCount];
            ball.isActive = true;
            ball.isReturning = false;
            ball.position = { ...this.launchPos };
            ball.velocity = { ...this.launchVector! };
            ball.clearTrail();
            firedCount++;
        }, 60);
    }

    private update(dt: number) {
        // Update Particles
        this.particles.update(dt);

        // Update Shake
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            if (this.shakeTime <= 0) {
                this.shakeTime = 0;
                this.shakeMagnitude = 0;
            }
        }

        // Animate Aim Line
        this.aimOffset = (this.aimOffset + dt * 60) % 24;

        // Update dying blocks
        this.dyingBlocks = this.dyingBlocks.filter(db => {
            db.timer -= dt;
            return db.timer > 0;
        });

        // Update floating texts
        this.floatingTexts = this.floatingTexts.filter(ft => {
            ft.timer -= dt;
            return ft.timer > 0;
        });

        // Update combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                // Combo ended
                if (this.comboCount >= 3) {
                    this.comboDisplay = {
                        count: this.comboCount,
                        timer: 1.0,
                        maxTimer: 1.0,
                        phase: 'pop',
                    };
                }
                this.comboCount = 0;
            }
        }

        // Update combo display
        if (this.comboDisplay) {
            this.comboDisplay.timer -= dt;
            const elapsed = this.comboDisplay.maxTimer - this.comboDisplay.timer;
            if (elapsed < 0.15) {
                this.comboDisplay.phase = 'pop';
            } else if (this.comboDisplay.timer > 0.3) {
                this.comboDisplay.phase = 'hold';
            } else {
                this.comboDisplay.phase = 'fade';
            }
            if (this.comboDisplay.timer <= 0) {
                this.comboDisplay = null;
            }
        }

        // Update screen flashes
        this.screenFlashes = this.screenFlashes.filter(sf => {
            sf.timer -= dt;
            return sf.timer > 0;
        });

        // Update level-up display
        if (this.levelUpDisplay) {
            this.levelUpDisplay.timer -= dt;
            if (this.levelUpDisplay.timer <= 0) {
                this.levelUpDisplay = null;
            }
        }

        if (this.phase === GamePhase.SHOOTING || this.phase === GamePhase.RETURNING) {
            // Auto Fast Forward Logic
            this.turnTimer += dt;
            if (this.turnTimer > 15 && this.timeScale < 2.0) {
                this.timeScale = 2.0;
                if (this.onLongTurn) this.onLongTurn(true);
            }
            if (this.turnTimer > 25 && this.timeScale < 3.0) {
                this.timeScale = 3.0;
            }

            const scaledDt = dt * this.timeScale;

            // Update ball trails before physics
            this.balls.forEach(ball => {
                if (ball.isActive) ball.updateTrail();
            });

            this.physics.update(scaledDt, this.balls, this.blocks, this.items);

            // Scoring and Gimmicks
            const destroyedBlocks = this.blocks.filter(b => b.hp <= 0);

            // Handle EXPLOSIVE gimmick
            let explosionTriggered = false;
            destroyedBlocks.forEach(block => {
                if (block.gimmick === 'EXPLOSIVE') {
                    explosionTriggered = true;
                    this.blocks.forEach(other => {
                        if (other.hp <= 0) return;
                        const colDiff = Math.abs(other.col - block.col);
                        const rowDiff = Math.abs(other.row - block.row);
                        if (colDiff <= 1 && rowDiff <= 1 && (colDiff + rowDiff > 0)) {
                            other.hp -= 2;
                            this.particles.emit(other.x + other.width / 2, other.y + other.height / 2, 5, '#f97316');
                        }
                    });
                    this.particles.emit(block.x + block.width / 2, block.y + block.height / 2, 15, '#f97316', 150, 4);
                    this.triggerShake(0.2, 8);
                }
            });

            // Screen flash for explosions
            if (explosionTriggered) {
                this.screenFlashes.push({ color: 'rgba(249, 115, 22, 0.3)', timer: 0.15, maxTimer: 0.15 });
            }

            // Screen flash for 3+ simultaneous breaks
            if (destroyedBlocks.length >= 3) {
                this.screenFlashes.push({ color: 'rgba(255, 255, 255, 0.25)', timer: 0.12, maxTimer: 0.12 });
            }

            // Calculate score + spawn effects
            let scoreGain = 0;
            destroyedBlocks.forEach(block => {
                const blockColor = this.getBlockColor(block);
                const pts = block.gimmick === 'GOLD' ? 500 : 100;
                scoreGain += pts;

                // Add dying block animation
                this.dyingBlocks.push({
                    x: block.x,
                    y: block.y,
                    width: block.width,
                    height: block.height,
                    color: blockColor,
                    type: block.type,
                    timer: 0.3,
                    maxTimer: 0.3,
                });

                // Add floating score text
                const cx = block.x + block.width / 2;
                const cy = block.y + block.height / 2;
                this.floatingTexts.push({
                    x: cx,
                    y: cy,
                    text: `+${pts}`,
                    color: block.gimmick === 'GOLD' ? '#fbbf24' : '#ffffff',
                    timer: 0.8,
                    maxTimer: 0.8,
                    fontSize: block.gimmick === 'GOLD' ? 24 : 18,
                });

                // Combo tracking
                this.comboCount++;
                this.comboTimer = 0.5;
            });

            this.blocks = this.blocks.filter(b => b.hp > 0);

            if (scoreGain > 0) {
                this.score += scoreGain;
                this.emitMetrics();
            }

            // Items Collection
            if (this.items && this.items.length > 0) {
                const collectedCount = this.items.filter(i => i.collected).length;
                if (collectedCount > 0) {
                    this.totalBalls += collectedCount;
                    this.emitMetrics();
                }
                this.items = this.items.filter(i => !i.collected);
            }

            // Check for returning balls
            this.balls.forEach(ball => {
                if (ball.isReturning) return;
                const hasBeenLaunched = ball.velocity.x !== 0 || ball.velocity.y !== 0;
                if (!hasBeenLaunched) return;

                if (ball.isActive) {
                    if (ball.position.y >= this.height - CONSTANTS.BALL_RADIUS) {
                        ball.isActive = false;
                        ball.isReturning = true;
                        ball.clearTrail();
                        this.ballsReturned++;
                        if (!this.launchPosUpdated) {
                            this.nextLaunchPos = { x: ball.position.x, y: this.height - 100 };
                            this.launchPosUpdated = true;
                        }
                    }
                } else {
                    ball.isReturning = true;
                    ball.clearTrail();
                    this.ballsReturned++;
                }
            });

            if (this.ballsReturned >= this.balls.length) {
                this.endTurn();
            }
        }
    }

    private launchPosUpdated = false;
    private nextLaunchPos: Vector | null = null;

    private endTurn() {
        if (this.launchIntervalId) {
            clearInterval(this.launchIntervalId);
            this.launchIntervalId = null;
        }

        this.phase = GamePhase.AIMING;
        if (this.nextLaunchPos) {
            this.launchPos = this.nextLaunchPos;
        }
        this.launchPosUpdated = false;
        this.nextLaunchPos = null;

        // Advance Level
        this.level++;

        // Level-up display
        this.levelUpDisplay = {
            level: this.level,
            timer: 1.2,
            maxTimer: 1.2,
        };

        this.moveBlocksDown();
        this.addBlockRow();
        this.resetBalls();

        // Check Game Over
        this.blocks.forEach(b => {
            if (b.y + b.height >= this.launchPos.y - 50) {
                this.phase = GamePhase.GAME_OVER;
                if (this.onGameOver) this.onGameOver(this.score);
            }
        });

        this.emitMetrics();
    }

    private emitMetrics() {
        if (this.onMetricUpdate) {
            this.onMetricUpdate(this.score, this.level, this.totalBalls);
        }
    }

    public recallBalls() {
        this.endTurn();
        if (this.onLongTurn) this.onLongTurn(false);
    }

    public getSnapshot(): GameSnapshot {
        return {
            level: this.level,
            score: this.score,
            totalBalls: this.totalBalls,
            launchPos: { ...this.launchPos },
            blocks: this.blocks.map(b => ({
                id: b.id,
                col: b.col,
                row: b.row,
                hp: b.hp,
                maxHp: b.maxHp,
                type: b.type,
                gimmick: (b.gimmick || 'NONE') as 'NONE' | 'EXPLOSIVE' | 'GOLD' | 'POISON',
            })),
            items: this.items.map(i => ({
                id: i.id,
                col: i.col,
                row: i.row,
            })),
        };
    }

    public restoreFromSnapshot(snapshot: GameSnapshot): void {
        this.level = snapshot.level;
        this.score = snapshot.score;
        this.totalBalls = snapshot.totalBalls;
        this.launchPos = { ...snapshot.launchPos };

        // Restore blocks
        this.blocks = snapshot.blocks.map(bs => {
            const block = new BlockEntity(bs.id, bs.col, bs.row, bs.hp, bs.type, bs.gimmick);
            block.maxHp = bs.maxHp;
            return block;
        });

        // Remove the bottom-most row of blocks to give the player breathing room
        if (this.blocks.length > 0) {
            const maxRow = Math.max(...this.blocks.map(b => b.row));
            this.blocks = this.blocks.filter(b => b.row !== maxRow);
        }

        // Restore items
        this.items = snapshot.items.map(is => new ItemEntity(is.id, is.col, is.row));

        this.updateBlockLayout();
        this.resetBalls();

        // Reset visual effects
        this.dyingBlocks = [];
        this.floatingTexts = [];
        this.comboDisplay = null;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.screenFlashes = [];
        this.levelUpDisplay = null;

        this.phase = GamePhase.AIMING;
        this.emitMetrics();
    }

    private loadBallTheme() {
        const savedTheme = localStorage.getItem('sbb_theme');
        if (savedTheme && THEME_COLORS[savedTheme]) {
            this.ballColor = THEME_COLORS[savedTheme];
        } else {
            this.ballColor = THEME_COLORS['cyan'];
        }
    }

    public refreshTheme() {
        this.loadBallTheme();
    }

    private moveBlocksDown() {
        this.blocks.forEach(b => b.row++);
        this.items.forEach(i => i.row++);
        this.updateBlockLayout();
    }

    private addBlockRow() {
        for (let col = 0; col < CONSTANTS.COLS; col++) {
            const rand = Math.random();
            if (rand < 0.1) {
                const item = new ItemEntity(`${Date.now()}-i-${col}`, col, 1);
                this.items.push(item);
            } else if (rand < 0.6) {
                const tierRand = Math.random();
                let multiplier = 1;
                if (tierRand < 0.40) {
                    multiplier = 0.1 + Math.random() * 0.4;
                } else if (tierRand < 0.80) {
                    multiplier = 0.7 + Math.random() * 0.6;
                } else if (tierRand < 0.95) {
                    multiplier = 1.5 + Math.random() * 1.0;
                } else {
                    multiplier = 3.0 + Math.random() * 2.0;
                }
                let hp = Math.floor(this.level * multiplier);
                hp = Math.max(1, hp);
                let type: BlockEntity['type'] = 'SQUARE';
                let gimmick: BlockEntity['gimmick'] = 'NONE';
                const shapeRoll = Math.random();
                if (shapeRoll < 0.20) {
                    const types: BlockEntity['type'][] = ['TRIANGLE_TL', 'TRIANGLE_TR', 'TRIANGLE_BL', 'TRIANGLE_BR'];
                    type = types[Math.floor(Math.random() * types.length)];
                } else if (shapeRoll < 0.35) {
                    type = 'DIAMOND';
                } else if (shapeRoll < 0.50) {
                    type = 'CIRCLE';
                }
                if (type === 'SQUARE') {
                    const gimmickRoll = Math.random();
                    if (gimmickRoll < 0.05) {
                        gimmick = 'EXPLOSIVE';
                    } else if (gimmickRoll < 0.08) {
                        gimmick = 'GOLD';
                    } else if (gimmickRoll < 0.12) {
                        gimmick = 'POISON';
                    }
                }
                const block = new BlockEntity(`${Date.now()}-${col}`, col, 1, hp, type, gimmick);
                this.blocks.push(block);
            }
        }
        this.updateBlockLayout();
    }

    private triggerShake(duration: number, magnitude: number) {
        this.shakeTime = duration;
        this.shakeMagnitude = magnitude;
    }

    /** Get the display color for a block */
    private getBlockColor(block: BlockEntity): string {
        if (block.gimmick === 'EXPLOSIVE') return '#f97316';
        if (block.gimmick === 'GOLD') return '#fbbf24';
        if (block.gimmick === 'POISON') return '#a855f7';
        const band = Math.floor((block.hp - 1) / 10);
        const gradientIndex = band % CONSTANTS.COLORS.blockGradient.length;
        return CONSTANTS.COLORS.blockGradient[gradientIndex] || '#fff';
    }

    // --- Rounded Rect Helper ---
    private roundRect(x: number, y: number, w: number, h: number, r: number) {
        const ctx = this.ctx;
        if (w <= 0 || h <= 0) return;
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        if (r < 0) r = 0;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    private draw() {
        const ctx = this.ctx;

        // Skip rendering if canvas not yet sized
        if (this.width <= 0 || this.height <= 0) return;

        // 1. Background clear
        ctx.fillStyle = CONSTANTS.COLORS.background;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.save();

        // Apply Shake
        if (this.shakeTime > 0) {
            const dx = (Math.random() - 0.5) * this.shakeMagnitude;
            const dy = (Math.random() - 0.5) * this.shakeMagnitude;
            ctx.translate(dx, dy);
        }

        // 2. Draw Particles (Glowy)
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'white';
        this.particles.draw(ctx);
        ctx.shadowBlur = 0;

        // 3. Draw Living Blocks (with damage overlay + crack lines)
        this.drawBlocks();

        // 4. Draw Dying Blocks (shrink + fade)
        this.drawDyingBlocks();

        // 5. Draw Score Popups & Combo
        this.drawFloatingTexts();
        this.drawComboDisplay();

        // 6. Draw Danger Zone Warning
        this.drawDangerZone();

        // 7. Draw Items (with pulsing glow)
        this.drawItems();

        // 8. Draw Ball Trails → Ball Bodies
        this.drawBallTrails();
        this.drawBalls();

        // 9. Draw Launch Position + Aim Line
        this.drawLaunchAndAim();

        // 10. Draw Level Up Display
        this.drawLevelUpDisplay();

        ctx.restore();

        // 11. Screen Flash (drawn after restore, on top of everything)
        this.drawScreenFlashes();
    }

    // --- Block Drawing with Damage Overlay + Crack Lines ---
    private drawBlocks() {
        const ctx = this.ctx;

        this.blocks.forEach(block => {
            if (block.hp <= 0) return;

            const x = block.x;
            const y = block.y;
            const w = block.width;
            const h = block.height;

            let color: string;
            let icon = '';

            if (block.gimmick === 'EXPLOSIVE') {
                color = '#f97316';
                icon = '\u{1F4A5}';
            } else if (block.gimmick === 'GOLD') {
                color = '#fbbf24';
                icon = '\u{2B50}';
            } else if (block.gimmick === 'POISON') {
                color = '#a855f7';
                icon = '\u{2620}\u{FE0F}';
            } else {
                const band = Math.floor((block.hp - 1) / 10);
                const gradientIndex = band % CONSTANTS.COLORS.blockGradient.length;
                color = CONSTANTS.COLORS.blockGradient[gradientIndex] || '#fff';
            }

            ctx.fillStyle = color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;

            ctx.beginPath();
            if (block.type === 'SQUARE') {
                this.roundRect(x + 2, y + 2, w - 4, h - 4, 8);
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.stroke();
            } else if (block.type === 'CIRCLE') {
                const cx = x + w / 2;
                const cy = y + h / 2;
                const radius = Math.max(1, Math.min(w, h) / 2 - 3);
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.stroke();

                // Damage overlay for circle
                const safeRadius = radius;
                this.drawBlockDamageOverlay(block, () => {
                    ctx.beginPath();
                    ctx.arc(cx, cy, safeRadius, 0, Math.PI * 2);
                });

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 18px Rajdhani';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText(block.hp.toString(), cx, cy);
                ctx.shadowBlur = 0;
                return;
            } else if (block.type === 'DIAMOND') {
                const cx = x + w / 2;
                const cy = y + h / 2;
                const hw = (w - 4) / 2;
                const hh = (h - 4) / 2;
                ctx.moveTo(cx, cy - hh);
                ctx.lineTo(cx + hw, cy);
                ctx.lineTo(cx, cy + hh);
                ctx.lineTo(cx - hw, cy);
                ctx.closePath();
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.stroke();

                // Damage overlay for diamond
                this.drawBlockDamageOverlay(block, () => {
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - hh);
                    ctx.lineTo(cx + hw, cy);
                    ctx.lineTo(cx, cy + hh);
                    ctx.lineTo(cx - hw, cy);
                    ctx.closePath();
                });

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 18px Rajdhani';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText(block.hp.toString(), cx, cy);
                ctx.shadowBlur = 0;
                return;
            } else {
                // Triangle Rendering
                let cx = x + w / 2;
                let cy = y + h / 2;

                switch (block.type) {
                    case 'TRIANGLE_TL':
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + w, y);
                        ctx.lineTo(x, y + h);
                        cx = x + w / 3;
                        cy = y + h / 3;
                        break;
                    case 'TRIANGLE_TR':
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + w, y);
                        ctx.lineTo(x + w, y + h);
                        cx = x + (2 * w) / 3;
                        cy = y + h / 3;
                        break;
                    case 'TRIANGLE_BL':
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + w, y + h);
                        ctx.lineTo(x, y + h);
                        cx = x + w / 3;
                        cy = y + (2 * h) / 3;
                        break;
                    case 'TRIANGLE_BR':
                        ctx.moveTo(x + w, y);
                        ctx.lineTo(x + w, y + h);
                        ctx.lineTo(x, y + h);
                        cx = x + (2 * w) / 3;
                        cy = y + (2 * h) / 3;
                        break;
                }
                ctx.closePath();
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.stroke();

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px Rajdhani';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText(block.hp.toString(), cx, cy);
                ctx.shadowBlur = 0;
                return;
            }

            // Damage overlay for SQUARE blocks
            this.drawBlockDamageOverlay(block, () => {
                this.roundRect(x + 2, y + 2, w - 4, h - 4, 8);
            });

            // Text for SQUARE blocks
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px Rajdhani';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;

            if (icon) {
                // POISON pulsation animation for skull icon
                if (block.gimmick === 'POISON') {
                    const pulse = Math.sin(Date.now() / 150) * 0.15 + 1.0;
                    ctx.save();
                    ctx.translate(x + w / 2, y + h / 2 + 10);
                    ctx.scale(pulse, pulse);
                    ctx.fillText(block.hp.toString(), 0, -16);
                    ctx.font = '14px sans-serif';
                    ctx.fillText(icon, 0, 0);
                    ctx.restore();
                } else {
                    ctx.fillText(`${block.hp}`, x + w / 2, y + h / 2 - 6);
                    ctx.font = '12px sans-serif';
                    ctx.fillText(icon, x + w / 2, y + h / 2 + 10);
                }
            } else {
                ctx.fillText(block.hp.toString(), x + w / 2, y + h / 2);
            }
            ctx.shadowBlur = 0;
        });
    }

    /** Draw damage overlay (darkening) + crack lines based on HP ratio */
    private drawBlockDamageOverlay(block: BlockEntity, shapeFn: () => void) {
        const ctx = this.ctx;
        const hpRatio = block.hp / block.maxHp;

        // Dark overlay as damage increases
        if (hpRatio < 1.0) {
            const darkness = (1 - hpRatio) * 0.4;
            ctx.save();
            ctx.globalAlpha = darkness;
            ctx.fillStyle = '#000';
            shapeFn();
            ctx.fill();
            ctx.restore();
        }

        // Crack lines when HP <= 50%
        if (hpRatio <= 0.5 && block.type === 'SQUARE') {
            const cx = block.x + block.width / 2;
            const cy = block.y + block.height / 2;
            const seed = this.hashId(block.id);
            const crackAlpha = Math.min(1.0, (0.5 - hpRatio) * 2.5);

            ctx.save();
            ctx.globalAlpha = crackAlpha * 0.6;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();

            // Generate pseudo-random crack pattern from block ID
            const a1 = ((seed * 7) % 360) * Math.PI / 180;
            const a2 = ((seed * 13 + 120) % 360) * Math.PI / 180;
            const len = block.width * 0.35;

            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a1) * len, cy + Math.sin(a1) * len);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a2) * len * 0.8, cy + Math.sin(a2) * len * 0.8);

            if (hpRatio <= 0.25) {
                const a3 = ((seed * 19 + 240) % 360) * Math.PI / 180;
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(a3) * len * 0.6, cy + Math.sin(a3) * len * 0.6);
            }

            ctx.stroke();
            ctx.restore();
        }
    }

    /** Simple string hash for deterministic crack patterns */
    private hashId(id: string): number {
        let h = 0;
        for (let i = 0; i < id.length; i++) {
            h = ((h << 5) - h + id.charCodeAt(i)) | 0;
        }
        return Math.abs(h);
    }

    // --- Dying Blocks (shrink + fade) ---
    private drawDyingBlocks() {
        const ctx = this.ctx;

        this.dyingBlocks.forEach(db => {
            const progress = 1 - (db.timer / db.maxTimer); // 0→1
            const scale = 1 - progress; // 1→0
            const alpha = scale;

            if (alpha <= 0) return;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = db.color;

            const cx = db.x + db.width / 2;
            const cy = db.y + db.height / 2;
            const sw = db.width * scale;
            const sh = db.height * scale;

            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            ctx.translate(-cx, -cy);

            const circleR = Math.max(1, Math.min(sw, sh) / 2 - 3);
            ctx.beginPath();
            if (db.type === 'SQUARE') {
                this.roundRect(db.x + 2, db.y + 2, db.width - 4, db.height - 4, 8);
            } else if (db.type === 'CIRCLE') {
                ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
            } else {
                this.roundRect(db.x + 2, db.y + 2, db.width - 4, db.height - 4, 4);
            }
            ctx.fill();
            ctx.restore();
        });
    }

    // --- Floating Score Texts ---
    private drawFloatingTexts() {
        const ctx = this.ctx;

        this.floatingTexts.forEach(ft => {
            const progress = 1 - (ft.timer / ft.maxTimer);
            const alpha = 1 - progress;
            const yOffset = progress * 40; // Float upward 40px

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = ft.color;
            ctx.font = `bold ${ft.fontSize}px Rajdhani`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y - yOffset);
            ctx.restore();
        });
    }

    // --- Combo Display ---
    private drawComboDisplay() {
        if (!this.comboDisplay) return;

        const ctx = this.ctx;
        const cd = this.comboDisplay;
        const elapsed = cd.maxTimer - cd.timer;

        let alpha = 1;
        let scale = 1;

        if (cd.phase === 'pop') {
            // Pop-in: scale from 0.5 to 1.2 to 1.0
            const t = elapsed / 0.15;
            scale = 0.5 + t * 0.7;
            if (scale > 1.2) scale = 1.2;
        } else if (cd.phase === 'hold') {
            scale = 1.0;
        } else {
            // Fade out
            alpha = cd.timer / 0.3;
            scale = 1.0 + (1 - alpha) * 0.2;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cx = this.width / 2;
        const cy = this.height / 2 - 50;

        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 36px Rajdhani';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 20;
        ctx.fillText(`COMBO x${cd.count}`, 0, 0);
        ctx.restore();
    }

    // --- Danger Zone Warning ---
    private drawDangerZone() {
        const ctx = this.ctx;
        const dangerThreshold = 100; // px from launch position

        let closestDist = Infinity;
        this.blocks.forEach(b => {
            if (b.hp <= 0) return;
            const blockBottom = b.y + b.height;
            const dist = this.launchPos.y - blockBottom;
            if (dist < closestDist) closestDist = dist;
        });

        if (closestDist < dangerThreshold && closestDist > 0) {
            const intensity = 1 - (closestDist / dangerThreshold); // 0→1 as closer
            const pulseSpeed = 150; // ms per pulse cycle
            const pulse = Math.sin(Date.now() / pulseSpeed * Math.PI) * 0.5 + 0.5;

            // Red gradient area at bottom
            const gradientHeight = 60 * intensity;
            const gradY = this.launchPos.y - gradientHeight;
            const grad = ctx.createLinearGradient(0, gradY, 0, this.launchPos.y);
            grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
            grad.addColorStop(1, `rgba(255, 0, 0, ${0.15 * intensity * (0.5 + pulse * 0.5)})`);

            ctx.fillStyle = grad;
            ctx.fillRect(0, gradY, this.width, gradientHeight);

            // Pulsing red line
            ctx.save();
            ctx.strokeStyle = `rgba(255, 50, 50, ${(0.4 + pulse * 0.4) * intensity})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(0, this.launchPos.y - 50);
            ctx.lineTo(this.width, this.launchPos.y - 50);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    // --- Items ---
    private drawItems() {
        const ctx = this.ctx;
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;

        this.items.forEach(item => {
            if (item.collected) return;

            ctx.shadowBlur = 15 * pulse;
            ctx.shadowColor = CONSTANTS.COLORS.primary;

            ctx.fillStyle = CONSTANTS.COLORS.primary;
            ctx.beginPath();
            ctx.arc(item.x, item.y, item.radius * (0.9 + pulse * 0.1), 0, Math.PI * 2);
            ctx.fill();

            ctx.lineWidth = 3;
            ctx.strokeStyle = '#fff';
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Rajdhani';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+1', item.x, item.y);

            ctx.shadowBlur = 0;
        });
    }

    // --- Ball Trails ---
    private drawBallTrails() {
        const ctx = this.ctx;

        this.balls.forEach(ball => {
            if (!ball.isActive || ball.trail.length === 0) return;

            for (let i = 0; i < ball.trail.length; i++) {
                const t = ball.trail[i];
                const frac = 1 - (i + 1) / (ball.trail.length + 1); // 1→0
                const radius = CONSTANTS.BALL_RADIUS * frac * 0.7;
                const alpha = frac * 0.35;

                if (radius < 0.5) continue;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.ballColor;
                ctx.beginPath();
                ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
    }

    // --- Balls ---
    private drawBalls() {
        const ctx = this.ctx;

        ctx.fillStyle = this.ballColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.ballColor;

        this.balls.forEach(ball => {
            if (ball.isActive) {
                ctx.beginPath();
                ctx.arc(ball.position.x, ball.position.y, CONSTANTS.BALL_RADIUS, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath();
                ctx.arc(ball.position.x - 2, ball.position.y - 2, CONSTANTS.BALL_RADIUS * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = this.ballColor;
            }
        });
        ctx.shadowBlur = 0;
    }

    // --- Launch Position & Aim Line (Dot-based) ---
    private drawLaunchAndAim() {
        const ctx = this.ctx;

        if (this.phase !== GamePhase.AIMING) return;

        const cx = this.launchPos.x;
        const cy = this.launchPos.y;
        const outerR = CONSTANTS.BALL_RADIUS * 2;
        const innerR = CONSTANTS.BALL_RADIUS;

        // Outer ring (pulsing)
        const ringPulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
        ctx.strokeStyle = `rgba(255,255,255,${ringPulse * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ball
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Aim Line: Dot-based with arrow head
        if (Vec2.mag(this.aimVector) > 10) {
            const points = this.physics.predictTrajectory(this.launchPos, this.aimVector, 2, this.blocks);

            if (points.length >= 2) {
                // Draw dots along each segment
                const dotSpacing = 12;
                let totalDist = 0;

                // Calculate total path length for fading
                let pathLength = 0;
                for (let i = 1; i < points.length; i++) {
                    pathLength += Vec2.mag(Vec2.sub(points[i], points[i - 1]));
                }

                for (let seg = 0; seg < points.length - 1; seg++) {
                    const p1 = points[seg];
                    const p2 = points[seg + 1];
                    const segVec = Vec2.sub(p2, p1);
                    const segLen = Vec2.mag(segVec);
                    if (segLen < 1) continue;
                    const segDir = Vec2.normalize(segVec);

                    let d = (seg === 0) ? (this.aimOffset % dotSpacing) : 0;
                    while (d < segLen) {
                        const px = p1.x + segDir.x * d;
                        const py = p1.y + segDir.y * d;
                        const distFromStart = totalDist + d;
                        const fade = Math.max(0, 1 - distFromStart / pathLength);
                        const glowPulse = Math.sin(Date.now() / 300 + distFromStart * 0.05) * 0.2 + 0.8;

                        ctx.save();
                        ctx.globalAlpha = fade * 0.6 * glowPulse;
                        ctx.fillStyle = '#fff';
                        ctx.shadowBlur = 6;
                        ctx.shadowColor = 'rgba(255,255,255,0.5)';
                        ctx.beginPath();
                        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();

                        d += dotSpacing;
                    }
                    totalDist += segLen;
                }

                // Arrow head at end of trajectory
                const lastPt = points[points.length - 1];
                const prevPt = points[points.length - 2];
                const dir = Vec2.normalize(Vec2.sub(lastPt, prevPt));
                const arrowSize = 8;

                const perpX = -dir.y;
                const perpY = dir.x;

                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.moveTo(lastPt.x, lastPt.y);
                ctx.lineTo(lastPt.x - dir.x * arrowSize + perpX * arrowSize * 0.5,
                           lastPt.y - dir.y * arrowSize + perpY * arrowSize * 0.5);
                ctx.lineTo(lastPt.x - dir.x * arrowSize - perpX * arrowSize * 0.5,
                           lastPt.y - dir.y * arrowSize - perpY * arrowSize * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }
    }

    // --- Level Up Display ---
    private drawLevelUpDisplay() {
        if (!this.levelUpDisplay) return;

        const ctx = this.ctx;
        const lu = this.levelUpDisplay;
        const elapsed = lu.maxTimer - lu.timer;

        let alpha = 1;
        let scale = 1;

        if (elapsed < 0.2) {
            // Scale in
            const t = elapsed / 0.2;
            scale = 0.3 + t * 0.7;
            alpha = t;
        } else if (lu.timer < 0.3) {
            // Fade out
            alpha = lu.timer / 0.3;
            scale = 1.0;
        }

        const cx = this.width / 2;
        const cy = this.height / 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        // Main text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Rajdhani';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
        ctx.fillText(`LEVEL ${lu.level}`, 0, -15);

        // Sub text
        ctx.font = 'bold 20px Rajdhani';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('GET READY', 0, 25);

        ctx.restore();
    }

    // --- Screen Flashes ---
    private drawScreenFlashes() {
        if (this.screenFlashes.length === 0) return;

        const ctx = this.ctx;
        this.screenFlashes.forEach(sf => {
            const alpha = sf.timer / sf.maxTimer;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = sf.color;
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.restore();
        });
    }
}
