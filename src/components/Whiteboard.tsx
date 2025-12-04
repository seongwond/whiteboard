"use client";

import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Rect, Circle as KonvaCircle, Text, Group, Path, Image as KonvaImage } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { v4 as uuidv4 } from "uuid";
import { useSocket } from "@/hooks/useSocket";
import useImage from "use-image";
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
    Users,
    MessageCircle,
    Send,
    Image as ImageIcon,
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
    }
    | {
        id: string;
        type: "image";
        x: number;
        y: number;
        src: string;
        width: number;
        height: number;
    };

type Cursor = {
    id: string;
    x: number;
    y: number;
    color: string;
    nickname: string;
};

type User = {
    id: string;
    color: string;
    nickname: string;
};

type ChatMessage = {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    color: string;
};

// Generate a random color for the cursor
const getRandomColor = () => {
    const colors = ["#FF5733", "#33FF57", "#3357FF", "#F033FF", "#FF33A8", "#33FFF5", "#FFC300", "#DAF7A6"];
    return colors[Math.floor(Math.random() * colors.length)];
};

const URLImage = ({ image }: { image: Element & { type: "image" } }) => {
    const [img] = useImage(image.src);
    return (
        <KonvaImage
            image={img}
            width={image.width}
            height={image.height}
        />
    );
};

const Whiteboard = () => {
    const [elements, setElements] = useState<Element[]>([]);
    const [history, setHistory] = useState<Element[][]>([]);
    const [future, setFuture] = useState<Element[][]>([]);
    const [tool, setTool] = useState<string>("pencil");
    const [color, setColor] = useState<string>("#000000");
    const [lineWidth, setLineWidth] = useState<number>(5);
    const [cursors, setCursors] = useState<Cursor[]>([]);
    const socket = useSocket();
    const isDrawing = useRef(false);
    const [users, setUsers] = useState<User[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [nickname, setNickname] = useState("");
    const [isNicknameSet, setIsNicknameSet] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    useEffect(() => {
        if (!socket) return;

        socket.on("connect", () => {
            console.log("Connected to server");
        });

        socket.on("init-state", (serverElements: Element[]) => {
            setElements(serverElements);
        });

        socket.on("update-element", (element: Element) => {
            setElements((prev) => {
                const index = prev.findIndex((el) => el.id === element.id);
                if (index !== -1) {
                    const newElements = [...prev];
                    newElements[index] = element;
                    return newElements;
                } else {
                    return [...prev, element];
                }
            });
        });

        socket.on("clear-board", () => {
            setElements([]);
            setHistory([]);
            setFuture([]);
        });

        socket.on("cursor-move", (data: Cursor) => {
            setCursors((prev) => {
                const index = prev.findIndex((c) => c.id === data.id);
                if (index !== -1) {
                    const newCursors = [...prev];
                    newCursors[index] = data;
                    return newCursors;
                } else {
                    return [...prev, data];
                }
            });
        });

        socket.on("update-user-list", (userList: User[]) => {
            console.log("User list updated:", userList);
            setUsers(userList);
        });

        socket.on("chat-message", (message: ChatMessage) => {
            console.log("New chat message:", message);
            setChatMessages((prev) => {
                // Deduplicate messages (prevent double rendering if optimistic update already added it)
                if (prev.some(msg => msg.id === message.id)) {
                    return prev;
                }
                return [...prev, message];
            });
        });

        return () => {
            socket.off("connect");
            socket.off("init-state");
            socket.off("update-element");
            socket.off("clear-board");
            socket.off("cursor-move");
            socket.off("update-user-list");
            socket.off("chat-message");
        };
    }, [socket]);

    const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (tool === "select") return;
        isDrawing.current = true;
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;

        const id = uuidv4();
        let newElement: Element | null = null;

        if (tool === "pencil" || tool === "eraser") {
            newElement = {
                id,
                type: "line",
                tool,
                points: [pos.x, pos.y],
                stroke: tool === "eraser" ? "#ffffff" : color,
                strokeWidth: tool === "eraser" ? 20 : lineWidth,
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
                strokeWidth: lineWidth,
            };
        } else if (tool === "circle") {
            newElement = {
                id,
                type: "circle",
                x: pos.x,
                y: pos.y,
                radius: 0,
                stroke: color,
                strokeWidth: lineWidth,
            };
        } else if (tool === "sticky") {
            newElement = {
                id,
                type: "sticky",
                x: pos.x,
                y: pos.y,
                text: "새 메모", // Localized
                color: "#ffeb3b", // Default yellow
            };
            isDrawing.current = false; // Sticky note is placed instantly
        }

        if (newElement) {
            setElements((prev) => [...prev, newElement!]);
            if (socket) {
                socket.emit("draw", newElement);
            }
        }
    };

    const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (!pos || !socket) return;

        // Emit cursor position
        if (isNicknameSet) {
            socket.emit("cursor-move", {
                id: socket.id,
                x: pos.x,
                y: pos.y,
                color: users.find(u => u.id === socket.id)?.color || "#000",
                nickname: nickname
            });
        }

        if (!isDrawing.current) return;

        const index = elements.length - 1;
        const element = elements[index];

        if (element.type === "line") {
            const newPoints = [...element.points, pos.x, pos.y];
            const newElement = { ...element, points: newPoints };
            setElements((prev) => {
                const copy = [...prev];
                copy[index] = newElement;
                return copy;
            });
            socket.emit("draw", newElement);
        } else if (element.type === "rect") {
            const newElement = {
                ...element,
                width: pos.x - element.x,
                height: pos.y - element.y,
            };
            setElements((prev) => {
                const copy = [...prev];
                copy[index] = newElement;
                return copy;
            });
            socket.emit("draw", newElement);
        } else if (element.type === "circle") {
            const radius = Math.sqrt(
                Math.pow(pos.x - element.x, 2) + Math.pow(pos.y - element.y, 2)
            );
            const newElement = { ...element, radius };
            setElements((prev) => {
                const copy = [...prev];
                copy[index] = newElement;
                return copy;
            });
            socket.emit("draw", newElement);
        }
    };

    const handleMouseUp = () => {
        isDrawing.current = false;
        setHistory((prev) => [...prev, elements]);
        setFuture([]);
    };

    const handleDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
        const newX = e.target.x();
        const newY = e.target.y();

        setElements((prev) =>
            prev.map((el) => {
                if (el.id === id) {
                    const updated = { ...el, x: newX, y: newY };
                    if (socket) socket.emit("draw", updated);
                    return updated;
                }
                return el;
            })
        );
    };

    const undo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setFuture((prev) => [elements, ...prev]);
        setHistory((prev) => prev.slice(0, -1));
        setElements(previous);
        // Ideally sync undo with server, but for now local
    };

    const redo = () => {
        if (future.length === 0) return;
        const next = future[0];
        setHistory((prev) => [...prev, elements]);
        setFuture((prev) => prev.slice(1));
        setElements(next);
    };

    const clearBoard = () => {
        setElements([]);
        setHistory([]);
        setFuture([]);
        if (socket) {
            socket.emit("clear-board");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.src = reader.result as string;
                img.onload = () => {
                    const newElement: Element = {
                        id: uuidv4(),
                        type: "image",
                        x: 100,
                        y: 100,
                        src: reader.result as string,
                        width: img.width > 300 ? 300 : img.width,
                        height: img.height > 300 ? (300 * img.height) / img.width : img.height,
                    };
                    setElements((prev) => [...prev, newElement]);
                    if (socket) {
                        socket.emit("draw", newElement);
                    }
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleJoin = () => {
        if (nickname.trim() && socket) {
            const color = getRandomColor();
            socket.emit("join-user", { nickname, color });
            setIsNicknameSet(true);
        }
    };

    const handleSendMessage = () => {
        if (newMessage.trim() && socket) {
            const message: ChatMessage = {
                id: uuidv4(),
                sender: nickname,
                text: newMessage,
                timestamp: Date.now(),
                color: users.find(u => u.id === socket?.id)?.color || "#000",
            };

            // Optimistic update: Add message immediately to local state
            setChatMessages((prev) => [...prev, message]);

            socket.emit("chat-message", message);
            setNewMessage("");
        }
    };

    if (!isNicknameSet) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
                    <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">화이트보드 참여</h2>
                    <input
                        type="text"
                        placeholder="닉네임을 입력하세요"
                        className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    />
                    <button
                        onClick={handleJoin}
                        className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        참여하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
            {/* Left Sidebar: Users & Chat */}
            <div className="absolute left-4 top-4 bottom-4 w-72 flex flex-col gap-4 pointer-events-none z-10">
                {/* User List */}
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/20 pointer-events-auto flex-shrink-0 max-h-[40%] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-gray-700" />
                        <h3 className="font-bold text-gray-800">사용자 ({users.length})</h3>
                    </div>
                    <ul className="space-y-2">
                        {users.map((user) => (
                            <li key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/50 transition-colors">
                                <div
                                    className="w-3 h-3 rounded-full shadow-sm"
                                    style={{ backgroundColor: user.color }}
                                />
                                <span className="text-sm font-medium text-gray-700 truncate">{user.nickname}</span>
                                {user.id === socket?.id && <span className="text-xs text-gray-500">(나)</span>}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Chat */}
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/20 pointer-events-auto flex-1 flex flex-col min-h-0">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageCircle className="w-5 h-5 text-gray-700" />
                        <h3 className="font-bold text-gray-800">채팅</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto mb-3 space-y-2 pr-1">
                        {chatMessages.map((msg) => (
                            <div key={msg.id} className="flex flex-col">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-bold" style={{ color: msg.color }}>{msg.sender}</span>
                                    <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-sm text-gray-800 bg-white/50 p-2 rounded-lg mt-1 break-words">{msg.text}</p>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="메시지를 입력하세요..."
                            className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/90"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        />
                        <button
                            onClick={handleSendMessage}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Toolbar */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-white/20 flex gap-2 z-10">
                <div className="flex gap-1 border-r border-gray-300 pr-2">
                    <button
                        className={`p-2 rounded-xl transition-all ${tool === "select" ? "bg-blue-100 text-blue-600 shadow-inner" : "hover:bg-gray-100 text-gray-600"}`}
                        onClick={() => setTool("select")}
                        title="선택 및 이동"
                    >
                        <MousePointer2 className="w-5 h-5" />
                    </button>
                    <button
                        className={`p-2 rounded-xl transition-all ${tool === "pencil" ? "bg-blue-100 text-blue-600 shadow-inner" : "hover:bg-gray-100 text-gray-600"}`}
                        onClick={() => setTool("pencil")}
                        title="펜"
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                    <button
                        className={`p-2 rounded-xl transition-all ${tool === "eraser" ? "bg-blue-100 text-blue-600 shadow-inner" : "hover:bg-gray-100 text-gray-600"}`}
                        onClick={() => setTool("eraser")}
                        title="지우개"
                    >
                        <Eraser className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-1 border-r border-gray-300 pr-2 pl-2">
                    <button
                        className={`p-2 rounded-xl transition-all ${tool === "rect" ? "bg-blue-100 text-blue-600 shadow-inner" : "hover:bg-gray-100 text-gray-600"}`}
                        onClick={() => setTool("rect")}
                        title="사각형"
                    >
                        <Square className="w-5 h-5" />
                    </button>
                    <button
                        className={`p-2 rounded-xl transition-all ${tool === "circle" ? "bg-blue-100 text-blue-600 shadow-inner" : "hover:bg-gray-100 text-gray-600"}`}
                        onClick={() => setTool("circle")}
                        title="원"
                    >
                        <Circle className="w-5 h-5" />
                    </button>
                    <button
                        className={`p-2 rounded-xl transition-all ${tool === "sticky" ? "bg-blue-100 text-blue-600 shadow-inner" : "hover:bg-gray-100 text-gray-600"}`}
                        onClick={() => setTool("sticky")}
                        title="스티커 메모"
                    >
                        <StickyNote className="w-5 h-5" />
                    </button>
                    <label className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 cursor-pointer transition-all" title="이미지 업로드">
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        <ImageIcon className="w-5 h-5" />
                    </label>
                </div>

                <div className="flex gap-1 items-center pl-2">
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                        title="색상 선택"
                    />
                    <div className="flex items-center gap-1 mx-2">
                        <button onClick={() => setLineWidth(Math.max(1, lineWidth - 1))} className="p-1 hover:bg-gray-100 rounded-lg">
                            <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-medium w-4 text-center">{lineWidth}</span>
                        <button onClick={() => setLineWidth(Math.min(50, lineWidth + 1))} className="p-1 hover:bg-gray-100 rounded-lg">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="flex gap-1 border-l border-gray-300 pl-2">
                    <button onClick={undo} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-all" title="실행 취소">
                        <Undo className="w-5 h-5" />
                    </button>
                    <button onClick={redo} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-all" title="다시 실행">
                        <Redo className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <Stage
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
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
                        } else if (el.type === "image") {
                            return (
                                <Group
                                    key={el.id}
                                    id={el.id}
                                    x={el.x}
                                    y={el.y}
                                    draggable={tool === "select"}
                                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                                >
                                    <URLImage image={el} />
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
                                shadowColor="black"
                                shadowBlur={2}
                                shadowOpacity={0.2}
                            />
                            <Text
                                x={15}
                                y={15}
                                text={cursor.nickname || `User ${cursor.id.substring(0, 4)}`}
                                fontSize={12}
                                fill={cursor.color}
                                fontFamily="sans-serif"
                                fontStyle="bold"
                                shadowColor="white"
                                shadowBlur={2}
                            />
                        </Group>
                    ))}
                </Layer>
            </Stage>
        </div>
    );
};

export default Whiteboard;
