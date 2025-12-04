import { createServer } from "http";
import { parse } from "url";
import next from "next";
import express from "express";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();
    const httpServer = createServer(server);
    const io = new Server(httpServer);

    const users: Record<string, { id: string; color: string; nickname: string }> = {};

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("join-user", (data) => {
            console.log(`[Server] User joined: ${socket.id}, Nickname: ${data.nickname}`);
            users[socket.id] = { id: socket.id, color: data.color, nickname: data.nickname };
            console.log("[Server] Current users:", Object.values(users));
            io.emit("update-user-list", Object.values(users));
        });

        socket.on("draw", (data) => {
            socket.broadcast.emit("draw", data);
        });

        socket.on("delete", (id) => {
            socket.broadcast.emit("delete", id);
        });

        socket.on("cursor-move", (data) => {
            socket.broadcast.emit("cursor-move", data);
        });

        socket.on("chat-message", (data) => {
            io.emit("chat-message", data);
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
            delete users[socket.id];
            io.emit("update-user-list", Object.values(users));
        });
    });

    server.all("*all", (req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
    });
});
