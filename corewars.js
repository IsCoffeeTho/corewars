const fs = require("fs");

const BOARDSIZE = 64;
const ARENASIZE = BOARDSIZE * BOARDSIZE;

class coreCell
{
	static parse(line, teamID)
	{
		var mnemonic = "";
		var data = [];
		var rest = line.replace(/(\w{0,3})(\.\w{0,2}){0,1} ([$@<>{}]{0,1})(-{0,1}\d+)(, ([$@<>{}]{0,1})(-{0,1}\d+)){0,1}/g, (m, op, mod, adrA, A, _s, adrB, B) => {
			A = parseInt(A);
			B = parseInt(B);

			switch (op.toLowerCase())
			{
				case "dat":
					mnemonic = "dat";
					data = [A];
					break;
				case "mov":
					mnemonic = "mov";
					data = [A, B];
					break;
				default:
					console.log(`SyntaxError: '${line}': Unknown Operation '${op}'.`);
					break;
			}
			return "";
		});
		if (rest)
		{
			console.log(`SyntaxError: '${line}': Unexpected Character '${rest[0]}'.`);
			return {
				mnemonic: 'nop',
				data: [0],
				teamID: teamID || -1
			};
		}
		return {
			mnemonic: mnemonic || 'nop',
			data: data || [],
			teamID: teamID || 0
		};
	}
}

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
		this.player = options.player || [
			`Le Capitaine`,
			`The Captain`,
			`El Capitan`,
			`O capitão`,
			`Te Kapene`
		][Math.floor(Math.random()*5)];
		this.ptr = 0;
		this.codepath = options.codepath || "code/default.red";
		this.halted = false;
		this.color = options.color || `#${Math.floor(Math.random()*0xffffff).toString(16)}`;
		this.coloralt = 0x000000;
		if (this.color.length == 7)
		{
			for (var i = 0; i < 3; i++)
			{
				var j = parseInt(this.color.slice(1), 16) >> (i * 8);
				j += 0x55;
				j &= 0xff;
				j = j << (i * 8);
				this.coloralt |= j;
			}
		}
		else
		{
			for (var i = 0; i < 3; i++)
			{
				var j = parseInt(this.color.slice(1), 16) >> (i * 4);
				j += 0x5;
				j &= 0xf;
				j = j << (i * 4);
				this.coloralt |= j;
			}
		}
		this.coloralt = `#${this.coloralt.toString(16)}`;
	}
}

/** Creates a CoreWars Instance */
class corewarsInstance
{
	/** Creates a CoreWars Instance */
	constructor(options={
		event:{
			name: ""
		},
		teams:
		[
			{
				name:"",
				player: "",
				color: 0,
				codepath: ""
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
		this.running = false;
		this.setupBoard();
		this.renderString();
	}

	/** Place code from teams onto the board */
	setupBoard()
	{
		this.board = [];
		for (var i = 0; i < this.teams.length; i++)
		{
			var start = Math.floor((i / this.teams.length) * (BOARDSIZE * BOARDSIZE));
			var code = fs.readFileSync(`${__dirname}/${this.teams[i].codepath}`);
			code = code.toString().split("\n");
			var j = 0;
			for (var j = 0; j < code.length; j++)
			{
				this.board[start + j] = coreCell.parse(code[j], i);
			}
			this.teams[i].ptr = start;
		}
	}

	/** Steps through an execution cycle of the board */
	stepBoard()
	{
		if (!this.halted)
		{
			var stopped = true;
			for (var i in this.teams)
			{
				var team = this.teams[i];
				if (!team.halted)
				{
					stopped = false;
					var ptr = team.ptr;
					var value = this.board[ptr];
					
					if (!value)
					{
						team.halted = true;
						stopped = true;
						continue;
					}

					var A = value.data[0];
					var B = value.data[1];

					// execute code here
					switch (value.mnemonic)
					{
						case 'dat':
							break;
						case 'mov':
							this.board[(team.ptr + B) % ARENASIZE] = this.board[(team.ptr + A) % ARENASIZE];
							break;
						case 'add':
							this.board[(team.ptr + B) % ARENASIZE].data[0] += A;
							break;
						case 'sub':
							this.board[(team.ptr + B) % ARENASIZE].data[0] -= A;
							break;
						case 'jmp':
							team.ptr = team.ptr + A - 1;
							break;
						case 'jmz':
							if (this.board[(team.ptr + B) % ARENASIZE].data[0] == 0)
								team.ptr = team.ptr + A - 1;
							break;
						case 'jmn':
							if (this.board[(team.ptr + B) % ARENASIZE].data[0] == 0)
								team.ptr = team.ptr + A - 1;
							break;
						default:
							team.halted = true;
							stopped = true;
							break;
					}
					team.ptr++;
					team.ptr %= ARENASIZE;
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
		for (var y = 0; y < BOARDSIZE; y++)
		{
			for (var x = 0; x < BOARDSIZE; x++)
			{
				var pos = (this.board[(y * BOARDSIZE) + x] || false);
				
				if (!pos) {string += "_"; continue;}

				var char = "";
				if (pos.teamID == 0) { char = "a";}
				if (pos.teamID == 1) { char = "b";}
				if (this.teams[pos.teamID].ptr == (y * BOARDSIZE) + x) char = char.toUpperCase();
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

	/** Dump info */
	infoDump()
	{
		return JSON.stringify({
			event : this.event,
			teams : this.teams,
			halted : this.halted
		});
	}
}

module.exports = corewarsInstance;