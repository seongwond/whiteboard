"use client";

import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Rect, Circle } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { v4 as uuidv4 } from "uuid";
import { useSocket } from "@/hooks/useSocket";

type Element =
    | { id: string; type: "line"; tool: string; points: number[]; stroke: string; strokeWidth: number }
    | { id: string; type: "rect"; x: number; y: number; width: number; height: number; stroke: string; strokeWidth: number }
    | { id: string; type: "circle"; x: number; y: number; radius: number; stroke: string; strokeWidth: number };

const Whiteboard = () => {
    const [elements, setElements] = useState<Element[]>([]);
    const [history, setHistory] = useState<Element[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);
    const isDrawing = useRef(false);
    const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
    const [tool, setTool] = useState("pen");
    const [color, setColor] = useState("#df4b26");
    const [strokeWidth, setStrokeWidth] = useState(5);
    const socket = useSocket();

    useEffect(() => {
        setStageSize({ width: window.innerWidth, height: window.innerHeight });

        const handleResize = () => {
            setStageSize({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on("draw", (data: Element) => {
            setElements((prevElements) => {
                const index = prevElements.findIndex((el) => el.id === data.id);
                let newElements;
                if (index !== -1) {
                    newElements = [...prevElements];
                    newElements[index] = data;
                } else {
                    newElements = [...prevElements, data];
                }
                return newElements;
            });
        });

        return () => {
            socket.off("draw");
        };
    }, [socket]);

    const handleMouseDown = (e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>) => {
        isDrawing.current = true;
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;

        const id = uuidv4();
        let newElement: Element | null = null;

        if (tool === "pen" || tool === "eraser") {
            newElement = {
                id,
                type: "line",
                tool,
                points: [pos.x, pos.y],
                stroke: tool === "eraser" ? "#ffffff" : color,
                strokeWidth: tool === "eraser" ? 20 : strokeWidth,
            };
        } else if (tool === "rect") {
            newElement = {
                id,
                type: "rect",
                x: pos.x,
                y: pos.y,
                width: 0,
                height: 0,
                stroke: color,
                strokeWidth,
            };
        } else if (tool === "circle") {
            newElement = {
                id,
                type: "circle",
                x: pos.x,
                y: pos.y,
                radius: 0,
                stroke: color,
                strokeWidth,
            };
        }

        if (newElement) {
            const newElements = [...elements, newElement];
            setElements(newElements);
            socket?.emit("draw", newElement);
        }
    };

    const handleMouseMove = (e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>) => {
        if (!isDrawing.current) return;
        const stage = e.target.getStage();
        const point = stage?.getPointerPosition();
        if (!point) return;

        const index = elements.length - 1;
        const lastElement = elements[index];
        let updatedElement: Element | null = null;

        if (lastElement.type === "line") {
            updatedElement = {
                ...lastElement,
                points: lastElement.points.concat([point.x, point.y]),
            };
        } else if (lastElement.type === "rect") {
            updatedElement = {
                ...lastElement,
                width: point.x - lastElement.x,
                height: point.y - lastElement.y,
            };
        } else if (lastElement.type === "circle") {
            const dx = point.x - lastElement.x;
            const dy = point.y - lastElement.y;
            const radius = Math.sqrt(dx * dx + dy * dy);
            updatedElement = {
                ...lastElement,
                radius,
            };
        }

        if (updatedElement) {
            const newElements = [...elements];
            newElements[index] = updatedElement;
            setElements(newElements);
            socket?.emit("draw", updatedElement);
        }
    };

    const handleMouseUp = () => {
        if (isDrawing.current) {
            isDrawing.current = false;
            // Add to history
            const newHistory = history.slice(0, historyStep + 1);
            newHistory.push(elements);
            setHistory(newHistory);
            setHistoryStep(newHistory.length - 1);
        }
    };

    const handleUndo = () => {
        if (historyStep === 0) return;
        const newStep = historyStep - 1;
        setHistoryStep(newStep);
        setElements(history[newStep]);
        // Note: Undo/Redo in collaborative env is complex, this is local view only for now
        // Ideally we should emit 'undo' event to server
    };

    const handleRedo = () => {
        if (historyStep === history.length - 1) return;
        const newStep = historyStep + 1;
        setHistoryStep(newStep);
        setElements(history[newStep]);
    };

    if (stageSize.width === 0) {
        return <div className="w-full h-screen bg-gray-100" />;
    }

    return (
        <div className="relative w-full h-screen bg-gray-100">
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded-lg shadow-md z-10 flex gap-4 items-center">
                <div className="flex gap-2">
                    <button
                        className={`p-2 rounded ${tool === "pen" ? "bg-blue-500 text-white" : "bg-gray-200"
                            }`}
                        onClick={() => setTool("pen")}
                    >
                        Pen
                    </button>
                    <button
                        className={`p-2 rounded ${tool === "eraser" ? "bg-blue-500 text-white" : "bg-gray-200"
                            }`}
                        onClick={() => setTool("eraser")}
                    >
                        Eraser
                    </button>
                    <button
                        className={`p-2 rounded ${tool === "rect" ? "bg-blue-500 text-white" : "bg-gray-200"
                            }`}
                        onClick={() => setTool("rect")}
                    >
                        Rect
                    </button>
                    <button
                        className={`p-2 rounded ${tool === "circle" ? "bg-blue-500 text-white" : "bg-gray-200"
                            }`}
                        onClick={() => setTool("circle")}
                    >
                        Circle
                    </button>
                </div>
                <div className="flex items-center gap-2 border-l pl-4 border-r pr-4">
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-none"
                    />
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                        className="w-24 cursor-pointer"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        className="p-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                        onClick={handleUndo}
                        disabled={historyStep === 0}
                    >
                        Undo
                    </button>
                    <button
                        className="p-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                        onClick={handleRedo}
                        disabled={historyStep === history.length - 1}
                    >
                        Redo
                    </button>
                </div>
            </div>
            <Stage
                width={stageSize.width}
                height={stageSize.height}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
            >
                <Layer>
                    {elements.map((el) => {
                        if (el.type === "line") {
                            return (
                                <Line
                                    key={el.id}
                                    points={el.points}
                                    stroke={el.stroke}
                                    strokeWidth={el.strokeWidth}
                                    tension={0.5}
                                    lineCap="round"
                                    lineJoin="round"
                                    globalCompositeOperation={
                                        el.tool === "eraser" ? "destination-out" : "source-over"
                                    }
                                />
                            );
                        } else if (el.type === "rect") {
                            return (
                                <Rect
                                    key={el.id}
                                    x={el.x}
                                    y={el.y}
                                    width={el.width}
                                    height={el.height}
                                    stroke={el.stroke}
                                    strokeWidth={el.strokeWidth}
                                />
                            );
                        } else if (el.type === "circle") {
                            return (
                                <Circle
                                    key={el.id}
                                    x={el.x}
                                    y={el.y}
                                    radius={el.radius}
                                    stroke={el.stroke}
                                    strokeWidth={el.strokeWidth}
                                />
                            );
                        }
                        return null;
                    })}
                </Layer>
            </Stage>
        </div>
    );
};

export default Whiteboard;
