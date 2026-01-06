export interface Vector {
    x: number;
    y: number;
}

export const GamePhase = {
    AIMING: 'AIMING',
    SHOOTING: 'SHOOTING',
    RETURNING: 'RETURNING', // Balls returning to bottom
    GAME_OVER: 'GAME_OVER',
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export interface Ball {
    id: number;
    position: Vector;
    velocity: Vector;
    isActive: boolean;
    isReturning: boolean;
}

export interface Block {
    id: string;
    col: number;
    row: number;
    hp: number;
    maxHp: number;
    type: 'SQUARE' | 'TRIANGLE_TL' | 'TRIANGLE_TR' | 'TRIANGLE_BL' | 'TRIANGLE_BR' | 'DIAMOND' | 'CIRCLE';
    gimmick?: 'NONE' | 'EXPLOSIVE' | 'GOLD' | 'POISON';
}

export interface Item {
    id: string;
    col: number;
    row: number;
    type: 'ADD_BALL';
    collected: boolean;
}

export interface Particle {
    id: number;
    position: Vector;
    velocity: Vector;
    life: number;
    color: string;
}
