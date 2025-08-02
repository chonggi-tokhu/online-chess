var express = require("express");
var http = require("http");
var app = express();
var io_pr = require("socket.io");
var session = require("express-session");
var f = require("session-file-store");
var chess = require("chess.js");
var DB = require("./database.js");
var fs = require("fs");
var database = new DB.Database("db");
var Filestore = f(session);
var file_store = new Filestore();
var path = require('path');
var bodyParser = require('body-parser');
var ejs = require("ejs");
var server = null;
function resetDB(dbname, condfunc, val) {
    if (typeof condfunc !== 'function') {
        return false;
    }
    if (!condfunc(database.table(dbname).getSync())) {
        database.table(dbname).setSync(val);
    }
    return true;
}
var chessGames = database.table("chess_games");
var users = database.table("users");
resetDB("chess_games", (p) => p instanceof Array, []);
resetDB("users", (p) => p instanceof Array, []);
var httpServer = http.createServer(app);
var io = io_pr(httpServer);
function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }
    res.status(500);
    console.log(err);
    return res.redirect('/home');
}
app.use(errorHandler);
var session_middleware =
    session({
        secret: "secret key",
        resave: false,
        saveUninitialized: true,
        store: file_store,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7
        },
    })
app.use(
    session_middleware
);
io.engine.use(session_middleware);
var router = express.Router();
app.set("view engine", 'ejs');
app.set('views', path.join(__dirname, '/frontend/served'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
router.use(errorHandler);
router.use(session_middleware);
var challenges = [];
function checkObj(p, checkingNull = true) {
    if (!checkingNull) {
        return typeof p === 'object';
    } else {
        return typeof p === 'object' && p !== null;
    }
}
function checkStr(p) {
    return typeof p === 'string' || p instanceof String;
}
function getOpponentColour(mycolour) {
    /* if (!['w', 'b'].includes(mycolour)) {
        return false;
    } */
    return mycolour === 'w' ? 'b' : 'w';
}
function shortToLongColour(mycolour) {
    return mycolour === 'w' ? 'Black' : 'White';
}
function useDB(tbname, condfunc, cbfunc) {
    var table = database.table(tbname);
    if (typeof condfunc === 'function') {
        if (!condfunc(table)) {
            return false;
        }
        if (typeof cbfunc === 'function') {
            var rtv = cbfunc(table);
            if (typeof rtv === 'boolean') {
                return rtv;
            }
            return rtv || table;
        }
    }
    return false;
}
function makeChessJSON(gameparam) {
    if (!(gameparam instanceof chess.Chess)) {
        return false;
    }
    console.log(gameparam.getHeaders());
    return {
        fen: gameparam.fen(),
        pgn: gameparam.pgn(),
        headers: gameparam.getHeaders(),
    }
}
function makeObjChess(objparam) {
    if (!checkObj(objparam)) {
        return false;
    }
    var game = new chess.Chess();
    console.log(objparam);
    if (checkObj(objparam?.headers)) {
        for (var key in objparam.headers) {
            console.log(objparam.headers[key]);
            game.setHeader(key, objparam.headers[key]);
        }
    }
    if (objparam?.fen) {
        game.load(objparam.fen);
    }
    if (objparam?.pgn) {
        game.loadPgn(objparam?.pgn);
    }
    return game;
}
/* 
router.post('/new_game_req', (req, res) => {
    if (req.session?.logged) {
        if (!['w', 'b'].includes(req.body['mycolour'])) {
            return res.send({ msg: "", key: "err", err: "" });
        }
        var mycolour = req.body['mycolour'];
        challenges.push({
            challenger: { id: req.session?.user?.id, colour: mycolour },
            challenged: { id: false, colour: getOpponentColour(mycolour) },
        });
        return res.send({ msg: "", redirecturl: "" });
    }
    return res.send({ msg: "", key: "err", err: ""});
}); */
Math.max_from_arr = function ([...arr]) {
    var rtv = arr[0];
    if (arr.length < 2) {
        return rtv;
    }
    for (var i = 1, anumbitem = arr[i]; i < arr.length; i++, anumbitem = arr[i]) {
        rtv = this.max(anumbitem, rtv);
    }
    return rtv;
}
router.post('/loginReq', (req, res) => {
    console.log(req.body);
    var loginId = req.body['id'], loginPw = req.body['pw'];
    if (!checkStr(loginId) || !checkStr(loginPw)) {
        return res.send({ redirecturl: "/error" });
    }
    var foundUserId = "", userList;
    var test = useDB("users", (p) => p.getSync() instanceof Array, (p) => {
        var gotTb = p.getSync();
        userList = gotTb;
        for (var user of gotTb) {
            if (user?.id === loginId) {
                if (user?.pw === loginPw) {
                    foundUserId = user?.id;
                    return true;
                }
            }
        }
        return false;
    });
    if (!test) {
        return res.send({ redirecturl: "/error" });
    }
    if (foundUserId.length > 0) {
        req.session.user = userList.find(val => val?.id === foundUserId);
        req.session.user.logged = true;
        return res.send({ redirecturl: "/" });
    }
    return res.send({ redirecturl: "/error" });
});
router.post('/joinReq', (req, res) => {
    console.log(req.body);
    var joinId = req.body['id'], joinPw = req.body['pw'];
    if (!checkStr(joinId) || !checkStr(joinPw)) {
        return res.send({ redirecturl: "/error" });
    }
    var userList;
    var test = useDB("users", (p) => p.getSync() instanceof Array, (p) => {
        var gotTb = p.getSync();
        userList = gotTb;
        for (var user of gotTb) {
            if (user?.id === joinId) {
                return false;
            }
        }
        gotTb.push({ id: joinId, pw: joinPw });
        p.setSync(gotTb);
        return true;
    });
    if (!test) {
        return res.send({ redirecturl: "/error" });
    }
    req.session.user = userList.find(val => val?.id === joinId);
    req.session.user.logged = true;
    return res.send({ redirecturl: "/" })
});
router.post('/data', (req, res) => {
    return res.send({ data: { session: { user: { id: req.session.user?.id || req.ip, logged: req.session.user?.logged } } } });
})
app.use('/api/', router);
app.use(express.static('./frontend/served/'));
app.use('/files/', (req, res, next) => {
    if (res.headersSent) {
        return next();
    }
    return fs.readFile(path.join(__dirname, '/files/' + decodeURI(req.path)), (err, data) => {
        if (err || res.headersSent) {
            console.log(err);
            return res.status(404).end('__');
        }
        var ext = decodeURI(req.path).split('.').find((val, idx, arr) => idx === arr.length - 1);
        //console.log(('.' + ext));
        //setHeader('Content-type', { 'png': 'image/png', 'svg': 'image/xml+svg', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'json': 'application/json', 'txt': 'text/plain', 'xml': 'text/xml' }[ext])
        return res.type(ext).send(data);
    });
    //var filecontents = fs.readFileSync(path.join(__dirname, '/frontend/dist/assets/' + decodeURI(req.path))).toString('utf-8');
});
app.use('/assets/', (req, res, next) => {
    if (res.headersSent) {
        return next();
    }
    return fs.readFile(path.join(__dirname, '/frontend/served/dist/assets/' + decodeURI(req.path)), (err, data) => {
        if (err || res.headersSent) {
            console.log(err);
            return res.status(404).end('__');
        }
        var ext = decodeURI(req.path).split('.').find((val, idx, arr) => idx === arr.length - 1);
        return res.type(ext).send(data);
    });
    //var filecontents = fs.readFileSync(path.join(__dirname, '/frontend/dist/assets/' + decodeURI(req.path))).toString('utf-8');
});
app.use('/', (req, res) => {
    return res.render('index.ejs', { title: "" });
});
io.on('connection', (socket) => {
    console.log(socket.request.session?.user);
    socket.on('challenge', (msg) => {
        console.log(msg)
        var mycolour = msg?.mycolour;
        if (!['w', 'b'].includes(mycolour)) {
            return socket.emit("error", { msg: "" });
        }
        var games = chessGames.getSync();
        if (!(games instanceof Array)) {
            return socket.emit("error", { msg: "" });
        }
        var challengeId = '' + (Math.max_from_arr(games.length > 0 ? games.map(val => parseInt(val?.id)) : [parseInt('0')]) + 1);
        challenges.push({
            challenger: { id: socket.request.session?.user?.id, colour: mycolour,/* socketid:socket.id */ },
            challenged: { id: false, colour: getOpponentColour(mycolour) },
            id: challengeId,
            ended: {
                status: false,
                reason: "",
            },
        });
        socket.join(challengeId);
        socket.emit("challenge res", { id: challengeId });
        return io.emit("challenges list", challenges.filter(val => !val?.ended?.status));
    });
    socket.on("challenges", (msg) => {
        console.log(challenges);
        socket.emit("challenges", challenges.filter(val => !val?.ended?.status));
    });
    socket.on("challenge accepted", (msg) => {
        /*
        if (typeof msg !== 'object' || msg === null) {
            return;
        }
        if (typeof msg?.challenge !== 'object' || msg?.challenge === null) {
            return;
        } */
        var challengeId = parseInt(msg?.challenge?.id)
        if (isNaN(challengeId)) {
            return socket.emit("error", { msg: "" });
        }
        /*  */
        var theChallengeIdx = challenges.findIndex(val => val?.id == msg?.challenge?.id);
        /* Array findIndex method returns -1 when no element to return index of was found */
        if (theChallengeIdx < 0) {
            return socket.emit("error", { msg: "" });
        }
        if (!checkObj(challenges[theChallengeIdx]?.ended)) {
            return socket.emit("error", { msg: "" });
        }
        if (!checkObj(challenges[theChallengeIdx]?.challenger) || !checkObj(challenges[theChallengeIdx]?.challenged)) {
            return socket.emit("error", { msg: "" });
        }
        if (challenges[theChallengeIdx].challenger.id === socket.request.session?.user?.id) {
            return socket.emit("error", { msg: "you cannot accept challenge of yourself" });
        }
        challenges[theChallengeIdx].ended.status = true;
        challenges[theChallengeIdx].ended.reason = "game aleady started";
        challenges[theChallengeIdx].challenged.id = socket.request.session?.user?.id;
        //challenges[theChallengeIdx].challenged.socketid = socket.id;
        var theChallenge = challenges[theChallengeIdx];
        var newChessGame = new chess.Chess();
        newChessGame.setHeader("White", theChallenge.challenger.colour === "w" ? theChallenge.challenger.id : theChallenge.challenged.id);
        newChessGame.setHeader("Black", theChallenge.challenger.colour === "b" ? theChallenge.challenger.id : theChallenge.challenged.id);
        var datems = Date.now();
        newChessGame.setHeader("Date", new Date(datems).getFullYear() + '.' + (new Date(datems).getMonth() + 1) + '.' + new Date(datems).getDate());
        newChessGame.setHeader("FEN", newChessGame.fen());
        var chessObj = makeChessJSON(newChessGame);
        //var chessJSON = JSON.stringify(chessObj);
        var chessGameObj = {};
        var chessGame = {};
        var test = useDB("chess_games", (p) => p.getSync() instanceof Array, (p) => {
            var gotTb = p.getSync();
            chessGameObj = {
                game: chessObj,
                id: theChallenge?.id,
                ended: false,
            }
            gotTb.push(chessGameObj);
            chessGame = gotTb[gotTb.length - 1];
            p.setSync(gotTb);
            return true;
        });
        if (!test) {
            return socket.emit("error", { msg: "" });
        }
        console.log(socket.rooms);
        var currRooms = Array.from(socket.rooms);
        /* for (var aroom of currRooms) {
            socket.leave(aroom);
            console.log(aroom);
        } */
        socket.join(chessGameObj.id);
        console.log(socket.rooms);
        socket.emit("challenge res", { id: chessGame.id });
        socket.request.session.data = socket.request.session?.data ? socket.request.session.data : {};
        socket.request.session.data.gameNow = socket.request.session.data?.gameNow ? socket.request.session.data.gameNow : {};
        socket.request.session.data.gameNow.id = chessGameObj.id;
        io.emit("challenges", challenges.filter(val => !val?.ended?.status));
        return io.to(chessGameObj.id).emit("start game", { game: chessGame.game, id: chessGame.id, players: [theChallenge.challenger.id, theChallenge.challenged.id] });
    });
    socket.on('new move', ({ move, gameid }) => {
        var games = chessGames.getSync();
        if (!(games instanceof Array)) {
            return socket.emit("error", { msg: "" });
        }
        if (!checkStr(move)) {
            return socket.emit("error", { msg: "" });
        }
        var theGameIdx = games.findIndex(val => val?.id == gameid);
        if (theGameIdx < 0) {
            return socket.emit("error", { msg: "game not found" });
        }
        var tester = new chess.Chess(games[theGameIdx]?.game?.fen);
        //tester.loadPgn(games[theGameIdx]?.game?.pgn);
        if (tester.isCheckmate()) { }
        var game = games[theGameIdx];
        if (!checkObj(game)) {
            return socket.emit("error", { msg: "game in the db is not object" });
        }
        if (!checkObj(game.game?.headers)) {
            return socket.emit("error", { msg: "game in the db has no header" });
        }
        if (game.game.headers[shortToLongColour(getOpponentColour(tester.turn()))] != socket.request.session?.user?.id) {
            console.log(game.game.headers);
            console.log(game.game.headers[shortToLongColour(getOpponentColour(tester.turn()))]);
            console.log(socket.request.session?.user?.id);
            return socket.emit("error", { msg: "you are not player" });
        }
        if (game.ended) {
            return socket.emit("error", { msg: "game is already ended" });
        }
        if (tester.move(move) === null) {
            return socket.emit("error", { msg: "your move is invalid" });
        }
        var chessFromObj = makeObjChess(game?.game);
        if (!chessFromObj) {
            return socket.emit("error", { msg: `can't create instance of chess.js Chess constructor from json` });
        }
        var newMove = chessFromObj.move(move);
        if (newMove === null) {
            return socket.emit("error", { msg: "your move is invalid" });
        }
        console.log(game?.id);
        var info = {};
        if (chessFromObj.isCheckmate()) {
            info.gameEnd = true;
        }
        var test = useDB("chess_games", (p) => p.getSync() instanceof Array, (p) => {
            var gotTb = p.getSync();
            var foundIdx = gotTb.findIndex(val => val?.id === gameid);
            if (!gotTb[foundIdx]?.game) {
                return false;
            }
            gotTb[foundIdx].game = makeChessJSON(chessFromObj);
            if (info.gameEnd) {
                gotTb[foundIdx].ended = true;
            }
            p.setSync(gotTb);
        });
        if (!test) {
            return socket.emit("error", { msg: "db error" });
        }
        console.log(game?.id);
        console.log(socket.rooms);
        return io.to('' + (game?.id)).emit("new move", { move: move, info: info, id: gameid });
    });
    socket.on('view game', ({ gameid }) => {
        var games = chessGames.getSync();
        if (!(games instanceof Array)) {
            return socket.emit("error", { msg: "" });
        }
        var theGameIdx = games.findIndex(val => val?.id === gameid);
        if (theGameIdx < 0) {
            return socket.emit("error", { msg: "" });
        }
        var game = games[theGameIdx];
        if (!checkObj(game)) {
            return socket.emit("error", { msg: "" });
        }
        var currRooms = Array.from(socket.rooms);
        for (var aroom of currRooms) {
            socket.leave(aroom);
        }
        socket.join(gameid);
        return socket.emit('view game', { game: game.game });
    });
    socket.on('disconnection', () => { });
});
server = httpServer.listen(3567, () => {
    console.log("server started");
})