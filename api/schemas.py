"""
Manipulation with the YANG schemas.
File: schemas.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

from liberouterapi import auth, config
from flask import request
import libyang as ly
import json
import os, errno, time

from .error import NetopeerException

__INVENTORY = config.modules['netopeer']['usersdata_path']
__SCHEMAS_EMPTY = '{"schemas":{"timestamp":0,"schema":[]}}'

def __schema_parse(path):
	try:
		ctx = ly.Context()
	except Exception as e:
		raise NetopeerException(str(e))
	
	return(ctx.parse_path(path, ly.LYS_IN_YANG, 0))
	

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


def __schemas_update(path):
	schemainv_path = os.path.join(path, '/schemas.json')
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
	
	# get the previous timestamp
	timestamp = schemas['schemas']['timestamp']
	
	# check the current content of the storage
	for file in os.listdir(path):
		if file[-4] != 'yang':
			continue
		
		schemapath = os.path.join(path, file);
		print(schemapath)
		if os.path.getmtime(schemapath) > timestamp:
			# update the list
			try:
				module = __schema_parse(schemapath)
				schemas['schemas']['schema'].append({'name':module.name(),'revision':module.rev().date()})
			except Exception:
				pass

	# update the timestamp
	schemas['schemas']['timestamp'] = time.time()
	
	#store the list
	try:
		with open(schemainv_path, 'w') as schema_file:
			json.dump(schemas, schema_file)
	except Exception:
		pass
	
	# return the up-to-date list 
	return schemas['schemas']['schema']

def __schemas_check(path):
	try:
		os.makedirs(path, mode=0o750)
	except OSError as e:
		if e.errno == errno.EEXIST and os.path.isdir(path):
			pass
		elif e.errno == errno.EEXIST:
			raise NetopeerException('User\'s schemas inventory (' + path + ') already exists and it\'s not a directory.')
		else:
			raise NetopeerException('Unable to use schemas inventory path ' + path +' (' + str(e) + ').') 


@auth.required()
def schemas_list():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	path = os.path.join(__INVENTORY, user.username)
	
	__schemas_check(path)
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
		module = __schema_parse(path)
	except Exception:
		os.remove(path)
		return(json.dumps({'success': False}))
			
	return(json.dumps({'success': True}))
