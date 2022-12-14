var Aclr;
var Bclr;
var Aptr;
var Bptr;
var arenaSize;
var tileSize;
var ctx;

const BOARDSIZE = 64;

function init()
{
	Aclr = document.getElementById("TEAM_A_CLR").attributes.color.value;
	Bclr = document.getElementById("TEAM_B_CLR").attributes.color.value;
	Aptr = document.getElementById("TEAM_A_PTR").attributes.color.value;
	Bptr = document.getElementById("TEAM_B_PTR").attributes.color.value;
	arenaSize = parseInt(document.getElementById("board").attributes.width.value);
	tileSize = arenaSize / BOARDSIZE;
	ctx = document.getElementById("board").getContext("2d");
	setInterval(render, 10);
}

function render()
{
	fetch(`${window.location.protocol}//${window.location.host}/boardstr`,
		{
			method:"GET",
			mode: "cors"
		}
	).then((response) => {
		response.text().then((dat) => {
			var lines = dat.split("\n");
			ctx.clearRect(0, 0, arenaSize, arenaSize);
			for (var y = 0; y < lines.length; y++)
			{
				for (var x = 0; x < lines[y].length; x++)
				{
					var char = lines[y][x];
					if (char == '_') continue;
					if (char == 'a') ctx.fillStyle = Aclr;
					if (char == 'A') ctx.fillStyle = Aptr;
					if (char == 'b') ctx.fillStyle = Bclr;
					if (char == 'B') ctx.fillStyle = Bptr;
					ctx.fillRect(x*tileSize, y*tileSize, Math.floor(tileSize)-1, Math.floor(tileSize)-1);
				}
			}
		});
	}).catch((err) => {
		console.log(err.message);
	});
}