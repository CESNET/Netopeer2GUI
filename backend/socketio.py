"""
Socket IO helper functions
File: socketio.py
Author: Radek Krejci <rkrejci@cesnet.cz>
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
	socketio.emit(name, params, callback = sio_send)


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
