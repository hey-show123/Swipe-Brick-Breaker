export class SoundManager {
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private enabled: boolean = true;
    private volume: number = 0.5;

    constructor() {
        // Preload sounds
        this.load('shoot', '/sounds/shoot.mp3');
        this.load('bounce', '/sounds/bounce.mp3');
        this.load('destroy', '/sounds/destroy.mp3');
        this.load('return', '/sounds/bounce.mp3'); // Use bounce for return too
    }

    private load(name: string, path: string) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        this.sounds.set(name, audio);
    }

    public play(name: string, volumeScale: number = 1.0) {
        if (!this.enabled) return;

        const sound = this.sounds.get(name);
        if (sound) {
            // Clone the node to allow overlapping sounds of the same type
            const clone = sound.cloneNode() as HTMLAudioElement;
            clone.volume = this.volume * volumeScale;
            clone.play().catch(e => {
                // Ignore autoplay errors or missing files for now
                console.warn(`SoundManager: Could not play sound "${name}"`, e);
            });

            // Cleanup after play
            clone.onended = () => {
                clone.remove();
            };
        }
    }

    public setVolume(volume: number) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    public toggle(enabled?: boolean) {
        this.enabled = enabled ?? !this.enabled;
    }
}

export const soundManager = new SoundManager();
