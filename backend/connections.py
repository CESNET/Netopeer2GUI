"""
NETCONF connections
File: connections.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

import json
import os

from liberouterapi import socketio, auth
from flask import request
from flask_socketio import emit
from eventlet import event
from eventlet.timeout import Timeout
import yang
import netconf2 as nc

from .inventory import INVENTORY
from .devices import devices_get
from .error import NetopeerException
from .data import *

sessions = {}
hostcheck = {}


def hostkey_check_send(data):
	print(json.dumps(data))
	try:
		e = hostcheck[data['id']]
		e.send(data['result'])
	except KeyError:
		pass


@socketio.on('hostcheck_result')
def hostkey_check_answer(data):
	hostkey_check_send(data)


def hostkey_check(hostname, state, keytype, hexa, priv):
	params = {'id': priv, 'hostname' : hostname, 'state' : state, 'keytype' : keytype, 'hexa' : hexa}
	socketio.emit('hostcheck', params, callback = hostkey_check_send)

	timeout = Timeout(30)
	try:
		e = hostcheck[priv] = event.Event()
		result = e.wait()
	except Timeout:
		return False;
	finally:
		hostcheck.pop(priv, None)
		timeout.cancel()

	return result


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
	ssh.setAuthHostkeyCheckClb(hostkey_check, session['session_id'])
	try:
		ncs = nc.Session(device['hostname'], device['port'], ssh)
	except Exception as e:
		return(json.dumps({'success': False, 'error-msg': str(e)}))

	if not user.username in sessions:
		sessions[user.username] = {}

	# use key (as hostname:port:session-id) to store the created NETCONF session
	key = ncs.host + ":" + str(ncs.port) + ":" + ncs.id
	sessions[user.username][key] = {}
	sessions[user.username][key]['session'] = ncs

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
	except ConnectionError as e:
		reply = {'success': False, 'error': [{'msg': str(e)}]}
		del sessions[user.username][key]
		return(json.dumps(reply))
	except nc.ReplyError as e:
		reply = {'success': False, 'error': []}
		for err in e.args[0]:
			reply['error'].append(json.loads(str(err)))
		return(json.dumps(reply))

	if not 'path' in req:
		return(dataInfoRoots(sessions[user.username][key]['data'], True if req['recursive'] == 'true' else False))
	else:
		return(dataInfoSubtree(sessions[user.username][key]['data'], req['path'], True if req['recursive'] == 'true' else False))


def _checkvalue(session, req, schema):
	user = session['user'];

	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing session key.'}))
	if not 'path' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing path to validate value.'}))
	if not 'value' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing value to validate.'}))

	key = req['key']
	if not key in sessions[user.username]:
		return(json.dumps({'success': False, 'error-msg': 'Invalid session key.'}))

	ctx = sessions[user.username][key]['session'].context;
	if schema:
		search = ctx.find_path(req['path'])
	else:
		search = sessions[user.username][key]['data'].find_path(req['path'])

	if search.number() != 1:
		return(json.dumps({'success': False, 'error-msg': 'Invalid data path.'}))

	if schema:
		node = search.schema()[0]
	else:
		node = search.data()[0]

	if node.validate_value(req['value']):
		errors = yang.get_ly_errors(ctx)
		if errors.size():
			return(json.dumps({'success': False, 'error-msg': errors[errors.size() - 1].errmsg()}))
		else:
			return(json.dumps({'success': False, 'error-msg': 'unknown error'}))

	return(json.dumps({'success': True}))

@auth.required()
def data_checkvalue():
	session = auth.lookup(request.headers.get('Authorization', None))
	req = request.args.to_dict()

	return _checkvalue(session, req, False)


@auth.required()
def schema_checkvalue():
	session = auth.lookup(request.headers.get('Authorization', None))
	req = request.args.to_dict()

	return _checkvalue(session, req, True)


@auth.required()
def schema_values():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	req = request.args.to_dict()

	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing session key.'}))
	if not 'path' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing path to validate value.'}))

	key = req['key']
	if not key in sessions[user.username]:
		return(json.dumps({'success': False, 'error-msg': 'Invalid session key.'}))

	search = sessions[user.username][key]['session'].context.find_path(req['path'])
	if search.number() != 1:
		return(json.dumps({'success': False, 'error-msg': 'Invalid data path.'}))
	schema = search.schema()[0]

	if schema.nodetype() != yang.LYS_LEAF and schema.nodetype != yang.LYS_LEAFLIST:
		result = None
	else:
		result = typeValues(schema.subtype().type(), [])
	return(json.dumps({'success': True, 'data': result}))


@auth.required()
def schema_info():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	req = request.args.to_dict()

	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing session key.'}))
	if not 'path' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing path to validate value.'}))

	key = req['key']
	if not key in sessions[user.username]:
		return(json.dumps({'success': False, 'error-msg': 'Invalid session key.'}))

	if req['path'] == '/':
		node = None
	else:
		search = sessions[user.username][key]['session'].context.find_path(req['path'])
		if search.number() != 1:
			return(json.dumps({'success': False, 'error-msg': 'Invalid data path.'}))
		node = search.schema()[0]

	result = [];
	if 'relative' in req:
		if req['relative'] == 'children':
			if node:
				instantiables = node.child_instantiables(0)
			else:
				# top level
				instantiables = sessions[user.username][key]['session'].context.data_instantiables(0)
		elif req['relative'] == 'siblings':
			if node.parent():
				instantiables = node.parent().child_instantiables(0)
			else:
				# top level
				instantiables = sessions[user.username][key]['session'].context.data_instantiables(0)
		else:
			return(json.dumps({'success': False, 'error-msg': 'Invalid relative parameter.'}))

		for child in instantiables:
			if child.flags() & yang.LYS_CONFIG_R:
				# ignore status nodes
				continue
			if child.nodetype() & (yang.LYS_RPC | yang.LYS_NOTIF | yang.LYS_ACTION):
				# ignore RPCs, Notifications and Actions
				continue
			result.append(schemaInfoNode(child))
	else:
		result.append(schemaInfoNode(node))

	return(json.dumps({'success': True, 'data': result}))


def _create_child(ctx, parent, child_def):
	at = child_def['info']['module'].find('@')
	if at == -1:
		module = ctx.get_module(child_def['info']['module'])
	else:
		module = ctx.get_module(child_def['info']['module'][:at], child_def['info']['module'][at + 1:])
	# print('child: ' + json.dumps(child_def))
	# print('parent: ' + parent.schema().name())
	# print('module: ' + module.name())
	# print('name: ' + child_def['info']['name'])
	if child_def['info']['type'] == 4 :
		# print('value: ' + str(child_def['value']))
		yang.Data_Node(parent, module, child_def['info']['name'], child_def['value'])
	elif child_def['info']['type'] == 8:
		# print('value: ' + child_def['value'][0])
		yang.Data_Node(parent, module, child_def['info']['name'], child_def['value'][0])
	else:
		child = yang.Data_Node(parent, module, child_def['info']['name'])
		if 'children' in child_def:
			for grandchild in child_def['children']:
				_create_child(ctx, child, grandchild)


@auth.required()
def session_commit():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']

	req = request.get_json(keep_order = True)
	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing session key.'}))
	if not 'modifications' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing modifications.'}))

	mods = req['modifications']
	ctx = sessions[user.username][req['key']]['session'].context
	root = None
	reorders = []
	for key in mods:
		recursion = False
		# get correct path and value if needed
		path = key
		value = None
		if mods[key]['type'] == 'change':
			value = mods[key]['value']
		elif mods[key]['type'] == 'create' or mods[key]['type'] == 'replace':
			if mods[key]['data']['info']['type'] == 1:
				# creating/replacing container
				recursion = True
			elif mods[key]['data']['info']['type'] == 4:
				# creating/replacing leaf
				value = mods[key]['data']['value']
			elif mods[key]['data']['info']['type'] == 8:
				# creating/replacing leaf-list
				value = mods[key]['data']['value'][0]
				path = mods[key]['data']['path']
			elif mods[key]['data']['info']['type'] == 16:
				recursion = True
				path = mods[key]['data']['path']
		elif mods[key]['type'] == 'reorder':
			# postpone reorders
			reorders.extend(mods[key]['transactions'])
			continue

		# create node
		# print("creating " + path)
		# print("value " + str(value))
		if root:
			root.new_path(ctx, path, value, 0, 0)
		else:
			root = yang.Data_Node(ctx, path, value, 0, 0)
		node = root.find_path(path).data()[0];

		# set operation attribute and add additional data if any
		if mods[key]['type'] == 'change':
			node.insert_attr(None, 'ietf-netconf:operation', 'merge')
		elif mods[key]['type'] == 'delete':
			node.insert_attr(None, 'ietf-netconf:operation', 'delete')
		elif mods[key]['type'] == 'create':
			node.insert_attr(None, 'ietf-netconf:operation', 'create')
		elif mods[key]['type'] == 'replace':
			node.insert_attr(None, 'ietf-netconf:operation', 'replace')
		else:
			return(json.dumps({'success': False, 'error-msg': 'Invalid modification ' + key}))

		if recursion and 'children' in mods[key]['data']:
			for child in mods[key]['data']['children']:
				if 'key' in child['info'] and child['info']['key']:
					continue
				_create_child(ctx, node, child)

	# finally process reorders which must be last since they may refer newly created nodes
	# and they do not reflect removed nodes
	for move in reorders:
		try:
			node = root.find_path(move['node']).data()[0];
			parent = node.parent()
			node.unlink()
			if parent:
				parent.insert(node)
			else:
				root.insert_sibling(node)
		except:
			if root:
				root.new_path(ctx, move['node'], None, 0, 0)
			else:
				root = yang.Data_Node(ctx, move['node'], None, 0, 0)
			node = root.find_path(move['node']).data()[0];
		node.insert_attr(None, 'yang:insert', move['insert'])
		if move['insert'] == 'after' or move['insert'] == 'before':
			if 'key' in move:
				node.insert_attr(None, 'yang:key', move['key'])
			elif 'value' in move:
				node.insert_attr(None, 'yang:value', move['value'])

	# print(root.print_mem(yang.LYD_XML, yang.LYP_FORMAT))
	try:
		sessions[user.username][req['key']]['session'].rpcEditConfig(nc.DATASTORE_RUNNING, root)
	except nc.ReplyError as e:
		reply = {'success': False, 'error': []}
		for err in e.args[0]:
			reply['error'].append(json.loads(str(err)))
		return(json.dumps(reply))

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
