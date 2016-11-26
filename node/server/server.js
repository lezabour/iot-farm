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
var express = require('express')
  , http = require('http')
  , morgan = require('morgan');
var request = require('request');
var configServer = require('./lib/config/server');
var app = express();
app.set('port', configServer.httpPort);
app.use(express.static(configServer.staticFolder));
app.use(morgan('dev'));
// server index - //Declaration des chemins d'acces
require('./lib/routes').serveIndex(app, configServer.staticFolder);

// HTTP server
var server = http.createServer(app);
server.listen(app.get('port'), function () {
	console.log('Serveur: HTTP server listening on port ' + app.get('port'));
});
var io = require('socket.io')(server);
var fs = require('file-system');
//Communication Python Node Shell
var PythonShell = require('python-shell');
var _mysql = require('mysql');
//Communication Raspberry-Arduino via SerialPort
var com = require("serialport");
// configuration files

// app parameters
var five = require("johnny-five") , board, servo;
var moisture,sensordata,status,lumiere ="";

module.exports.app = app;



var mysql = _mysql.createConnection({
	    host: HOST,
	    port: PORT,
	    user: MYSQL_USER,
	    password: MYSQL_PASS,
	    database : DATABASE
	});

mysql.connect();


board = new five.Board();

board.on("ready", function() {
	console.log("Arduino Board Connected");
	
	moisture = new five.Sensor({
		pin: "A0",
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
		var datenow = new Date().toLocaleString();
		var heurenow = new Date().toLocaleTimeString();
		sensordata = {};
		sensordata['date'] = datenow; 
		sensordata['moisture'] = moisture.value;
		sensordata['lumiere'] = lumiere.value;
		sensordata['status'] = status;
		saveMoisture(sensordata);
		request('http://192.168.0.21:8080/?action=snapshot').pipe(fs.createWriteStream('./../images/pic-'+datenow+'.jpg'));
		cpt = cpt+1;
		
		}, 
	2000);
	
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
		sensordata['lumiere'] = lumiere.value;
		sensordata['status'] = status;
		saveMoisture(sensordata);
		if(cpt%2==0) {
			request('http://192.168.0.21:8080/?action=snapshot').pipe(fs.createWriteStream('./../images/pic-'+datenow+'.jpg'));
			cpt=0;
		}
		cpt = cpt+1;
		
		} 
		), 
	300000);
	
	//On boucle toutes les 5min pour enregistrer les donner
	/*this.loop(300000, function() {});
	*/
	io.on('connection', function (socket) {
	 	console.log('Connection');  
	 	
		socket.on('get-humidity-sensor', function (data) {
	    		getMoistureData(socket);
	  	});
	  	socket.on('get-humidity-sensor-update', function (data) {
		  	console.log('Demande update'); 
		  	updateMoistureData(socket);
	  	});
	  	
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
	mysql.query("INSERT INTO "+TABLE+" (id,date,data,status) VALUES ('','"+data['date']+"','"+jsondata+"','"+data['status']+"')");
	console.log('Save moisture OK');
		
} 

function getMoistureData(socket) {
	console.log('Debut Get data');
	
	var query = mysql.query("SELECT * FROM "+TABLE);
	
	query.on('error', function(err) {
	    throw err;
	});
	 
	 
	query.on('result', function(row) {
	    socket.emit('humidity-sensor', { data: row.data });
	});
	
	
	console.log('Get data OK');
} 

function updateMoistureData(socket) {
	console.log('Debut UPDATE');
	
	var queryUpdate= mysql.query("SELECT * from "+TABLE+" order by ID DESC limit 0,1");
	
	queryUpdate.on('error', function(err) {
	    throw err;
	});
	 
	queryUpdate.on('result', function(row2) {
			console.log('Update emit ->'+row2.data);
			socket.emit('humidity-sensor-update', { data: row2.data });
	});
	
	
	console.log('FIN UPDATE');
}






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