"""
Manipulation with the YANG schemas.
File: schemas.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

import json
import os
import errno
import time
from subprocess import check_output
from shutil import copy

from liberouterapi import auth
from flask import request
import yang

from .inventory import INVENTORY, inventory_check
from .error import NetopeerException

__SCHEMAS_EMPTY = '{"timestamp":0, "schemas":{}}'


def __schema_parse(path, format = yang.LYS_IN_UNKNOWN):
	try:
		ctx = yang.Context(os.path.dirname(path))
	except Exception as e:
		raise NetopeerException(str(e))

	try:
		module = ctx.parse_module_path(path, yang.LYS_IN_YANG if format == yang.LYS_IN_UNKNOWN else format)
	except Exception as e:
		if format != yang.LYS_IN_UNKOWN:
			raise NetopeerException(str(e))
		try:
			module = ctx.parse_module_path(path, ly_LYS_IN_YIN)
		except Exception as e:
			raise NetopeerException(str(e))

	return module


def __schemas_init(path):
	schemas = json.loads(__SCHEMAS_EMPTY)
	try:
		ctx = yang.Context()
	except Exception as e:
		raise NetopeerException(str(e))

	# initialize the list with libyang's internal modules
	modules = ctx.get_module_iter()
	for module in modules:
		name_norm = module.name() + '@' + module.rev().date() + '.yang'
		schemas['schemas'][name_norm] = {'name':module.name(), 'revision':module.rev().date()}
		try:
			with open(os.path.join(path, name_norm), 'w') as schema_file:
				schema_file.write(module.print_mem(yang.LYS_OUT_YANG, 0))
		except:
			pass
	try:
		nc_schemas_dir = check_output("pkg-config --variable=LNC2_SCHEMAS_DIR libnetconf2", shell = True).decode()
		nc_schemas_dir = nc_schemas_dir[:len(nc_schemas_dir) - 1]
		for file in os.listdir(nc_schemas_dir):
			if file[-5:] == '.yang' or file[-4:] == '.yin':
				try:
					copy(os.path.join(nc_schemas_dir, file), path)
				except:
					pass
			else:
				continue
	except:
		pass

	return schemas


def __schemas_inv_load(path):
	schemainv_path = os.path.join(path, 'schemas.json')
	try:
		with open(schemainv_path, 'r') as schemas_file:
			schemas = json.load(schemas_file)
	except OSError as e:
		if e.errno == errno.ENOENT:
			schemas = __schemas_init(path)
		else:
			raise NetopeerException('Unable to use user\'s schemas inventory ' + schemainv_path + ' (' + str(e) + ').')
	except ValueError:
		schemas = __schemas_init(path)

	return schemas


def __schemas_inv_save(path, schemas):
	schemainv_path = os.path.join(path, 'schemas.json')

	# update the timestamp
	schemas['timestamp'] = time.time()

	#store the list
	try:
		with open(schemainv_path, 'w') as schema_file:
			json.dump(schemas, schema_file, sort_keys = True)
	except Exception:
		pass

	return schemas


def __schemas_update(path):
	# get schemas database
	schemas = __schemas_inv_load(path)

	# get the previous timestamp
	timestamp = schemas['timestamp']

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
					name_norm = module.name() + '@' + module.rev().date() + '.yang'
					schemas['schemas'][name_norm] = {'name': module.name(), 'revision': module.rev().date()}
				else:
					name_norm = module.name() + '.yang'
					schemas['schemas'][name_norm] = {'name': module.name()}
				if file != name_norm:
					try:
						with open(os.path.join(path, name_norm), 'w') as schema_file:
							schema_file.write(module.print_mem(yang.LYS_OUT_YANG, 0))
					except:
						pass

					try:
						os.remove(schemapath)
					except:
						pass
			except:
				continue

	#store the list
	__schemas_inv_save(path, schemas)

	# return the up-to-date list
	return schemas['schemas']


@auth.required()
def schemas_list():
	session = auth.lookup(request.headers.get('lgui-Authorization', None))
	user = session['user']
	path = os.path.join(INVENTORY, user.username)

	inventory_check(path)
	schemas = __schemas_update(path)

	return(json.dumps(schemas, sort_keys = True))


@auth.required()
def schema_get():
	session = auth.lookup(request.headers.get('lgui-Authorization', None))
	user = session['user']
	req = request.args.to_dict()
	path = os.path.join(INVENTORY, user.username)

	if not 'key' in req:
		return(json.dumps({'success': False, 'error-msg': 'Missing schema key.'}))
	key = req['key']

	schemas = __schemas_inv_load(path)
	if key in schemas['schemas']:
		try:
			with open(os.path.join(path, key), 'r') as schema_file:
				data = schema_file.read()
			return(json.dumps({'success': True, 'data': data}))
		except:
			pass;
	return(json.dumps({'success': False, 'error-msg':'Schema ' + key + ' not found.'}))


@auth.required()
def schemas_add():
	if 'schema' not in request.files:
		raise NetopeerException('Missing schema file in upload request.')

	session = auth.lookup(request.headers.get('lgui-Authorization', None))
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

		# normalize file name to allow removing without remembering schema path
		if module.rev_size():
			name_norm = module.name() + '@' + module.rev().date() + '.yang'
		else:
			name_norm = module.name() + '.yang'
		if file.filename != name_norm:
			with open(os.path.join(INVENTORY, user.username, name_norm), 'w') as schema_file:
				schema_file.write(module.print_mem(yang.LYS_OUT_YANG, 0))
			try:
				os.remove(path)
			except:
				pass
	except Exception:
		try:
			os.remove(path)
		except:
			pass
		return(json.dumps({'success': False}))

	return(json.dumps({'success': True}))


@auth.required()
def schemas_rm():
	session = auth.lookup(request.headers.get('lgui-Authorization', None))
	user = session['user']
	path = os.path.join(INVENTORY, user.username)

	key = request.get_json()
	if not key:
		raise NetopeerException('Invalid schema remove request.')

	schemas = __schemas_inv_load(path)
	try:
		schemas['schemas'].pop(key)
	except KeyError:
		# schema not in inventory
		return (json.dumps({'success': False}))

	# update the inventory database
	__schemas_inv_save(path, schemas)

	# remove the schema file
	try:
		os.remove(os.path.join(path, key))
	except Exception as e:
		print(e)

	# TODO: resolve dependencies ?

	return(json.dumps({'success': True}))
