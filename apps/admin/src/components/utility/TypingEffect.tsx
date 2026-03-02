import React, { useEffect, useState } from "react";

interface TypingEffectProps {
    text: string;
    speed?: number; // ms per character
    className?: string;
}



const TypingEffect: React.FC<TypingEffectProps> = ({ text, speed = 80, className = "" }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        setCount(0);
        if (!text) return;
        const interval = setInterval(() => {
            setCount((prev) => {
                if (prev < text.length) {
                    return prev + 1;
                } else {
                    clearInterval(interval);
                    return prev;
                }
            });
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed]);

    return (
        <span className={className}>
            {text.split("").slice(0, count).map((char, idx) => (
                <span key={idx} className="text-blue-400">{char}</span>
            ))}
            <span className="blinking-cursor">|</span>
        </span>
    );
};

export default TypingEffect;
