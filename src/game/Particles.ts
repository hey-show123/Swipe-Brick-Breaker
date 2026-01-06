

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;     // 0.0 to 1.0 (or duration in sec)
    maxLife: number;
    color: string;
    size: number;
    alpha: number;
}

export class ParticleSystem {
    private particles: Particle[] = [];

    public emit(x: number, y: number, count: number, color: string, speed: number = 100, size: number = 3) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * speed;

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 0.5 + Math.random() * 0.5, // 0.5 - 1.0s
                maxLife: 1.0,
                color,
                size: size * (0.5 + Math.random()),
                alpha: 1.0
            });
        }
    }

    public update(dt: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            // Physics
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Gravity
            p.vy += 500 * dt; // Gravity

            // Friction
            p.vx *= 0.95;
            p.vy *= 0.95;

            // Fade out
            p.alpha = p.life / p.maxLife;
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
