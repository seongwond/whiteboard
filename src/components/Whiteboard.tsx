"use client";

import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Rect, Circle as KonvaCircle, Text, Group, Path } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { v4 as uuidv4 } from "uuid";
import { useSocket } from "@/hooks/useSocket";
import {
    Pencil,
    Eraser,
    Square,
    Circle,
    Undo,
    Redo,
    Minus,
    Plus,
    StickyNote,
    MousePointer2,
} from "lucide-react";

type Element =
    | {
        id: string;
        type: "line";
        tool: string;
        points: number[];
        stroke: string;
        strokeWidth: number;
    }
    | {
        id: string;
        type: "rect";
        x: number;
        y: number;
        width: number;
        height: number;
        stroke: string;
        strokeWidth: number;
    }
    | {
        id: string;
        type: "circle";
        x: number;
        y: number;
        radius: number;
        stroke: string;
        strokeWidth: number;
    }
    | {
        id: string;
        type: "sticky";
        x: number;
        y: number;
        text: string;
        color: string;
    };

type Cursor = {
    id: string;
    x: number;
    y: number;
    color: string;
};

// Generate a random color for the cursor
const getRandomColor = () => {
    const colors = ["#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF33A8", "#33FFF5"];
    return colors[Math.floor(Math.random() * colors.length)];
};

const Whiteboard = () => {
    const [elements, setElements] = useState<Element[]>([]);
    const [history, setHistory] = useState<Element[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);
    const isDrawing = useRef(false);
    const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
    const [tool, setTool] = useState("pen");
    const [color, setColor] = useState("#df4b26");
    const [strokeWidth, setStrokeWidth] = useState(5);
    const [cursors, setCursors] = useState<Cursor[]>([]);
    const [myCursorColor] = useState(getRandomColor());
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

        socket.on("delete", (id: string) => {
            setElements((prevElements) => prevElements.filter((el) => el.id !== id));
        });

        socket.on("cursor-move", (data: Cursor) => {
            setCursors((prevCursors) => {
                const index = prevCursors.findIndex((c) => c.id === data.id);
                if (index !== -1) {
                    const newCursors = [...prevCursors];
                    newCursors[index] = data;
                    return newCursors;
                } else {
                    return [...prevCursors, data];
                }
            });
        });

        return () => {
            socket.off("draw");
            socket.off("delete");
            socket.off("cursor-move");
        };
    }, [socket]);

    const handleMouseDown = (
        e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>
    ) => {
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (!pos) return;

        // Object Eraser Logic
        if (tool === "eraser") {
            isDrawing.current = true; // Allow dragging to erase multiple
            const shape = stage?.getIntersection(pos);
            if (shape && shape !== stage) {
                let targetId = shape.id();
                if (!targetId && shape.parent) {
                    targetId = shape.parent.id();
                }

                if (targetId) {
                    const elementExists = elements.some(el => el.id === targetId);
                    if (elementExists) {
                        const newElements = elements.filter(el => el.id !== targetId);
                        setElements(newElements);
                        socket?.emit("delete", targetId);

                        const newHistory = history.slice(0, historyStep + 1);
                        newHistory.push(newElements);
                        setHistory(newHistory);
                        setHistoryStep(newHistory.length - 1);
                    }
                }
            }
            return;
        }

        const clickedOnEmpty = e.target === stage;
        if (!clickedOnEmpty && tool !== "eraser") return;

        if (tool === "select") return;

        if (tool === "sticky") {
            const text = window.prompt("메모 내용을 입력하세요:");
            if (!text) return;

            const id = uuidv4();
            const newElement: Element = {
                id,
                type: "sticky",
                x: pos.x,
                y: pos.y,
                text,
                color: "#ffeb3b",
            };

            const newElements = [...elements, newElement];
            setElements(newElements);
            socket?.emit("draw", newElement);

            const newHistory = history.slice(0, historyStep + 1);
            newHistory.push(newElements);
            setHistory(newHistory);
            setHistoryStep(newHistory.length - 1);

            setTool("select");
            return;
        }

        isDrawing.current = true;
        const id = uuidv4();
        let newElement: Element | null = null;

        if (tool === "pen") {
            newElement = {
                id,
                type: "line",
                tool,
                points: [pos.x, pos.y],
                stroke: color,
                strokeWidth: strokeWidth,
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

    const handleMouseMove = (
        e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>
    ) => {
        const stage = e.target.getStage();
        const point = stage?.getPointerPosition();
        if (!point) return;

        // Broadcast cursor position
        if (socket) {
            socket.emit("cursor-move", {
                id: socket.id,
                x: point.x,
                y: point.y,
                color: myCursorColor,
            });
        }

        if (!isDrawing.current) return;

        // Object Eraser Drag Logic
        if (tool === "eraser") {
            const shape = stage?.getIntersection(point);
            if (shape && shape !== stage) {
                let targetId = shape.id();
                if (!targetId && shape.parent) {
                    targetId = shape.parent.id();
                }

                if (targetId) {
                    const elementExists = elements.some(el => el.id === targetId);
                    if (elementExists) {
                        const newElements = elements.filter(el => el.id !== targetId);
                        setElements(newElements);
                        socket?.emit("delete", targetId);
                    }
                }
            }
            return;
        }

        const index = elements.length - 1;
        const lastElement = elements[index];
        if (!lastElement) return;

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

    const handleDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
        const newElements = elements.map((el) => {
            if (el.id === id) {
                return {
                    ...el,
                    x: e.target.x(),
                    y: e.target.y(),
                };
            }
            return el;
        });
        setElements(newElements);

        const updatedElement = newElements.find((el) => el.id === id);
        if (updatedElement) {
            socket?.emit("draw", updatedElement);
        }
    };

    const handleUndo = () => {
        if (historyStep === 0) return;
        const newStep = historyStep - 1;
        setHistoryStep(newStep);
        setElements(history[newStep]);
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
        <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded-2xl shadow-xl z-10 flex gap-4 items-center border border-gray-100">
                {/* Tools */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                    <button
                        className={`p-2 rounded-lg transition-all ${tool === "select"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                            }`}
                        onClick={() => setTool("select")}
                        title="선택 (이동)"
                    >
                        <MousePointer2 size={20} />
                    </button>
                    <button
                        className={`p-2 rounded-lg transition-all ${tool === "pen"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                            }`}
                        onClick={() => setTool("pen")}
                        title="펜"
                    >
                        <Pencil size={20} />
                    </button>
                    <button
                        className={`p-2 rounded-lg transition-all ${tool === "eraser"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                            }`}
                        onClick={() => setTool("eraser")}
                        title="지우개 (객체 삭제)"
                    >
                        <Eraser size={20} />
                    </button>
                    <button
                        className={`p-2 rounded-lg transition-all ${tool === "rect"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                            }`}
                        onClick={() => setTool("rect")}
                        title="사각형"
                    >
                        <Square size={20} />
                    </button>
                    <button
                        className={`p-2 rounded-lg transition-all ${tool === "circle"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                            }`}
                        onClick={() => setTool("circle")}
                        title="원"
                    >
                        <Circle size={20} />
                    </button>
                    <button
                        className={`p-2 rounded-lg transition-all ${tool === "sticky"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                            }`}
                        onClick={() => setTool("sticky")}
                        title="메모 (포스트잇)"
                    >
                        <StickyNote size={20} />
                    </button>
                </div>

                <div className="w-px h-8 bg-gray-200" />

                {/* Style Controls */}
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-8 h-8 rounded-full cursor-pointer border-2 border-gray-200 p-0.5 overflow-hidden"
                            title="색상 선택"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-lg" title="선 두께">
                        <Minus size={14} className="text-gray-500" />
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={strokeWidth}
                            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                            className="w-20 cursor-pointer accent-blue-600"
                        />
                        <Plus size={14} className="text-gray-500" />
                    </div>
                </div>

                <div className="w-px h-8 bg-gray-200" />

                {/* History Controls */}
                <div className="flex gap-1">
                    <button
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        onClick={handleUndo}
                        disabled={historyStep === 0}
                        title="실행 취소"
                    >
                        <Undo size={20} />
                    </button>
                    <button
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        onClick={handleRedo}
                        disabled={historyStep === history.length - 1}
                        title="다시 실행"
                    >
                        <Redo size={20} />
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
                                    id={el.id}
                                    points={el.points}
                                    stroke={el.stroke}
                                    strokeWidth={el.strokeWidth}
                                    tension={0.5}
                                    lineCap="round"
                                    lineJoin="round"
                                />
                            );
                        } else if (el.type === "rect") {
                            return (
                                <Rect
                                    key={el.id}
                                    id={el.id}
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
                                <KonvaCircle
                                    key={el.id}
                                    id={el.id}
                                    x={el.x}
                                    y={el.y}
                                    radius={el.radius}
                                    stroke={el.stroke}
                                    strokeWidth={el.strokeWidth}
                                />
                            );
                        } else if (el.type === "sticky") {
                            return (
                                <Group
                                    key={el.id}
                                    id={el.id}
                                    x={el.x}
                                    y={el.y}
                                    draggable={tool === "select"}
                                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                                >
                                    <Rect
                                        width={150}
                                        height={150}
                                        fill={el.color}
                                        shadowColor="black"
                                        shadowBlur={10}
                                        shadowOpacity={0.1}
                                        cornerRadius={5}
                                    />
                                    <Text
                                        x={10}
                                        y={10}
                                        width={130}
                                        text={el.text}
                                        fontSize={16}
                                        fontFamily="sans-serif"
                                        fill="#333"
                                    />
                                </Group>
                            );
                        }
                        return null;
                    })}
                    {/* Render other users' cursors */}
                    {cursors.map((cursor) => (
                        <Group key={cursor.id} x={cursor.x} y={cursor.y}>
                            <Path
                                data="M3.5 0L12 22L16.5 14L23 14L3.5 0Z"
                                fill={cursor.color}
                                stroke="white"
                                strokeWidth={2}
                                rotation={-15}
                            />
                            <Text
                                x={15}
                                y={15}
                                text="User"
                                fontSize={12}
                                fill={cursor.color}
                                fontFamily="sans-serif"
                                fontStyle="bold"
                            />
                        </Group>
                    ))}
                </Layer>
            </Stage>
        </div>
    );
};

export default Whiteboard;
