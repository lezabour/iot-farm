/**
 * Created by Elie on 23/11/2016.
 */
/*var HOST = 'localhost';
var PORT = 3306;
var MYSQL_USER = 'root';
var MYSQL_PASS = 'clic2clic';
var DATABASE = 'rpi';
var TABLE = 'sensor';*/
var HOST = 'mysql-robotperso.alwaysdata.net';
var PORT = 3306;
var MYSQL_USER = '130280_iotfarm';
var MYSQL_PASS = 'test12345';
var DATABASE = 'robotperso_iotfarm';
var TABLE = 'sensors';



// modules


var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendfile('index.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
});

http.listen(5001, function(){
  console.log('listening on *:5001');
});


var sys = require('sys');
var exec = require('child_process').exec;
var request = require('request');


var count = 0

var fs = require('file-system');

  

// app parameters
var five = require("johnny-five") , board, servo;
var moisture,sensordata,status,lumiere ="";



board = new five.Board();
lancer_camera();
board.on("ready", function() {
	console.log("Arduino Board Connected");
	
	moisture = new five.Sensor({
		pin: "A0",
		enabled: true
	});
	moisture2 = new five.Sensor({
		pin: "A2",
		enabled: true
	});
	lumiere = new five.Sensor({
		pin: "A1",
	});

	var cpt=0;
	setTimeout(function() {
		if(moisture.value > 500) {
			status = 'Sec';
		} else {
			status = 'Humide';
		}
		if(lumiere.value > 500) {
			status += ' - Lumineux';
		} else {
			status += ' - Sombre';
		}
		var datenow = new Date().toLocaleString();
		var heurenow = new Date().toLocaleTimeString();
		
		sensordata = {};
		sensordata['date'] = datenow; 
		sensordata['moisture'] = moisture.value;
		sensordata['moisture2'] = moisture2.value;
		sensordata['lumiere'] = lumiere.value;
		sensordata['status'] = status;
		saveMoisture(sensordata);
		//On ne prend les photos que le jour, lorsqu'il y a de la lumiere car pas de capteur Infra Rouge
		if(heurenow>'00:45:00' && heurenow<'06:45:00') {
			console.log('NUIT ');
		} else {
			console.log('JOUR ');
			request('http://89.2.170.137:8080/?action=snapshot').pipe(fs.createWriteStream('./../images/pic-'+datenow+'.jpg'));
		} 
		
		cpt = cpt+1;
		
		}, 
	5000);
	
	setInterval((function() {
		if(moisture.value > 500) {
			status = 'Sec';
		} else {
			status = 'Humide';
		}
		if(lumiere.value > 500) {
			status += ' - Lumineux';
		} else {
			status += ' - Sombre';
		}
		var datenow = new Date().toLocaleString();
		var heurenow = new Date().toLocaleTimeString();
		sensordata = {};
		sensordata['date'] = datenow; 
		sensordata['moisture'] = moisture.value;
		sensordata['moisture2'] = moisture2.value;
		sensordata['lumiere'] = lumiere.value;
		sensordata['status'] = status;
		saveMoisture(sensordata);
		if(heurenow>'00:45:00' && heurenow<'06:45:00') {
			console.log('NUIT ');
			
		} else {
			console.log('JOUR ');
			if(cpt%2==0) {
				request('http://89.2.170.137:8080/?action=snapshot').pipe(fs.createWriteStream('./../images/pic-'+datenow+'.jpg'));
				cpt=0;
			}
		}
		
		cpt = cpt+1;
		
	}), 300000);
	
	//On boucle toutes les 5min pour enregistrer les donner
	/*this.loop(300000, function() {});
	*/
	io.on('connection', function (socket) {
	 	console.log('Connection');  
	 	count++;
	 	socket.emit('number-connected', { count: count });
	 	console.log('count' + count);  
		socket.on('get-humidity-sensor', function (data) {
	    		getMoistureData(socket);
	  	});
	  	socket.on('get-humidity-sensor-update', function (data) {
		  	console.log('Demande update'); 
		  	updateMoistureData(socket);
	  	});
	  	
	  	socket.on('save-infos', function (data) {
		  	console.log('Demande sauvegarde Infos'); 
		  	saveInfos(socket,data);
	  	});
	  	
	  	socket.on('liste-infos', function (data) {
		  	console.log('Demande de liste infos'); 
		  	listeInfos(socket);
	  	});
	  	
	
	    socket.on('disconnect', function(){
	        count--;
	        socket.emit('number-connected', { count: count });
	    })
	    
	    setInterval(function() {
			socket.emit('number-connected', { count: count });
		}, 5000);
	  	//setInterval(updateMoistureData(socket), 10000);
	  	
	}); //Fin io.on
	
});


//////////////////////////////////////////////////////////
//Centre de reception des messages après la connexion
//////////////////////////////////////////////////////////


/*
	Recupere les infos du sensor, et les mets en forme
*/

/*
	Ajoute les infos sur sensor dans la Base	
*/
function saveMoisture(data) {
	
	jsondata = JSON.stringify(data);
	
	
	console.log(jsondata);
	//mysql.query("INSERT INTO "+TABLE+" (id,date,data,type) VALUES ('','"+data['date']+"','"+jsondata+"','sensors')");
	console.log('Save moisture OK');
		
} 

function getMoistureData(socket) {
	console.log('Get sensors data');
	var count = 0;
	var nb = 0;
	/*var query = mysql.query("SELECT count(*) as count FROM sensors where type='sensors' ", function(err, rows, fields)   
	{  
	  if (err) throw err;  
	  var stringi =  JSON.stringify(rows[0]);
	  var parse =  JSON.parse(stringi);
	  count =  parse.count
	  nb = count - 600;
	  var myq = "SELECT * FROM sensors where type='sensors' order by id ASC limit "+nb+",600";
		var query = mysql.query(myq, function(err, rows, fields)   
		{  
		  if (err) throw err;  
		  socket.emit('humidity-sensor', { data: rows });
		});  

	});*/
	console.log('OK'); 
} 

function updateMoistureData(socket) {
	console.log('UPDATE moisture');
	
	var queryUpdate= mysql.query("SELECT * from "+TABLE+" where type = 'sensors' order by ID DESC limit 0,1");
	
	queryUpdate.on('error', function(err) {
	    throw err;
	});
	 
	queryUpdate.on('result', function(row2) {
			console.log('Update emit ->'+row2.data);
			socket.emit('humidity-sensor-update', { data: row2.data });
			console.log('OK');
	});
	
}

function saveInfos(socket,data) {
	/*
	data['text'] = mysql_real_escape_string(data['text']);
	var datajson = JSON.stringify(data);
	var datenow = new Date().toLocaleString();
	mysql.query("INSERT INTO "+TABLE+" (id,date,data,type) VALUES ('','"+datenow+"','"+datajson+"','infos')");
	console.log('Save Infos OK');
	socket.emit('save-infos-ok');
	*/
	
}

function listeInfos(socket) {
	/*
	console.log('GET liste infos');
		
	var query = mysql.query("SELECT * FROM sensors where type='infos' order by id DESC limit 0,10", function(err, rows, fields)   
	{  
	  if (err) throw err;  
	  socket.emit('liste-infos', { data: rows });
	  console.log('OK');
	});  */	
	
} 


function lancer_camera() {
	console.log("lancer camera");
	
	exec('kill $(pgrep mjpg_streamer) > /dev/null 2>&1',function puts(error, stdout, stderr) { 
		sys.puts(stdout);
		setTimeout(function() {
			child = exec("sh webcam.sh", function (error, stdout, stderr) {
				sys.print('stdout: ' + stdout);
				sys.print('stderr: ' + stderr);
				if (error !== null) {
					console.log('exec error: ' + error);
				}
				console.log("camera OK");
			});
			}
		, 500);
		
	});
	
	

	
}

function arret_camera() {
	console.log("stoper camera");
	function puts(error, stdout, stderr) { sys.puts(stdout) }
	exec('kill $(pgrep mjpg_streamer) > /dev/null 2>&1',puts);
	
}

function mysql_real_escape_string(str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            	return " "; 
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
        }
    });
}




/* RANGE MAPPING CONVERSION NUMBER */
/*
function convertToRange(value, srcRange, dstRange){
  // value is outside source range return
  if (value < srcRange[0] || value > srcRange[1]){
    return NaN; 
  }

  var srcMax = srcRange[1] - srcRange[0],
      dstMax = dstRange[1] - dstRange[0],
      adjValue = value - srcRange[0];

  return (adjValue * dstMax / srcMax) + dstRange[0];

}

Use like convertToRange(20,[10,50],[5,10]);
*/
//Exemple callback
function doMainStuff() {
  //do all your stuff
  lastAsyncThing(function (error) {
    //When your final async thing is done, start the timer
    if (error) {
        //log error. Maybe exit if it's irrecoverable.
    }
    setTimeout(doMainStuff, 10 * 1000);
  });
}

//when your program starts, do stuff right away.
//doMainStuff();

//OU
/*
function sendEmail() {
  email.send(to, headers, body);
  setTimeout(sendEmail, 10*1000);
}
setTimeout(sendEmail, 10*1000);*/


//OU
/*
	 // v--------place your code in a function
function get_request() {
    $.get("request2.php", function(vystup){
       if (vystup !== ""){
          $("#prompt").html(vystup)
                      .animate({"top": "+=25px"}, 500)
                      .delay(2000)
                      .animate({"top": "-=25px"}, 500)
                      .delay(500)
                      .html("");
        }
        setTimeout( get_request, 4000 ); // <-- when you ge a response, call it
                                         //        again after a 4 second delay
    });
}

get_request();  // <-- start it off
*/

//OU
/*
// declare your variable for the setInterval so that you can clear it later
var myInterval; 

// set your interval
myInterval = setInterval(whichFunction,4000);

whichFunction{
    // function code goes here
}

// this code clears your interval (myInterval)
window.clearInterval(myInterval); 
*/