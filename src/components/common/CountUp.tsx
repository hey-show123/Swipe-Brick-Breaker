import React, { useEffect, useState, useRef } from 'react';

interface CountUpProps {
    value: number;
    className?: string;
    duration?: number;
}

export const CountUp: React.FC<CountUpProps> = ({ value, className, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(value);
    const startValue = useRef(value);
    const startTime = useRef<number | null>(null);

    useEffect(() => {
        startValue.current = displayValue;
        startTime.current = null;

        const step = (timestamp: number) => {
            if (!startTime.current) startTime.current = timestamp;
            const progress = Math.min((timestamp - startTime.current) / duration, 1);

            // Ease out method
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            const current = Math.floor(startValue.current + (value - startValue.current) * easeOutQuart);
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }, [value]);

    return <span className={className}>{displayValue.toLocaleString()}</span>;
};
