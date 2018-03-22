#!/bin/bash
virtualenv venv --system-site-packages -p python3
source venv/bin/activate
pip3 install --upgrade pip
pip3 install -r requirements.txt
deactivate

