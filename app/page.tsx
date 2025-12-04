"use client";

import dynamic from "next/dynamic";

const Whiteboard = dynamic(() => import("@/components/Whiteboard"), {
    ssr: false,
    loading: () => <div className="w-full h-screen bg-gray-100 animate-pulse" />,
});

export default function Home() {
    return (
        <main>
            <Whiteboard />
        </main>
    );
}
