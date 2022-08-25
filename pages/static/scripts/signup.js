function attemptSignup()
{
	var user = document.getElementById("CW_USER").value;
	var pass = document.getElementById("CW_PASS").value;
	var passable = (pass == document.getElementById("CW_PASS_C").value);
	if (passable)
	{

	}
	else
	{
		document.getElementById("err").innerHTML = "Password Fields don't match.";
	}
}