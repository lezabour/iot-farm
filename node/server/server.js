/**
 * Created by Elie on 23/11/2016.
 */

// modules
var express = require('express')
  , http = require('http')
  , morgan = require('morgan');
var request = require('request');
var fs = require('file-system');
//Communication Python Node Shell
var PythonShell = require('python-shell');
var _mysql = require('mysql');
//Communication Raspberry-Arduino via SerialPort
var com = require("serialport");
// configuration files
var configServer = require('./lib/config/server');
// app parameters
var app = express();
app.set('port', configServer.httpPort);
app.use(express.static(configServer.staticFolder));
app.use(morgan('dev'));
var five = require("johnny-five") , board, servo;
var moisture,sensordata,status,lumiere ="";

// server index - //Declaration des chemins d'acces
require('./lib/routes').serveIndex(app, configServer.staticFolder);

// HTTP server
var server = http.createServer(app);
server.listen(app.get('port'), function () {
	console.log('Serveur: HTTP server listening on port ' + app.get('port'));
});
var i=0;
// Robot constants 
board = new five.Board();
console.log('Serveur: A user has connected ');
board.on("ready", function() {
	console.log("Connected");
	
	moisture = new five.Sensor({
		pin: "A0",
		enabled: true
	});
	lumiere = new five.Sensor({
		pin: "A1",
	});
	
	var lumiereval = lumiere.value;
	//On fait la boucle d'initialisation
	if(moisture.value > 500) {
		status = 'Sec';
	} else {
		status = 'Humide';
	}
	
	var datenow = new Date().toLocaleString();
	var heurenow = new Date().toLocaleTimeString();
	console.log("Date : "+datenow+ " - Moisture: "+moisture.value+ " - status :"+ status+ " - lumiere :"+ lumiere.value);
	var sensordata ={};
	sensordata['date'] = datenow; 
	sensordata['moisture'] = moisture.value;
	sensordata['lumiere'] = lumiere.value;
	sensordata['status'] = status;
	saveMoisture(sensordata);
	
	//On boucle toutes les 5min pour enregistrer les donner
	this.loop(300000, function() {
		if(moisture.value > 500) {
			status = 'Sec';
		} else {
			status = 'Humide';
		}
		var datenow = new Date().toLocaleString();
		var heurenow = new Date().toLocaleTimeString();
		console.log("Date : "+datenow+ " - Moisture: "+moisture.value+ " - status :"+ status+ " - lumiere :"+ lumiere.value);
		sensordata = {};
		sensordata['date'] = datenow; 
		sensordata['moisture'] = moisture.value;
		sensordata['lumiere'] = lumiere.value;
		sensordata['status'] = status;
		saveMoisture(sensordata);
		if(i%5==0) {
			request('http://192.168.0.21:8080/?action=snapshot').pipe(fs.createWriteStream('./../images/pic-'+datenow+'.jpg'));
			i=0;
		}
		i = i+1;
	});
	
});
	  
//////////////////////////////////////////////////////////
//Centre de reception des messages après la connexion
//////////////////////////////////////////////////////////
module.exports.app = app;

/*
	Recupere les infos du sensor, et les mets en forme
*/

/*
	Ajoute les infos sur sensor dans la Base	
*/
function saveMoisture(data) {

	var HOST = 'localhost';
	var PORT = 3306;
	var MYSQL_USER = 'root';
	var MYSQL_PASS = 'clic2clic';
	var DATABASE = 'rpi';
	var TABLE = 'sensor';
	var random=Math.random() * (100 - 0) + 0;
	var mysql = _mysql.createConnection({
	    host: HOST,
	    port: PORT,
	    user: MYSQL_USER,
	    password: MYSQL_PASS,
	});
	jsondata = JSON.stringify(data);
	mysql.query('use ' + DATABASE);
	mysql.query("INSERT INTO "+TABLE+" (id,date,data,status) VALUES ('','"+data['date']+"','"+jsondata+"','"+data['status']+"')");
	console.log('Save moisture OK');
  	/*serialport.on('open', function(){ 
	  	serialport.on('data', function(data){   
    console.log(''+data); 
	});*/


} 


