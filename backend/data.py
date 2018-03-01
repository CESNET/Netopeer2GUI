"""
NETCONF data helper functions
File: data.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

import json
import os

import yang
import netconf2 as nc

def infoBuiltInType(base):
	return {
		- 1 : 'error',
		 0 : 'derived',
		 1 : 'binary',
		 2 : 'bits',
		 3 : 'boolean',
		 4 : 'decimal64',
		 5 : 'empty',
		 6 : 'enumeration',
		 7 : 'identityref',
		 8 : 'instance-identifier',
		 9 : 'leafref',
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


def schemaInfoType(schema, info):
	info["datatype"] = schema.type().der().name()
	info["datatypebase"] = infoBuiltInType(schema.type().base())


def typeValues(type, result):
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

def schemaInfoNode(schema):
	info = {}

	info["type"] = schema.nodetype()
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
		schemaInfoType(schema.subtype(), info)
		info["key"] = False if schema.subtype().is_key() == -1 else True
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
		schemaInfoType(schema.subtype(), info)
	elif info["type"] == yang.LYS_LIST:
		info["keys"] = []
		for key in schema.subtype().keys():
			info["keys"].append(key.name())

	return info


def _sortChildren(node):
	sorted = []
	for index, item in enumerate(node["children"]):
		sorted.append(item)
		if item["info"]["type"] == yang.LYS_LIST:
			removed = 0
			for i, instance in enumerate(node["children"][index + 1:]):
				if item["info"]["name"] == instance["info"]["name"] and item["info"]["module"] == instance["info"]["module"]:
					sorted.append(node["children"].pop(index + 1 + i - removed))
					removed += 1;
		if item["info"]["type"] == yang.LYS_LEAFLIST:
			lastLeafList = len(sorted) - 1
			item["first"] = True
			removed = 0
			for i, instance in enumerate(node["children"][index + 1:]):
				if item["info"]["name"] == instance["info"]["name"] and item["info"]["module"] == instance["info"]["module"]:
					instance["first"] = False
					sorted.append(node["children"].pop(index + 1 + i - removed))
					removed += 1;
	node["children"] = sorted
	last = node["children"][len(node["children"]) - 1]
	if last["info"]["type"] == yang.LYS_LEAFLIST:
		node["children"][lastLeafList]["last"] = True
		for item in node["children"][lastLeafList + 1:]:
			item["lastLeafList"] = True;
	else:
		last["last"] = True


def dataInfoNode(node, parent=None, recursion=False):
	schema = node.schema()
	casted = node.subtype()

	if node.dflt():
		return None

	info = schemaInfoNode(schema);

	result = {}
	if info["type"] == yang.LYS_LEAF or info["type"] == yang.LYS_LEAFLIST:
		result["value"] = casted.value_str()
	elif recursion:
		result["children"] = []
		if node.child():
			for child in node.child().tree_for():
				childNode = dataInfoNode(child, result, True)
				if not childNode:
					continue
				result["children"].append(childNode)
			# sort list instances
			_sortChildren(result)
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

def dataInfoSubtree(data, path, recursion=False):
	try:
		node = data.find_path(path).data()[0]
	except:
		return(json.dumps({'success': False, 'error-msg': 'Invalid data path.'}))

	result = dataInfoNode(node)
	if not result:
		return(json.dumps({'success': False, 'error-msg': 'Path refers to a default node.'}))

	result["children"] = []
	if node.child():
		for child in node.child().tree_for():
			childNode = dataInfoNode(child, result, recursion)
			if not childNode:
				continue
			result["children"].append(childNode)
		_sortChildren(result)

	return(json.dumps({'success': True, 'data': result}))


def dataInfoRoots(data, recursion=False):
	top = {}
	top["children"] = []
	for root in data.tree_for():
		rootNode = dataInfoNode(root, top, recursion)
		if not rootNode:
			continue
		top["children"].append(rootNode)
	_sortChildren(top)
	return(json.dumps({'success': True, 'data': top["children"]}))
