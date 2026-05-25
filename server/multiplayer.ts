import { WebSocketServer, WebSocket } from 'ws';
import { recordMatchResult } from './leaderboard.js';

interface PlayerSession {
  ws: WebSocket;
  username: string;
  mon: any;
  status: 'idle' | 'searching' | 'battling';
  roomId: string | null;
  pNumber: number; // 1 or 2
}

interface RoomState {
  roomId: string;
  isAiMatch: boolean;
  p1: { username: string; mon: any; hp: number; maxHp: number; ws: WebSocket | null; action: any };
  p2: { username: string; mon: any; hp: number; maxHp: number; ws: WebSocket | null; action: any };
  turn: number;
}

const sessions = new Map<WebSocket, PlayerSession>();
const rooms = new Map<string, RoomState>();

// Sarcastic bots to fight in case matchmaking server has no other active humans
const RETRO_BOTS = [
  {
    username: 'Hackerman-9000',
    name: 'CobolSlayer',
    avatarUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=150&q=80',
    type: 'Cobol-Legacy',
    level: 52,
    bio: 'Wrote the bios code in the Apollo 11 Lander inside a text editor with no syntax highlighting.',
    roast: 'Still using tabs instead of spaces and compiles directly into binary using magnetic coils.',
    stats: { hp: 100, attack: 72, defense: 68, speed: 50, chaos: 85 },
    moves: [
      { name: 'PunchCard Strike', power: 45, desc: 'Overwhelms system cache with massive sequence of instructions.' },
      { name: 'Direct Master Push', power: 65, desc: 'Bypasses Git staging entirely.' },
      { name: 'Buffer Overflow', power: 75, desc: 'Flares memory leak causing critical damage to core subsystems.' },
      { name: 'Sleep Deprivation', power: 30, desc: 'Consumes caffeine to repair 30 corrupted system HP.' },
    ],
    joinedYear: '1979',
    publicRepos: 104,
    followers: 256,
    location: 'Underground Datacenter',
    spriteSeed: 'hacker-9000-apollo',
  },
  {
    username: 'Junior-AI-Prompter',
    name: 'TokenSpammer',
    avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&q=80',
    type: 'AI-Copier',
    level: 40,
    bio: 'Prompts AI to write custom microservices in Rust but doesn\'t know what a compiler is.',
    roast: 'Spends 30 dollars a month on premium helper tools just to build a custom static hello world button.',
    stats: { hp: 80, attack: 45, defense: 40, speed: 85, chaos: 90 },
    moves: [
      { name: 'Spam Prompt', power: 50, desc: 'Floods the stream with unvalidated AI modules.' },
      { name: 'Refactor Loop', power: 30, desc: 'Accidentally re-generates an infinite loop.' },
      { name: 'Hallucination Blast', power: 70, desc: 'Deals erratic visual distortion waves to opponent logic.' },
      { name: 'Paste Overflow', power: 40, desc: 'Clones a StackOverflow solution to heal 25 HP.' },
    ],
    joinedYear: '2024',
    publicRepos: 3,
    followers: 1,
    location: 'OpenAI Dev Forum',
    spriteSeed: 'junior-gpt-cloner',
  },
  {
    username: 'Y2K-Glitch-Drake',
    name: 'SyntaxReaper',
    avatarUrl: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=150&q=80',
    type: 'Glitch-Abomination',
    level: 65,
    bio: 'Formed from 2 billion lines of unmerged JS commits locked inside a cold production bin.',
    roast: 'Lacks documentation, has 47 critical vulnerability security alerts, and uses var instead of let.',
    stats: { hp: 110, attack: 85, defense: 55, speed: 60, chaos: 95 },
    moves: [
      { name: 'Force-Merge Chaos', power: 75, desc: 'Splices conflicting git branches and causes extreme system trauma.' },
      { name: 'Var Declaration', power: 45, desc: 'Pollutes global scopes with memory leakage.' },
      { name: 'Spit-Roast Critique', power: 55, desc: 'Unleashes cyber roasts that tear down opponent defense stat.' },
      { name: 'Hot Fix Patch', power: 25, desc: 'Installs urgent security build to restore 35 HP.' },
    ],
    joinedYear: '1999',
    publicRepos: 89,
    followers: 404,
    location: 'Localhost:8080',
    spriteSeed: 'glitchy-y2k-drake',
  }
];

export function setupMultiplayer(server: any) {
  const wss = new WebSocketServer({ server });

  console.log('WebSocket Server mounted on Express HTTP core listening to port 3000');

  wss.on('connection', (ws: WebSocket) => {
    // Save session
    const session: PlayerSession = {
      ws,
      username: '',
      mon: null,
      status: 'idle',
      roomId: null,
      pNumber: 1,
    };
    sessions.set(ws, session);

    // Send initial status
    ws.send(JSON.stringify({
      type: 'lobby_update',
      onlineCount: sessions.size,
    }));

    ws.on('message', (messageData: string) => {
      try {
        const data = JSON.parse(messageData);

        switch (data.type) {
          case 'register': {
            session.username = data.username;
            session.mon = data.mon;
            session.status = 'idle';
            console.log(`Registered player: ${session.username} with mon ${session.mon?.name}`);
            
            // Broadcast online players
            broadcastLobbyUpdate(wss);
            break;
          }

          case 'start_matchmaking': {
            if (!session.mon) {
              ws.send(JSON.stringify({ type: 'error', message: 'Must summon and register a Roast-Mon first.' }));
              return;
            }

            session.status = 'searching';
            console.log(`Player ${session.username} entered matchmaking queue.`);

            // Search for other actual human searching players (excluding self)
            let matchOpponent: PlayerSession | null = null;
            for (const [otherWs, otherSession] of sessions.entries()) {
              if (otherWs !== ws && otherSession.status === 'searching' && otherSession.username !== session.username) {
                matchOpponent = otherSession;
                break;
              }
            }

            if (matchOpponent) {
              // Create an actual human match room
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
                p1: {
                  username: session.username,
                  mon: session.mon,
                  hp: session.mon.stats.hp,
                  maxHp: session.mon.stats.hp,
                  ws: ws,
                  action: null,
                },
                p2: {
                  username: matchOpponent.username,
                  mon: matchOpponent.mon,
                  hp: matchOpponent.mon.stats.hp,
                  maxHp: matchOpponent.mon.stats.hp,
                  ws: matchOpponent.ws,
                  action: null,
                },
                turn: 1,
              };

              rooms.set(roomId, room);

              console.log(`Matched Room ${roomId}: ${session.username} VS ${matchOpponent.username}`);

              ws.send(JSON.stringify({
                type: 'match_found',
                roomId,
                pNumber: 1,
                opponent: matchOpponent.mon,
                opponentName: matchOpponent.username,
                isAi: false,
              }));

              matchOpponent.ws.send(JSON.stringify({
                type: 'match_found',
                roomId,
                pNumber: 2,
                opponent: session.mon,
                opponentName: session.username,
                isAi: false,
              }));

              broadcastLobbyUpdate(wss);
            } else {
              // Queue fallback to offline simulation in case they wait alone
              setTimeout(() => {
                // Double check if player is still searching
                if (session.status === 'searching') {
                  // Connect as AI match!
                  const roomId = `pvp_room_bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                  
                  // Pick a random bot
                  const botMon = RETRO_BOTS[Math.floor(Math.random() * RETRO_BOTS.length)];
                  
                  session.status = 'battling';
                  session.roomId = roomId;
                  session.pNumber = 1;

                  const room: RoomState = {
                    roomId,
                    isAiMatch: true,
                    p1: {
                      username: session.username,
                      mon: session.mon,
                      hp: Math.max(session.mon.stats.hp, 50),
                      maxHp: Math.max(session.mon.stats.hp, 50),
                      ws: ws,
                      action: null,
                    },
                    p2: {
                      username: botMon.username,
                      mon: botMon,
                      hp: botMon.stats.hp,
                      maxHp: botMon.stats.hp,
                      ws: null, // bot
                      action: null,
                    },
                    turn: 1,
                  };

                  rooms.set(roomId, room);

                  console.log(`AI Matchmaking room ${roomId} triggered for player: ${session.username} VS Bot ${botMon.username}`);

                  ws.send(JSON.stringify({
                    type: 'match_found',
                    roomId,
                    pNumber: 1,
                    opponent: botMon,
                    opponentName: botMon.username,
                    isAi: true,
                  }));

                  broadcastLobbyUpdate(wss);
                }
              }, 4500); 
            }
            break;
          }

          case 'cancel_searching': {
            session.status = 'idle';
            console.log(`Player ${session.username} cancelled matchmaking.`);
            broadcastLobbyUpdate(wss);
            break;
          }

          case 'submit_pvp_action': {
            const { roomId, action, moveIndex } = data;
            const room = rooms.get(roomId);
            if (!room) {
              ws.send(JSON.stringify({ type: 'error', message: 'Active room not found.' }));
              return;
            }

            const isP1 = session.pNumber === 1;
            
            if (isP1) {
              room.p1.action = { action, moveIndex };
            } else {
              room.p2.action = { action, moveIndex };
            }

            console.log(`PVP action received (Room ${roomId}) from pNumber ${session.pNumber}: ${action}`);

            // If playing with AI and player 1 makes a move, AI instantly submits action
            if (room.isAiMatch && room.p1.action) {
              // Bot chooses what to do: heal if HP low, otherwise attack with a random move
              const botHpRatio = room.p2.hp / room.p2.maxHp;
              let botAction = 'MOVE';
              let botMoveIndex = Math.floor(Math.random() * 4);

              if (botHpRatio < 0.3 && Math.random() < 0.5) {
                // Trigger heal (usually move 4 or just explicit general heal action in some games)
                botAction = 'HEAL';
              } else if (Math.random() < 0.15) {
                botAction = 'SPIT_ROAST';
              }

              room.p2.action = { action: botAction, moveIndex: botMoveIndex };
            }

            // If both players have selected their turn moves, process them!
            if (room.p1.action && room.p2.action) {
              processPvpTurn(room);
            }
            break;
          }

          case 'forfeit_match': {
            const { roomId } = data;
            const room = rooms.get(roomId);
            if (room) {
              handleForfeit(room, session.pNumber);
            }
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket parsing error:', err);
      }
    });

    ws.on('close', () => {
      console.log('Player disconnected from WebSocket.');
      // Handle active battles if they were playing
      if (session.roomId) {
        const room = rooms.get(session.roomId);
        if (room) {
          handleForfeit(room, session.pNumber);
        }
      }
      sessions.delete(ws);
      broadcastLobbyUpdate(wss);
    });
  });
}

function broadcastLobbyUpdate(wss: WebSocketServer) {
  const onlineCount = sessions.size;
  const idlePlayernames: string[] = [];
  
  for (const session of sessions.values()) {
    if (session.status === 'idle' && session.username) {
      idlePlayernames.push(session.username);
    }
  }

  const payload = JSON.stringify({
    type: 'lobby_update',
    onlineCount,
    idlePlayers: idlePlayernames,
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function handleForfeit(room: RoomState, forfeiteePNumber: number) {
  const isP1Forfei = forfeiteePNumber === 1;
  const logs = [
    `CRITICAL ALERT!`,
    `Player ${isP1Forfei ? room.p1.username : room.p2.username} disconnected/forfeited!`,
    `Player ${isP1Forfei ? room.p2.username : room.p1.username} wins by forfeit!`
  ];

  const p1Receiver = room.p1.ws;
  const p2Receiver = room.p2.ws;

  const results = {
    type: 'pvp_turn_result',
    logs,
    p1HP: isP1Forfei ? 0 : room.p1.hp,
    p2HP: isP1Forfei ? room.p2.hp : 0,
    isOver: true,
    winnerNickname: isP1Forfei ? room.p2.username : room.p1.username,
  };

  if (p1Receiver?.readyState === WebSocket.OPEN) {
    p1Receiver.send(JSON.stringify(results));
  }
  if (p2Receiver?.readyState === WebSocket.OPEN) {
    p2Receiver.send(JSON.stringify(results));
  }

  // Update leaderboard with forfeit stats
  if (isP1Forfei) {
    recordMatchResult(
      { username: room.p2.username, monName: room.p2.mon.name, level: room.p2.mon.level, avatarUrl: room.p2.mon.avatarUrl },
      { username: room.p1.username, monName: room.p1.mon.name, level: room.p1.mon.level, avatarUrl: room.p1.mon.avatarUrl }
    );
  } else {
    recordMatchResult(
      { username: room.p1.username, monName: room.p1.mon.name, level: room.p1.mon.level, avatarUrl: room.p1.mon.avatarUrl },
      { username: room.p2.username, monName: room.p2.mon.name, level: room.p2.mon.level, avatarUrl: room.p2.mon.avatarUrl }
    );
  }

  rooms.delete(room.roomId);
}

function processPvpTurn(room: RoomState) {
  const logs: string[] = [`=== ROUND ${room.turn} ===`];

  // Determine priority order
  const p1Speed = room.p1.mon.stats.speed;
  const p2Speed = room.p2.mon.stats.speed;
  
  let first = room.p1;
  let second = room.p2;
  let p1First = true;

  if (p2Speed > p1Speed || (p2Speed === p1Speed && Math.random() < 0.5)) {
    first = room.p2;
    second = room.p1;
    p1First = false;
  }

  const executeAction = (attacker: typeof room.p1, defender: typeof room.p1) => {
    const act = attacker.action;
    if (!act) return;

    if (act.action === 'HEAL') {
      const healAmt = 25 + Math.floor(Math.random() * 15);
      const oldHp = attacker.hp;
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
      const diff = attacker.hp - oldHp;
      logs.push(`${attacker.username}'s ${attacker.mon.name} repaired code loops!`);
      logs.push(`Restored +${diff} HP! (${attacker.hp}/${attacker.maxHp} HP)`);
    } 
    else if (act.action === 'SPIT_ROAST') {
      const dbRate = Math.floor(Math.random() * 8) + 12;
      defender.hp = Math.max(0, defender.hp - dbRate);
      logs.push(`${attacker.username} hurled a savage spit roast critique!`);
      logs.push(`Dealt ${dbRate} mental dmg! [${defender.username}: ${defender.hp}/${defender.maxHp} HP]`);
    } 
    else if (act.action === 'MOVE') {
      const moveIndex = act.moveIndex ?? 0;
      const move = attacker.mon.moves[moveIndex] || attacker.mon.moves[0];
      
      // Compute damage ratio based on standard retro algorithms: (Power * Attack) / (Defense * 1.5)
      let rawDmg = Math.floor((move.power * attacker.mon.stats.attack) / (defender.mon.stats.defense * 1.4));
      rawDmg = Math.max(8, rawDmg) + Math.floor(Math.random() * 6);
      
      defender.hp = Math.max(0, defender.hp - rawDmg);
      logs.push(`${attacker.username}'s ${attacker.mon.name} used ${move.name.toUpperCase()}!`);
      logs.push(`Critique landed! Dealt ${rawDmg} dmg. [${defender.username}: ${defender.hp}/${defender.maxHp} HP]`);
    }
  };

  // Step 1: First player attacks
  executeAction(first, second);

  // Step 2: Check if battle finished
  if (second.hp <= 0) {
    logs.push(`${second.username}'s ${second.mon.name} is corrupted and crashed!`);
    logs.push(`PLAYER ${first.username} WINS THE PVP CHAMPIONSHIP!`);
    finishRoom(room, first, second, logs);
    return;
  }

  // Step 3: Second player attacks
  executeAction(second, first);

  // Step 4: Check if second attack ended battle
  if (first.hp <= 0) {
    logs.push(`${first.username}'s ${first.mon.name} is corrupted and crashed!`);
    logs.push(`PLAYER ${second.username} WINS THE PVP CHAMPIONSHIP!`);
    finishRoom(room, second, first, logs);
    return;
  }

  // Round continues
  room.turn += 1;
  room.p1.action = null;
  room.p2.action = null;

  broadcastTurnResult(room, logs, false, '');
}

function broadcastTurnResult(room: RoomState, logs: string[], isOver: boolean, winnerNickname: string) {
  const payload = JSON.stringify({
    type: 'pvp_turn_result',
    logs,
    p1HP: room.p1.hp,
    p2HP: room.p2.hp,
    isOver,
    winnerNickname,
  });

  if (room.p1.ws?.readyState === WebSocket.OPEN) {
    room.p1.ws.send(payload);
  }
  if (room.p2.ws?.readyState === WebSocket.OPEN) {
    room.p2.ws.send(payload);
  }
}

function finishRoom(room: RoomState, winner: typeof room.p1, loser: typeof room.p1, logs: string[]) {
  broadcastTurnResult(room, logs, true, winner.username);

  // Record stats to leaderboard if it is not an AI battle match (or if it is, still count for the human!)
  if (!room.isAiMatch) {
    recordMatchResult(
      { username: winner.username, monName: winner.mon.name, level: winner.mon.level, avatarUrl: winner.mon.avatarUrl },
      { username: loser.username, monName: loser.mon.name, level: loser.mon.level, avatarUrl: loser.mon.avatarUrl }
    );
  } else {
    // Human is p1
    const p1Winner = winner.username === room.p1.username;
    if (p1Winner) {
      recordMatchResult(
        { username: room.p1.username, monName: room.p1.mon.name, level: room.p1.mon.level, avatarUrl: room.p1.mon.avatarUrl },
        { username: room.p2.username, monName: room.p2.mon.name, level: room.p2.mon.level, avatarUrl: room.p2.mon.avatarUrl }
      );
    } else {
      recordMatchResult(
        { username: room.p2.username, monName: room.p2.mon.name, level: room.p2.mon.level, avatarUrl: room.p2.mon.avatarUrl },
        { username: room.p1.username, monName: room.p1.mon.name, level: room.p1.mon.level, avatarUrl: room.p1.mon.avatarUrl }
      );
    }
  }

  // Set session statuses back to idle
  if (room.p1.ws) {
    const s1 = sessions.get(room.p1.ws);
    if (s1) {
      s1.status = 'idle';
      s1.roomId = null;
    }
  }
  if (room.p2.ws) {
    const s2 = sessions.get(room.p2.ws);
    if (s2) {
      s2.status = 'idle';
      s2.roomId = null;
    }
  }

  rooms.delete(room.roomId);
}
