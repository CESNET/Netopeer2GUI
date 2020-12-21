# coding=utf-8
"""
Netconf session operations
File: netconf.py
Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>


Parts of this file was taken from the Netopeer2GUI project by Radek Krejčí
Available here: https://github.com/CESNET/Netopeer2GUI

  Copyright 2017 Radek Krejčí

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
"""

from liberouterapi import db, auth, config, socketio
from liberouterapi.dbConnector import dbConnector
import netconf2 as nc
import json
from eventlet.timeout import Timeout
from flask import request
import logging
from .sockets import *
import os
import yang
from .schemas import get_schema
from .devices import *
from .data import *
import pprint

sessions = {}
log = logging.getLogger(__name__)
netconf_db = dbConnector('netconf', provider='mongodb', config={'database': config['netconf']['database']})
netconf_coll = netconf_db.db[config['netconf']['collection']]

"""
netconf session (ncs)
static PyGetSetDef ncSessionGetSetters[] = {
    {"id", (getter)ncSessionGetId, NULL, "NETCONF Session id.", NULL},
    {"host", (getter)ncSessionGetHost, NULL, "Host where the NETCONF Session is connected.", NULL},
    {"port", (getter)ncSessionGetPort, NULL, "Port number where the NETCONF Session is connected.", NULL},
    {"user", (getter)ncSessionGetUser, NULL, "Username of the user connected with the NETCONF Session.", NULL},
    {"transport", (getter)ncSessionGetTransport, NULL, "Transport protocol used for the NETCONF Session.", NULL},
    {"version", (getter)ncSessionGetVersion, NULL, "NETCONF Protocol version used for the NETCONF Session.", NULL},
    {"capabilities", (getter)ncSessionGetCapabilities, NULL, "Capabilities of the NETCONF Session.", NULL},
    {"context", (getter)ncSessionGetContext, NULL, "libyang context of the NETCONF Session.", NULL},
    {NULL} /* Sentinel */
};
"""


def auth_common(session_id):
    global log
    result = None
    timeout = Timeout(60)
    try:
        # wait for response from the frontend
        data = sio_wait(session_id)
        result = data['password']
    except Timeout:
        # no response received within the timeout
        log.info("socketio: auth request timeout.")
    except KeyError:
        # no password
        log.info("socketio: invalid credential data received.")
    finally:
        # we have the response
        sio_clean(session_id)
        timeout.cancel()

    return result


def auth_interactive(name, instruction, prompt, priv):
    try:
        pp = pprint.PrettyPrinter(indent=4)
        pp.pprint(priv)
        params = {'id': priv['id'], 'type': name, 'msg': instruction, 'prompt': prompt, 'device': priv['device']}
        sio_emit('device_auth', params)
        return auth_common(priv)
    except Exception as e:
        print(e)


def auth_password(username, hostname, priv):
    sio_emit('device_auth', {'id': priv, 'type': 'Password Authentication', 'msg': username + '@' + hostname})
    return auth_common(priv)


@auth.required()
def connect_device():
    global sessions
    session = auth.lookup(request.headers.get('lgui-Authorization', None))
    username = str(session['user'].username)
    data = request.get_json()

    nc.setSchemaCallback(get_schema, session)
    site_root = os.path.realpath(os.path.dirname(__file__))
    path = os.path.join(site_root, 'userfiles', username)
    if not os.path.exists(path):
        os.makedirs(path)
    nc.setSearchpath(path)
    if 'password' in data and data['password'] != '':
        ssh = nc.SSH(data['username'], password=data['password'])
    else:
        ssh = nc.SSH(data['username'])
        ssh.setAuthPasswordClb(auth_password, session['session_id'])
        ssh.setAuthInteractiveClb(func=auth_interactive, priv={'id': session['session_id'], 'device': data})

    ssh.setAuthHostkeyCheckClb(hostkey_check, {'session': session, 'device': data})

    try:
        ncs = nc.Session(data['hostname'], int(data['port']), ssh)
    except Exception as e:
        nc.setSchemaCallback(None)
        return json.dumps({'success': False, 'code': 500, 'message': str(e)})
    nc.setSchemaCallback(None)

    if username not in sessions:
        sessions[username] = {}

    # use key (as hostname:port:session-id) to store the created NETCONF session
    key = ncs.host + ":" + str(ncs.port) + ":" + ncs.id
    sessions[username][key] = {}
    sessions[username][key]['session'] = ncs

    # update inventory's list of schemas
    # schemas_update(session)

    return json.dumps({'success': True, 'session-key': key})


def hostkey_check(hostname, state, keytype, hexa, priv):
    if 'fingerprint' in priv['device']:
        # check according to the stored fingerprint from previous connection
        if hexa == priv['device']['fingerprint']:
            return True
        elif state != 2:
            log.error("Incorrect host key state")
            state = 2

        # ask frontend/user for hostkey check
    params = {'id': priv['session']['session_id'], 'hostname': hostname, 'state': state, 'keytype': keytype,
              'hexa': hexa, 'device': priv['device']}
    sio_emit('hostcheck', params)

    result = False
    timeout = Timeout(30)
    try:
        # wait for response from the frontend
        data = sio_wait(priv['session']['session_id'])
        result = data['result']
    except Timeout:
        # no response received within the timeout
        log.info("socketio: hostcheck timeout.")
    except KeyError:
        # invalid response
        log.error("socketio: invalid hostcheck_result received.")
    finally:
        # we have the response
        sio_clean(priv['session']['session_id'])
        timeout.cancel()

    if result:
        # store confirmed fingerprint for future connections
        priv['device']['fingerprint'] = hexa
        if 'id' in priv['device'].keys():
            update_hexa(priv['device']['id'], hexa, netconf_coll)
        else:
            update_hexa_by_device(priv['device'], hexa, netconf_coll)
    return result


""" SESSION HANDLING """


@auth.required()
def sessions_get_open():
    """
    Get all open sessions belonging to the user
    :return: Array of session keys and devices belonging to sessions. Device names will not be loaded.
    """
    global sessions
    session = auth.lookup(request.headers.get('lgui-Authorization', None))
    username = str(session['user'].username)

    if username in sessions:
        result = []
        for key in sessions[username].keys():
            ncs = sessions[username][key]['session']
            device = get_device_from_session_data(ncs.host, ncs.port, username, ncs.user, netconf_coll)
            if device is not None:
                result.append({'key': key, 'device': device})
        return json.dumps(result)
    else:
        return json.dumps([])


@auth.required()
def session_alive(key):
    global sessions
    session = auth.lookup(request.headers.get('lgui-Authorization', None))
    username = str(session['user'].username)

    if not username in sessions:
        sessions[username] = {}

    if key in sessions[username]:
        return json.dumps({'success': True, 'code': 200})
    else:
        return json.dumps({'success': False, 'code': 404, 'message': 'Session not found'})


@auth.required()
def session_destroy(key):
    global sessions
    session = auth.lookup(request.headers.get('lgui-Authorization', None))
    username = str(session['user'].username)
    if not username in sessions:
        sessions[username] = {}

    if key in sessions[username]:
        del sessions[username][key]
        return json.dumps({'success': True, 'code': 200})
    else:
        return json.dumps({'success': False, 'code': 404, 'message': 'Session not found'})


@auth.required()
def session_destroy_all():
    global sessions
    session = auth.lookup(request.headers.get('lgui-Authorization', None))
    username = str(session['user'].username)
    if username in sessions:
        del sessions[username]
    return json.dumps({'success': True, 'code': 200})


@auth.required()
def session_rpc_get():
    """
    code 500: wrong argument
    code 404: session invalid -> try reconnecting
    code 410: connection gone -> remove session, try reconnecting
    code 418: Error in processing netconf request (nothing to do with a teapot)
    """
    global sessions
    session = auth.lookup(request.headers.get('lgui-Authorization', None))
    username = str(session['user'].username)
    req = request.args.to_dict()
    if 'key' not in req:
        return json.dumps({'success': False, 'code': 500, 'message': 'Missing session key.'})
    if 'recursive' not in req:
        return json.dumps({'success': False, 'code': 500, 'message': 'Missing recursive flag.'})

    if username not in sessions:
        sessions[username] = {}

    key = req['key']
    if key not in sessions[username]:
        return json.dumps({'success': False, 'code': 404, 'message': 'Invalid session key.'})

    try:
        sessions[username][key]['data'] = sessions[username][key]['session'].rpcGet()
    except ConnectionError as e:
        del sessions[username][key]
        return json.dumps({'success': False, 'code': 410, 'message': str(e)})
    except nc.ReplyError as e:
        err_list = []
        for err in e.args[0]:
            err_list.append(str(err))
        return json.dumps({'success': False, 'code': 418, 'message': str(e)})

    if 'path' not in req:
        return data_info_roots(sessions[username][key]['data'], True if req['recursive'] == 'true' else False)
    else:
        return data_info_subtree(sessions[username][key]['data'], req['path'],
                                 True if req['recursive'] == 'true' else False)


@auth.required()
def session_commit():
    session = auth.lookup(request.headers.get('lgui-Authorization', None))
    user = session['user']

    req = request.get_json(keep_order=True)
    if 'key' not in req:
        return json.dumps({'success': False, 'code': 500, 'message': 'Missing session key.'})
    if 'modifications' not in req:
        return json.dumps({'success': False, 'code': 500, 'message': 'Missing modifications.'})

    mods = req['modifications']
    ctx = sessions[user.username][req['key']]['session'].context
    root = None
    reorders = []
    for key in mods:
        recursion = False
        # get correct path and value if needed
        path = mods[key]['data']['path']
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
            try:
                root = yang.Data_Node(ctx, path, value, 0, 0)
            except Exception as e:
                print(e)
                return json.dumps({'success': False, 'code': 404, 'message': str(e)})
        node = root.find_path(path).data()[0]

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
            return json.dumps({'success': False, 'error-msg': 'Invalid modification ' + key})

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
        except Exception as e:
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
        reply = {'success': False, 'code': 500, 'message': '[]'}
        for err in e.args[0]:
            reply['message'] += str(err) + '; '
        return json.dumps(reply)

    return json.dumps({'success': True})


def _create_child(ctx, parent, child_def):
    at = child_def['info']['module'].find('@')
    if at == -1:
        module = ctx.get_module(child_def['info']['module'])
    else:
        module = ctx.get_module(child_def['info']['module'][:at], child_def['info']['module'][at + 1:])
    if child_def['info']['type'] == 4:
        yang.Data_Node(parent, module, child_def['info']['name'], child_def['value'])
    elif child_def['info']['type'] == 8:
        yang.Data_Node(parent, module, child_def['info']['name'], child_def['value'][0])
    else:
        child = yang.Data_Node(parent, module, child_def['info']['name'])
        if 'children' in child_def:
            for grandchild in child_def['children']:
                _create_child(ctx, child, grandchild)
