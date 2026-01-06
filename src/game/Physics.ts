import type { BallEntity, BlockEntity, ItemEntity } from './Entities';
import { CONSTANTS } from './Constants';
import { Vec2 } from './Vector';
import type { Vector } from './types';

export class PhysicsSystem {
    private width: number;
    private height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    public updateDimensions(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    public onCollision: ((pos: Vector, type: 'HIT' | 'DESTROY', color: string) => void) | null = null;

    public update(dt: number, balls: BallEntity[], blocks: BlockEntity[], items: ItemEntity[]) {
        // Separate active balls to avoid iterating all
        const activeBalls = balls.filter(b => b.isActive && !b.isReturning);

        // Sub-stepping to prevent tunneling
        // Max movement per step should be less than radius
        const maxSpeed = CONSTANTS.BALL_SPEED; // approximate
        const stepSize = CONSTANTS.BALL_RADIUS * 0.5;
        const steps = Math.ceil((maxSpeed * dt) / stepSize);
        const subDt = dt / steps;

        for (let s = 0; s < steps; s++) {
            for (const ball of activeBalls) {
                this.stepBall(subDt, ball, blocks, items);
            }
        }
    }

    private stepBall(dt: number, ball: BallEntity, blocks: BlockEntity[], items: ItemEntity[]) {
        // 1. Move
        // velocity is assumed to be px/s
        const nextPos = Vec2.add(ball.position, Vec2.mul(ball.velocity, dt));

        // 2. Wall Collisions
        // Left
        if (nextPos.x - CONSTANTS.BALL_RADIUS < 0) {
            nextPos.x = CONSTANTS.BALL_RADIUS;
            ball.velocity.x *= -1;
        }
        // Right
        if (nextPos.x + CONSTANTS.BALL_RADIUS > this.width) {
            nextPos.x = this.width - CONSTANTS.BALL_RADIUS;
            ball.velocity.x *= -1;
        }
        // Top
        if (nextPos.y - CONSTANTS.BALL_RADIUS < 0) {
            nextPos.y = CONSTANTS.BALL_RADIUS;
            ball.velocity.y *= -1;
        }
        // Bottom (Game Over / Return) behavior handled by Engine usually, 
        // but here we just clamp or let it pass for the Engine to catch 'out of bounds'
        // Limit ball return in Engine, but keep this hook if needed
        if (nextPos.y > this.height) {
            // Let it go out
        }

        // 3. Item Collisions (Sensor - No Reflection)
        for (const item of items) {
            if (item.collected) continue;

            const dx = nextPos.x - item.x;
            const dy = nextPos.y - item.y;
            const distSq = dx * dx + dy * dy;
            const combinedRadius = CONSTANTS.BALL_RADIUS + item.radius;

            if (distSq < combinedRadius * combinedRadius) {
                item.collected = true;
                // Trigger effect? (Handled by checking collected state later or event)
            }
        }

        // 4. Block Collisions


        // Optimization: Spatial partition or Grid would be better, but loop is fine for < 100 blocks
        for (const block of blocks) {
            if (block.hp <= 0) continue;

            const collision = this.checkCollision(nextPos, block);
            if (collision) {
                // POISON gimmick: destroy ball on contact
                if (block.gimmick === 'POISON') {
                    ball.isActive = false;
                    ball.isReturning = true;
                    block.hp -= 1;
                    if (this.onCollision) {
                        this.onCollision(nextPos, block.hp <= 0 ? 'DESTROY' : 'HIT', '#a855f7');
                    }
                    return; // Ball is dead, exit early
                }

                // Resolve position
                nextPos.x += collision.normal.x * collision.depth;
                nextPos.y += collision.normal.y * collision.depth;

                // Reflect velocity
                ball.velocity = Vec2.reflect(ball.velocity, collision.normal);

                // Damage block
                block.hp -= 1;

                // Event
                if (this.onCollision) {
                    this.onCollision(nextPos, block.hp <= 0 ? 'DESTROY' : 'HIT', '');
                }

                break;
            }
        }

        ball.position = nextPos;
    }

    private checkCollision(ballPos: Vector, block: BlockEntity): { normal: Vector, depth: number } | null {
        // CIRCLE: Circle-Circle collision
        if (block.type === 'CIRCLE') {
            const cx = block.x + block.width / 2;
            const cy = block.y + block.height / 2;
            const blockRadius = Math.min(block.width, block.height) / 2 - 2;

            const dx = ballPos.x - cx;
            const dy = ballPos.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const combinedRadius = CONSTANTS.BALL_RADIUS + blockRadius;

            if (dist < combinedRadius) {
                const normal = dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 0, y: -1 };
                return { normal, depth: combinedRadius - dist };
            }
            return null;
        }

        // DIAMOND: Check against 4 edges (polygon collision)
        if (block.type === 'DIAMOND') {
            const cx = block.x + block.width / 2;
            const cy = block.y + block.height / 2;
            const hw = (block.width - 4) / 2;
            const hh = (block.height - 4) / 2;

            // Diamond vertices: Top, Right, Bottom, Left
            const vertices = [
                { x: cx, y: cy - hh },      // Top
                { x: cx + hw, y: cy },      // Right
                { x: cx, y: cy + hh },      // Bottom
                { x: cx - hw, y: cy }       // Left
            ];

            // Check each edge
            let closestDist = Infinity;
            let closestNormal: Vector = { x: 0, y: -1 };

            for (let i = 0; i < 4; i++) {
                const p1 = vertices[i];
                const p2 = vertices[(i + 1) % 4];

                // Find closest point on line segment
                const edge = Vec2.sub(p2, p1);
                const toBall = Vec2.sub(ballPos, p1);
                const edgeLenSq = Vec2.dot(edge, edge);
                let t = 0;
                if (edgeLenSq > 0) {
                    t = Math.max(0, Math.min(1, Vec2.dot(toBall, edge) / edgeLenSq));
                }
                const closest = Vec2.add(p1, Vec2.mul(edge, t));

                const diff = Vec2.sub(ballPos, closest);
                const dist = Vec2.mag(diff);

                if (dist < closestDist) {
                    closestDist = dist;
                    closestNormal = dist > 0 ? Vec2.normalize(diff) : { x: 0, y: -1 };
                }
            }

            if (closestDist < CONSTANTS.BALL_RADIUS) {
                return { normal: closestNormal, depth: CONSTANTS.BALL_RADIUS - closestDist };
            }
            return null;
        }

        // SQUARE: AABB collision
        if (block.type === 'SQUARE') {
            return this.checkAABBCollision(ballPos, block);
        }

        // Triangle Collision
        const aabb = this.checkAABBCollision(ballPos, block);
        if (!aabb) return null;
        return this.checkTriangleCollision(ballPos, block, aabb);
    }

    private checkAABBCollision(ballPos: Vector, block: BlockEntity): { normal: Vector, depth: number } | null {
        let closestX = Math.max(block.x, Math.min(ballPos.x, block.x + block.width));
        let closestY = Math.max(block.y, Math.min(ballPos.y, block.y + block.height));

        const distanceX = ballPos.x - closestX;
        const distanceY = ballPos.y - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;

        const radiusSq = CONSTANTS.BALL_RADIUS * CONSTANTS.BALL_RADIUS;

        if (distanceSquared < radiusSq) {
            const distance = Math.sqrt(distanceSquared);
            const depth = CONSTANTS.BALL_RADIUS - distance;

            let normal: Vector;
            if (distance === 0) {
                // Center is inside, push out roughly
                // Use relative position to center
                const cx = block.x + block.width / 2;
                const cy = block.y + block.height / 2;
                normal = Vec2.normalize({ x: ballPos.x - cx, y: ballPos.y - cy });
                if (normal.x === 0 && normal.y === 0) normal = { x: 0, y: -1 };
            } else {
                normal = { x: distanceX / distance, y: distanceY / distance };
            }
            return { normal, depth };
        }
        return null;
    }

    private checkTriangleCollision(ballPos: Vector, block: BlockEntity, aabbCollision: { normal: Vector, depth: number }): { normal: Vector, depth: number } | null {
        // Triangle Types:
        // TL (Top Left filled): Solid diagonal from BL to TR? No, usually hypotenuse connects BL and TR.
        // 'TRIANGLE_TL': ◣ (Wait, TL filled usually means Top-Left corner is the 90deg corner)
        // So points are (x,y), (x+w, y), (x, y+h). Hypotenuse is (x+w, y) to (x, y+h).

        // Let's define the Normal of the hypotenuse
        let normal: Vector = { x: 0, y: 0 };
        let p1: Vector, p2: Vector; // Line segment points

        const x = block.x;
        const y = block.y;
        const w = block.width;
        const h = block.height;

        switch (block.type) {
            case 'TRIANGLE_TL': // ◤
                // 90deg at TopLeft. Hypotenuse bottom-left to top-right? No, (0,h) to (w,0)
                normal = { x: 1, y: 1 }; // Pointing out (down-right)
                // Wait, for ◤, hypotenuse is (x, y+h) -> (x+w, y).
                // Normal points towards positive X, positive Y.
                p1 = { x: x, y: y + h };
                p2 = { x: x + w, y: y };
                break;
            case 'TRIANGLE_TR': // ◥
                // 90deg at TopRight. Hypotenuse (x, y) -> (x+w, y+h)
                normal = { x: -1, y: 1 }; // Pointing down-left
                p1 = { x: x, y: y };
                p2 = { x: x + w, y: y + h };
                break;
            case 'TRIANGLE_BL': // ◣
                // 90deg at BottomLeft. Hypotenuse (x, y) -> (x+w, y+h)
                normal = { x: 1, y: -1 }; // Pointing up-right
                p1 = { x: x, y: y };
                p2 = { x: x + w, y: y + h };
                break;
            case 'TRIANGLE_BR': // ◢
                // 90deg at BottomRight. Hypotenuse (x, y+h) -> (x+w, y)
                normal = { x: -1, y: -1 }; // Pointing up-left
                p1 = { x: x, y: y + h };
                p2 = { x: x + w, y: y };
                break;
            default:
                return aabbCollision;
        }

        normal = Vec2.normalize(normal);

        // Distance from Ball Center to Line
        // Project (Ball - P1) onto Normal. 
        // If dist < Radius, collision.

        // We also need to be careful not to collide with the "empty" half of AABB
        // It's easier to check: Is Ball inside the Triangle + Radius?
        // For a corner, we might collide with the vertical/horizontal sides too.

        // Simple robustness:
        // 1. If AABB collision normal matches one of the flat sides (Vertical or Horizontal), and we are hitting that side, use it.
        // 2. If we are traversing the diagonal, use diagonal normal.

        // Dot product to see if we are on the "hypotenuse side" of the center
        // Or just project ball center onto the line.

        // Line equation: Ax + By + C = 0
        // Distance = (Ax + By + C) / Sqrt(A^2 + B^2)
        // Used simplified:
        const v = { x: p2.x - p1.x, y: p2.y - p1.y };
        const w_vec = { x: ballPos.x - p1.x, y: ballPos.y - p1.y };

        // Closest point on segment
        const segmentLenSq = Vec2.dot(v, v);
        let t = 0;
        if (segmentLenSq > 0) {
            t = Math.max(0, Math.min(1, Vec2.dot(w_vec, v) / segmentLenSq));
        }
        const closest = Vec2.add(p1, Vec2.mul(v, t));

        const distVec = Vec2.sub(ballPos, closest);
        const dist = Vec2.mag(distVec);

        if (dist < CONSTANTS.BALL_RADIUS) {
            // We have touched the hypotenuse/segment
            // Ensure we are striking from the outside (normal direction)
            const colNormal = Vec2.normalize(distVec);
            return { normal: colNormal, depth: CONSTANTS.BALL_RADIUS - dist };
        }

        // If AABB collision but not hypotenuse collision, it must be the straight edges
        // BUT, for a triangle, one corner is "missing".
        // We must verify we are colliding with the solid part.
        // Dot Product check: Normal points OUT from solid face.
        // P_rel = ball - center_of_triangle. dot(P_rel, normal) > 0 ?

        const center = { x: block.x + block.width / 2, y: block.y + block.height / 2 };
        const rel = Vec2.sub(ballPos, center);

        // For now, return AABB collision ONLY if it makes sense (e.g. not in the empty corner)
        // Hacky heuristic:
        const proj = Vec2.dot(rel, normal);
        if (proj > 0) {
            // We are on the empty side. Ignore AABB collision unless we hit the hypotenuse (checked above).
            return null;
        }

        return aabbCollision;
    }

    public predictTrajectory(startPos: Vector, direction: Vector, maxBounces: number, blocks: BlockEntity[]): Vector[] {
        const points: Vector[] = [startPos];
        let currentPos = { ...startPos };
        let currentDir = Vec2.normalize(direction);

        // Safety break
        if (Vec2.mag(direction) < 0.001) return points;

        for (let b = 0; b < maxBounces; b++) {
            let shortestDist = Infinity;
            let normal = { x: 0, y: 0 };
            let hitType: 'WALL' | 'BLOCK' | 'NONE' = 'NONE';

            // 1. Check Walls
            // Right Wall (x = width)
            if (currentDir.x > 0) {
                const d = (this.width - CONSTANTS.BALL_RADIUS - currentPos.x) / currentDir.x;
                if (d < shortestDist) {
                    shortestDist = d;
                    normal = { x: -1, y: 0 };
                    hitType = 'WALL';
                }
            }
            // Left Wall (x = 0)
            else if (currentDir.x < 0) {
                const d = (CONSTANTS.BALL_RADIUS - currentPos.x) / currentDir.x;
                if (d < shortestDist) {
                    shortestDist = d;
                    normal = { x: 1, y: 0 };
                    hitType = 'WALL';
                }
            }

            // Top Wall (y = 0)
            if (currentDir.y < 0) {
                const d = (CONSTANTS.BALL_RADIUS - currentPos.y) / currentDir.y;
                if (d < shortestDist) {
                    shortestDist = d;
                    normal = { x: 0, y: 1 };
                    hitType = 'WALL';
                }
            }

            // 2. Check Blocks (Raycast vs AABB roughly)
            for (const block of blocks) {
                if (block.hp <= 0) continue;

                // Expand block by ball radius for simple hit check
                const bounds = {
                    x: block.x - CONSTANTS.BALL_RADIUS,
                    y: block.y - CONSTANTS.BALL_RADIUS,
                    w: block.width + CONSTANTS.BALL_RADIUS * 2,
                    h: block.height + CONSTANTS.BALL_RADIUS * 2
                };

                // Ray vs AABB (Slab method)
                let tmin = -Infinity;
                let tmax = Infinity;

                if (currentDir.x !== 0) {
                    const tx1 = (bounds.x - currentPos.x) / currentDir.x;
                    const tx2 = (bounds.x + bounds.w - currentPos.x) / currentDir.x;
                    tmin = Math.max(tmin, Math.min(tx1, tx2));
                    tmax = Math.min(tmax, Math.max(tx1, tx2));
                }

                if (currentDir.y !== 0) {
                    const ty1 = (bounds.y - currentPos.y) / currentDir.y;
                    const ty2 = (bounds.y + bounds.h - currentPos.y) / currentDir.y;
                    tmin = Math.max(tmin, Math.min(ty1, ty2));
                    tmax = Math.min(tmax, Math.max(ty1, ty2));
                }

                // Hit?
                if (tmax >= tmin && tmax >= 0 && tmin < shortestDist && tmin > 0.1) {
                    shortestDist = tmin;
                    hitType = 'BLOCK';
                    normal = { x: 0, y: 0 };
                }
            }

            if (shortestDist === Infinity || shortestDist > 2000) {
                // No hit, extend to arbitrary far point
                const end = Vec2.add(currentPos, Vec2.mul(currentDir, 1000));
                points.push(end);
                break;
            }

            // Move to hit point
            const hitPos = Vec2.add(currentPos, Vec2.mul(currentDir, shortestDist));
            points.push(hitPos);

            if (hitType === 'BLOCK') {
                // Stop line at block
                break;
            } else if (hitType === 'WALL') {
                // Reflect and continue
                currentPos = hitPos;
                // Push out slightly to prevent getting stuck
                currentPos = Vec2.add(currentPos, Vec2.mul(normal, 0.1));
                currentDir = Vec2.reflect(currentDir, normal);
            } else {
                break;
            }
        }

        return points;
    }
}
