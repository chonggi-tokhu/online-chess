var fs = require("fs");
var path = require("path");

var colourlog = { red: text => "\x1b[31m" + text + "\x1b[37m" };

var getTableFileName = (directory, idx) => directory + '/file_' + idx + '.db';

class Table {
    constructor(tbname, directory, idx) {
        this.tbname = tbname;
        this.idx = idx;
        this.directory = directory;
        this.file = getTableFileName(directory, idx);
    }

    getFileSync() {
        var dataJSON = fs.readFileSync(this.file).toString();
        var read = JSON.parse(dataJSON);

        return read;
    }

    getSync() {
        return this.getFileSync();
    }

    getJSONSync() {
        var dataJSON = fs.readFileSync(this.file).toString();
        var read = JSON.parse(dataJSON);

        return { name: this.tbname, body: read };
    }

    setSync(data) {
        fs.writeFileSync(this.file, JSON.stringify(data));
        return this.getSync();
    }

    setJSONSync(json) {
        try {
            this.setSync(json.body);
        } catch (err) {
            console.log(err);
        }
    }

    removeSync() {
        var dataJSON = fs.readFileSync(this.directory + '/fileToIndex.db').toString();
        var fileToIndex = JSON.parse(dataJSON);
        fs.unlinkSync(this.file);
        delete fileToIndex[this.tbname];
        fs.writeFileSync(this.directory + '/fileToIndex.db', JSON.stringify(fileToIndex));
    }

    async getFile() {
        var dataJSON = (await fs.promises.readFile(this.file)).toString();
        var read = JSON.parse(dataJSON);

        return read;
    }

    async get() {
        return await this.getFile();
    }

    async getJSON() {
        return { name: this.tbname, body: this.read };
    }

    async set(data) {
        await fs.promises.writeFile(this.file, JSON.stringify(data));
    }

    async setJSON(json) {
        try {
            this.set(json.body);
        } catch (err) {
            console.log(err);
        }
    }

    async remove() {
        var dataJSON = fs.readFileSync(this.directory + '/fileToIndex.db').toString();
        var fileToIndex = JSON.parse(dataJSON);

        fs.unlinkSync(this.file);
        delete fileToIndex[this.tbname];

        fs.writeFileSync(this.directory + '/fileToIndex.db', JSON.stringify(fileToIndex));
    }
}

class Database {
    constructor(dbname) {
        this.dbname = dbname;
        this.directory = path.join(process.cwd(), 'database');

        if (!fs.existsSync(this.directory)) {
            fs.mkdirSync(this.directory);
        }

        this.directory = path.join(this.directory, encodeURIComponent(dbname));

        if (!fs.existsSync(this.directory)) {
            fs.mkdirSync(this.directory);

            fs.writeFileSync(this.directory + '/fileToIndex.db', '{}');

            fs.writeFileSync(this.directory + '/index.idx', '0');
        }
    }

    table(name) {
        var dataJSON = fs.readFileSync(this.directory + '/fileToIndex.db').toString();
        var fileToIndex = JSON.parse(dataJSON);

        if (fileToIndex[name]) return new Table(name, this.directory, fileToIndex[name]);

        var index = JSON.parse(fs.readFileSync(this.directory + '/index.idx').toString()) + 1;
        fileToIndex[name] = index;

        fs.writeFileSync(this.directory + '/index.idx', `${index}`);

        fs.writeFileSync(this.directory + '/file_' + index + '.db', 'null');
        fs.writeFileSync(this.directory + '/fileToIndex.db', JSON.stringify(fileToIndex));

        return new Table(name, this.directory, index);
    }

    checkTable(name) {
        var dataJSON = fs.readFileSync('./database/' + dbname + '/fileToIndex.db').toString();
        var fileToIndex = JSON.parse(dataJSON);

        return fileToIndex.hasOwnProperty(name);
    }

    tables() {
        var dataJSON = fs.readFileSync('./database/' + dbname + '/fileToIndex.db').toString();
        var fileToIndex = JSON.parse(dataJSON);

        return Object.keys(fileToIndex);
    }

    getJSON() {
        var dataJSON = fs.readFileSync('./database/' + dbname + '/fileToIndex.db').toString();
        var fileToIndex = JSON.parse(dataJSON);

        var body = [];

        for (var tbname in fileToIndex) {
            var table = new Table(tbname, this.directory, fileToIndex[tbname]);

            body.push(table.getJSONSync());
        }

        return { name: this.dbname, body };
    }

    setJSON(json) {
        try {
            json.body.forEach(element => {
                let table = this.table(element.name);
                table.setJSONSync(element);
            });
        } catch (err) {
            console.log(err);
        }
    }

    clear() {
        var dataJSON = fs.readFileSync(this.directory + '/fileToIndex.db').toString();
        var fileToIndex = JSON.parse(dataJSON);

        for (var tbname in fileToIndex) {
            fs.unlinkSync(this.directory + '/file_' + fileToIndex[tbname] + '.db');
            delete fileToIndex[tbname];
        }

        fs.writeFileSync(this.directory + '/index.idx', 0);

        fs.writeFileSync(this.directory + '/fileToIndex.db', JSON.stringify(fileToIndex));
    }

    remove() {
        this.clear();
        fs.rmdirSync(this.directory);
    }
}

function existsDatabase() {
    return fs.existsSync(path.join(process.cwd(), 'database'));
}

function checkDatabase(name) {
    return existsDatabase() && fs.existsSync(path.join(process.cwd(), 'database', encodeURIComponent(name)));
}

function getJSON() {
    let directory = path.join(process.cwd(), 'database');
    return {
        body: fs.readdirSync(directory).map((el) => {
            let database = new Database(el);
            return database.getJSON();
        })
    };
}

function setJSON(json) {
    try {
        json.body.forEach(element => {
            let database = new Database(element.name);
            database.setJSON(element);
        });
    } catch (err) {
        console.log(err);
    }
}

function eraseDatabase() {
    let directory = path.join(process.cwd(), 'database');

    try {
        fs.readdirSync(directory).forEach((el) => {
            let database = new Database(el);

            database.remove();
        });

        fs.rmdirSync(directory);
    } catch (err) {
        console.log(`${colourlog.red('[error]')} Database remove error: ${colourlog.red(err)}`);
    }
    return true;
}

module.exports = {
    Database,
    existsDatabase,
    checkDatabase,
    getJSON,
    setJSON,
    eraseDatabase
};