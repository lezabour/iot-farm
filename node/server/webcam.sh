#!/bin/bash

cd /home/pi/projets/librairies/mjpg-streamer/mjpg-streamer-experimental ;
export LD_LIBRARY_PATH=. ;
./mjpg_streamer -i "input_uvc.so" -o "output_http.so -w ./www"