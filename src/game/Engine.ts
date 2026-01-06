import { CONSTANTS } from './Constants';
import { GamePhase } from './types';
import type { Vector } from './types';
import { Vec2 } from './Vector';
import { BallEntity, BlockEntity, ItemEntity } from './Entities';
import { PhysicsSystem } from './Physics';
import { InputHandler } from './InputHandler';
import { ParticleSystem } from './Particles';

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
    private totalBalls: number = 5;
    private ballsReturned: number = 0;
    private launchPos: { x: number, y: number } = { x: 0, y: 0 };
    private launchVector: { x: number, y: number } | null = null;
    private launchIntervalId: number | null = null;
    private turnTimer: number = 0;
    private timeScale: number = 1.0;
    private isPaused: boolean = false;
    private aimOffset: number = 0; // For aim line animation

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

        // Bind Physics Events
        this.physics.onCollision = (pos, type, color) => {
            if (type === 'DESTROY') {
                // Explosion
                this.particles.emit(pos.x, pos.y, 20, color || '#fff', 200, 5);
                this.triggerShake(0.3, 10);
            } else {
                // Spark
                this.particles.emit(pos.x, pos.y, 5, '#fff', 100, 2);
            }
        };

        // Bind Input Actions
        // Bind Input Actions
        this.input.onAim = (pos) => {
            if (this.phase === GamePhase.AIMING) {
                // Vector = Cursor - LaunchPos
                this.aimVector = Vec2.sub(pos, this.launchPos);
            }
        };

        this.input.onShoot = (pos) => {
            if (this.phase === GamePhase.AIMING) {
                const vector = Vec2.sub(pos, this.launchPos);
                // Min distance check
                if (Vec2.mag(vector) > 10) {
                    this.startShooting(vector);
                    this.aimVector = { x: 0, y: 0 };
                }
            }
        };

        this.resize();

        // Setup initial game state
        this.resetGame();

        window.addEventListener('resize', () => this.resize());
    }

    private resetGame() {
        this.level = 1;
        this.score = 0;
        this.totalBalls = 1; // Start with 10? Requirement said 10. Let's start with 10.
        this.blocks = [];
        this.items = [];
        this.launchPos = { x: this.width / 2, y: this.height - 100 };

        // Add first row
        this.addBlockRow();

        // Reset Balls
        this.resetBalls();
    }

    private resetBalls() {
        this.balls = [];
        for (let i = 0; i < this.totalBalls; i++) {
            // All balls start at launchPos
            const ball = new BallEntity(i, this.launchPos.x, this.launchPos.y);
            ball.isActive = false; // Waiting to launch
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

            // Update Physics bounds
            this.physics.updateDimensions(this.width, this.height);

            // If first run, center launch pos
            if (this.balls.length === 0 && this.width > 0) {
                this.launchPos = { x: this.width / 2, y: this.height - 100 };
                this.resetBalls();
            }

            // Make sure launch pos stays within bounds if resized
            if (this.launchPos.x > this.width) this.launchPos.x = this.width - 20;
            if (this.launchPos.y > this.height) this.launchPos.y = this.height - 50;

            // Update Block Positions based on new width
            this.updateBlockLayout();
        }
    }

    private updateBlockLayout() {
        const blockWidth = (this.width - (CONSTANTS.COLS + 1) * CONSTANTS.BLOCK_GAP) / CONSTANTS.COLS;
        const blockHeight = blockWidth; // Square blocks

        this.blocks.forEach(b => {
            b.updatePosition(blockWidth, blockHeight, CONSTANTS.BLOCK_GAP, CONSTANTS.BLOCK_GAP * 12); // Top padding increased
        });
        this.items.forEach(i => i.updatePosition(blockWidth, blockHeight, CONSTANTS.BLOCK_GAP, CONSTANTS.BLOCK_GAP * 12));
    }

    public start() {
        if (this.animationId) return;

        // Dismiss any keyboard/inputs
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
            // Reset lastTime to avoid huge dt jump
            this.lastTime = performance.now();
        }
    }

    private loop = (timestamp: number) => {
        if (!this.lastTime) this.lastTime = timestamp;

        // If paused, just keep requesting animation frame to keep loop alive (or stop updating)
        // We can skip updating but maybe keep drawing? 
        // For battery, maybe we can stop drawing too, but let's keep drawing in case we want a "frozen" backdrop
        if (this.isPaused) {
            this.lastTime = timestamp; // Consume time
            this.animationId = requestAnimationFrame(this.loop);
            return;
        }

        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Safety: Clamp dt to max 100ms (10fps min) to prevent huge physics jumps
        if (dt > 0.1) dt = 0.1;

        this.update(dt);
        this.draw();

        this.animationId = requestAnimationFrame(this.loop);
    };

    private startShooting(vector: Vector) {
        // Normalize vector
        const norm = Vec2.normalize(vector);
        // Shoot UP usually, so flip Y if dragging DOWN (Drag Down to Shoot Up)

        this.launchVector = Vec2.mul(norm, CONSTANTS.BALL_SPEED);
        this.phase = GamePhase.SHOOTING;
        this.ballsReturned = 0;
        this.turnTimer = 0;
        this.timeScale = 1.0;
        if (this.onLongTurn) this.onLongTurn(false);

        // Launch balls sequence
        let firedCount = 0;

        // Clear interval if any
        if (this.launchIntervalId) clearInterval(this.launchIntervalId);

        // Fire every 60ms
        this.launchIntervalId = window.setInterval(() => {
            if (firedCount >= this.balls.length) {
                if (this.launchIntervalId) clearInterval(this.launchIntervalId);
                return;
            }

            const ball = this.balls[firedCount];
            ball.isActive = true;
            ball.isReturning = false; // Ensure clean state
            ball.position = { ...this.launchPos };
            ball.velocity = { ...this.launchVector! };
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
        this.aimOffset = (this.aimOffset + dt * 20) % 16;

        if (this.phase === GamePhase.SHOOTING || this.phase === GamePhase.RETURNING) {
            // Auto Fast Forward Logic
            this.turnTimer += dt;
            if (this.turnTimer > 15 && this.timeScale < 2.0) {
                this.timeScale = 2.0;
                if (this.onLongTurn) this.onLongTurn(true); // Show button after 15s
            }
            if (this.turnTimer > 25 && this.timeScale < 3.0) {
                this.timeScale = 3.0; // Faster
            }

            // Apply Time Scale
            const scaledDt = dt * this.timeScale;

            this.physics.update(scaledDt, this.balls, this.blocks, this.items);

            // Scoring and Gimmicks
            const destroyedBlocks = this.blocks.filter(b => b.hp <= 0);

            // Handle EXPLOSIVE gimmick
            destroyedBlocks.forEach(block => {
                if (block.gimmick === 'EXPLOSIVE') {
                    // Damage adjacent blocks
                    this.blocks.forEach(other => {
                        if (other.hp <= 0) return;
                        const colDiff = Math.abs(other.col - block.col);
                        const rowDiff = Math.abs(other.row - block.row);
                        if (colDiff <= 1 && rowDiff <= 1 && (colDiff + rowDiff > 0)) {
                            other.hp -= 2;
                            // Particle effect
                            this.particles.emit(other.x + other.width / 2, other.y + other.height / 2, 5, '#f97316');
                        }
                    });
                    // Big explosion particles
                    for (let i = 0; i < 15; i++) {
                        this.particles.emit(block.x + block.width / 2, block.y + block.height / 2, 3, '#f97316');
                    }
                    this.triggerShake(0.2, 8);
                }
            });

            // Calculate score
            let scoreGain = 0;
            destroyedBlocks.forEach(block => {
                if (block.gimmick === 'GOLD') {
                    scoreGain += 500; // 5x the normal 100
                } else {
                    scoreGain += 100;
                }
            });

            this.blocks = this.blocks.filter(b => b.hp > 0);

            if (scoreGain > 0) {
                this.score += scoreGain;
                this.emitMetrics();
            }

            // Items Collection
            // Create a safe copy or iterate carefully
            if (this.items && this.items.length > 0) {
                for (const item of this.items) {
                    if (item.collected) {
                        // Schedule +1 ball for NEXT turn
                        // For now, simpler: increments totalBalls immediately, but effective next reset.
                        // We should probably show a visual "+1".
                    }
                }
                const collectedCount = this.items.filter(i => i.collected).length;
                if (collectedCount > 0) {
                    this.totalBalls += collectedCount;
                    this.emitMetrics();
                }
                this.items = this.items.filter(i => !i.collected);
            }

            // check for returning balls
            this.balls.forEach(ball => {
                // Skip balls already processed (e.g., killed by POISON)
                if (ball.isReturning) return;

                if (ball.isActive) {
                    // Check if fell to bottom
                    if (ball.position.y >= this.height - CONSTANTS.BALL_RADIUS) {
                        ball.isActive = false;
                        ball.isReturning = true;
                        this.ballsReturned++;

                        if (!this.launchPosUpdated) {
                            this.nextLaunchPos = { x: ball.position.x, y: this.height - 100 };
                            this.launchPosUpdated = true;
                        }
                    }
                } else if (!ball.isActive && !ball.isReturning) {
                    // Ball was killed (e.g., by POISON) but not yet counted
                    ball.isReturning = true;
                    this.ballsReturned++;
                }
            });

            // Check if all balls are back
            if (this.ballsReturned >= this.balls.length) {
                this.endTurn();
            }
        }
    }

    private launchPosUpdated = false;
    private nextLaunchPos: Vector | null = null;

    private endTurn() {
        this.phase = GamePhase.AIMING;
        if (this.nextLaunchPos) {
            this.launchPos = this.nextLaunchPos;
        }
        this.launchPosUpdated = false;
        this.nextLaunchPos = null;

        // Advance Level
        this.level++;
        // Removed auto +1 ball per level to rely on items? Or both?
        // Usually +1 per item. Let's stick to Items for +1.

        this.moveBlocksDown();
        this.addBlockRow();

        // Reset balls
        this.resetBalls();

        // Check Game Over
        this.blocks.forEach(b => {
            if (b.y + b.height >= this.launchPos.y - 50) { // Safety margin
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
        // Force end turn immediately
        this.endTurn();
        if (this.onLongTurn) this.onLongTurn(false);
    }

    private moveBlocksDown() {
        // blocks.row++
        this.blocks.forEach(b => b.row++);
        this.items.forEach(i => i.row++); // Move items too

        // Remove blocks/items that fall out?
        // Actually if they hit bottom = Game Over.
        // Items hitting bottom = lost? usually they stay until collected or game over.

        this.updateBlockLayout();
    }

    private addBlockRow() {
        for (let col = 0; col < CONSTANTS.COLS; col++) {
            const rand = Math.random();
            if (rand < 0.1) {
                // 10% chance for Item
                const item = new ItemEntity(`${Date.now()}-i-${col}`, col, 1);
                this.items.push(item);
            } else if (rand < 0.6) {
                // 50% chance for block (Increased from 40%)

                // Smart HP Distribution (Randomized Ranges)
                const tierRand = Math.random();
                let multiplier = 1;

                if (tierRand < 0.40) {
                    // Weak: 0.1x to 0.5x
                    multiplier = 0.1 + Math.random() * 0.4;
                } else if (tierRand < 0.80) {
                    // Standard: 0.7x to 1.3x
                    multiplier = 0.7 + Math.random() * 0.6;
                } else if (tierRand < 0.95) {
                    // Elite: 1.5x to 2.5x
                    multiplier = 1.5 + Math.random() * 1.0;
                } else {
                    // Boss: 3.0x to 5.0x
                    multiplier = 3.0 + Math.random() * 2.0;
                }

                let hp = Math.floor(this.level * multiplier);
                hp = Math.max(1, hp);

                let type: BlockEntity['type'] = 'SQUARE';
                let gimmick: BlockEntity['gimmick'] = 'NONE';

                // 50% chance for special shape
                const shapeRoll = Math.random();
                if (shapeRoll < 0.20) {
                    const types: BlockEntity['type'][] = ['TRIANGLE_TL', 'TRIANGLE_TR', 'TRIANGLE_BL', 'TRIANGLE_BR'];
                    type = types[Math.floor(Math.random() * types.length)];
                } else if (shapeRoll < 0.35) {
                    type = 'DIAMOND';
                } else if (shapeRoll < 0.50) {
                    type = 'CIRCLE';
                }

                // Gimmick chance (only for SQUARE blocks)
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

    private draw() {
        // Clear (with slight fade for trails? No, explicit trails better)
        this.ctx.fillStyle = CONSTANTS.COLORS.background;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.save();

        // Apply Shake
        if (this.shakeTime > 0) {
            const dx = (Math.random() - 0.5) * this.shakeMagnitude;
            const dy = (Math.random() - 0.5) * this.shakeMagnitude;
            this.ctx.translate(dx, dy);
        }

        // Helper for Rounded Rect
        const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        };

        // Draw Particles (Glowy)
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'white';
        this.particles.draw(this.ctx);
        this.ctx.shadowBlur = 0;

        // Draw Blocks
        this.blocks.forEach(block => {
            if (block.hp <= 0) return;

            const x = block.x;
            const y = block.y;
            const w = block.width;
            const h = block.height;

            // Color based on gimmick first, then HP
            let color: string;
            let icon = '';

            if (block.gimmick === 'EXPLOSIVE') {
                color = '#f97316'; // Orange
                icon = '💥';
            } else if (block.gimmick === 'GOLD') {
                color = '#fbbf24'; // Gold/Yellow
                icon = '⭐';
            } else if (block.gimmick === 'POISON') {
                color = '#a855f7'; // Purple/Poison
                icon = '☠️';
            } else {
                const colorIdx = Math.min(block.hp, CONSTANTS.COLORS.blockGradient.length) - 1;
                color = CONSTANTS.COLORS.blockGradient[Math.max(0, colorIdx)] || '#fff';
            }

            this.ctx.fillStyle = color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = color;

            this.ctx.beginPath();
            if (block.type === 'SQUARE') {
                roundRect(this.ctx, x + 2, y + 2, w - 4, h - 4, 8);
                this.ctx.fill();
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                this.ctx.stroke();
            } else if (block.type === 'CIRCLE') {
                // Circle block
                const cx = x + w / 2;
                const cy = y + h / 2;
                const radius = Math.min(w, h) / 2 - 3;
                this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                this.ctx.stroke();

                // Text for circle at center
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 18px Rajdhani';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.shadowColor = 'black';
                this.ctx.shadowBlur = 4;
                this.ctx.fillText(block.hp.toString(), cx, cy);
                this.ctx.shadowBlur = 0;
                return;
            } else if (block.type === 'DIAMOND') {
                // Diamond: rotated square
                const cx = x + w / 2;
                const cy = y + h / 2;
                const hw = (w - 4) / 2;
                const hh = (h - 4) / 2;
                this.ctx.moveTo(cx, cy - hh);      // Top
                this.ctx.lineTo(cx + hw, cy);      // Right
                this.ctx.lineTo(cx, cy + hh);      // Bottom
                this.ctx.lineTo(cx - hw, cy);      // Left
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                this.ctx.stroke();

                // Text for diamond at center
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 18px Rajdhani';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.shadowColor = 'black';
                this.ctx.shadowBlur = 4;
                this.ctx.fillText(block.hp.toString(), cx, cy);
                this.ctx.shadowBlur = 0;
                return;
            } else {
                // Triangle Rendering
                let cx = x + w / 2; // Default centroid X
                let cy = y + h / 2; // Default centroid Y

                switch (block.type) {
                    case 'TRIANGLE_TL': // ◤
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(x + w, y);
                        this.ctx.lineTo(x, y + h);
                        // Centroid: (x + x+w + x) / 3, (y + y + y+h) / 3
                        cx = x + w / 3;
                        cy = y + h / 3;
                        break;
                    case 'TRIANGLE_TR': // ◥
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(x + w, y);
                        this.ctx.lineTo(x + w, y + h);
                        cx = x + (2 * w) / 3;
                        cy = y + h / 3;
                        break;
                    case 'TRIANGLE_BL': // ◣
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(x + w, y + h);
                        this.ctx.lineTo(x, y + h);
                        cx = x + w / 3;
                        cy = y + (2 * h) / 3;
                        break;
                    case 'TRIANGLE_BR': // ◢
                        this.ctx.moveTo(x + w, y);
                        this.ctx.lineTo(x + w, y + h);
                        this.ctx.lineTo(x, y + h);
                        cx = x + (2 * w) / 3;
                        cy = y + (2 * h) / 3;
                        break;
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                this.ctx.stroke();

                // Draw text at centroid for triangles
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 16px Rajdhani';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.shadowColor = 'black';
                this.ctx.shadowBlur = 4;
                this.ctx.fillText(block.hp.toString(), cx, cy);
                this.ctx.shadowBlur = 0;
                return; // Skip the common text draw below
            }

            // Text for SQUARE blocks
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 20px Rajdhani';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.shadowColor = 'black';
            this.ctx.shadowBlur = 4;

            // Show icon for gimmick blocks, or HP + icon
            if (icon) {
                this.ctx.fillText(`${block.hp}`, x + w / 2, y + h / 2 - 6);
                this.ctx.font = '12px sans-serif';
                this.ctx.fillText(icon, x + w / 2, y + h / 2 + 10);
            } else {
                this.ctx.fillText(block.hp.toString(), x + w / 2, y + h / 2);
            }
            this.ctx.shadowBlur = 0;
        });

        // Draw Items (with pulsing glow)
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7; // 0.4 to 1.0
        this.items.forEach(item => {
            if (item.collected) return;

            // Outer glow
            this.ctx.shadowBlur = 15 * pulse;
            this.ctx.shadowColor = CONSTANTS.COLORS.primary;

            this.ctx.fillStyle = CONSTANTS.COLORS.primary;
            this.ctx.beginPath();
            this.ctx.arc(item.x, item.y, item.radius * (0.9 + pulse * 0.1), 0, Math.PI * 2);
            this.ctx.fill();

            // Inner ring
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = '#fff';
            this.ctx.stroke();

            // "+1" text
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px Rajdhani';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('+1', item.x, item.y);

            this.ctx.shadowBlur = 0;
        });

        // Draw Ball Trails
        this.ctx.globalAlpha = 0.3;
        this.balls.forEach(ball => {
            if (ball.isActive && ball.velocity) {
                const trailLength = 5;
                for (let i = 1; i <= trailLength; i++) {
                    const alpha = 1 - (i / trailLength);
                    const size = CONSTANTS.BALL_RADIUS * (1 - i * 0.1);
                    const offsetX = ball.position.x - ball.velocity.x * i * 0.02;
                    const offsetY = ball.position.y - ball.velocity.y * i * 0.02;

                    this.ctx.globalAlpha = alpha * 0.4;
                    this.ctx.fillStyle = CONSTANTS.COLORS.primary;
                    this.ctx.beginPath();
                    this.ctx.arc(offsetX, offsetY, size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        });
        this.ctx.globalAlpha = 1.0;

        // Draw Balls
        this.ctx.fillStyle = CONSTANTS.COLORS.primary;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = CONSTANTS.COLORS.primary;

        this.balls.forEach(ball => {
            if (ball.isActive) {
                // Main ball
                this.ctx.beginPath();
                this.ctx.arc(ball.position.x, ball.position.y, CONSTANTS.BALL_RADIUS, 0, Math.PI * 2);
                this.ctx.fill();

                // Inner highlight
                this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
                this.ctx.beginPath();
                this.ctx.arc(ball.position.x - 2, ball.position.y - 2, CONSTANTS.BALL_RADIUS * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = CONSTANTS.COLORS.primary;
            }
        });
        this.ctx.shadowBlur = 0;

        // Draw Launch Position (if Aiming)
        if (this.phase === GamePhase.AIMING) {
            // Crosshair / Target indicator
            const cx = this.launchPos.x;
            const cy = this.launchPos.y;
            const outerR = CONSTANTS.BALL_RADIUS * 2;
            const innerR = CONSTANTS.BALL_RADIUS;

            // Outer ring (pulsing)
            const ringPulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
            this.ctx.strokeStyle = `rgba(255,255,255,${ringPulse * 0.5})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
            this.ctx.stroke();

            // Inner ball
            this.ctx.fillStyle = '#fff';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;

            // Draw Aim Line with Reflection Prediction
            if (Vec2.mag(this.aimVector) > 10) {
                // Predict path: Start Pos, Aim Vector, Max Bounces, Blocks
                const points = this.physics.predictTrajectory(this.launchPos, this.aimVector, 2, this.blocks);

                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([8, 8]);
                this.ctx.lineDashOffset = -this.aimOffset; // Animate

                this.ctx.beginPath();
                if (points.length > 0) {
                    this.ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        this.ctx.lineTo(points[i].x, points[i].y);
                    }
                }
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        this.ctx.restore();
    }
}
