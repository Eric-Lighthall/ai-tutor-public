// landing page  - module cards grid, the first thing users see
import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Zap, Target } from "lucide-react";

const PAGE_ROOT_CLASS = "relative flex min-h-screen flex-col overflow-hidden bg-neutral-950";
const BACKDROP_CLASS = "absolute inset-0 z-0";
const BACKDROP_GRADIENT_CLASS = "absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black";
const BACKDROP_GLOW_LARGE_CLASS = "absolute -left-64 -top-64 h-[1200px] w-[1200px] rounded-full bg-blue-500/4 blur-[120px]";
const BACKDROP_GLOW_SMALL_CLASS = "absolute -top-32 left-32 h-[1000px] w-[1000px] rounded-full bg-purple-500/3 blur-[100px]";
const CONTENT_CLASS = "relative z-20 flex flex-1 flex-col justify-center";
const CONTAINER_CLASS = "mx-auto w-full max-w-6xl px-6 py-12";
const CARD_CLASS = "relative flex h-full min-h-[500px] flex-col rounded-xl border border-neutral-800/50 bg-neutral-900/95 p-10 backdrop-blur-sm";
const ICON_WRAPPER_CLASS = "rounded-lg border border-neutral-700/50 p-3";
const CONCEPT_CHIP_CLASS = "rounded border border-neutral-700/50 bg-neutral-800/60 px-2 py-1 text-xs text-neutral-300";
const CONCEPT_MORE_CLASS = "rounded border border-neutral-700/50 bg-neutral-800/60 px-2 py-1 text-xs text-neutral-400";
const START_BUTTON_CLASS = "block w-full rounded-lg px-6 py-3 text-center font-semibold text-white";

const difficultyLevels = [
    {
        id: "easy",
        title: "Easy",
        description: "Perfect for beginners. Start with fundamental concepts and basic problem-solving patterns.",
        icon: Target,
        color: "bg-emerald-600",
        concepts: ["Arrays", "Strings", "Basic Math", "Simple Loops"]
    },
    {
        id: "medium",
        title: "Medium",
        description: "Build on your foundation with more complex algorithms and data structures.",
        icon: TrendingUp,
        color: "bg-amber-600",
        concepts: ["Hash Tables", "Two Pointers", "Sliding Window", "Recursion"]
    },
    {
        id: "hard",
        title: "Hard",
        description: "Master advanced algorithms and tackle challenging optimization problems.",
        icon: Zap,
        color: "bg-rose-600",
        concepts: ["Dynamic Programming", "Graph Algorithms", "Tree Traversal", "Advanced Data Structures"]
    }
];



export default function LandingPage() {

    return (
        <div className={PAGE_ROOT_CLASS}>
            <div className={BACKDROP_CLASS}>
                <div className={BACKDROP_GRADIENT_CLASS}></div>
                <div className={BACKDROP_GLOW_LARGE_CLASS}></div>
                <div className={BACKDROP_GLOW_SMALL_CLASS}></div>
            </div>
            
            <div className={CONTENT_CLASS}>
                <div className={CONTAINER_CLASS}>
                    <div className="mb-16 flex-shrink-0">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
                                AI-Powered <span className="text-blue-400">Tutor</span>
                            </h1>
                            <p className="text-xl text-neutral-300 leading-relaxed max-w-3xl">
                                Master data structures and algorithms through structured practice with intelligent feedback.
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 flex-grow">
                    {difficultyLevels.map((level) => {
                        const IconComponent = level.icon;
                        
                        return (
                            <div
                                key={level.id}
                                className={CARD_CLASS}
                            >
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-8">
                                        <div className={`${ICON_WRAPPER_CLASS} ${level.color}`}>
                                            <IconComponent size={24} className="text-white" />
                                        </div>
                                    </div>
                                    
                                    <h2 className="text-2xl font-bold text-white mb-4">
                                        {level.title}
                                    </h2>
                                    
                                    <p className="text-neutral-400 leading-relaxed text-sm mb-8 flex-grow">
                                        {level.description}
                                    </p>
                                    
                                    
                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {level.concepts.slice(0, 3).map((concept) => (
                                            <span
                                                key={concept}
                                                className={CONCEPT_CHIP_CLASS}
                                            >
                                                {concept}
                                            </span>
                                        ))}
                                        {level.concepts.length > 3 && (
                                            <span className={CONCEPT_MORE_CLASS}>
                                                +{level.concepts.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                    
                                    <Link
                                        to={`/modules/${level.id}`}
                                        className={`${START_BUTTON_CLASS} ${level.color}`}
                                    >
                                        Start Learning
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
            </div>

            <div className="relative z-20 text-center py-4 px-6 flex-shrink-0">
                <p className="text-sm text-neutral-500">
                    Crafted by{" "}
                    <a 
                        href="https://ericlighthall.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-neutral-400 font-medium"
                    >
                        Eric Lighthall
                    </a>
                </p>
            </div>
        </div>
    );
}
