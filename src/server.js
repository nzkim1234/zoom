import http from "http";
import express from "express";
import WebSocket from "ws";
import {Server} from "socket.io";
import {instrument} from "@socket.io/admin-ui";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`listening on http://localhost:3000`);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
    },
});

instrument(io, {
    auth: false,
});

function publicRooms(){
    const {
        sockets: {
            adapter: {sids, rooms},
        },
    } = io;

    const publicRooms = [];

    rooms.forEach((_, key) => {
        if(sids.get(key) === undefined){
            publicRooms.push(key);
        }
    });
    return publicRooms
}

function countRoom(roomName){
    return io.sockets.adapter.rooms.get(roomName)?.size;
}


io.on("connection", (socket) => {
    socket["nickname"] = "Anon";
    socket.onAny((event) => {
        console.log(`Socket Event: ${event}`);
    });
    socket.on("enter_room", (roomname, done) => {
        socket.join(roomname);
        done();
        socket.to(roomname).emit("welcome", socket.nickname, countRoom(roomname));
        io.sockets.emit("room_change", publicRooms());
    });
    socket.on("disconnect", () => {
        io.sockets.emit("room_change", publicRooms());
    });
    socket.on("disconnecting", () => {
        socket.rooms.forEach(room => socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1));
    });
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    })

    socket.on("nickname", (nickname) => {
        socket["nickname"] = nickname;
    });
});

// const wss = new WebSocket.Server({server});
// const sockets = [];
// wss.on("connection", (socket) => {
//     sockets.push(socket);
//     socket["nickname"] = 'Anonymous';
//     console.log('Connected to Browser ')
//     socket.on("close", () => console.log('Disconnected from the browser'));
//     socket.on('message', (msg) => {
//         const message = JSON.parse(msg);
//         switch(message.type) {
//             case "new_message":
//                 sockets.forEach((aSocket) => 
//                     aSocket.send(`${socket.nickname}: ${message.payload}`)
//                 ); 
//             case "nickname":
//                 socket["nickname"] = message.payload;
//         }
//     });
// });

server.listen(3000, handleListen);