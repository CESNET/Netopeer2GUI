"""
Socket IO helper functions

Copyright 2018 Radek Krejčí

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
   http://www.apache.org/licenses/LICENSE-2.0
"""

from eventlet import event
from liberouterapi import socketio


sio_data = {}


def sio_send(data):
    try:
        e = sio_data[data['id']]
        e.send(data)
    except KeyError:
        pass


def sio_emit(name, params):
    socketio.emit(name, params, callback=sio_send)


def sio_wait(id):
    e = sio_data[id] = event.Event()
    return e.wait()


def sio_clean(id):
    sio_data.pop(id, None)


@socketio.on('device_auth_password')
@socketio.on('hostcheck_result')
@socketio.on('getschema_result')
def process_answer(data):
    sio_send(data)
