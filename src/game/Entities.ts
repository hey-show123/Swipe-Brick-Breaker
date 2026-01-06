import type { Ball, Block, Item, Vector } from './types';
import { Vec2 } from './Vector';
import { CONSTANTS } from './Constants';

export class BallEntity implements Ball {
    id: number;
    position: Vector;
    velocity: Vector;
    isActive: boolean = true;
    isReturning: boolean = false;

    constructor(id: number, x: number, y: number) {
        this.id = id;
        this.position = { x, y };
        this.velocity = { x: 0, y: 0 };
    }

    update(dt: number) {
        if (!this.isActive) return;

        // Euler integration
        // NewPos = Pos + Vel * Speed * dt
        // Note: velocity should be normalized direction usually, but here we might store full velocity.
        // Let's assume 'velocity' is the movement vector per second.

        // const moveStep = Vec2.mul(this.velocity, dt * CONSTANTS.BALL_SPEED * 60);
        // Actually, let's keep it simple: velocity IS px/sec.
        // So CONSTANTS.BALL_SPEED should be like 600 px/sec?
        // In Constants we put "12". If that was "per frame", then per sec is 12 * 60 = 720.

        // Let's rely on the physics system to handle movement to ensure collision detection happens inside the step.
        // But for basic movement:
        this.position = Vec2.add(this.position, Vec2.mul(this.velocity, dt));
    }
}

export class BlockEntity implements Block {
    id: string;
    col: number;
    row: number;
    hp: number;
    maxHp: number;
    type: Block['type'];
    gimmick: Block['gimmick'];

    // Computed for rendering/physics
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(id: string, col: number, row: number, hp: number, type: Block['type'] = 'SQUARE', gimmick: Block['gimmick'] = 'NONE') {
        this.id = id;
        this.col = col;
        this.row = row;
        this.hp = hp;
        this.maxHp = hp;
        this.type = type;
        this.gimmick = gimmick;

        // Position will be calculated by the Grid System ideally, but storing here for cache
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
    }

    updatePosition(blockWidth: number, blockHeight: number, startX: number, startY: number) {
        this.width = blockWidth;
        this.height = blockHeight;
        this.x = startX + this.col * (blockWidth + CONSTANTS.BLOCK_GAP);
        this.y = startY + this.row * (blockHeight + CONSTANTS.BLOCK_GAP);
    }
}

export class ItemEntity implements Item {
    id: string;
    col: number;
    row: number;
    type: 'ADD_BALL' = 'ADD_BALL';
    collected: boolean = false;

    x: number = 0;
    y: number = 0;
    radius: number = CONSTANTS.ITEM_RADIUS;

    constructor(id: string, col: number, row: number) {
        this.id = id;
        this.col = col;
        this.row = row;
    }

    updatePosition(blockWidth: number, blockHeight: number, startX: number, startY: number) {
        // Center in the cell
        const cellX = startX + this.col * (blockWidth + CONSTANTS.BLOCK_GAP);
        const cellY = startY + this.row * (blockHeight + CONSTANTS.BLOCK_GAP);

        this.x = cellX + blockWidth / 2;
        this.y = cellY + blockHeight / 2;
    }
}
