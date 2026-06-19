import http from "http";
import express from "express";
import cors from "cors";
import { Server, Room, Client } from "colyseus";
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
app.use(cors());
// ⚠️ 终极修复 1：允许服务器解析前端发来的开房请求
app.use(express.json()); 

// ⚠️ 终极修复 2：加一个探针，以后直接访问网址就能知道服务器活没活着
app.get("/", (req, res) => {
    res.send("🐒 猴子服务器运行正常！匹配系统已就绪！"); 
});

const httpServer = http.createServer(app);

const gameServer = new Server({
    transport: new WebSocketTransport({
        server: httpServer
    })
});

gameServer.define("monkey_room", GameRoom);

// ⚠️ 终极修复 3：强制转换端口类型，完美适配 Render 云环境
const port = Number(process.env.PORT || 2567);
httpServer.listen(port, () => {
    console.log(`🚀 猴子服务器已启动，监听端口: ${port}`);
});
