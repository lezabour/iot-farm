#!/bin/bash

cd /home/pi/projets/librairie/mjpg-streamer ;
export LD_LIBRARY_PATH=. ;
./mjpg_streamer -i "input_uvc.so" -o "output_http.so -w ./www"