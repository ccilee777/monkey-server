import http from "http";
import express from "express";
import cors from "cors";
import { Server, Room, Client } from "colyseus";
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

// ⚠️ 终极跨域修复：动态获取前端域名，拒绝使用通配符 '*'，允许凭证通行
app.use(cors({
    origin: true,
    credentials: true
})); 
app.use(express.json());

app.get("/", (req, res) => {
    res.send("🐒 猴子服务器运行正常！"); 
});

const httpServer = http.createServer(app);

// ⚠️ 终极修复核心：直接传入 server 对象，不要套 WebSocketTransport！
// 这样 Colyseus 才会自动把 /matchmake 匹配路由挂载到 Express 上
const gameServer = new Server({
    server: httpServer 
});

gameServer.define("monkey_room", GameRoom);

const port = Number(process.env.PORT || 2567);

// ⚠️ 启动方式必须改成 gameServer.listen 而不是 httpServer.listen
gameServer.listen(port).then(() => {
    console.log(`🚀 猴子服务器已启动，监听端口: ${port}`);
});
