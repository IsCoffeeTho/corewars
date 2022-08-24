class coreTeam
{
	/* Creates team for corewars */
	constructor (options={
		name: "",
		player: "",
		color: 0,
		codepath: ""
	})
	{
		this.name = options.name || `Team${this.teams.length+1}`;
		this.player = options.player || `El Capitan`;
		this.ptr = 0;
		this.halted = false;
		this.color = options.color || `#${Math.floor(Math.random()*0xffffff).toString(16)}`;
		this.coloralt = 0x000000;
		for (var i = 0; i < 3; i++)
		{
			var j = parseInt(this.color.slice(1), 16) >> (i * 8);
			j += 0x33;
			j &= 0xff;
			j = j << (i * 8);
			this.coloralt |= j;
		}
		this.coloralt = `#${this.coloralt.toString(16)}`
	}
}

/* Creates a CoreWars Instance */
class corewarsInstance
{
	/* Creates a CoreWars Instance */
	constructor(options={
		event:{
			name: ""
		},
		teams:
		[
			{
				name:"",
				player: "",
				color: 0
			}
		]
	})
	{
		this.event = {
			name: options.event.name || "CoreWars",
			desc: options.event.desc || "Stay Alive"
		}
		this.teams = [];
		for (var i in (options.teams || [])) this.createTeam(options.teams[i]);
		this.board = [];
		this.boardinfo;
		this.halted = false;
		this.renderString();
	}

	/** Steps through an execution cycle of the board */
	stepBoard()
	{
		if (!this.halted)
		{
			var stopped = false;
			for (var i in this.teams)
			{
				var team = this.teams[i];
				if (!team.halted)
				{
					var ptr = team.ptr;
					var value = this.board[ptr];

					// execute code here



					team.ptr++;
					if (this.board[team.ptr]) {
						team.halted = true;
					}
					console.log(team.name, "->", value);
				}
				else if (!stopped)
				{
					stopped = true;
				}
			}
			this.renderString();
			this.halted = stopped;
			return (!stopped);
		}
		return (0);
	}


	/** Renders string to be sent to recievers*/
	renderString()
	{
		var string = "";
		for (var y = 0; y < 64; y++)
		{
			for (var x = 0; x < 64; x++)
			{
				var pos = (this.board[(y * 64) + x] || false);
				
				if (!pos) {string += "_"; continue;}

				var char = "";
				if (pos.teamID == 0) { char = "a";}
				if (pos.teamID == 1) { char = "b";}
				if (this.teams[pos.teamID]) char = char.toUpperCase();
				string += char;
			}
			string += "\n";
		}
		this.rendered = string;
	}

	/** Creates team for corewars */
	createTeam(options={
		name: "",
		color: 0
	})
	{
		var team = new coreTeam(options);
		this.teams.push(team);
	}
}

module.exports = corewarsInstance;