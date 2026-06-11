"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import { menuData } from '@/data/menu';

const IMAGES = menuData.slice(0, 8).map(item => ({
    src: item.image,
    id: item.id
}));
const TOTAL_IMAGES = IMAGES.length;

function ScrollMorphImage({ 
    src, index, progress, radiusX, radiusY, isMobile, id
}: { 
    src: string, index: number, progress: MotionValue<number>, radiusX: number, radiusY: number, isMobile: boolean, id: string
}) {
    // 1. Math to distribute them around the circle
    const baseAngle = (index / TOTAL_IMAGES) * 360;
    const rad = (baseAngle * Math.PI) / 180;
    
    // 2. Final orbit position around the text
    const targetX = Math.cos(rad) * radiusX;
    const targetY = Math.sin(rad) * radiusY;
    
    // Tangent rotation: so images face "outward" or follow the circle curve
    const targetRotation = baseAngle + 90;

    // 3. Starting randomized/scattered positions (simulating flying inward)
    // Using index directly to make random logic deterministic across SSR/hydration
    const pseudoRandom = ((index * 37) % 20) / 10; // Values between 0.0 and 1.9
    const distanceMult = isMobile ? 3 : 4; 
    
    const startX = targetX * (distanceMult + pseudoRandom);
    const startY = targetY * (distanceMult + pseudoRandom);
    const startRotation = targetRotation + (index % 2 === 0 ? -180 : 180);

    // 4. Transform mapping based on scroll progress (0 to 1)
    // Fly inward during the first 60% of the scroll, then stay in orbit
    const x = useTransform(progress, [0, 0.6, 1], [startX, targetX, targetX]);
    const y = useTransform(progress, [0, 0.6, 1], [startY, targetY, targetY]);
    const scale = useTransform(progress, [0, 0.6, 1], [0.3, 1, 1]);
    const rotate = useTransform(progress, [0, 0.6, 1], [startRotation, targetRotation, targetRotation]);

    // Responsive element size
    const IMG_W = isMobile ? 80 : 130;
    
    return (
        <motion.div
            style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                marginLeft: -IMG_W / 2,
                marginTop: -IMG_W / 2,
                width: IMG_W,
                height: IMG_W,
                x,
                y,
                scale,
                rotate,
                transformStyle: "preserve-3d",
                perspective: "1000px"
            }}
            className="cursor-pointer group"
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        >
            <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                whileHover={{ rotateY: 180, scale: 1.1 }}
            >
                {/* Front Object-Fit Image Layer */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.8)]"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt={`hero-image-${index}`}
                        className="h-full w-full object-cover"
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&q=80';
                        }}
                    />
                    <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
                </div>

                {/* Back Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-[24px] shadow-lg bg-[var(--card)] flex flex-col items-center justify-center p-2 border border-[var(--border)]"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-[var(--green)] uppercase tracking-widest mb-1">View</p>
                        <p className="text-xs font-medium text-white shadow-2xl">Menu</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function IntroAnimation() {
    // Scroll progress measurement bound to standard 300vh wrapper
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // We revolve the entire wrapper independently of the flyer-inward logic.
    // This creates the continuous "planets revolving around the sun" effect!
    const globalRotate = useTransform(smoothProgress, [0, 1], [0, 180]);
    const overallOpacity = useTransform(smoothProgress, [0.85, 1], [1, 0]);
    const scrollPromptOpacity = useTransform(smoothProgress, [0, 0.1], [1, 0]);

    return (
        <div ref={containerRef} className="relative w-full h-[300vh] bg-black">
            {/* Sticky 100vh viewport container */}
            <motion.div 
                className="sticky top-0 w-full h-screen overflow-hidden"
                style={{ opacity: overallOpacity }}
            >
                {/* Structural Alignment Box */}
                <div className="relative w-full h-full flex flex-col items-center justify-center">

                    {/* Central Absolute Title Box (The Sun) */}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                        <div className="flex flex-col items-center justify-center text-center">
                            <h1 className="flex flex-col items-center justify-center text-5xl md:text-8xl font-black tracking-tighter text-white drop-shadow-2xl uppercase">
                                <span className="block leading-[1.1]">EAT CLEAN.</span>
                                <span className="block leading-[1.1]">LIVE FIT.</span>
                                <span className="block leading-[1.1]">PROJECT FIT</span>
                            </h1>
                        </div>
                    </div>

                    {/* Rotating Scroll Morph Layer (The Planets) */}
                    <motion.div 
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ rotate: globalRotate, willChange: 'transform' }}
                    >
                        {IMAGES.map((item, i) => {
                            // Large radius ensuring the hole fits the text and images do not overlap.
                            const radiusX = isMobile ? 180 : 450;
                            const radiusY = isMobile ? 220 : 380;

                            return (
                                <ScrollMorphImage
                                    key={i}
                                    index={i}
                                    src={item.src}
                                    id={item.id!}
                                    progress={smoothProgress}
                                    radiusX={radiusX}
                                    radiusY={radiusY}
                                    isMobile={isMobile}
                                />
                            );
                        })}
                    </motion.div>

                    {/* Fading Scroll Prompt */}
                    <motion.div 
                       className="absolute bottom-10 z-20 flex flex-col items-center pointer-events-none"
                       style={{ opacity: scrollPromptOpacity }}
                    >
                        <div className="w-5 h-9 border-2 border-[var(--border)] rounded-full flex justify-center p-1 bg-black/40 backdrop-blur-md">
                            <motion.div 
                                animate={{ y: [0, 12, 0] }} 
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="w-[4px] h-[4px] bg-[var(--green)] rounded-full"
                            />
                        </div>
                    </motion.div>

                </div>
            </motion.div>
        </div>
    );
}
