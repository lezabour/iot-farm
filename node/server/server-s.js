/**
 * Created by Elie on 23/11/2016.
 Serveur Propre, avec uniquement les elements necessaire
 Gere 2 sensor d'humidité + 1 sensor de lumiere 
 */

var HOST = 'xxx';
var PORT = 3306;
var MYSQL_USER = 'xxx';
var MYSQL_PASS = 'xxx';
var DATABASE = 'xxx';
var TABLE = 'xx';


var https = require('https');
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
var _mysql = require('mysql');
  

// app parameters
var five = require("johnny-five") , board, servo;
var moisture,sensordata,status,lumiere,relay,madata,temp ="";

var mysql = _mysql.createConnection({
	    host: HOST,
	    port: PORT,
	    user: MYSQL_USER,
	    password: MYSQL_PASS,
	    database : DATABASE
	});

mysql.connect();

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
	relay =  new five.Relay({
		pin: 6
	});
	temp = new five.Thermometer({
		 controller: "LM35",
		 pin: "A3"
   	});
   		 
   


   		 
   		 
	
	var cpt=0;
	setTimeout(function() {
		if(moisture.value > 500) {
			status = 'Sec';
		} else {
			status = 'Humide';
		}
		if(lumiere.value < 500) {
			status += ' - Lumineux';
		} else {
			status += ' - Sombre';
		}
		var datenow = new Date().toLocaleString();
		var heurenow = new Date().toLocaleTimeString();
		console.log('temp'+temp.value+ "---"+temp.celsius);
		sensordata = {};
		sensordata['date'] = datenow;
		sensordata['moisture'] = moisture.value;
		sensordata['moisture2'] = moisture2.value;
		sensordata['lumiere'] = lumiere.value;
		sensordata['temp'] = temp.celsius;
		saveMoisture(sensordata);
		//On ne prend les photos que le jour, lorsqu'il y a de la lumiere car pas de capteur Infra Rouge
		if(heurenow>'00:45:00' && heurenow<'06:45:00') {
			console.log('NUIT ');
		} else {
			console.log('JOUR ');
			request('http://89.2.170.137:8080/?action=snapshot').pipe(fs.createWriteStream('./../images/pic-'+datenow+'.jpg'));
		} 
		
		if(sensordata['moisture']>200) {
			callIftt('Water_moisture',sensordata, function(data) {
				console.log(data);
			});
		}//Fin if moisture
		
		
		
		cpt = cpt+1;
		
	},  5000);
	
	setInterval((function() {
		
		if(moisture.value > 500) {
			status = 'Sec';
		} else {
			status = 'Humide';
		}
		if(lumiere.value < 500) {
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
		sensordata['temp'] = temp.celsius;
		//sensordata['status'] = status;
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
		console.log('temp '+temp.value+ "---"+temp.celsius);
		/*if(sensordata['moisture']>200) {
			callIftt('Water_moisture',sensordata, function(data) {
				console.log(data);
			});
		}//Fin if moisture
		*/
		/*madata = {};
		madata['titre']="test titre";
		madata['texte'] = "texte infos";
		callIftt('Moisture_low',madata, function(data) {
				console.log(data);
			});
		*/
		cpt = cpt+1;
		
	}), 300000);
	
	io.on('connection', function (socket) {
		console.log('a user connected');
	 	console.log('Connection');  
	 	count++;
	 	
	 	socket.on('connected', function (data) {
		 	socket.emit('node-connected'); 
	 	});
	 	socket.emit('number-connected', { count: count });
	 	console.log('count' + count);  
	 	
	 	//Envoyer tous les sensors sur demande
	 	socket.on('get-all-sensors', function (data) {
	    		sendAllSensors(socket);
	  	});
	 	
		socket.on('get-humidity-sensor', function (data) {
	    		//getMoistureData(socket);
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
	  	socket.on('pompe-on', function (data) {
		  	console.log('POMPE ON'); 
		  	relay.close();
	  	});
	  	socket.on('pompe-off', function (data) {
		  	console.log('POMPE OFF'); 
		  	relay.open();
	  	});
	  	socket.on('pompe-arrosage', function (data) {
		  	console.log('POMPE ARROSAGE'); 
		  	lancerpompe(socket);
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

function sendAllSensors(socket) {
	var datenow = new Date().toLocaleString();
	var heurenow = new Date().toLocaleTimeString();
	sensordata['date'] = datenow; 
	sensordata['moisture'] = moisture.value;
	sensordata['moisture2'] = moisture2.value;
	sensordata['lumiere'] = lumiere.value;
	sensordata['status'] = status;
	sensordata['temp'] = temp.celsius;
	socket.emit('all-sensors', { data: sensordata });
			
} 

function saveMoisture(data) {
	
	
	
	console.log(data['moisture']+','+data['moisture2']+','+data['lumiere']);
	mysql.query("INSERT INTO sensors (date,humidite1,humidite2,lumiere,temp) VALUES ('"+data['date']+"','"+data['moisture']+"','"+data['moisture2']+"','"+data['lumiere']+"','"+data['temp']+"')");
	
	console.log('Save moisture OK');
	
	
	/*sensordata = {};
	sensordata['date'] = data['date']; 
	sensordata['moisture'] = data['moisture']; 
	sensordata['moisture2'] = data['moisture2']; 
	sensordata['lumiere'] = data['lumiere']; 
	sensordata['status'] = data['status']; 
		
	
	
	request.post(
	    'http://robotperso.eu/api/api.php/sensors',
	    sensordata,
	    function (error, response, body) {
	        if (!error && response.statusCode == 200) {
	            console.log(response);
		        console.log(body);
	        } else {
		        console.log(response);
		        console.log(body);
	        }
	    }
	);
	console.log('Save moisture OK');*/
		
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
	
	data['text'] = mysql_real_escape_string(data['text']);
	var datajson = JSON.stringify(data);
	var datenow = new Date().toLocaleString();
	mysql.query("INSERT INTO "+TABLE+" (id,date,data,type) VALUES ('','"+datenow+"','"+datajson+"','infos')");
	console.log('Save Infos OK');
	socket.emit('save-infos-ok');
	
	
}

function listeInfos(socket) {
	
	console.log('GET liste infos');
		
	var query = mysql.query("SELECT * FROM sensors where type='infos' order by id DESC limit 0,10", function(err, rows, fields)   
	{  
	  if (err) throw err;  
	  socket.emit('liste-infos', { data: rows });
	  console.log('OK');
	});  	
	
} 

function lancerpompe(socket) {
	relay.close(); //on ouvre
  	setTimeout(function() {
		relay.open(); //on ferme 
	} , 10000);
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



function callIftt(receipe,sensordata) {
	if(receipe == 'Water_moisture' ) {
		jsonObject = JSON.stringify({
		    "value1" : sensordata['moisture'],
		    "value2" : sensordata['moisture2'],
		    "value3" : sensordata,
		});	
	} else if(receipe == 'Moisture_low') {
		jsonObject = JSON.stringify({
		    "value1" : sensordata['titre'],
		    "value2" : sensordata['texte'],
		});	
	}
					
	// prepare the header
	var postheaders = {
	    'Content-Type' : 'application/json',
	    'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
	};
	var optionspost = {
	    host : 'maker.ifttt.com',
		path : '/trigger/'+receipe+'/with/key/1EeqFcrJpPH5WRpaL7sev',
	    method : 'POST',
	    headers : postheaders
	};
	/*console.info('Options :'+jsonObject);	*/
	
	// do the POST call
	var reqPost = https.request(optionspost, function(res) {
	    console.log("statusCode: ", res.statusCode);
	
	    res.on('data', function(d) {
	        console.info('POST result:\n');
	        process.stdout.write(d);
	        console.info('\n\nPOST completed');
	    });
	});
	
	reqPost.write(jsonObject);
	reqPost.end();
	reqPost.on('error', function(e) {
	    console.error(e);
	});
	reqPost.on('data', function(e) {
	    console.log(e);
	});
}
	
	
					
				
				