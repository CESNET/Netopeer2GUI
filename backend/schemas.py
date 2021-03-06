"""
Manipulation with the YANG schemas.
File: schemas.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

import json
import os
import logging
import errno
import time
from subprocess import check_output
from shutil import copy

from liberouterapi import socketio, auth
from flask import request
from eventlet.timeout import Timeout
import yang

from .inventory import INVENTORY, inventory_check
from .socketio import  sio_send, sio_wait, sio_clean
from .error import NetopeerException

log = logging.getLogger(__name__)

__SCHEMAS_EMPTY = '{"timestamp":0, "schemas":{}}'

def make_schema_key(module):
	result = module.name()
	if module.rev_size():
		result = result + '@' + module.rev().date() + '.yang'
	return result


def getschema(name, revision, submod_name, submod_revision, priv):
	# ask frontend/user for missing schema
	params = {'id': priv['session_id'], 'name' : name, 'revision' : revision, 'submod_name' : submod_name, 'submod_revision' : submod_revision}
	socketio.emit('getschema', params, callback = sio_send)
	result = (None, None)
	timeout = Timeout(300)
	try:
		# wait for response from the frontend
		data = sio_wait(priv['session_id'])
		if data['filename'].lower()[len(data['filename']) - 5:] == '.yang':
			format = yang.LYS_IN_YANG
		elif data['filename'].lower()[len(data['filename']) - 4:] == '.yin':
			format = yang.LYS_IN_YIN
		else:
			return result
		result = (format, data['data'])
	except Timeout:
		# no response received within the timeout
		log.info("socketio: getschema timeout.")
	except (KeyError, AttributeError) as e:
		# invalid response
		log.error(e)
		log.error("socketio: invalid getschema_result received.")
	finally:
		# we have the response
		sio_clean(priv['session_id'])
		timeout.cancel()

		# store the received file
		try:
			with open(os.path.join(INVENTORY, priv['user'].username, data['filename']), 'w') as schema_file:
				schema_file.write(data['data'])
		except Exception as e:
			log.error(e)
			pass

	return result


def __schema_parse(path, format, session):
	try:
		ctx = yang.Context(os.path.dirname(path), yang.LY_CTX_PREFER_SEARCHDIRS)
		ctx.set_module_imp_clb(getschema, session)
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


def schemas_update(session):
	user = session['user']
	path = os.path.join(INVENTORY, user.username)
	inventory_check(path)

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
				module = __schema_parse(schemapath, format, session)
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
				os.remove(schemapath)
				continue

	#store the list
	__schemas_inv_save(path, schemas)

	# return the up-to-date list
	return schemas['schemas']


@auth.required()
def schemas_list():
	session = auth.lookup(request.headers.get('lgui-Authorization', None))

	schemas = schemas_update(session)

	result = []
	for key in schemas:
		if 'revision' in schemas[key]:
			result.append({'key':key, 'name':schemas[key]['name'], 'revision':schemas[key]['revision']})
		else:
			result.append({'key':key, 'name':schemas[key]['name']})

	return(json.dumps(result, sort_keys = True))


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
			if (not 'type' in req) or req['type'] == 'text':
				# default (text) representation
				with open(os.path.join(path, key), 'r') as schema_file:
					data = schema_file.read()
			else:
				if req['type'] == 'tree':
					# build tree representation for frontend
					target = None
				elif req['type'] == 'tree-identity':
					target = 'identity' + req['path']
				elif req['type'] == 'tree-typedef':
					target = 'typedef' + req['path']
				elif req['type'] == 'tree-grouping':
					target = 'grouping' + req['path']
				elif req['type'] == 'tree-node':
					target = req['path']
				elif req['type'] == 'tree-type':
					target = 'type' + req['path']
				elif req['type'] == 'tree-feature':
					target = 'feature' + req['path']
				else:
					return(json.dumps({'success': False, 'error-msg': 'Unsupported schema format ' + req['type']}))

				try:
					ctx = yang.Context(path)
					module = ctx.parse_module_path(os.path.join(path, key), yang.LYS_IN_YANG)
					data = json.loads(module.print_mem(yang.LYS_OUT_JSON, target, 0))
				except Exception as e:
					return(json.dumps({'success': False, 'error-msg':str(e)}))

			if 'revision' in schemas['schemas'][key]:
				return(json.dumps({'success': True, 'data': data, 'name':schemas['schemas'][key]['name'],
								 'revision':schemas['schemas'][key]['revision']}, ensure_ascii = False))
			else:
				return(json.dumps({'success': True, 'data': data, 'name':schemas['schemas'][key]['name']}, ensure_ascii = False))
		except Exception as e:
			return(json.dumps({'success': False, 'error-msg':str(e)}));
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
		module = __schema_parse(path, format, session)

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
