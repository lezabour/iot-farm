#!/bin/bash

sudo killall mjpg_streamer >>/home/pi/projets/iot-farm/stream.log 2>>/home/pi/projets/iot-farm/stream.log
cd /home/pi/projets/librairie/mjpg-streamer ;
export LD_LIBRARY_PATH=. ;
./mjpg_streamer -i "input_uvc.so -f 25 -q 100" -o "output_http.so -w ./www"