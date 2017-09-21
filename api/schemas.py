"""
Manipulation with the YANG schemas.
File: schemas.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

from liberouterapi import auth, config
from flask import request
import libyang as ly
import json
import os, errno, time, sys

from .inventory import inventory_check
from .error import NetopeerException

__INVENTORY = config.modules['netopeer']['usersdata_path']
__SCHEMAS_EMPTY = '{"schemas":{"timestamp":0,"schema":[]}}'

def __schema_parse(path, format=ly.LYS_IN_UNKNOWN):
	try:
		ctx = ly.Context(os.path.dirname(path))
	except Exception as e:
		raise NetopeerException(str(e))
	
	try:
		module = ctx.parse_path(path, ly.LYS_IN_YANG if format == ly.LYS_IN_UNKNOWN else format)
	except Exception as e:
		if format != ly.LYS_IN_UNKOWN:
			raise NetopeerException(str(e))
		try:
			module = ctx.parse_path(path, ly_LYS_IN_YIN)
		except Exception as e:
			raise NetopeerException(str(e))

	return module
	

def __schemas_init():
	schemas = json.loads(__SCHEMAS_EMPTY)
	try:
		ctx = ly.Context()
	except Exception as e:
		raise NetopeerException(str(e))
	
	# initialize the list with libyang's internal modules
	modules = ctx.get_module_iter()
	for module in modules:
		schemas['schemas']['schema'].append({'name':module.name(),'revision':module.rev().date()})
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
			format =  ly.LYS_IN_YANG
		elif file[-4:] == '.yin':
			format = ly.LYS_IN_YIN
		else:
			continue
		
		schemapath = os.path.join(path, file);
		if os.path.getmtime(schemapath) > timestamp:
			# update the list
			print("updating by " + schemapath)
			try:
				module = __schema_parse(schemapath, format)
				if module.rev_size():
					schemas['schemas']['schema'].append({'name':module.name(), 'revision':module.rev().date()})
				else:
					schemas['schemas']['schema'].append({'name':module.name()})
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
	path = os.path.join(__INVENTORY, user.username)
	
	inventory_check(path)
	schemas = __schemas_update(path)
	
	return(json.dumps(schemas))

@auth.required()
def schemas_add():
	if 'schema' not in request.files:
		raise NetopeerException('Missing schema file in upload request.')
	
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	file = request.files['schema']
	
	# store the file
	path = os.path.join(__INVENTORY, user.username, file.filename)
	file.save(path)
	
	# parse file
	try:
		if file.filename[-5:] == '.yang':
			format = ly.LYS_IN_YANG
		elif file.filename[-4:] == '.yin':
			format = ly.LYS_IN_YIN
		else:
			format = ly.LYS_IN_UNKNOWN
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
	path = os.path.join(__INVENTORY, user.username)

	schema_rm = request.get_json()
	if not schema_rm:
		raise NetopeerException('Invalid schema remove request.')

	schemas = __schemas_inv_load(path)
	for i in range(len(schemas['schemas']['schema'])):
		schema = schemas['schemas']['schema'][i]
		if 'revision' in schema_rm:
			if schema['name'] != schema_rm['name'] or not 'revision' in schema or schema['revision'] != schema_rm['revision']:
				schema = None
				continue
		else:
			if schema['name'] != schema_rm['name'] or 'revision' in schema:
				schema = None
				continue
		schemas['schemas']['schema'].pop(i)
		break;

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
