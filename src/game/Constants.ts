export const CONSTANTS = {
    // Appearance
    BALL_RADIUS: 6, // Slightly smaller for crisp look
    BALL_COLOR: '#ffffff',
    BLOCK_GAP: 4, // Gap between blocks in pixels

    // Physics
    BALL_SPEED: 800, // Pixels per second (approx 13 px/frame at 60fps)
    TIME_STEP: 1 / 60,

    // Grid
    COLS: 7, // 7 columns fits well on mobile
    ROWS_VISIBLE: 9, // How many rows visible before danger zone
    ITEM_RADIUS: 12, // Radius for item circle

    // Colors (Neon palette)
    COLORS: {
        background: '#111111',
        primary: '#00ffcc', // Neon Cyan
        secondary: '#ff00ff', // Neon Magenta
        accent: '#ffff00', // Neon Yellow
        text: '#ffffff',
        blockGradient: ['#ff4444', '#ffaa00', '#ffff00', '#00ff00', '#00ffff', '#0044ff'], // HP Heatmap
    }
};
