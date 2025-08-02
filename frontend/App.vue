<script setup>
import axios from 'axios';
import { socket } from './socket.io/socket';
import chessboard from './chessboardjs/js/chessboard-1.0.0-esm';
import * as chess from 'chess.js';
import { nextTick } from 'vue';
import global from './mixins/global';
import mixins from './mixins/index';
import loginform from './form.vue';
import jQuery from './js/jquery.module.js';
</script>
<template>
    <template v-if="session.user?.logged">
        <div class="game">
            <div v-if="viewBoard" class="game-main">
                <div>
                    <h2>
                        <span class="bold">{{ players.w }} </span> <span>vs</span> <span class="bold">
                            {{ players.b }}</span>
                    </h2>
                </div>
                <div id="board" style="width: 400px;"></div>
            </div>
            <div class="menu">
                <template v-if="ready">
                    <div>
                        <ul>
                            <li v-for="challenge, idx in challenges">
                                <span>{{ challenge?.id }}</span>
                                <span> from {{ challenge?.challenger?.id }}</span>
                                <button @click="acceptChallenge(challenge?.id)" class="btn btn-secondary">
                                    Accept challenge</button>
                            </li>
                        </ul>
                    </div>
                    <hr>
                    <div class="input-group">
                        <span>game-</span>
                        <input type="text" placeholder="id of game to spectate" v-model="spectatorOpts.gameid" required>
                        <button class="btn btn-primary" @click="spectate()">Spectate game</button>
                    </div>
                    <p>or...</p>
                    <div class="input-group">
                        <select v-model="challengeOpts.mycolour" required>
                            <option disabled selected>My colour (default white)</option>
                            <option value="w">White</option>
                            <option value="b">Black</option>
                        </select>
                        <button class="btn btn-primary" @click="challenge()">Challenge</button>
                    </div>
                </template>
            </div>
        </div>
    </template>
    <template v-else>
        <template v-if="!['login', 'join'].includes(decodeURI($route.path).replace('/', ''))">
            <a href="/login">Sign in</a>
        </template>
        <template v-else>
            <RouterView />
        </template>
    </template>
</template>
<style scoped>
@import "./chessboardjs/css/chessboard-1.0.0.min.css";
@import "./bootstrap/css/bootstrap.min.css";
@import "./chessboardjs/css/chessboard-1.0.0.css";
/*! chessboard.js v1.0.0 | (c) 2019 Chris Oakman | MIT License chessboardjs.com/license */

.clearfix-7da63 {
    clear: both;
}

.board-b72b1 {
    border: 2px solid #404040;
    box-sizing: content-box;
}

.square-55d63 {
    float: left;
    position: relative;

    /* disable any native browser highlighting */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

.white-1e1d7 {
    background-color: #f0d9b5;
    color: #b58863;
}

.black-3c85d {
    background-color: #b58863;
    color: #f0d9b5;
}

.highlight1-32417,
.highlight2-9c5d2 {
    box-shadow: inset 0 0 3px 3px yellow;
}

.notation-322f9 {
    cursor: default;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 14px;
    position: absolute;
}

.alpha-d2270 {
    bottom: 1px;
    right: 3px;
}

.numeric-fc462 {
    top: 2px;
    left: 2px;
}

.bold {
    font-weight: bold;
}
</style>
<script>
export default {
    mixins: [global, mixins],
    data() {
        return {
            viewBoard: false,
            Chessboard: null,
            board: null,
            challengeOpts: {
                mycolour: 'w',
                gameid: '',
            },
            spectatorOpts: {
                gameid: '',
            },
            ready: false,
            game: new chess.Chess(),
            playing: false,
            challenges: [],
            players: {
                w: false,
                b: false,
            }
        }
    },
    methods: {
        challenge() {
            if (!this.session.user?.logged) {
                return false;
            }
            if (['w', 'b'].includes(this.challengeOpts.mycolour)) {
                return socket.emit('challenge', { mycolour: this.challengeOpts.mycolour });
            } else {
                return window.alert(`The value of challengeOpts.mycolour should be "w" or "b"`);
            }
        },
        spectate() {
            if (isNaN(Number(this.spectatorOpts.gameid))) {
                return window.alert(``);
            } else {
                this.$store.state.setSessionProp('data.gameNow.id', id);
                return socket.emit('view game', { gameid: this.spectatorOpts.gameid });
            }
        },
        acceptChallenge(challengeid) {
            socket.emit('challenge accepted', { challenge: { id: challengeid } });
        },
        config(thisParam) {
            var thisVar = thisParam.getThisProp();
            return {
                onDragStart: (source, piece, position, orientation) => {
                    console.log(thisVar);
                    if (thisVar.game.isGameOver()) {
                        return false;
                    }
                    if ((thisVar.game.turn() === 'w' && piece.search(/^b/) !== -1) || (thisVar.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
                        return false;
                    }
                },
                onDrop: (source, target) => {
                    // see if the move is legal
                    var move = thisVar.game.move({
                        from: source,
                        to: target,
                        promotion: 'q' // NOTE: always promote to a queen for example simplicity
                    })

                    // illegal move
                    if (move === null) { return 'snapback'; }
                    thisVar.game.undo();
                    console.log(move.san);
                    return socket.emit('new move', { move: move.san, gameid: thisVar.challengeOpts.gameid });
                },
                onSnapEnd: () => {
                    //thisVar.board.position(thisVar.game.fen());
                },
            }
        },
        getThisProp(key) {
            if (!key) {
                return this;
            }
            return this['key'];
        }
    },
    mounted() {
        var thisVar = this;
        this.fetchData(() => {
            nextTick(() => {
                console.log(this.session);
                this.Chessboard = chessboard(window, jQuery).chessboard;
                socket.on('challenge res', ({ id }) => {
                    var sessionData = this.$store.state.session;
                    sessionData.data = sessionData.data || {};
                    sessionData.data.gameNow = sessionData.data.gameNow || {};
                    sessionData.data.gameNow.id = id;
                    sessionData.data.gameNow.playing = true;
                    this.$store.state.setSessionProp('data', sessionData.data);
                });
                socket.on('challenges', ([...challenges]) => {
                    this.challenges = challenges;
                });
                socket.on('challenges list', ([...challenges]) => {
                    this.challenges = challenges;
                })
                socket.on('start game', ({ game, id, players }) => {
                    var { pgn, fen, headers } = game;
                    if (!(players instanceof Array)) {
                        return socket.emit("error", { msg: "move is not valid" });
                    }
                    //this.$store.state.setSessionProp('data.gameNow', id);
                    var newGame = new chess.Chess();
                    for (var key in headers) {
                        newGame.setHeader(key, headers[key]);
                        if (key === 'White') {
                            this.players.w = headers[key];
                        } else if (key === 'Black') {
                            this.players.b = headers[key];
                        }
                    }
                    this.viewBoard = true;
                    //newGame.loadPgn(pgn);
                    newGame.load(fen);
                    this.game = newGame;
                    if (id == this.session?.data?.gameNow?.id && players.includes(this.session?.user?.id)) {
                        this.challengeOpts.gameid = id;
                        this.playing = true;
                    }
                    nextTick(() => {
                        var config = this.config(thisVar);
                        this.board = this.Chessboard('board', {
                            onDragStart: config.onDragStart,
                            onDrop: config.onDrop,
                            onSnapEnd: config.onSnapEnd,
                            draggable: true,
                        });
                        console.log(this.board);
                        this.board.position(newGame.fen());
                    });
                });
                socket.on('new move', ({ move, info, id }) => {
                    console.log('got move');
                    if (id == this.session?.data?.gameNow?.id) {
                        var newMove = this.game.move(move);
                        if (newMove === null) {
                            return socket.emit("error", { msg: "move is not valid" });
                        }
                        this.board.position(this.game.fen());
                        if (info?.gameEnd) {
                            if (info?.draw) {
                                confirm(`Draw ${info?.reason ? '(' + info?.reason + ')' : ''}`);
                            } else if (this.players[info?.winner] === this.session.user?.id) {
                                confirm('You won.');
                            } else {
                                confirm('You lost');
                            }
                        }
                    }
                    return;
                });
                socket.on('error', (msg) => {
                    confirm(msg?.msg);
                });
                socket.emit('challenges');
                this.ready = true;
            });
        });
    },
}
</script>