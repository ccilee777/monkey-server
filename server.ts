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
app.use(express.json()); 

app.get("/", (req, res) => {
    res.send("🐒 猴子服务器运行正常！匹配系统已就绪！"); 
});

// ⚠️ 终极核心：在源头分流，彻底杜绝 Express 抢跑和 404
const httpServer = http.createServer((req, res) => {
    if (req.url && req.url.startsWith("/matchmake")) {
        // 遇到匹配请求，直接将 Express 拦在门外，让请求原封不动地交给 Colyseus 处理
        return; 
    }
    // 其他请求（如访问主页探针）才交给 Express
    app(req, res);
});

const gameServer = new Server({
    transport: new WebSocketTransport({
        server: httpServer
    }),
    // @ts-ignore: 强行在游戏引擎最底层注入正确的 CORS 规则，完美匹配前端的跨域凭证
    cors: {
        origin: true,
        credentials: true
    }
});

gameServer.define("monkey_room", GameRoom);

const port = Number(process.env.PORT || 2567);
httpServer.listen(port, () => {
    console.log(`🚀 猴子服务器已启动，监听端口: ${port}`);
});
