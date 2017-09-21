"""
Manipulation with the devices to connect.
File: devices.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

from liberouterapi import auth, config
from flask import request
import json
import os
import errno

from .inventory import INVENTORY, inventory_check
from .error import NetopeerException

__DEVICES_EMPTY = '{"device":[]}'


def __devices_init():
	return json.loads(__DEVICES_EMPTY)

def __devices_inv_load(path):
	devicesinv_path = os.path.join(path, 'devices.json')
	try:
		with open(devicesinv_path, 'r') as devices_file:
			devices = json.load(devices_file)
	except OSError as e:
		if e.errno == errno.ENOENT:
			devices = __devices_init()
		else:
			raise NetopeerException('Unable to use user\'s devices inventory ' + devicesinv_path + ' (' + str(e) + ').')
	except ValueError:
		devices = __devices_init()

	return devices

def __devices_inv_save(path, devices):
	devicesinv_path = os.path.join(path, 'devices.json')

	#store the list
	try:
		with open(devicesinv_path, 'w') as devices_file:
			json.dump(devices, devices_file)
	except Exception:
		pass

	return devices

@auth.required()
def devices_list():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	path = os.path.join(INVENTORY, user.username)
	
	inventory_check(path)
	devices = __devices_inv_load(path)
	
	return(json.dumps(devices['device']))

@auth.required()
def devices_add():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	path = os.path.join(INVENTORY, user.username)

	device = request.get_json()
	if not device or not device['id']:
		raise NetopeerException('Invalid device remove request.')

	devices = __devices_inv_load(path)
	for dev in devices['device']:
		if dev['id'] == device['id']:
			return (json.dumps({'success': False}))

	device_json = {'id':device['id'], 'hostname':device['hostname'], 'port':device['port']}
	if 'username' in device:
		device_json['username'] = device['username']
		if 'password' in device:
			device_json['password'] = device['password']
	devices['device'].append(device_json)

	#store the list
	__devices_inv_save(path, devices)

	return(json.dumps({'success': True}))

@auth.required()
def devices_rm():
	session = auth.lookup(request.headers.get('Authorization', None))
	user = session['user']
	path = os.path.join(INVENTORY, user.username)

	rm_id = request.get_json()['id']
	if not rm_id:
		raise NetopeerException('Invalid device remove request.')

	devices = __devices_inv_load(path)
	for i in range(len(devices['device'])):
		device = devices['device'][i]
		if device['id'] == rm_id:
			devices['device'].pop(i)
			device = None
			break;

	if device:
		# device not in inventory
		return (json.dumps({'success': False}))

	# update the inventory database
	__devices_inv_save(path, devices)

	return(json.dumps({'success': True}))

def devices_get(device_id, username):
	path = os.path.join(INVENTORY, username)
	devices = __devices_inv_load(path)

	for i in range(len(devices['device'])):
		device = devices['device'][i]
		if device['id'] == device_id:
			return device

	return None