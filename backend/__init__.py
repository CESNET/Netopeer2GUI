"""
Netopeer2 GUI backend
File: __init__.py
Author: Radek Krejci <rkrejci@cesnet.cz>

Backend initialization via liberouter GUI.
"""

from liberouterapi import config, modules

# Get Netopeer backend config
config.load(path = __path__[0] + '/config.ini')

# Register a blueprint
module_bp = modules.module.Module('netopeer', __name__, url_prefix = '/netopeer', no_version = True)

from .schemas import *
from .devices import *
from .connections import *

module_bp.add_url_rule('/inventory/schemas/list', view_func = schemas_list, methods=['GET'])
module_bp.add_url_rule('/inventory/schemas', view_func = schemas_add, methods=['POST'])
module_bp.add_url_rule('/inventory/schemas', view_func = schemas_rm, methods = ['DELETE'])
module_bp.add_url_rule('/inventory/devices/list', view_func = devices_list, methods=['GET'])
module_bp.add_url_rule('/inventory/devices', view_func = devices_add, methods=['POST'])
module_bp.add_url_rule('/inventory/devices', view_func = devices_rm, methods = ['DELETE'])
module_bp.add_url_rule('/session', view_func = connect, methods=['POST'])
module_bp.add_url_rule('/session', view_func = session_close, methods = ['DELETE'])
module_bp.add_url_rule('/session/alive', view_func = session_alive, methods=['GET'])
module_bp.add_url_rule('/session/capabilities', view_func = session_get_capabilities, methods=['GET'])
module_bp.add_url_rule('/session/rpcGet', view_func = session_get, methods=['GET'])
module_bp.add_url_rule('/session/commit', view_func = session_commit, methods = ['POST'])
module_bp.add_url_rule('/session/element/checkvalue', view_func = data_checkvalue, methods = ['GET'])
module_bp.add_url_rule('/session/schema', view_func = schema_info, methods = ['GET'])
module_bp.add_url_rule('/session/schema/checkvalue', view_func = schema_checkvalue, methods = ['GET'])
