const settings = require("./settings.json");
const express = require('express');
const corewars = require('./corewars');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

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

app.get("/boardstr", (req, res) => {
	res.type("text/plain").send(instance.rendered);
});

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
					case "SIZE": return settings.view?.board?.size || 500;
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

app.get("/step", (req, res) => {
	console.log("Stepped");
	res.type("text/plain").send(instance.stepBoard() ? "Stepped" : "Halted");
});

app.get("/pause", (req, res) => {
	if (instance.running)
	{
		instance.running = false;
		res.type("text/plain").send("Paused");
		console.log("Game Paused");
	}
	else
	{
		res.type("text/plain").send("Not Running");
	}
});

app.get("/run", (req, res) => {
	if (!instance.running)
	{
		res.type("text/plain").send("Running");
		console.log("Running Game");
		new Promise((res, rej) => {
			setInterval(function()
			{
				if (instance.running)
				{
					if (!instance.stepBoard())
					{
						console.log("Game Halted");
						instance.running = false;
						res();
					}
				}
				else
				{
					res();
				}
			}, 2);
		});
		instance.running = true;
	}
	else
	{
		res.type("text/plain").send("Already Running");
	}
});

app.get("/dump", (req, res) => {
	res.type("text/json").send(instance.infoDump());
});

app.get("/login", (req, res) => {
	fs.readFile(`${path.join(__dirname, 'pages')}/login.html`, (err, data) => {
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

app.get("/signup", (req, res) => {
	fs.readFile(`${path.join(__dirname, 'pages')}/signup.html`, (err, data) => {
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

app.post("/login", (req, res) => {
	console.log(req.body);
});

app.post("/signup", (req, res) => {
	console.log(req.body);
});

app.get("/*", (req, res) => {
	fs.readFile(`${path.join(__dirname, 'pages')}/404.html`, (err, data) => {
		res.status(404).send(data.toString());
	});
});

app.listen(settings.server.port, () => {
	console.log(`Started on port ${settings.server.port}`);
})