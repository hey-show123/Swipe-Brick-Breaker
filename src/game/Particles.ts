interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    alpha: number;
    active: boolean;
}

const MAX_PARTICLES = 300;

export class ParticleSystem {
    private pool: Particle[] = [];
    private activeCount: number = 0;

    constructor() {
        // Pre-allocate pool
        for (let i = 0; i < MAX_PARTICLES; i++) {
            this.pool.push({
                x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 1, color: '#fff',
                size: 3, alpha: 1, active: false,
            });
        }
    }

    private findInactive(): Particle | null {
        for (let j = 0; j < this.pool.length; j++) {
            if (!this.pool[j].active) return this.pool[j];
        }
        return null;
    }

    public emit(x: number, y: number, count: number, color: string, speed: number = 100, size: number = 3) {
        for (let i = 0; i < count; i++) {
            const p = this.findInactive();
            if (!p) return;

            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * speed;

            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.life = 0.4 + Math.random() * 0.4;
            p.maxLife = p.life;
            p.color = color;
            p.size = size * (0.5 + Math.random());
            p.alpha = 1.0;
            p.active = true;
            this.activeCount++;
        }
    }

    /** Emit particles in a directional cone (for destruction bursts) */
    public emitDirectional(x: number, y: number, count: number, color: string, angle: number, spread: number, speed: number = 150, size: number = 3) {
        for (let i = 0; i < count; i++) {
            const p = this.findInactive();
            if (!p) return;

            const a = angle + (Math.random() - 0.5) * spread;
            const spd = speed * (0.5 + Math.random() * 0.5);

            p.x = x;
            p.y = y;
            p.vx = Math.cos(a) * spd;
            p.vy = Math.sin(a) * spd;
            p.life = 0.3 + Math.random() * 0.5;
            p.maxLife = p.life;
            p.color = color;
            p.size = size * (0.5 + Math.random());
            p.alpha = 1.0;
            p.active = true;
            this.activeCount++;
        }
    }

    public update(dt: number) {
        this.activeCount = 0;
        for (let i = 0; i < this.pool.length; i++) {
            const p = this.pool[i];
            if (!p.active) continue;

            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
                continue;
            }

            this.activeCount++;

            // Physics
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Gravity
            p.vy += 500 * dt;

            // Friction
            p.vx *= 0.95;
            p.vy *= 0.95;

            // Fade out
            p.alpha = p.life / p.maxLife;
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (this.activeCount === 0) return;

        ctx.save();
        for (let i = 0; i < this.pool.length; i++) {
            const p = this.pool[i];
            if (!p.active) continue;

            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
