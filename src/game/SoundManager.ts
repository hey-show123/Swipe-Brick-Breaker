/**
 * Web Audio API based SoundManager with throttling and pooling.
 * Avoids creating HTMLAudioElement clones which are heavy on mobile.
 */
export class SoundManager {
    private ctx: AudioContext | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();
    private enabled: boolean = true;
    private volume: number = 0.5;
    private gainNode: GainNode | null = null;

    // Throttling: track last play time per sound
    private lastPlayTime: Map<string, number> = new Map();
    private throttleMs: Map<string, number> = new Map();

    // Limit concurrent sounds
    private activeSources: number = 0;
    private maxConcurrent: number = 8;

    constructor() {
        // Set throttle intervals per sound type (ms)
        this.throttleMs.set('bounce', 60);
        this.throttleMs.set('destroy', 40);
        this.throttleMs.set('shoot', 100);
    }

    private async initContext() {
        if (this.ctx) return;
        this.ctx = new AudioContext();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = this.volume;
        this.gainNode.connect(this.ctx.destination);
    }

    private async loadBuffer(name: string, path: string): Promise<void> {
        if (!this.ctx) return;
        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers.set(name, audioBuffer);
        } catch {
            // Sound file missing - gracefully ignore
        }
    }

    /**
     * Must be called from a user gesture (touch/click) to unlock AudioContext.
     */
    public async init() {
        await this.initContext();
        await Promise.all([
            this.loadBuffer('shoot', './sounds/shoot.mp3'),
            this.loadBuffer('bounce', './sounds/bounce.mp3'),
            this.loadBuffer('destroy', './sounds/destroy.mp3'),
        ]);
    }

    public play(name: string, volumeScale: number = 1.0) {
        if (!this.enabled || !this.ctx || !this.gainNode) return;

        // Throttle check
        const now = performance.now();
        const lastTime = this.lastPlayTime.get(name) || 0;
        const throttle = this.throttleMs.get(name) || 30;
        if (now - lastTime < throttle) return;

        // Concurrent limit
        if (this.activeSources >= this.maxConcurrent) return;

        const buffer = this.buffers.get(name);
        if (!buffer) return;

        this.lastPlayTime.set(name, now);

        // Create a lightweight buffer source (no DOM element)
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        // Per-sound volume via a temporary gain node
        if (volumeScale !== 1.0) {
            const tempGain = this.ctx.createGain();
            tempGain.gain.value = volumeScale;
            source.connect(tempGain);
            tempGain.connect(this.gainNode);
        } else {
            source.connect(this.gainNode);
        }

        this.activeSources++;
        source.onended = () => {
            this.activeSources--;
        };

        source.start(0);
    }

    public setVolume(volume: number) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.gainNode) {
            this.gainNode.gain.value = this.volume;
        }
    }

    public toggle(enabled?: boolean) {
        this.enabled = enabled ?? !this.enabled;
    }
}

export const soundManager = new SoundManager();
