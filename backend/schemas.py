# coding=utf-8
"""
YANG schema manipulation
File: devices.py

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

from liberouterapi import socketio, auth
import netconf2 as nc
import json
from eventlet.timeout import Timeout
from flask import request
import logging
from .sockets import *
import os
import yang

log = logging.getLogger(__name__)


def get_all_schema_names(username):
    site_root = os.path.realpath(os.path.dirname(__file__))
    try:
        return [
            file for file in os.listdir(os.path.join(site_root, 'userfiles', username))
            if os.path.splitext(file)[1] == '.yang' or os.path.splitext(file)[1] == '.yin'
        ]
    except FileNotFoundError:
        return []


def get_schema_detail(username, schema):
    if os.path.splitext(schema)[1] == '.yang' or os.path.splitext(schema)[1] == '.yin':
        site_root = os.path.realpath(os.path.dirname(__file__))
        try:
            with open(os.path.join(site_root, 'userfiles', username, schema), 'r') as f:
                return f.read()
        except FileNotFoundError:
            return "Requested schema not found"
    else:
        return "Only files with .yang or .yin extension can be displayed"


def get_schema_json(username, schema, session, path=None):
    format = yang.LYS_IN_UNKNOWN
    module = None
    site_root = os.path.realpath(os.path.dirname(__file__))
    try:
        ctx = yang.Context(os.path.join(site_root, 'userfiles', username), yang.LY_CTX_PREFER_SEARCHDIRS)
        ctx.set_module_imp_clb(get_schema, session)
    except Exception as e:
        return {'success': False, 'code': 500, 'message': str(e)}

    try:
        module = ctx.parse_module_path(os.path.join(site_root, 'userfiles', username, schema),
                                       yang.LYS_IN_YANG if format == yang.LYS_IN_UNKNOWN else format)
    except Exception as e:
        if format == yang.LYS_IN_UNKNOWN:
            try:
                module = ctx.parse_module_path(os.path.join(site_root, 'userfiles', username, schema),
                                               yang.LYS_IN_YIN)
            except Exception as e:
                return {'success': False, 'code': 500, 'message': str(e)}
        else:
            return {'success': False, 'code': 500, 'message': str(e)}
    return json.loads(module.print_mem(yang.LYS_OUT_JSON, path, 0))


def remove_schema(username, schema):
    site_root = os.path.realpath(os.path.dirname(__file__))
    path = os.path.join(site_root, 'userfiles', username, schema)
    if os.path.exists(path):
        try:
            os.remove(path)
            return True
        except Exception:
            return false
    else:
        return False


def get_schema(name, revision, submod_name, submod_revision, priv):
    global log
    # ask frontend/user for missing schema
    params = {'id': priv['session_id'], 'name': name, 'revision': revision, 'submod_name': submod_name,
              'submod_revision': submod_revision}
    socketio.emit('getschema', params, callback=sio_send)
    result = (None, None)
    timeout = Timeout(300)
    data = None
    try:
        # wait for response from the frontend
        data = sio_wait(priv['session_id'])
        if data['filename'].lower()[len(data['filename']) - 5:] == '.yang':
            format = yang.LYS_IN_YANG
            pass
        elif data['filename'].lower()[len(data['filename']) - 4:] == '.yin':
            format = yang.LYS_IN_YIN
            pass
        else:
            return result
        result = (format, data['data'])
    except Timeout:
        # no response received within the timeout
        print("socketio: getschema timeout.")
    except (KeyError, AttributeError) as e:
        # invalid response
        print(e)
        print("socketio: invalid getschema_result received.")
    finally:
        # we have the response
        sio_clean(priv['session_id'])
        timeout.cancel()

        # store the received file
        try:
            site_root = os.path.realpath(os.path.dirname(__file__))
            path = os.path.join(site_root, 'userfiles', priv['user'].username, data['filename'])
            if not os.path.exists(os.path.dirname(path)):
                try:
                    os.makedirs(os.path.dirname(path))
                except OSError as exc:  # Guard against race condition
                    if exc.errno != errno.EEXIST:
                        raise
            with open(path, 'w+') as schema_file:
                schema_file.write(data['data'])
        except Exception as e:
            log.error(e)
            print(e)
    return result
