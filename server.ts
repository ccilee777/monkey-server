import http from "http";
import express from "express";
import cors from "cors";
import { Server, Room, Client } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Schema, MapSchema, type } from "@colyseus/schema";

// 1. 定义玩家状态
class Player extends Schema {
    @type("boolean") isJumping: boolean = false;
    @type("string") role: string = ""; 
}

// 2. 定义全局状态
class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
}

// 3. 定义游戏房间逻辑 (移除了容易引发冲突的 <GameState> 泛型)
class GameRoom extends Room {
    maxClients = 2;

    onCreate(options: any) {
        this.setState(new GameState());
        
        this.onMessage("jump", (client, message) => {
            console.log(`收到玩家 ${client.sessionId} 的跳跃指令`);
            this.broadcast("player_jumped", { id: client.sessionId });
        });
    }

    onJoin(client: Client) {
        console.log(`玩家加入: ${client.sessionId}`);
        const newPlayer = new Player();
        newPlayer.role = this.clients.length === 1 ? "left_monkey" : "right_monkey";
        
        // 核心修复点：使用 'as' 关键字强制断言类型，完美绕开 TS 报错
        const state = this.state as GameState;
        state.players.set(client.sessionId, newPlayer);

        if (this.clients.length === 2) {
            console.log("房间已满，游戏开始！");
            this.broadcast("game_start");
        }
    }

    onLeave(client: Client) {
        console.log(`玩家离开: ${client.sessionId}`);
        // 核心修复点
        const state = this.state as GameState;
        state.players.delete(client.sessionId);
    }
}

// 4. 启动服务器
const app = express();
app.use(cors());
const httpServer = http.createServer(app);

const gameServer = new Server({
    transport: new WebSocketTransport({
        server: httpServer
    })
});

gameServer.define("monkey_room", GameRoom);

const port = 2567;
httpServer.listen(port, () => {
    console.log(`🚀 猴子服务器已在本地启动: http://localhost:${port}`);
});