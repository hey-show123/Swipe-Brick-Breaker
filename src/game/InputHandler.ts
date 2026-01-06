import type { Vector } from './types';


export class InputHandler {
    private canvas: HTMLCanvasElement;
    private isDragging: boolean = false;
    private dragStart: Vector = { x: 0, y: 0 };
    private currentDrag: Vector = { x: 0, y: 0 };

    public onAim: ((vector: Vector) => void) | null = null;
    public onShoot: ((vector: Vector) => void) | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.attachListeners();
    }

    private attachListeners() {
        this.canvas.addEventListener('mousedown', this.onDown);
        this.canvas.addEventListener('mousemove', this.onMove);
        window.addEventListener('mouseup', this.onUp);

        this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
        window.addEventListener('touchend', this.onTouchEnd);
    }

    public detach() {
        this.canvas.removeEventListener('mousedown', this.onDown);
        this.canvas.removeEventListener('mousemove', this.onMove);
        window.removeEventListener('mouseup', this.onUp);

        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        window.removeEventListener('touchend', this.onTouchEnd);
    }

    private getPos(e: MouseEvent | TouchEvent): Vector {
        const rect = this.canvas.getBoundingClientRect();
        // Default to 0 if no touches (shouldn't happen in start/move)
        let clientX = 0;
        let clientY = 0;

        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ('changedTouches' in e && e.changedTouches.length > 0) {
            // For touchend
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }

        // We want Logic Coordinates.
        // The canvas logical size (width/height attributes) might differ from CSS size.
        // We should map to logical size.

        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    private onDown = (e: MouseEvent) => {
        // Only left click
        if (e.button !== 0) return;
        this.startDrag(e);
    };

    private onTouchStart = (e: TouchEvent) => {
        e.preventDefault(); // Prevent scroll
        this.startDrag(e);
    };

    private startDrag(e: MouseEvent | TouchEvent) {
        this.isDragging = true;
        this.dragStart = this.getPos(e);
        this.currentDrag = this.dragStart;
    }

    private onMove = (e: MouseEvent) => {
        if (!this.isDragging) return;
        this.updateDrag(e);
    };

    private onTouchMove = (e: TouchEvent) => {
        if (!this.isDragging) return;
        e.preventDefault();
        this.updateDrag(e);
    };

    private updateDrag(e: MouseEvent | TouchEvent) {
        this.currentDrag = this.getPos(e);

        // "Shoot Towards Cursor" Mode:
        // We just pass the absolute position of the cursor/finger.
        // The Engine will calculate the direction vector relative to LaunchPos.

        if (this.onAim) {
            this.onAim(this.currentDrag);
        }
    }

    private onUp = (e: MouseEvent) => {
        if (!this.isDragging) return;
        this.endDrag(e);
    };

    private onTouchEnd = (e: TouchEvent) => {
        if (!this.isDragging) return;
        this.endDrag(e);
    };

    private endDrag(e: MouseEvent | TouchEvent) {
        this.isDragging = false;
        this.currentDrag = this.getPos(e);

        // Release to shoot toward the last cursor position
        if (this.onShoot) {
            this.onShoot(this.currentDrag);
        }
    }
}
