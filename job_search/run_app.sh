#!/bin/bash
cd "$(dirname "$0")"
export FLASK_APP=app.py
python app.py
