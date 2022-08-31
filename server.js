const settings = require("./settings.json");
const express = require('express');
const corewars = require('./corewars');
const { hash } = require('./primitives');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const { env } = require("process");

const { Session } = require("inspector");

function errTranslate(err)
{
	return {
		"EXP_SESSION": "The session expired!"
	}[err] || "&nbsp;";
}

class userSystem
{
	/** Generates a system to handle users */
	constructor()
	{
		this.secure = [];
		this.users = [];
		this.dict = [];
		this.deserialize();
	}

	deserialize()
	{
		fs.readFile(`${__dirname}/.users.json`, (err, data) => {
			if (err && err.errno == -2)
			{
				return ;
			}
			var list = JSON.parse(data.toString());
			for (var id in list)
			{
				this.users[id] = {
					username: list[id].username,
					admin: list[id].admin || false
				};
				this.secure[id] = {
					password: list[id].passHASH
				};
				this.dict[list[id].username] = id;
			}
		});
	}

	serialize()
	{
		var data = {};
		for (var i in this.users)
		{
			data[i] = {
				username: this.users[i].username,
				admin: this.users[i].admin,
				passHASH: this.secure[i].password
			};
		}
		fs.writeFile(`${__dirname}/.users.json`, JSON.stringify(data), (err) => {console.error(err);});
	}

	/** creates a new user in the system*/
	newUser(username, password)
	{
		var id = userSystem.genid();
		while (this.users[id])
			id = userSystem.genid();
			
		this.dict[username] = id;
		this.secure[id] = {
			password: hash(id + password)
		};
		this.users[id] = {
			username: username,
			admin : false,
			id: id
		};
		this.serialize();
		return this.users[id];
	}

	authorize(username, password)
	{
		if (this.dict[username])
			if (this.secure[this.dict[username]])
				if (this.secure[this.dict[username]].password == hash(this.dict[username] + password))
					return true;
		return false;
	}

	static genid(size=32)
	{
		var str = "";
		for (var i = 0; i < (size || 32); i++)
			str += "0123456789abcdef"[Math.floor(Math.random()*16)];
		return str;
	}
}

const usr = new userSystem();

const SESSIONLIFETIME = 600;
var sessions = {};

class session
{
	constructor (userid)
	{
		this.birthTimestamp = Date.now();
		this.id = (function () {
			var str = "";
			for (var i = 0; i < 32; i++)
				str += "0123456789abcdef"[Math.floor(Math.random()*16)];
			return str;
		})();
		this.user = usr.users[userid];
		this.isAdmin = (this.user.admin || false);
	}

	get isAlive()
	{
		if ((this.birthTimestamp + (SESSIONLIFETIME * 1000)) >= Date.now())
			return true;
		return false;
	}

	dump()
	{
		return {
			birthTimestamp: this.birthTimestamp,
			user: this.user,
			isAlive: this.isAlive
		};
	}
}

const app = new express();
app.use(express.text());
app.use(cookieParser());

app.get("/static/*", express.static(path.join(__dirname, 'pages')));

const instance = new corewars(settings.game);

// cheeky little easter egg
app.get("/flag", (req, res) => {res.type("text/plain").send("SCTF{begginer_friendly}");});

app.get("/", (req, res) => {
	fs.readFile(`${path.join(__dirname, 'pages')}/index.html`, (err, data) => {
		res.send(data.toString()
			.replace(/\{\{([\w_]+)\}\}/g, (m, g) => {
				switch (g)
				{
					case "name": return instance.event.name;
					case "desc": return instance.event.desc;
					default: return "";
				}
			})
		);
	});
});

app.get("/boardstr", (req, res) => {res.type("text/plain").send(instance.rendered);});

app.get("/style.css", (req, res) => {
	fs.readFile(`${path.join(__dirname, 'pages')}/style.css`, (err, data) => {
		res.type("text/stylesheet").send(data.toString()
			.replace(/\{\{([\w_]+)\}\}/g, (m, g) => {
				switch (g)
				{
					case "background": return settings.view.theme.background;
					case "foreground": return settings.view.theme.foreground;
					default: return "";
				}
			})
		);
	});
});

app.get("/board", (req, res) => {
	fs.readFile(`${path.join(__dirname, 'pages')}/board.html`, (err, data) => {
		res.send(data.toString()
			.replace(/\{\{([\w_]+)\}\}/g, (m, g) => {
				switch (g)
				{
					case "name": return instance.event.name;
					case "desc": return instance.event.desc;
					case "SIZE": return (settings.view.board.size ? settings.view.board.size : 500) || 500;
					case "TEAM_A_NAME": return instance.teams[0].name.toUpperCase();
					case "TEAM_A_PLYR": return instance.teams[0].player;
					case "TEAM_A_CLR": return instance.teams[0].color;
					case "TEAM_A_PTR": return instance.teams[0].coloralt;
					case "TEAM_B_NAME": return instance.teams[1].name.toUpperCase();
					case "TEAM_B_PLYR": return instance.teams[1].player;
					case "TEAM_B_CLR": return instance.teams[1].color;
					case "TEAM_B_PTR": return instance.teams[1].coloralt;
					default: return "";
				}
			})
		);
	});
});

app.get("/reset", (req, res) => {
	if (sessions[req.cookies.session] && sessions[req.cookies.session].isAdmin)
	{
		if (instance.running) console.log("Game Paused");
		console.log("Game Reset");
		instance.halted = false;
		instance.running = false;
		instance.setupBoard();
			res.type("text/json").send(JSON.stringify({code:'OK',msg:`Board has been reset.`}));
	}
	else
		res.status(403).type("text/json").send(JSON.stringify({code:'INVALID_PERMISSION',msg:`Only ADMINS can reset the board.`}));
});

app.get("/step", (req, res) => {
	if (sessions[req.cookies.session] && sessions[req.cookies.session].isAdmin)
	{
		console.log("Stepped");
		if (instance.stepBoard())
			res.type("text/json").send(JSON.stringify({code:'OK',msg:`Instance has been stepped.`}));
		else
			res.type("text/json").send(JSON.stringify({code:'NO_ACTION',msg:`Instance can't be stepped. All Programs have been halted`}));
	}
	else
		res.status(403).type("text/json").send(JSON.stringify({code:'INVALID_PERMISSION',msg:`Only ADMINS can step instances.`}));
});

app.get("/pause", (req, res) => {
	if (sessions[req.cookies.session] && sessions[req.cookies.session].isAdmin)
	{
		if (instance.running)
		{
			instance.running = false;
			res.type("text/json").send(JSON.stringify({code:'OK',msg:`Instance has been paused.`}));
			console.log("Game Paused");
		}
		else
			res.type("text/json").send(JSON.stringify({code:'NO_ACTION',msg:`Instance is already paused.`}));
	}
	else
		res.status(403).type("text/json").send(JSON.stringify({code:'INVALID_PERMISSION',msg:`Only ADMINS can pause instances.`}));
});

var ENGINE_LOOP;

app.get("/run", (req, res) => {
	if (sessions[req.cookies.session] && sessions[req.cookies.session].isAdmin)
	{
		if (!instance.running)
		{
			res.type("text/json").send(JSON.stringify({code:'OK',msg:`Instance started.`}));
			console.log("Running Game");
			new Promise((resolve, reject) => {
				clearInterval(ENGINE_LOOP);
				ENGINE_LOOP = setInterval(function()
				{
					if (instance.running)
					{
						if (!instance.stepBoard())
						{
							console.log("Game Halted");
							instance.running = false;
							resolve();
						}
					}
					else
						resolve();
				}, 2);
			});
			instance.running = true;
		}
		else
			res.type("text/json").send(JSON.stringify({code:'NO_ACTION',msg:`Instance is already running.`}));
	}
	else
		res.status(403).type("text/json").send(JSON.stringify({code:'INVALID_PERMISSION',msg:`Only ADMINS can start instances.`}));
});

app.get("/dump", (req, res) => {
	if (sessions[req.cookies.session]
		&& sessions[req.cookies.session].isAdmin)
	{
		res.type("text/json").send(instance.infoDump());
	}
	else
		res.status(403).type("text/json").send(JSON.stringify({code:'INVALID_PERMISSION',msg:`Only ADMINS can view infoDumps.`}));
});

app.get("/login", (req, res) => {
	fs.readFile(`${path.join(__dirname, 'pages')}/login.html`, (err, data) => {
		res.send(data.toString()
			.replace(/\{\{([\w_]+)\}\}/g, (m, g) => {
				switch (g)
				{
					case "name": return instance.event.name;
					case "desc": return instance.event.desc;
					case "err": return errTranslate(req.query['err']);
					default: return "";
				}
			})
		);
	});
});

app.get("/signup", (req, res) => {
	fs.readFile(`${path.join(__dirname, 'pages')}/signup.html`, (err, data) => {
		res.send(data.toString()
			.replace(/\{\{([\w_]+)\}\}/g, (m, g) => {
				switch (g)
				{
					case "name": return instance.event.name;
					case "desc": return instance.event.desc;
					case "err": return errTranslate(req.query['err']);
					default: return "";
				}
			})
		);
	});
});

app.post("/login", (req, res) => {
	var data = JSON.parse(req.body);
	if (!data.username) { res.status(400).type("text/json").send(JSON.stringify({code:'BAD_FORMAT',msg:`Incorrectly formatted data "username".`})); return; }
	if (!data.password) { res.status(400).type("text/json").send(JSON.stringify({code:'BAD_FORMAT',msg:`Incorrectly formatted data "password".`})); return; }
	if (!usr.authorize(data.username, data.password)) { res.status(400).type("text/json").send(JSON.stringify({code:'BAD_AUTH',msg:`Invalid username/password.`})); return; }
	var sess = new session(usr.dict[data.username]);
	sessions[sess.id] = sess;
	res.status(200).cookie('session', sess.id, { expires: new Date(Date.now() + (SESSIONLIFETIME * 1000)) }).send(JSON.stringify({code:"OK",msg:`Logged In!`}));
});

app.post("/signup", (req, res) => {
	var data = JSON.parse(req.body);
	if (!data.username) { res.status(400).type("text/json").send(JSON.stringify({code:'BAD_FORMAT',msg:`Incorrectly formatted data "username"`})); return; }
	if (!data.password) { res.status(400).type("text/json").send(JSON.stringify({code:'BAD_FORMAT',msg:`Incorrectly formatted data "password"`})); return; }
	if (usr.dict[data.username]) { res.status(400).type("text/json").send(JSON.stringify({code:'AUTH_EXISTS',msg:`Username taken.`})); return; }
	if (data.username.length < 3) { res.status(400).type("text/json").send(JSON.stringify({code:'BAD_FORMAT',msg:`Username MUST be atleast 3 characters.`})); return; }
	if (data.password.length < 3) { res.status(400).type("text/json").send(JSON.stringify({code:'BAD_FORMAT',msg:`password MUST be atleast 3 characters.`})); return; }
	var user = usr.newUser(data.username, data.password);
	var sess = new session(user.id);
	sessions[sess.id] = sess;
	res.status(200).cookie('session', sess.id, { expires: new Date(Date.now() + (SESSIONLIFETIME * 1000)) }).type("text/json").send(JSON.stringify({code:"OK",msg:`Account Created!`}));
});

app.get("/panel", (req, res) => {
	if (sessions[req.cookies.session])
	{
		if (sessions[req.cookies.session].isAdmin)
		{
			fs.readFile(`${path.join(__dirname, 'pages')}/panel.html`, (err, data) => {
				res.send(data.toString()
					.replace(/\{\{([\w_]+)\}\}/g, (m, g) => {
						switch (g)
						{
							case "name": return instance.event.name;
							case "desc": return instance.event.desc;
							case "username": return sessions[req.cookies.session].user.username;
							default: return "";
						}
					})
				);
			});
		} else {
			fs.readFile(`${path.join(__dirname, 'pages')}/nopanel.html`, (err, data) => {
				res.send(data.toString()
					.replace(/\{\{([\w_]+)\}\}/g, (m, g) => {
						switch (g)
						{
							case "name": return instance.event.name;
							case "desc": return instance.event.desc;
							default: return "";
						}
					})
				);
			});
		}
	}
	else
		res.redirect("/login?err=EXP_SESSION");
});

app.get("/*", (req, res) => {
	fs.readFile(`${path.join(__dirname, 'pages')}/404.html`, (err, data) => {
		res.status(404).send(data.toString());
	});
});

app.listen(settings.server.port, () => {
	console.log(`Started on port ${settings.server.port}`);
})