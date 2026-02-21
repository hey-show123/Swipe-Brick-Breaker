export const CONSTANTS = {
    // Appearance
    BALL_RADIUS: 6, // Slightly smaller for crisp look
    BALL_COLOR: '#ffffff',
    BLOCK_GAP: 4, // Gap between blocks in pixels

    // Physics
    BALL_SPEED: 800, // Pixels per second (approx 13 px/frame at 60fps)
    TIME_STEP: 1 / 60,
    INITIAL_BALLS: 3, // Starting ball count for better early-game tempo

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
        blockGradient: [
            '#ff4444', // 1-10: Red
            '#ff8800', // 11-20: Orange-Red
            '#ffcc00', // 21-30: Yellow-Orange
            '#ffff00', // 31-40: Yellow
            '#aaff00', // 41-50: Lime
            '#00ff00', // 51-60: Green
            '#00ffaa', // 61-70: Mint
            '#00ffff', // 71-80: Cyan
            '#00aaff', // 81-90: Light Blue
            '#8800ff', // 91-100: Purple
        ], // HP Heatmap (Loops every 100 HP, changes every 10 HP)
    }
};
