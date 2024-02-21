const Game = require('./modules/gameObjects')

let app = require('express')();
let server = require('http').Server(app);
let io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 10000,
    pingInterval: 15000
});

server.listen(8000);

const DEBUG_LOG = false;
const rooms = [];
const room_limit = 4;
const server_connections = []
let clients_currently_playing = 0;

io.on("connection", async (socket) => {
    if (socket.handshake.query.action === "connectToServer") {
        connectToServer(socket).then((clientID) => {
            socket.on('getRoomList', () => {
                try {
                    sendAvailableRoomsToServerClient(clientID);
                } catch (err) {
                    log("error", "SERVER", `Error handling request: ${err}`)
                }
            });

            socket.on('getNumClientsPlaying', () => {
                try {
                    // note: number of clients divided by two as two connections per client
                    io.to(clientID).emit('numClientsPlayingUpdate', clients_currently_playing)
                } catch (err) {
                    log("error", "SERVER", `Error handling request: ${err}`)
                }
            });

            socket.on('doesRoomHaveCapacity', (args) => {
                try {
                    const roomID = args;
                    let canJoin = true;

                    for (const room of rooms) {
                        if (room.id === roomID)
                            if (room.clients.length >= room_limit) {
                                canJoin = false;
                                break;
                            }
                    }
                    io.to(clientID).emit('doesRoomHaveCapacity', canJoin);
                } catch (err) {
                    log("error", roomID, `Error handling request: ${err}`)
                }
            });

            socket.on('isUsernameAvailable', (args) => {
                try {
                    const roomID = args.roomID;
                    const displayName = args.displayName;
                    let isInRoom = false;

                    for (const room of rooms)
                        if (room.id === roomID)
                            if (room.clients.length < room_limit)
                                for (const client_entry of room.clients)
                                    if (client_entry.displayName === displayName) {
                                        isInRoom = true;
                                        break;
                                    }


                    io.to(clientID).emit('isUsernameAvailable', !isInRoom)
                } catch (err) {
                    log("error", roomID, `Error handling request: ${err}`)
                }
            });
        });
    }

    if (socket.handshake.query.action === "connectToGame") {
        getRoomEntryAndJoin(socket).then((room_entry) => {
                sendRoomsUpdateToServerClients();
                const room_id = socket.handshake.query.room;
                const client_id = socket.handshake.query.client;
                const displayName = socket.handshake.query.displayName;

                socket.on("startGame", (args) => {
                    log("info", room_id, `startGame command: ${JSON.stringify(args)} from ${displayName} (${client_id})`)
                    try {
                        const room_entry = roomEntry(room_id, false);
                        if (room_entry == null) {
                            log("error", room_id, `Room not found: ${room_id}`)
                            return
                        }
                        if (!isInRoom(room_entry, client_id, displayName)) {
                            log("error", room_id, `user ${displayName} cannot start game - he/she is not in the room ${room_id}`)
                            return
                        }
                        if (shouldCreateNewGame(room_entry.gameInstance, room_entry.clients)) {
                            room_entry.gameInstance = new Game([
                                room_entry.clients[0] ? room_entry.clients[0].displayName : null,
                                room_entry.clients[1] ? room_entry.clients[1].displayName : null,
                                room_entry.clients[2] ? room_entry.clients[2].displayName : null,
                                room_entry.clients[3] ? room_entry.clients[3].displayName : null,
                            ], room_entry.meetingUrl);
                            sendToAllPlayersInRoom(room_entry, 'gameStatusUpdate', room_entry.gameInstance.getGameInfo())
                        }
                        const gameInfo = room_entry.gameInstance.getGameInfo();

                        if (gameInfo.gameStatus !== "in_progress") {
                            log("error", room_id, `Game status is invalid: ${gameInfo.gameStatus}`)
                            return;
                        }
                        if (gameInfo.teamsValid !== true) {
                            log("error", room_id, `Teams are not valid for a game ${gameInfo}`)
                            return;
                        }
                        sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', room_entry.gameInstance.currentRound.getRoundStatus())
                        sendMoveOptionsToPlayers(room_entry)
                    } catch (e) {
                        log("error", room_id, `Error handling request: ${err}`)
                    }
                });

                socket.on("switchPlayers", (args) => {
                    log("info", room_id, `switchPlayers command: ${JSON.stringify(args)} from ${displayName} (${client_id})`)
                    try {
                        const room_entry = roomEntry(room_id, false);
                        if (room_entry == null) {
                            log("error", room_id, `Room not found: ${room_id}`)
                            return
                        }
                        let newClients = []
                        for (const playerName of args) {
                        // for (const playerName of args[0]) {
                            for (const client of room_entry.clients) {
                                if (client.displayName === playerName) {
                                    newClients.push(client)
                                }
                            }
                        }

                        room_entry.clients = newClients
                        room_entry.gameInstance = null
                        recreateNewGame(room_entry)
                    } catch (e) {
                        log("error", room_id, `Error handling request: ${err}`)
                    }
                });

                // Leave the room if the user closes the socket
                socket.on("disconnect", () => {
                    try {
                        socket.leave(client_id);
                        log("info", room_id, `${displayName} (${client_id}) has left room`)
                        for (const client_entry of room_entry.clients) {
                            if (client_entry.id === client_id) {
                                const index = room_entry.clients.indexOf(client_entry);
                                if (index > -1) {
                                    room_entry.clients.splice(index, 1);
                                }
                            }
                        }
                        sendToAllPlayersInRoom(room_entry, 'lobbyUpdate', {
                            client: {
                                id: client_id,
                                displayName: displayName
                            }, action: "left"
                        })

                        // delete the room if all users have left
                        if (room_entry.clients.length === 0) {
                            for (const entry of rooms) {
                                if (entry.id === room_id) {
                                    const index = rooms.indexOf(entry);
                                    if (index > -1) {
                                        rooms.splice(index, 1);
                                        log("info", room_id, `Deleted room ${room_id}`)
                                    }
                                }
                            }
                        }
                        updateNumPlayersOnline(-1);
                        sendRoomsUpdateToServerClients();
                    } catch (err) {
                        log("error", room_id, `Error handling request: ${err}`)
                    }
                });

                socket.on('splitDeck', (args) => {
                    try {
                        log("info", room_id, `Getting command to split deck: ${args} from ${displayName} (${client_id})`)
                        if (room_entry.gameInstance) {
                            if (room_entry.gameInstance.currentRound.splitDeck(displayName, args)) {
                                sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', room_entry.gameInstance.currentRound.getRoundStatus())
                                sendMoveOptionsToPlayers(room_entry)
                            }
                        }
                    } catch (err) {
                        log("error", room_id, `Error handling request: ${err}`)
                    }
                });

                socket.on('anouncePremium', (args) => {
                    try {
                        log("info", room_id, `Getting command to anounce premiums: ${JSON.stringify(args)} from ${displayName} (${client_id})`)

                        for (const premium of args) {
                            if (room_entry.gameInstance)
                                if (room_entry.gameInstance.currentRound.anouncePlayerPremium(displayName, premium.cards, premium.type)) {
                                    sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', room_entry.gameInstance.currentRound.getRoundStatus())
                                    sendMoveOptionsToPlayers(room_entry)
                                }
                        }
                    } catch (err) {
                        log("error", room_id, `Error handling request: ${err}`)
                    }
                });

                socket.on('suitSelect', async (args) => {
                    let currentSuit;
                    try {
                        log("info", room_id, `Getting command to select suit: ${args} from ${displayName} (${client_id})`)

                        if (room_entry.gameInstance) {
                            let suitRes = false;
                            if (args === 'x2' || args === 'x4') {
                                currentSuit = room_entry.gameInstance.currentRound.suit;
                                suitRes = room_entry.gameInstance.currentRound.callSuit(displayName, currentSuit, args.charAt(1))
                            } else {
                                suitRes = room_entry.gameInstance.currentRound.callSuit(displayName, args, 1)
                            }

                            if (suitRes) {
                                let roundStatus = room_entry.gameInstance.currentRound.getRoundStatus()

                                if (room_entry.gameInstance.currentRound.getRoundStatus().status == 'suit_selected') {
                                    room_entry.gameInstance.currentRound.initPlayStage()
                                    roundStatus = room_entry.gameInstance.currentRound.getRoundStatus()
                                }

                                const suitSelection = {
                                    roundNum: room_entry.gameInstance.getGameInfo().roundNum,
                                    suitSelection: args,
                                    madeBy: displayName
                                }

                                sendToAllPlayersInRoom(room_entry, 'suitSelectionUpdate', suitSelection)
                                sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', roundStatus)
                                sendMoveOptionsToPlayers(room_entry)

                                if (room_entry.gameInstance.currentRound.getRoundStatus().status === 'over') {
                                    await sendToAllPlayersInRoom(room_entry, 'roundScoreUpdate', room_entry.gameInstance.currentRound.getRoundResults())
                                    await room_entry.gameInstance.endCurrentRound()
                                    await sendToAllPlayersInRoom(room_entry, 'gameStatusUpdate', room_entry.gameInstance.getGameInfo())

                                    // //sleep for 15 secs before starting new round
                                    // await new Promise(resolve => setTimeout(resolve, 5000));
                                    //
                                    // sendMoveOptionsToPlayers(room_entry)
                                    // sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', room_entry.gameInstance.currentRound.getRoundStatus())
                                }
                            }
                        }
                    } catch (err) {
                        log("error", room_id, `Error handling request: ${err}`)
                    }
                });

                socket.on('cardPlay', async (args) => {
                    try {
                        log("info", room_id, `Getting command to play card: ${JSON.stringify(args)} from ${displayName} (${client_id})`)
                        if (room_entry.gameInstance) {
                            //create a copy of the round state in case 4 cards are placed and game needs to pause
                            const startingRoundState = JSON.parse(JSON.stringify(await room_entry.gameInstance.currentRound.getRoundStatus()));

                            if (room_entry.gameInstance.currentRound.placeCard(displayName, args.suit, args.rank)) {
                                // pause for 2 secs if there's 4 cards on the table so players can see them
                                sendMoveOptionsToPlayers(room_entry)
                                if (startingRoundState.cardsOnTable.length === 3) {
                                    await delayCollectingCards(startingRoundState, args, displayName, room_entry)
                                }
                                sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', room_entry.gameInstance.currentRound.getRoundStatus())

                                if (room_entry.gameInstance.currentRound.getRoundStatus().status === 'over') {
                                    await sendToAllPlayersInRoom(room_entry, 'roundScoreUpdate', room_entry.gameInstance.currentRound.getRoundResults())
                                    await room_entry.gameInstance.endCurrentRound()
                                    sendToAllPlayersInRoom(room_entry, 'gameStatusUpdate', room_entry.gameInstance.getGameInfo())

                                    //sleep for 15 secs before starting new round
                                    // await new Promise(resolve => setTimeout(resolve, 15000));
                                    //
                                    // sendMoveOptionsToPlayers(room_entry)
                                    // sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', room_entry.gameInstance.currentRound.getRoundStatus())
                                }
                            }
                        }
                    } catch (err) {
                        log("error", room_id, `Error handling request: ${err}`)
                    }
                });

                socket.on('nextRound', async (args) => {
                    try {
                        log("info", room_id, `Next round command: ${JSON.stringify(args)} from ${displayName} (${client_id})`)
                        // if (room_entry.gameInstance && room_entry.gameInstance.currentRound.getRoundStatus().status === 'over') {
                        if (room_entry.gameInstance) {
                            // this.shiftPlayerTurn();

                            sendMoveOptionsToPlayers(room_entry)
                            sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', room_entry.gameInstance.currentRound.getRoundStatus())
                        }
                    } catch (err) {
                        log("error", room_id, `Error handling request: ${err}`)
                    }
                });
            }
        );
    }
});


async function getMeetingUrl(room_name) {

    if (true) return "TODO"

    const data = JSON.stringify({
        "title": room_name,
        "source": "meet_control",
        "displayName": "Guest user"
    });

    const resp = await fetch("https://api.join.skype.com/v1/meetnow/guest", {
        method: "post",
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.skype.com/'
        },

        body: data
    })

    const json = await resp.json();
    return json.joinLink;
}

// game server funcs

const delayCollectingCards = async (startingRoundState, args, displayName, room_entry) => {
    if (startingRoundState.cardsOnTable.length === 3) {
        startingRoundState.cardsOnTable.push({
            "suit": args.suit,
            "rank": args.rank,
            "placedBy": displayName
        })
        sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', startingRoundState)
        //sleep for 1 sec before hiding the cards
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
}

const sendMoveOptionsToPlayers = async (room) => {
    for (const player of room.clients) {
        await io.to(player.id).emit('playerHandUpdate', room.gameInstance.currentRound.getPlayerHand(player.displayName));
        await io.to(player.id).emit('playerValidSuitOptionsUpdate', room.gameInstance.currentRound.getValidPlayerSuitCalls(player.displayName));
        await io.to(player.id).emit('playerPremiumValidOptions', room.gameInstance.currentRound.getPlayerPremiumOptions(player.displayName));

        if (room.gameInstance.currentRound.getRoundStatus().pTurnName === player.displayName) {
            await io.to(player.id).emit('playerHandValidOptionsUpdate', room.gameInstance.currentRound.getPlayerOptions(player.displayName));
        } else await io.to(player.id).emit('playerHandValidOptionsUpdate', []);
    }
}

const sendToAllPlayersInRoom = async (room, evntType, data) => {
    for (const player of room.clients) {
        await io.to(player.id).emit(evntType, data)
    }
}

const roomEntry = (roomId, create = true) => {
    let room_entry = null
    for (const item of rooms)
        if (item.id === roomId)
            room_entry = item

    if (create && !room_entry) {
        const meetingUrl = getMeetingUrl(roomId);
        const room_data = {
            id: roomId,
            clients: [],
            gameInstance: null,
            messages: [],
            meetingUrl: meetingUrl
        }
        rooms.push(room_data);
        room_entry = room_data
    }

    return room_entry
}

const isInRoom = (room_entry, client_id, displayName) => {
    let isInRoom = false;
    for (const client_entry of room_entry.clients) {
        if (client_entry.id === client_id) {
            isInRoom = true
        }
        if (client_entry.displayName === displayName) {
            isInRoom = true
        }
    }
    return isInRoom;
}

const getRoomEntryAndJoin = async (socket) => {
    // Join a room
    const room_id = socket.handshake.query.room;
    const client_id = socket.handshake.query.client;
    const displayName = socket.handshake.query.displayName;

    // get rooms arr entry
    let room_entry = roomEntry(room_id)

    // check if user is already in room
    let inRoom = isInRoom(room_entry, client_id, displayName);

    // check if room is not already full
    let isRoomFull = false;
    if (room_entry.clients.length >= room_limit) {
        isRoomFull = true;
        log("info", room_id, `Room is full!`)
        sendToAllPlayersInRoom(room_entry, 'lobbyUpdate', {error: "lobby_full"})
    }

    // update rooms arr entry and join
    // init game object for room if enough players are there
    // make init not reset game if player is already in it - I think reconnecting to a game might already work...?
    if (!inRoom && !isRoomFull) {
        socket.join(client_id);
        const new_connection = {
            id: client_id,
            displayName: displayName
        }
        room_entry.clients.push(new_connection);
        log("info", room_id, `client ${client_id} with username ${displayName} has joined room ${room_id}`)

        await sendToAllPlayersInRoom(room_entry, 'lobbyUpdate', {client: new_connection, action: "joined"})
        // update global players counter
        updateNumPlayersOnline(1);

        //create new game if room has 4 people in it
        log("info", room_id, `Creating room with clients: ${room_entry.clients.map(client => {
            return JSON.stringify(client);
        })}`)
        // this doesn't work...
        await recreateNewGame(room_entry)
    }
    return (room_entry);
}


const recreateNewGame = async (room_entry) => {
    if (shouldCreateNewGame(room_entry.gameInstance, room_entry.clients)) {
        room_entry.gameInstance = new Game([
            room_entry.clients[0] ? room_entry.clients[0].displayName : null,
            room_entry.clients[1] ? room_entry.clients[1].displayName : null,
            room_entry.clients[2] ? room_entry.clients[2].displayName : null,
            room_entry.clients[3] ? room_entry.clients[3].displayName : null,
        ], room_entry.meetingUrl);
        await sendToAllPlayersInRoom(room_entry, 'gameStatusUpdate', room_entry.gameInstance.getGameInfo());
        // await sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', room_entry.gameInstance.currentRound.getRoundStatus())

        room_entry.gameInstance = null;

        // if (room_entry.gameInstance.getGameInfo().teamsValid === true) {
        //     sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', room_entry.gameInstance.currentRound.getRoundStatus())
        //     sendMoveOptionsToPlayers(room_entry)
        // } else {
        //     room_entry.gameInstance = null;
        // }
    } else {
        await sendToAllPlayersInRoom(room_entry, 'gameStatusUpdate', room_entry.gameInstance.getGameInfo())
        await sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', room_entry.gameInstance.currentRound.getRoundStatus())
        await sendMoveOptionsToPlayers(room_entry)
    }
}

const startGame = (roomId) => {
    const room_entry = roomEntry(roomId);
    if (room_entry.gameInstance != null) {

    }
    if (room_entry.gameInstance.getGameInfo().teamsValid === true) {
        sendToAllPlayersInRoom(room_entry, 'roundStatusUpdate', room_entry.gameInstance.currentRound.getRoundStatus())
        sendMoveOptionsToPlayers(room_entry)
    } else {
        log("warn", roomId, "Cannot start game - teams are not valid")
    }
}


const shouldCreateNewGame = (currentInstance, clients) => {
    if (currentInstance === null) return true;
    else {
        //check if players are already in game - if game is not over and all the player names match, they should resume
        if (currentInstance.gameStatus === 'over') return true;
        else {
            let playersInGame = true
            for (const client of clients) {
                if (!currentInstance.currentRound.getRoundStatus().players.includes(client.displayName))
                    playersInGame = false;
            }
            return !playersInGame;
        }
    }
}

// all server funcs
const connectToServer = async (socket) => {
    const connID = socket.handshake.query.client;

    // connect to socket if id is not already registered
    if (server_connections.indexOf(connID) === -1) {
        server_connections.push(connID);
        socket.join(connID);
        log("info", "SERVER", `${connID} joined the server, (action = ${socket.handshake.query.action})`)
    }

    socket.on("disconnect", () => {
        server_connections.splice(server_connections.indexOf(connID), 1)
        socket.leave(connID);
        log("info", "SERVER", `${connID} left the server, (action = ${socket.handshake.query.action})`)
    });

    return connID;
}

const sendRoomsUpdateToServerClients = () => {
    const data = []
    for (const room of rooms) {
        if (room.clients.length < 4) {
            const entry = {
                room_id: room.id,
                current_players: room.clients
            }
            data.push(entry)
        }
    }
    broadCastToAllServerClients('roomListUpdate', data)
}

const broadCastToAllServerClients = (evntType, data) => {
    for (const client of server_connections) {
        io.to(client).emit(evntType, data)
    }
}

// modifier should be +1 or -1;
const updateNumPlayersOnline = (modifier) => {
    clients_currently_playing += modifier;

    // sometimes the server miscounts because of web-sockets being flaky
    if (clients_currently_playing < 0)
        clients_currently_playing = 0;
    broadCastToAllServerClients('numClientsPlayingUpdate', clients_currently_playing);
}

const sendAvailableRoomsToServerClient = (clientID) => {
    const data = []
    for (const room of rooms) {
        if (room.clients.length < 4) {
            const entry = {
                room_id: room.id,
                current_players: room.clients
            }
            data.push(entry)
        }
    }
    io.to(clientID).emit('roomListUpdate', data)
}

// valid types/levels are 'error', 'info' and 'debug'
//                         = 0      = 1        = 2
const log = (type, roomID, message) => {
    if (type === "debug" && DEBUG_LOG === true) {
        console.log(`DEBUG INFO: ${message}`)
    } else {
        let now = new Date();
        // generate datetime string
        let datetimeStr =
            now.getFullYear()
            + '-'
            + (now.getMonth() + 1)
            + '-'
            + now.getDate()
            + ' '
            + now.getHours()
            + ":"
            + now.getMinutes()
            + ":"
            + now.getSeconds();

        if (typeof (message) !== "string")
            message = JSON.stringify(message)


        if (type === "info")
            console.log(`[INFO] ${datetimeStr}@[${roomID}]: ${message}`);
        if (type === "error")
            console.error(`[ERROR] ${datetimeStr}@[${roomID}]: ${message}`);
    }

}