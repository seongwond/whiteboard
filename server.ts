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

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("draw", (data) => {
            socket.broadcast.emit("draw", data);
        });

        socket.on("delete", (id) => {
            socket.broadcast.emit("delete", id);
        });

        socket.on("cursor-move", (data) => {
            socket.broadcast.emit("cursor-move", data);
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
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
