import http from "http";
import express from "express";
import cors from "cors";
// ⚠️ 引入了 matchMaker（官方的幕后发票员）
import { Server, Room, Client, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Schema, MapSchema, type } from "@colyseus/schema";

class Player extends Schema {
    @type("boolean") isJumping: boolean = false;
    @type("string") role: string = ""; 
}

class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
}

class GameRoom extends Room {
    maxClients = 2;

    onCreate(options: any) {
        this.setState(new GameState());
        this.onMessage("jump", (client, message) => {
            this.broadcast("player_jumped", { id: client.sessionId });
        });
    }

    onJoin(client: Client) {
        const newPlayer = new Player();
        newPlayer.role = this.clients.length === 1 ? "left_monkey" : "right_monkey";
        const state = this.state as GameState;
        state.players.set(client.sessionId, newPlayer);

        if (this.clients.length === 2) {
            this.broadcast("game_start");
        }
    }

    onLeave(client: Client) {
        const state = this.state as GameState;
        state.players.delete(client.sessionId);
    }
}

const app = express();

app.use(cors({
    origin: true,
    credentials: true
})); 
app.use(express.json()); 

app.get("/", (req, res) => {
    res.send("🐒 猴子服务器运行正常！"); 
});

// ⚠️ 终极破局魔法：我们自己手写一个售票处！
// 拦截前端找房间的请求，让幕后发票员（matchMaker）直接把房间数据以 JSON 格式发给手机
app.post("/matchmake/joinOrCreate/:roomName", async (req, res) => {
    try {
        const reservation = await matchMaker.joinOrCreate(req.params.roomName, req.body || {});
        res.json(reservation); // 把门票完美交给前端，消灭 undefined 报错！
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

const httpServer = http.createServer(app);

const gameServer = new Server({
    transport: new WebSocketTransport({
        server: httpServer
    })
});

gameServer.define("monkey_room", GameRoom);

const port = Number(process.env.PORT || 2567);
gameServer.listen(port);
console.log(`🚀 猴子服务器已启动，监听端口: ${port}`);
