"""
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

import json
import os

import yang
import netconf2 as nc


def info_built_in_type(base):
    return {
        - 1: 'error',
        0: 'derived',
        1: 'binary',
        2: 'bits',
        3: 'boolean',
        4: 'decimal64',
        5: 'empty',
        6: 'enumeration',
        7: 'identityref',
        8: 'instance-identifier',
        9: 'leafref',
        10: 'string',
        11: 'union',
        12: 'int8',
        13: 'uint8',
        14: 'int16',
        15: 'uint16',
        16: 'int32',
        17: 'uint32',
        18: 'int64',
        19: 'uint64',
    }[base]


def make_schema_key(module):
    result = module.name()
    if module.rev_size():
        result = result + '@' + module.rev().date() + '.yang'
    return result


def schema_info_type(schema, info):
    info["datatype"] = schema.type().der().name()
    info["datatypebase"] = info_built_in_type(schema.type().base())


def type_values(type, result):
    while type.der():
        if type.base() == 2:
            # bits
            if type.info().bits().count():
                for bit in type.info().bits().bit():
                    result.append(bit.name())
        elif type.base() == 6:
            # enumeration
            if type.info().enums().count():
                for enm in type.info().enums().enm():
                    result.append(enm.name())
        else:
            return result
        type = type.der().type()

    return result


def schema_info_node(schema):
    info = {"type": schema.nodetype()}

    if schema.module().rev_size():
        info["module"] = schema.module().name() + '@' + schema.module().rev().date()
    else:
        info["module"] = schema.module().name()
    info["name"] = schema.name()
    info["dsc"] = schema.dsc()
    info["config"] = True if schema.flags() & yang.LYS_CONFIG_W else False
    if info["type"] == 1:
        info["presence"] = schema.subtype().presence()
    info["path"] = schema.path()

    if info["type"] == yang.LYS_LEAF:
        schema_info_type(schema.subtype(), info)
        info["key"] = False if schema.subtype().is_key() is None else True
        dflt = schema.subtype().dflt()
        if dflt:
            info["default"] = dflt
        else:
            tpdf = schema.subtype().type().der()
            while tpdf and not tpdf.dflt():
                tpdf = tpdf.type().der()
            if tpdf:
                info["default"] = tpdf.dflt()
    elif info["type"] == yang.LYS_LEAFLIST:
        schema_info_type(schema.subtype(), info)
        if schema.flags() & yang.LYS_USERORDERED:
            info["ordered"] = True
    elif info["type"] == yang.LYS_LIST:
        if schema.flags() & yang.LYS_USERORDERED:
            info["ordered"] = True
        info["keys"] = []
        for key in schema.subtype().keys():
            info["keys"].append(key.name())

    return info


def _sort_children(node):
    sorted = []
    last_leaf_list = 0
    for index, item in enumerate(node["children"]):
        sorted.append(item)
        if item["info"]["type"] == yang.LYS_LIST:
            removed = 0
            if "ordered" in item["info"]:
                item["order"] = removed
            for i, instance in enumerate(node["children"][index + 1:]):
                if item["info"]["name"] == instance["info"]["name"] and item["info"]["module"] == instance["info"][
                    "module"]:
                    sorted.append(node["children"].pop(index + 1 + i - removed))
                    removed += 1
                    if "ordered" in item["info"]:
                        instance["order"] = removed
        if item["info"]["type"] == yang.LYS_LEAFLIST:
            last_leaf_list = len(sorted) - 1
            item["first"] = True
            removed = 0
            if "ordered" in item["info"]:
                item["order"] = removed
            for i, instance in enumerate(node["children"][index + 1:]):
                if item["info"]["name"] == instance["info"]["name"] and item["info"]["module"] == instance["info"][
                    "module"]:
                    instance["first"] = False
                    sorted.append(node["children"].pop(index + 1 + i - removed))
                    removed += 1
                    if "ordered" in item["info"]:
                        instance["order"] = removed
    node["children"] = sorted
    last = node["children"][len(node["children"]) - 1]
    if last["info"]["type"] == yang.LYS_LEAFLIST:
        node["children"][last_leaf_list]["last"] = True
        for item in node["children"][last_leaf_list + 1:]:
            item["last_leaf_list"] = True;
    else:
        last["last"] = True


def data_info_node(node, parent=None, recursion=False):
    schema = node.schema()
    casted = node.subtype()

    if node.dflt():
        return None

    info = schema_info_node(schema)

    result = {}
    if info["type"] == yang.LYS_LEAF or info["type"] == yang.LYS_LEAFLIST:
        result["value"] = casted.value_str()
        if info["datatypebase"] == "identityref":
            info["refmodule"] = make_schema_key(casted.value().ident().module())
    elif recursion:
        result["children"] = []
        if node.child():
            for child in node.child().tree_for():
                child_node = data_info_node(child, result, True)
                if not child_node:
                    continue
                result["children"].append(child_node)
            # sort list instances
            _sort_children(result)
        if info["type"] == yang.LYS_LIST:
            result["keys"] = []
            index = 0
            for key in schema.subtype().keys():
                if len(result["children"]) <= index:
                    break
                if key.subtype().name() == result["children"][index]["info"]["name"]:
                    result["keys"].append(result["children"][index]["value"])
                index = index + 1
    result["info"] = info
    result["path"] = node.path()

    return result


def data_info_subtree(data, path, recursion=False):
    try:
        node = data.find_path(path).data()[0]
    except Exception:
        return json.dumps({'success': False, 'code': 500, 'message': 'Invalid data path.'})
    result = data_info_node(node)
    if not result:
        return json.dumps({'success': False, 'code': 500, 'message': 'Path refers to a default node.'})

    result["children"] = []
    if node.child():
        for child in node.child().tree_for():
            child_node = data_info_node(child, result, recursion)
            if not child_node:
                continue
            result["children"].append(child_node)
        _sort_children(result)

    return json.dumps({'success': True, 'code': 200, 'data': result})


def data_info_roots(data, recursion=False):
    top = {"children": []}
    for root in data.tree_for():
        root_node = data_info_node(root, top, recursion)
        if not root_node:
            continue
        if not recursion:
            rootNode['subtreeRoot'] = True
        top["children"].append(root_node)
    _sort_children(top)
    return json.dumps({'success': True, 'code': 200, 'data': top["children"]})
