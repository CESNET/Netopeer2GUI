"""
Device database manipulation
File: devices.py
Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
"""

import json
from flask import request
from bson.objectid import ObjectId
# import netconf2 as nc


def get_saved_devices(username, db_coll):
    list = []
    for item in db_coll.find({'owner': username}):
        item['_id'] = str(item['_id'])
        item['id'] = str(item['_id'])
        list.append(item)
    return list


def add_device(username, device, db_coll):
    device['owner'] = username
    # Check if device parameter has all required keys
    if all (k in device for k in ('hostname', 'port', 'username')):
        return str(db_coll.insert_one(device).inserted_id)
    return False


def get_device_by_id(device_id: str, db_coll):
    device = db_coll.find_one({'_id': ObjectId(device_id)})
    if device is not None:
        device['_id'] = str(device['_id'])
        device['id'] = str(device['_id'])
    return device


def update_device(device_id, update_dict, db_coll):
    db_coll.update_one({'_id': ObjectId(device_id)}, {'$set': update_dict})


def update_hexa(device_id, new_hexa, db_coll):
    db_coll.update_one({'_id': ObjectId(device_id)}, {'$set': {'fingerprint': new_hexa}})


def update_hexa_by_device(device, new_hexa, db_coll):
    db_coll.update_one({'hostname': device['hostname'], 'port': device['port'], 'username': device['username']},
                       {'$set': {'fingerprint': new_hexa}})


def get_device_from_session_data(host, port, owner, username, db_coll):
    print(host)
    device = db_coll.find_one({'hostname': host, 'port': port, 'owner': owner, 'username': username})
    if device is None and host == '127.0.0.1':
        device = db_coll.find_one({'hostname': 'localhost', 'port': port, 'owner': owner, 'username': username})
    if device is not None:
        device['_id'] = str(device['_id'])
        device['id'] = str(device['_id'])
    return device
