import type { Vector } from './types';

export class Vec2 {
    static add(v1: Vector, v2: Vector): Vector {
        return { x: v1.x + v2.x, y: v1.y + v2.y };
    }

    static sub(v1: Vector, v2: Vector): Vector {
        return { x: v1.x - v2.x, y: v1.y - v2.y };
    }

    static mul(v: Vector, s: number): Vector {
        return { x: v.x * s, y: v.y * s };
    }

    static dot(v1: Vector, v2: Vector): number {
        return v1.x * v2.x + v1.y * v2.y;
    }

    static mag(v: Vector): number {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    static normalize(v: Vector): Vector {
        const m = Vec2.mag(v);
        if (m === 0 || isNaN(m)) return { x: 0, y: 0 };
        return { x: v.x / m, y: v.y / m };
    }

    static dist(v1: Vector, v2: Vector): number {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static reflect(v: Vector, normal: Vector): Vector {
        // r = d - 2(d . n)n
        const dot = Vec2.dot(v, normal);
        return Vec2.sub(v, Vec2.mul(normal, 2 * dot));
    }
}
