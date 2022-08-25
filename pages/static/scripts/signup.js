function attemptSignup()
{
	var user = document.getElementById("CW_USER").value;
	var pass = document.getElementById("CW_PASS").value;
	if (user.length >= 3)
	{
		if (pass.length >= 3)
		{
			if (pass == document.getElementById("CW_PASS_C").value)
			{
				fetch(`${window.location.protocol}//${window.location.host}/signup`, {
					method: "POST",
					body: JSON.stringify({
						"username": user,
						"password": pass
					})
				}).then((res) => {
					res.text().then((data) => {
						if (res.status == 200)
						{
							window.location.href = "/panel";
						}
						else
							document.getElementById("err").innerHTML = JSON.parse(data).msg;
					});
				}).catch((err) => {
					document.getElementById("err").innerHTML = err;
				});
				document.getElementById("err").innerHTML = "&nbsp;";
			}
			else
				document.getElementById("err").innerHTML = "Password Fields don't match.";
		}
		else
			document.getElementById("err").innerHTML = "Password cannot be less than 3 characters long.";
	}
	else
		document.getElementById("err").innerHTML = "Username cannot be less than 3 characters long.";
}