"""
HTTP request handling
File: connections.py
Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
"""

from liberouterapi import db, auth, config, socketio
from liberouterapi.dbConnector import dbConnector
import json

from .profiles import *
from .devices import *
from .schemas import *

"""
DB connection setup
"""
netconf_db = dbConnector('netconf', provider='mongodb', config={'database': config['netconf']['database']})
netconf_coll = netconf_db.db[config['netconf']['collection']]

"""
Helpers
"""


@auth.required()
def get_username_from_session():
    session = auth.lookup(request.headers.get('lgui-Authorization', None))
    return session['user'].username


"""
Devices
"""


@auth.required()
def devices_get():
    return json.dumps(get_saved_devices(get_username_from_session(), netconf_coll))


@auth.required()
def device_add():
    data = request.json
    device = data['device']
    return json.dumps({'id': add_device(get_username_from_session(), device, netconf_coll)})


"""
Profiles
"""


@auth.required()
def activate_profile():
    data = request.json
    name = data['profile']
    if set_active_profile(get_username_from_session(), name):
        return json.dumps({'success': True, 'code': 200})
    else:
        return json.dumps({'success': False, 'code': 500})


@auth.required()
def profiles():
    return json.dumps(get_profile_names(get_username_from_session()))


@auth.required()
def profile_add():
    data = request.json
    name = data['profile']
    if add_profile(get_username_from_session(), name):
        return json.dumps({'success': True, 'code': 200})
    else:
        return json.dumps({'success': False, 'code': 500})


@auth.required()
def profile_get(profile_name):
    return json.dumps(get_profile_devices(get_username_from_session(), profile_name, netconf_coll))


@auth.required()
def profile_remove():
    data = request.json
    name = data['profile']
    if remove_profile(get_username_from_session(), name):
        return json.dumps({'success': True, 'code': 200})
    else:
        return json.dumps({'success': False, 'code': 500})


@auth.required()
def profile_on_login():
    return json.dumps(get_on_login_profile(get_username_from_session(), netconf_coll))


@auth.required()
def profile_set():
    data = request.json
    val = data['value']
    profile = data['profile']
    if set_profile_devices(get_username_from_session(), profile, val):
        return json.dumps({'success': True, 'code': 200})
    else:
        return json.dumps({'success': False, 'code': 500})


@auth.required()
def profile_set_connect_on_login():
    data = request.json
    profile = data['profile']
    value = data['value']
    if set_connect_on_login(get_username_from_session(), profile, value):
        return json.dumps({'success': True, 'code': 200})
    else:
        return json.dumps({'success': False, 'code': 500})


"""
Schemas
"""


@auth.required()
def schemas_get_all():
    return json.dumps(get_all_schema_names(get_username_from_session()))


@auth.required()
def schema_get(name):
    return json.dumps(get_schema_detail(get_username_from_session(), name))


@auth.required()
def schema_get_parsed(name):
    req = request.args.to_dict()
    if 'session' not in req:
        return json.dumps({'success': False, 'code': 500, 'message': 'Missing session key'})
    if 'path' in req:
        return json.dumps(get_schema_json(get_username_from_session(), name, req['session'], req['path']))
    else:
        return json.dumps(get_schema_json(get_username_from_session(), name, req['session']))

