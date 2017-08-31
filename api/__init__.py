"""
Netopeer2 GUI backend
File: __init__.py
Author: Radek Krejci <rkrejci@cesnet.cz>

Backend initialization via liberouter GUI.
"""

from liberouterapi import app, config
from ..module import Module

# Get Netopeer backend config
config.load(path = __path__[0] + '/config.ini')

# Register a blueprint
module_bp = Module('netopeer', __name__, url_prefix = '/netopeer', no_version = True)

from .schemas import *

module_bp.add_url_rule('/inventory/schemas/list', view_func = schemas_list, methods=['GET'])
module_bp.add_url_rule('/inventory/schemas', view_func = schemas_add, methods=['POST'])
