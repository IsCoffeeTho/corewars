const settings = require("./settings.json");
const express = require('express');
const corewars = require('./corewars');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = new express();
app.use(express.json());
app.use(cookieParser());

app.get("/static/*", express.static(path.join(__dirname, 'pages')));

const instance = new corewars(settings.game);

app.get("/", (req, res) => {
	fs.readFile(`${path.join(__dirname, 'pages')}/index.html`, (err, data) => {
		res.send(data.toString()
			.replace("{{name}}", instance.event.name)
			.replace("{{desc}}", instance.event.desc)
		);
	});
});

app.get("/boardstr", (req, res) => {
	res.type("text/plain").send(instance.rendered);
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
				}
			})
		);
	});
});

app.get("/login", (req, res) => {
	fs.readFile(`${path.join(__dirname, 'pages')}/login.html`, (err, data) => {
		res.send(data.toString());
	});
});

app.post("/login", (req, res) => {
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