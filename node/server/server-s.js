/**
 * Created by Elie on 23/11/2016.
 Serveur Propre, avec uniquement les elements necessaire
 Gere 2 sensor d'humidité + 1 sensor de lumiere 
 */
 
 
//Load external variables from config file 
var variables = require('./conf/variables.js');
console.log(variables.HOST);



//Load all required librairies
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
//var sys = require('sys');
var exec = require('child_process').exec;
var request = require('request'); //Do snapshot of video
var fs = require('file-system');
var _mysql = require('mysql');
var https = require('https');

//Route of files
app.get('/', function(req, res){
  res.sendfile('index.html');
});

//Lance socket
io.on('connection', function(socket){
  console.log('a user connected');
});
http.listen(5001, function(){
  console.log('listening on *:5001');
});


//Connect to MYSQL
var mysql = _mysql.createConnection({
	    host: variables.HOST,
	    port: variables.PORT,
	    user: variables.MYSQL_USER,
	    password: variables.MYSQL_PASS,
	    database : variables.DATABASE
	});
mysql.connect();

//Launch video stream
lancer_camera();

//Create a Johnny Five board to manage Arduino
var five = require("johnny-five") , board;
board = new five.Board();

//Variables for functions
var moisture,sensordata,status,lumiere,relay,madata,temp ="";
var count,cpt = 0

board.on("ready", function() {
	console.log("Arduino Board Connected");
	
	//Sensors for arduino
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
   		 
   	//First loop at launch	 	
	setTimeout(function() {
		
		var datenow = new Date().toLocaleString();
		var heurenow = new Date().toLocaleTimeString();
		
		sensordata = {};
		sensordata['date'] = datenow;
		sensordata['moisture'] = moisture.value;
		sensordata['moisture2'] = moisture2.value;
		sensordata['lumiere'] = lumiere.value;
		sensordata['temp'] = temp.celsius;
		saveDatas(sensordata);
		
		//On ne prend les photos que le jour, lorsqu'il y a de la lumiere car pas de capteur Infra Rouge
		if(sensordata['lumiere'] < 800) {
			console.log('JOUR ');
			if(cpt%2==0) {
				request(variables.stream).pipe(fs.createWriteStream(variables.img_dir+'pic-'+datenow+'.jpg'));
				cpt=0;
			}
		} 
		cpt = cpt+1;		
	},  2000);
	
	
	//Loop every 5min
	setInterval((function() {
		
		var datenow = new Date().toLocaleString();
		var heurenow = new Date().toLocaleTimeString();
		
		sensordata = {};
		sensordata['date'] = datenow; 
		sensordata['moisture'] = moisture.value;
		sensordata['moisture2'] = moisture2.value;
		sensordata['lumiere'] = lumiere.value;
		sensordata['temp'] = temp.celsius;
		saveDatas(sensordata);
		
		if(sensordata['lumiere'] < 800) {
			console.log('JOUR ');
			if(cpt%2==0) {
				request(variables.stream).pipe(fs.createWriteStream(variables.img_dir+'pic-'+datenow+'.jpg'));
				cpt=0;
			}
		}
		//console.log('temp '+temp.value+ "---"+temp.celsius);
		
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
		
	}), variables.maj_delay);
	
	count = 0;
	io.on('connection', function (socket) {
		console.log('a user has connected');
		
		/**********************
			Manage Users
		***********************/	
		//Connection
	 	socket.on('connected', function (data) {
		 	count = count +1;
		 	
		 	socket.emit('node-connected'); 
		 	socket.emit('number-connected', { count: count });
		 	console.log('count' + count); 
	 	});
	 	//Disconnection
	 	socket.on('disconnect', function(){
	        count = count -1;
	        socket.emit('number-connected', { count: count });
	    })
	    //Send users numbers on need
	    setInterval(function() {
			socket.emit('number-connected', { count: count });
		}, 5000);
	 	 
	 	/**********************
			Manage Sensors
		***********************/
	 	//Send all datas of sensors
	 	socket.on('get-all-sensors', function (data) {
	    		sendAllSensors(socket);
	  	});
	 	
	 	//Send humidy sensors
		socket.on('get-humidity-sensor', function (data) {
	    		//getMoistureData(socket);
	  	});
	  	socket.on('get-humidity-sensor-update', function (data) {
		  	console.log('Demande update'); 
		  	updateMoistureData(socket);
	  	});
	  	
	  	/**********************
			Manage Infos in DB
		***********************/
	  	//Save new infos
	  	socket.on('save-infos', function (data) {
		  	console.log('Demande sauvegarde Infos'); 
		  	saveInfos(socket,data);
	  	});
	  	socket.on('liste-infos', function (data) {
		  	console.log('Demande de liste infos'); 
		  	listeInfos(socket);
	  	});
	  	
	  	/**********************
			Manage PUMP
		***********************/
	  	//Manage PUMP
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
	  	
	  	
	  	/**********************
			Manage Other functionnalities
		***********************/
	  	socket.on('reboot', function (data) {
		  	console.log('POMPE ARROSAGE'); 
		  	reboot(socket);
	  	});
	    	  	
	}); //Fin io.on
	
});


//////////////////////////////////////////////////////////
//Centre de reception des messages après la connexion
//////////////////////////////////////////////////////////






/*
	Envoi une MAJ des sensors au browser client
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

/*
	Ajoute les infos sur sensor dans la Base	
*/
function saveDatas(data) {
	
	console.log('moisture1:'+data['moisture']+', Moisture2: '+data['moisture2']+', Temperature:'+data['temp']+', Lumiere:'+data['lumiere']);
	
	jsonObject = JSON.stringify({
		"date" : data['date'],
	    "humidite1" : data['moisture'],
	    "humidite2" : data['moisture2'],
	    "lumiere":data['lumiere'],
	    "temp":data['temp'],
	});	
						
	// prepare the header
	var postheaders = {
	    'Content-Type' : 'application/json',
	    'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
	};
	
	var optionspost = {
	    host : 'robotperso.eu',
		path : '/api/api.php/sensors',
	    method : 'POST',
	    rejectUnauthorized: false,
		requestCert: true,
		agent: false,
	    headers : postheaders
	};
	
	// do the POST call
	var reqPost = https.request(optionspost, function(res) {	
	    res.on('data', function(d) {
	        console.log('Data ID : '+d);
	    });
	});
	
	reqPost.write(jsonObject);
	reqPost.end();
	reqPost.on('error', function(e) {
		console.log('Error save data');
	    console.error(e);
	});
		
	
	console.log('Save moisture OK');
			
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
		console.log(stdout);
		setTimeout(function() {
			child = exec("sh /home/pi/projets/iot-farm/node/server/webcam.sh", function (error, stdout, stderr) {
				console.log('stdout: ' + stdout);
				console.log('stderr: ' + stderr);
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
	function puts(error, stdout, stderr) { console.log(stdout) }
	exec('kill $(pgrep mjpg_streamer) > /dev/null 2>&1',puts);
	
}

function reboot(socket) {
	console.log("reboot");
	exec('sudo reboot',function puts(error, stdout, stderr) { 
		console.log(stdout);
		console.log('stdout: ' + stdout);
		
		
	});
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
		path : '/trigger/'+receipe+'/with/key/'+variables.ifttt_key,
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
	
	
function saveData(data,table) {
	console.log('Lancement de saveData');
	
	jsonObject = JSON.stringify({
		"date" : data['date'],
	    "humidite1" : data['humidite1'],
	    "humidite2" : data['humidite2'],
	    "lumiere":data['lumiere'],
	    "temp":data['temp'],
	});	
						
	// prepare the header
	var postheaders = {
	    'Content-Type' : 'application/json',
	    'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
	};
	
	var optionspost = {
	    host : 'robotperso.eu',
		path : '/api/api.php/'+table,
	    method : 'POST',
	    rejectUnauthorized: false,
		requestCert: true,
		agent: false,
	    headers : postheaders
	};
	console.info('Options :'+jsonObject);	
	
	// do the POST call
	var reqPost = https.request(optionspost, function(res) {	
	    res.on('data', function(d) {
	        console.log('Data ID : '+d);
	    });
	});
	
	reqPost.write(jsonObject);
	reqPost.end();
	reqPost.on('error', function(e) {
		console.log('Error save data');
	    console.error(e);
	});
		
	
	console.log('Save moisture OK');
}
						
				
				