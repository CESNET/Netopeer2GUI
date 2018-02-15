"""
NETCONF connections
File: connections.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

import json
import os

from liberouterapi import auth
from flask import request
import yang
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

	if schema:
		search = sessions[user.username][key]['session'].context.find_path(req['path'])
	else:
		search = sessions[user.username][key]['data'].find_path(req['path'])

	if search.number() != 1:
		return(json.dumps({'success': False, 'error-msg': 'Invalid data path.'}))

	if schema:
		node = search.schema()[0]
	else:
		node = search.data()[0]

	if node.validate_value(req['value']):
		return(json.dumps({'success': False, 'error-msg': yang.Error().errmsg()}))

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
	module = ctx.get_module(child_def['info']['module'])
	# print('child: ' + json.dumps(child_def))
	if child_def['info']['type'] == 4:
		# print('parent: ' + parent.schema().name())
		# print('module: ' + module.name())
		# print('name: ' + child_def['info']['name'])
		# print('value: ' + child_def['value'])
		yang.Data_Node(parent, module, child_def['info']['name'], child_def['value'])
	else:
		# print('parent: ' + parent.schema().name())
		# print('module: ' + module.name())
		# print('name: ' + child_def['info']['name'])
		child = yang.Data_Node(parent, module, child_def['info']['name'])
		if 'children' in child_def:
			for grandchild in child_def['children']:
				_create_child(ctx, child, grandchild)


@auth.required()
def session_commit():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']

	req = request.get_json()
	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing session key.'}))
	if not 'modifications' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing modifications.'}))

	mods = req['modifications']
	ctx = sessions[user.username][req['key']]['session'].context
	root = None
	for key in mods:
		recursion = False
		# get correct path and value if needed
		path = key
		value = None
		if mods[key]['type'] == 'change':
			value = mods[key]['value']
		elif mods[key]['type'] == 'create' or mods[key]['type'] == 'replace':
			if mods[key]['data']['info']['type'] == 4:
				# creating/replacing leaf
				value = mods[key]['data']['value']
			elif mods[key]['data']['info']['type'] == 16:
				recursion = True
				path = mods[key]['data']['path']
			elif mods[key]['data']['info']['type'] == 1:
				recursion = True

		# create node
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
