import { recordMatchResult } from './leaderboard';
import { Env, PlayerSession, RoomState } from './types';

const RETRO_BOTS = [
  { username:'Hackerman-9000', name:'CobolSlayer', avatarUrl:'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=150&q=80', type:'Cobol-Legacy', level:52, bio:'Wrote the bios code in the Apollo 11 Lander inside a text editor with no syntax highlighting.', roast:'Still using tabs instead of spaces and compiles directly into binary using magnetic coils.', stats:{hp:100,attack:72,defense:68,speed:50,chaos:85}, moves:[{name:'PunchCard Strike',power:45,desc:'Overwhelms system cache with massive sequence of instructions.'},{name:'Direct Master Push',power:65,desc:'Bypasses Git staging entirely.'},{name:'Buffer Overflow',power:75,desc:'Flares memory leak causing critical damage to core subsystems.'},{name:'Sleep Deprivation',power:30,desc:'Consumes caffeine to repair 30 corrupted system HP.'}], joinedYear:'1979', publicRepos:104, followers:256, location:'Underground Datacenter', spriteSeed:'hacker-9000-apollo' },
  { username:'Junior-AI-Prompter', name:'TokenSpammer', avatarUrl:'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&q=80', type:'AI-Copier', level:40, bio:"Prompts AI to write custom microservices in Rust but doesn't know what a compiler is.", roast:'Spends 30 dollars a month on premium helper tools just to build a custom static hello world button.', stats:{hp:80,attack:45,defense:40,speed:85,chaos:90}, moves:[{name:'Spam Prompt',power:50,desc:'Floods the stream with unvalidated AI modules.'},{name:'Refactor Loop',power:30,desc:'Accidentally re-generates an infinite loop.'},{name:'Hallucination Blast',power:70,desc:'Deals erratic visual distortion waves to opponent logic.'},{name:'Paste Overflow',power:40,desc:'Clones a StackOverflow solution to heal 25 HP.'}], joinedYear:'2024', publicRepos:3, followers:1, location:'OpenAI Dev Forum', spriteSeed:'junior-gpt-cloner' },
  { username:'Y2K-Glitch-Drake', name:'SyntaxReaper', avatarUrl:'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=150&q=80', type:'Glitch-Abomination', level:65, bio:'Formed from 2 billion lines of unmerged JS commits locked inside a cold production bin.', roast:'Lacks documentation, has 47 critical vulnerability security alerts, and uses var instead of let.', stats:{hp:110,attack:85,defense:55,speed:60,chaos:95}, moves:[{name:'Force-Merge Chaos',power:75,desc:'Splices conflicting git branches and causes extreme system trauma.'},{name:'Var Declaration',power:45,desc:'Pollutes global scopes with memory leakage.'},{name:'Spit-Roast Critique',power:55,desc:'Unleashes cyber roasts that tear down opponent defense stat.'},{name:'Hot Fix Patch',power:25,desc:'Installs urgent security build to restore 35 HP.'}], joinedYear:'1999', publicRepos:89, followers:404, location:'Localhost:8080', spriteSeed:'glitchy-y2k-drake' }
];

interface GameServerState {
  sessions: Map<WebSocket, { username: string; mon: any; status: string; roomId: string | null; pNumber: number }>;
  rooms: Map<string, RoomState>;
}

export class GameServer implements DurableObject {
  private sessions: Map<WebSocket, { username: string; mon: any; status: string; roomId: string | null; pNumber: number }>;
  private rooms: Map<string, RoomState>;
  private ctx: DurableObjectState;
  private storage: DurableObjectStorage;
  private env: Env;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.storage = ctx.storage;
    this.env = env;
    this.sessions = new Map();
    this.rooms = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Accept the WebSocket
      this.sessions.set(server, { username: '', mon: null, status: 'idle', roomId: null, pNumber: 1 });
      this.ctx.acceptWebSocket(server);

      // Send initial lobby update
      server.send(JSON.stringify({
        type: 'lobby_update',
        onlineCount: this.sessions.size,
      }));

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    try {
      const data = JSON.parse(message);
      const session = this.sessions.get(ws);
      if (!session) return;

      switch (data.type) {
        case 'register': {
          session.username = data.username;
          session.mon = data.mon;
          session.status = 'idle';
          this.broadcastLobbyUpdate();
          break;
        }

        case 'start_matchmaking': {
          if (!session.mon) {
            ws.send(JSON.stringify({ type: 'error', message: 'Must summon and register a Roast-Mon first.' }));
            return;
          }
          session.status = 'searching';

          // Find another searching player
          let matchOpponent: { ws: WebSocket; username: string; mon: any; status: string; roomId: string | null; pNumber: number } | null = null;
          for (const [otherWs, otherSession] of this.sessions.entries()) {
            if (otherWs !== ws && otherSession.status === 'searching' && otherSession.username !== session.username) {
              matchOpponent = { ws: otherWs, ...otherSession };
              break;
            }
          }

          if (matchOpponent) {
            const roomId = `pvp_room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            session.status = 'battling';
            session.roomId = roomId;
            session.pNumber = 1;
            matchOpponent.status = 'battling';
            matchOpponent.roomId = roomId;
            matchOpponent.pNumber = 2;

            const room: RoomState = {
              roomId,
              isAiMatch: false,
              p1: { username: session.username, mon: session.mon, hp: session.mon.stats.hp, maxHp: session.mon.stats.hp, ws, action: null },
              p2: { username: matchOpponent.username, mon: matchOpponent.mon, hp: matchOpponent.mon.stats.hp, maxHp: matchOpponent.mon.stats.hp, ws: matchOpponent.ws, action: null },
              turn: 1,
            };
            this.rooms.set(roomId, room);

            ws.send(JSON.stringify({ type: 'match_found', roomId, pNumber: 1, opponent: matchOpponent.mon, opponentName: matchOpponent.username, isAi: false }));
            matchOpponent.ws.send(JSON.stringify({ type: 'match_found', roomId, pNumber: 2, opponent: session.mon, opponentName: session.username, isAi: false }));
            this.broadcastLobbyUpdate();
          } else {
            // After 4.5s, fallback to AI bot
            const timeoutId = setTimeout(() => {
              if (session.status === 'searching') {
                const botMon = RETRO_BOTS[Math.floor(Math.random() * RETRO_BOTS.length)];
                const roomId = `pvp_room_bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                session.status = 'battling';
                session.roomId = roomId;
                session.pNumber = 1;

                const room: RoomState = {
                  roomId,
                  isAiMatch: true,
                  p1: { username: session.username, mon: session.mon, hp: Math.max(session.mon.stats.hp, 50), maxHp: Math.max(session.mon.stats.hp, 50), ws, action: null },
                  p2: { username: botMon.username, mon: botMon, hp: botMon.stats.hp, maxHp: botMon.stats.hp, ws: null, action: null },
                  turn: 1,
                };
                this.rooms.set(roomId, room);

                ws.send(JSON.stringify({ type: 'match_found', roomId, pNumber: 1, opponent: botMon, opponentName: botMon.username, isAi: true }));
                this.broadcastLobbyUpdate();
              }
            }, 4500);
            // Store timeout ID
            (session as any).matchmakingTimeout = timeoutId;
          }
          break;
        }

        case 'cancel_searching': {
          session.status = 'idle';
          if ((session as any).matchmakingTimeout) {
            clearTimeout((session as any).matchmakingTimeout);
            (session as any).matchmakingTimeout = null;
          }
          this.broadcastLobbyUpdate();
          break;
        }

        case 'submit_pvp_action': {
          const { roomId, action, moveIndex } = data;
          const room = this.rooms.get(roomId);
          if (!room) { ws.send(JSON.stringify({ type: 'error', message: 'Active room not found.' })); return; }

          const isP1 = session.pNumber === 1;
          if (isP1) room.p1.action = { action, moveIndex };
          else room.p2.action = { action, moveIndex };

          if (room.isAiMatch && room.p1.action) {
            const botHpRatio = room.p2.hp / room.p2.maxHp;
            let botAction = 'MOVE';
            let botMoveIndex = Math.floor(Math.random() * 4);
            if (botHpRatio < 0.3 && Math.random() < 0.5) botAction = 'HEAL';
            else if (Math.random() < 0.15) botAction = 'SPIT_ROAST';
            room.p2.action = { action: botAction, moveIndex };
          }

          if (room.p1.action && room.p2.action) this.processTurn(room);
          break;
        }

        case 'forfeit_match': {
          const room = this.rooms.get(data.roomId);
          if (room) this.handleForfeit(room, session.pNumber);
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  }

  async webSocketClose(ws: WebSocket) {
    const session = this.sessions.get(ws);
    if (session?.roomId) {
      const room = this.rooms.get(session.roomId);
      if (room) this.handleForfeit(room, session.pNumber);
    }
    if ((session as any)?.matchmakingTimeout) clearTimeout((session as any).matchmakingTimeout);
    this.sessions.delete(ws);
    this.broadcastLobbyUpdate();
  }

  private broadcastLobbyUpdate() {
    const onlineCount = this.sessions.size;
    const idlePlayers: string[] = [];
    for (const s of this.sessions.values()) {
      if (s.status === 'idle' && s.username) idlePlayers.push(s.username);
    }
    const payload = JSON.stringify({ type: 'lobby_update', onlineCount, idlePlayers });
    for (const [client] of this.sessions) {
      try { client.send(payload); } catch {}
    }
  }

  private handleForfeit(room: RoomState, forfeiteePNumber: number) {
    const isP1Forfeit = forfeiteePNumber === 1;
    const logs = [
      'CRITICAL ALERT!',
      `Player ${isP1Forfeit ? room.p1.username : room.p2.username} disconnected/forfeited!`,
      `Player ${isP1Forfeit ? room.p2.username : room.p1.username} wins by forfeit!`
    ];
    const results = {
      type: 'pvp_turn_result', logs,
      p1HP: isP1Forfeit ? 0 : room.p1.hp,
      p2HP: isP1Forfeit ? room.p2.hp : 0,
      isOver: true,
      winnerNickname: isP1Forfeit ? room.p2.username : room.p1.username,
    };
    [room.p1.ws, room.p2.ws].forEach(w => { try { w?.send(JSON.stringify(results)); } catch {} });

    const p1Winner = isP1Forfeit ? room.p2 : room.p1;
    const p1Loser = isP1Forfeit ? room.p1 : room.p2;

    if (!room.isAiMatch) {
      recordMatchResult(this.env.LEADERBOARD,
        { username: p1Winner.username, monName: p1Winner.mon.name, level: p1Winner.mon.level, avatarUrl: p1Winner.mon.avatarUrl },
        { username: p1Loser.username, monName: p1Loser.mon.name, level: p1Loser.mon.level, avatarUrl: p1Loser.mon.avatarUrl }
      );
    } else {
      recordMatchResult(this.env.LEADERBOARD,
        { username: room.p1.username, monName: room.p1.mon.name, level: room.p1.mon.level, avatarUrl: room.p1.mon.avatarUrl },
        { username: room.p2.username, monName: room.p2.mon.name, level: room.p2.mon.level, avatarUrl: room.p2.mon.avatarUrl }
      );
    }

    this.cleanupRoom(room);
  }

  private processTurn(room: RoomState) {
    const logs: string[] = [`=== ROUND ${room.turn} ===`];
    const p1Speed = room.p1.mon.stats.speed;
    const p2Speed = room.p2.mon.stats.speed;
    let first = room.p1, second = room.p2;
    if (p2Speed > p1Speed || (p2Speed === p1Speed && Math.random() < 0.5)) { first = room.p2; second = room.p1; }

    const executeAction = (attacker: typeof room.p1, defender: typeof room.p1) => {
      const act = attacker.action;
      if (!act) return;
      if (act.action === 'HEAL') {
        const healAmt = 25 + Math.floor(Math.random() * 15);
        const oldHp = attacker.hp;
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
        logs.push(`${attacker.username}'s ${attacker.mon.name} repaired code loops! Restored +${attacker.hp - oldHp} HP! (${attacker.hp}/${attacker.maxHp} HP)`);
      } else if (act.action === 'SPIT_ROAST') {
        const dmg = Math.floor(Math.random() * 8) + 12;
        defender.hp = Math.max(0, defender.hp - dmg);
        logs.push(`${attacker.username} hurled a savage spit roast critique! Dealt ${dmg} mental dmg! [${defender.username}: ${defender.hp}/${defender.maxHp} HP]`);
      } else {
        const moveIndex = act.moveIndex ?? 0;
        const move = attacker.mon.moves[moveIndex] || attacker.mon.moves[0];
        let rawDmg = Math.floor((move.power * attacker.mon.stats.attack) / (defender.mon.stats.defense * 1.4));
        rawDmg = Math.max(8, rawDmg) + Math.floor(Math.random() * 6);
        defender.hp = Math.max(0, defender.hp - rawDmg);
        logs.push(`${attacker.username}'s ${attacker.mon.name} used ${move.name.toUpperCase()}! Dealt ${rawDmg} dmg. [${defender.username}: ${defender.hp}/${defender.maxHp} HP]`);
      }
    };

    executeAction(first, second);
    if (second.hp <= 0) {
      logs.push(`${second.username}'s ${second.mon.name} is corrupted and crashed!`);
      logs.push(`PLAYER ${first.username} WINS THE PVP CHAMPIONSHIP!`);
      this.finishRoom(room, first, second, logs);
      return;
    }
    executeAction(second, first);
    if (first.hp <= 0) {
      logs.push(`${first.username}'s ${first.mon.name} is corrupted and crashed!`);
      logs.push(`PLAYER ${second.username} WINS THE PVP CHAMPIONSHIP!`);
      this.finishRoom(room, second, first, logs);
      return;
    }
    room.turn += 1;
    room.p1.action = null;
    room.p2.action = null;
    this.broadcastTurnResult(room, logs, false, '');
  }

  private broadcastTurnResult(room: RoomState, logs: string[], isOver: boolean, winnerNickname: string) {
    const payload = JSON.stringify({ type: 'pvp_turn_result', logs, p1HP: room.p1.hp, p2HP: room.p2.hp, isOver, winnerNickname });
    [room.p1.ws, room.p2.ws].forEach(w => { try { w?.send(payload); } catch {} });
  }

  private finishRoom(room: RoomState, winner: typeof room.p1, loser: typeof room.p1, logs: string[]) {
    this.broadcastTurnResult(room, logs, true, winner.username);

    if (!room.isAiMatch) {
      recordMatchResult(this.env.LEADERBOARD,
        { username: winner.username, monName: winner.mon.name, level: winner.mon.level, avatarUrl: winner.mon.avatarUrl },
        { username: loser.username, monName: loser.mon.name, level: loser.mon.level, avatarUrl: loser.mon.avatarUrl }
      );
    } else {
      recordMatchResult(this.env.LEADERBOARD,
        { username: room.p1.username, monName: room.p1.mon.name, level: room.p1.mon.level, avatarUrl: room.p1.mon.avatarUrl },
        { username: room.p2.username, monName: room.p2.mon.name, level: room.p2.mon.level, avatarUrl: room.p2.mon.avatarUrl }
      );
    }

    this.cleanupRoom(room);
  }

  private cleanupRoom(room: RoomState) {
    [{ ws: room.p1.ws }, { ws: room.p2.ws }].forEach(({ ws }) => {
      if (ws) {
        const s = this.sessions.get(ws);
        if (s) { s.status = 'idle'; s.roomId = null; }
      }
    });
    this.rooms.delete(room.roomId);
    this.broadcastLobbyUpdate();
  }
}
