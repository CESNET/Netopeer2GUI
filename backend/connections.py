"""
NETCONF connections
File: connections.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

import json
import os

from liberouterapi import auth
from flask import request
import netconf2 as nc

from .inventory import INVENTORY
from .devices import devices_get
from .error import NetopeerException
from .data import *

sessions = {}

def hostkey_check(hostname, state, keytype, hexa, priv):
	# TODO real check
	return True

@auth.required()
def connect():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	path = os.path.join(INVENTORY, user.username)

	data = request.get_json()
	if 'id' in data:
		# stored device
		device = devices_get(data['id'], user.username)
	elif 'device' in data:
		# one-time connect, the device is specified in request
		device = data['device']
	else:
		raise NetopeerException('Invalid connection request.')

	if not device:
		raise NetopeerException('Unknown device to connect to request.')

	nc.setSearchpath(path)

	ssh = nc.SSH(device['username'], password=device['password'])
	ssh.setAuthHostkeyCheckClb(hostkey_check)
	try:
		session = nc.Session(device['hostname'], device['port'], ssh)
	except Exception as e:
		return(json.dumps({'success': False, 'error-msg': str(e)}))

	if not user.username in sessions:
		sessions[user.username] = {}

	# use key (as hostname:port:session-id) to store the created NETCONF session
	key = session.host + ":" + str(session.port) + ":" + session.id
	sessions[user.username][key] = {}
	sessions[user.username][key]['session'] = session

	return(json.dumps({'success': True, 'session-key': key}))


@auth.required()
def session_get_capabilities():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	req = request.args.to_dict()

	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing session key.'}))

	if not user.username in sessions:
		sessions[user.username] = {}
		
	key = req['key']
	if not key in sessions[user.username]:
		return(json.dumps({'success': False, 'error-msg': 'Invalid session key.'}))

	cpblts = []
	for c in sessions[user.username][key]['session'].capabilities:
		cpblts.append(c)

	return(json.dumps({'success': True, 'capabilities': cpblts}))

@auth.required()
def session_get():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	req = request.args.to_dict()

	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing session key.'}))
	if not 'recursive' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing recursive flag.'}))

	if not user.username in sessions:
		sessions[user.username] = {}

	key = req['key']
	if not key in sessions[user.username]:
		return(json.dumps({'success': False, 'error-msg': 'Invalid session key.'}))

	try:
		sessions[user.username][key]['data'] = sessions[user.username][key]['session'].rpcGet()
	except nc.ReplyError as e:
		reply = {'success': False, 'error': []}
		for err in e.args[0]:
			reply['error'].append(json.loads(str(err)))
		return(json.dumps(reply))

	if not 'path' in req:
		return(dataInfoRoots(sessions[user.username][key]['data'], True if req['recursive'] == 'true' else False))
	else:
		return(dataInfoSubtree(sessions[user.username][key]['data'], req['path'], True if req['recursive'] == 'true' else False))


@auth.required()
def session_checkvalue():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	req = request.args.to_dict()

	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing session key.'}))
	if not 'path' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing path to validate value.'}))
	if not 'value' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing value to validate.'}))

	if not user.username in sessions:
		sessions[user.username] = {}

	key = req['key']
	if not key in sessions[user.username]:
		return(json.dumps({'success': False, 'error-msg': 'Invalid session key.'}))

	search = sessions[user.username][key]['data'].find_path(req['path'])
	if search.number() != 1:
		return(json.dumps({'success': False, 'error-msg': 'Invalid data path.'}))
	node = search.data()[0]

	try:
		node.validate_value(req['value'])
	except:
		return(json.dumps({'success': False, 'error-msg': ly.Error().errmsg()}))

	return(json.dumps({'success': True}))


@auth.required()
def session_close():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	req = request.args.to_dict()

	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing session key.'}))

	if not user.username in sessions:
		sessions[user.username] = {}

	key = req['key']
	if not key in sessions[user.username]:
		return(json.dumps({'success': False, 'error-msg': 'Invalid session key.'}))

	del sessions[user.username][key]
	return(json.dumps({'success': True}))

@auth.required()
def session_alive():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	req = request.args.to_dict()

	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing session key.'}))

	if not user.username in sessions:
		sessions[user.username] = {}
		
	key = req['key']
	if not key in sessions[user.username]:
		return(json.dumps({'success': False, 'error-msg': 'Invalid session key.'}))

	return(json.dumps({'success': True}))
