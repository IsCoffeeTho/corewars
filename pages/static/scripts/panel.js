var rm_nts;

function notif(message)
{
	clearTimeout(rm_nts);
	document.getElementById("notification").innerHTML = message;
	document.getElementById("notification").setAttribute("show",null);
	rm_nts = setTimeout(function() {
		document.getElementById("notification").removeAttribute("show");
	}, 2000);
}

function sendAction(action)
{
	fetch(`${window.location.protocol}//${window.location.host}/${action}`).then((data) => {
		data.json().then((value) => {
			console.log(value);
			notif(value.msg);
		})
	}).catch((err) => {
		console.log(err);
	});
}