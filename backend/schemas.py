"""
Manipulation with the YANG schemas.
File: schemas.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

import json
import os
import errno
import time

from liberouterapi import auth
from flask import request
import yang

from .inventory import INVENTORY, inventory_check
from .error import NetopeerException

__SCHEMAS_EMPTY = '{"schemas":{"timestamp":0,"schema":[]}}'


def __schema_parse(path, format = yang.LYS_IN_UNKNOWN):
	try:
		ctx = yang.Context(os.path.dirname(path))
	except Exception as e:
		raise NetopeerException(str(e))
	
	try:
		module = ctx.parse_path(path, yang.LYS_IN_YANG if format == yang.LYS_IN_UNKNOWN else format)
	except Exception as e:
		if format != yang.LYS_IN_UNKOWN:
			raise NetopeerException(str(e))
		try:
			module = ctx.parse_path(path, ly_LYS_IN_YIN)
		except Exception as e:
			raise NetopeerException(str(e))

	return module
	

def __schemas_init():
	schemas = json.loads(__SCHEMAS_EMPTY)
	try:
		ctx = yang.Context()
	except Exception as e:
		raise NetopeerException(str(e))
	
	# initialize the list with libyang's internal modules
	modules = ctx.get_module_iter()
	for module in modules:
		schemas['schemas']['schema'].append({'key':module.name() + '@' + module.rev().date(), 'name':module.name(), 'revision':module.rev().date()})
	return schemas


def __schemas_inv_load(path):
	schemainv_path = os.path.join(path, 'schemas.json')
	try:
		with open(schemainv_path, 'r') as schemas_file:
			schemas = json.load(schemas_file)
	except OSError as e:
		if e.errno == errno.ENOENT:
			schemas = __schemas_init()
		else:
			raise NetopeerException('Unable to use user\'s schemas inventory ' + schemainv_path + ' (' + str(e) + ').')
	except ValueError:
		schemas = __schemas_init()

	return schemas

def __schemas_inv_save(path, schemas):
	schemainv_path = os.path.join(path, 'schemas.json')

	# update the timestamp
	schemas['schemas']['timestamp'] = time.time()

	#store the list
	try:
		with open(schemainv_path, 'w') as schema_file:
			json.dump(schemas, schema_file)
	except Exception:
		pass

	return schemas

def __schemas_update(path):
	# get schemas database
	schemas = __schemas_inv_load(path)
	
	# get the previous timestamp
	timestamp = schemas['schemas']['timestamp']
	
	# check the current content of the storage
	for file in os.listdir(path):
		if file[-5:] == '.yang':
			format = yang.LYS_IN_YANG
		elif file[-4:] == '.yin':
			format = yang.LYS_IN_YIN
		else:
			continue
		
		schemapath = os.path.join(path, file);
		if os.path.getmtime(schemapath) > timestamp:
			# update the list
			try:
				module = __schema_parse(schemapath, format)
				if module.rev_size():
					schemas['schemas']['schema'].append({'key':module.name() + '@' + module.rev().date(),
														 'name':module.name(),
														 'revision':module.rev().date(),
														 'file':os.path.basename(schemapath)})
				else:
					schemas['schemas']['schema'].append({'key':module.name() + '@',
														 'name':module.name(),
														 'file':os.path.basename(schemapath)})
			except Exception as e:
				continue

	#store the list
	__schemas_inv_save(path, schemas)
	
	# return the up-to-date list 
	return schemas['schemas']['schema']

@auth.required()
def schemas_list():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	path = os.path.join(INVENTORY, user.username)
	
	inventory_check(path)
	schemas = __schemas_update(path)
	
	return(json.dumps(schemas))


@auth.required()
def schema_get():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	req = request.args.to_dict()
	path = os.path.join(INVENTORY, user.username)

	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing schema key.'}))
	key = req['key']

	schemas = __schemas_inv_load(path)
	for i in range(len(schemas['schemas']['schema'])):
		schema = schemas['schemas']['schema'][i]
		if schema['key'] == key:
			data = ""
			if 'file' in schema:
				with open(os.path.join(path, schema['file']), 'r') as schema_file:
					data = schema_file.read()
			else:
				ctx = yang.Context()
				data = ctx.get_module(schema['name']).print_mem(yang.LYS_OUT_YANG, 0)
			return(json.dumps({'success': True, 'data': data}))

	return(json.dumps({'success': False, 'error-msg':'Schema ' + key + ' not found.'}))


@auth.required()
def schemas_add():
	if 'schema' not in request.files:
		raise NetopeerException('Missing schema file in upload request.')
	
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	file = request.files['schema']
	
	# store the file
	path = os.path.join(INVENTORY, user.username, file.filename)
	file.save(path)
	
	# parse file
	try:
		if file.filename[-5:] == '.yang':
			format = yang.LYS_IN_YANG
		elif file.filename[-4:] == '.yin':
			format = yang.LYS_IN_YIN
		else:
			format = yang.LYS_IN_UNKNOWN
		module = __schema_parse(path, format)
		# TODO: normalize file name to allow removing without remembering schema path
	except Exception:
		os.remove(path)
		return(json.dumps({'success': False}))
			
	return(json.dumps({'success': True}))

@auth.required()
def schemas_rm():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	path = os.path.join(INVENTORY, user.username)

	key = request.get_json()
	if not key:
		raise NetopeerException('Invalid schema remove request.')

	schemas = __schemas_inv_load(path)
	for i in range(len(schemas['schemas']['schema'])):
		schema = schemas['schemas']['schema'][i]
		if schema['key'] == key:
			schemas['schemas']['schema'].pop(i)
			break;
		else:
			schema = None;

	if not schema:
		# schema not in inventory
		return (json.dumps({'success': False}))

	# update the inventory database
	__schemas_inv_save(path, schemas)

	# remove the schema file
	if 'revision' in schema:
		path = os.path.join(path, schema['name'] + '@' + schema['revision'] + '.yang')
	else:
		path = os.path.join(path, schema['name'] + '.yang')
	os.remove(path)

	# TODO: resolve dependencies

	return(json.dumps({'success': True}))
