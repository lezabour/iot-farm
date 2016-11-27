/* global io */
/* global $ */
$(document).ready(function() 
{
	console.log('ready');		
	//properties & ui objects mappings
	var ui = {
		quality480p : $("#quality-480p"),
		quality720p : $("#quality-720p"),
		quality1080p : $("#quality-1080p"),
		alertMode : $("#alert-mode"),
		imgContainer : $("#img-container"),
		img : $("#image-view"),
		imgPreloader : $("#image-preloader"),
		imgTimestamp : $("#timestamp"),
		clientsList : $("#clients"),
		clientsCount : $("#clients-count"),	
	},	
	appConfig = {},
	appClients = [],
	socket = io.connect();  
	var j=0;
	
	//notify server of connection
	socket.emit('connected'); 
	
	$("#canvas-video").attr('src' , "http://192.168.0.21:8080/?action=stream");
	var lesdatas = [];
	socket.emit('get-humidity-sensor');
	
	socket.on("humidity-sensor", function(data) {
    	lesdatas[j] = jQuery.parseJSON(data.data);
    	j++;
	});
	
	socket.on("humidity-sensor-update", function(data) {
		data = jQuery.parseJSON(data.data);
		console.log('Update received JSON- ' +data);
		var x = (new Date(data['date'])).getTime();
		var    y = data['moisture'];
		chart1.series[0].addPoint([x, y], true, true);
		console.log('Ajout des points - x:'+x +'- y:'+ y);
	});
	
	/*
		Lancement du graphique 1seconde apres le chargement de la page, pour recuperer les datas avant
	*/
	setTimeout(function (socket) {
	    Highcharts.setOptions({
	        global: {
	            useUTC: false
	        }
	    });
	    // Create the chart
	     chart1 = Highcharts.stockChart('container', {
	        rangeSelector: {
	            buttons: [{
	                count: 12,
	                type: 'hour',
	                text: '12H'
	            }, {
	                count: 1,
	                type: 'day',
	                text: '1D'
	            },
	            {
	                count: 1,
	                type: 'week',
	                text: '1W'
	            },{
	                count: 1,
	                type: 'month',
	                text: '1M'
	            }, {
	                type: 'all',
	                text: 'All'
	            }],
	            inputEnabled: false,
	            selected: 0
	        },
	
	        title: {
	            text: 'Live random data'
	        },
	
	        exporting: {
	            enabled: false
	        },
	
	        series: [{
	            name: 'Humidity Datas',
	            data: (function () {
	                // generate an array of random data
	                var data = [],
	                    time = (new Date()).getTime(),
	                    i;
	                console.log("total row"+lesdatas.length);   
	                for (i = 0; i < lesdatas.length; i = i + 1) {
	                    data.push([
	                        time = (new Date(lesdatas[i]['date'])).getTime(),
	                        lesdatas[i]['moisture']
	                        
	                    ]);
	                    //console.log("---> i: "+i+" - "+lesdatas[i]['moisture']+ " - "+ time);
	                }
	                return data;
	            }())
	        }]
	    });
	
	}
    , 1000);
				
	//On lance le refreshu graphe
    setInterval(function() {
		socket.emit("get-humidity-sensor-update"); 
	},30000);
	
	//bind ui objects to function associated with config settings update
	ui.alertMode.click(function(){ ConfigUpdateAlert(); });
	ui.quality480p.change(function(){ ConfigUpdateQuality("640x480",25); });
	ui.quality720p.change(function(){ ConfigUpdateQuality("1280x720",15); });
	ui.quality1080p.change(function(){ ConfigUpdateQuality("1920x1080",5); });	
	
});
