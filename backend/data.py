"""
NETCONF data helper functions
File: data.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

import json
import os

import libyang as ly
import netconf2 as nc

def dataInfoNode(node, recursion=False):
	schema = node.schema()
	casted = node.subtype()

	if node.dflt():
		return None

	info = {}
	info["type"] = schema.nodetype()
	info["module"] = schema.module().name()
	info["name"] = schema.name()
	info["dsc"] = schema.dsc()
	info["config"] = True if schema.flags() & ly.LYS_CONFIG_W else False

	result = {}
	if info["type"] == ly.LYS_LEAF or info["type"] == ly.LYS_LEAFLIST:
		result["value"] = casted.value_str()
	elif recursion:
		result["children"] = []
		if node.child():
			for child in node.child().tree_for():
				childNode = dataInfoNode(child, True)
				if not childNode:
					continue
				if not child.next():
					childNode["last"] = True
				result["children"].append(childNode)
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
			childNode = dataInfoNode(child, recursion)
			if not childNode:
				continue
			if not child.next():
				childNode["last"] = True
			result["children"].append(childNode)

	return(json.dumps({'success': True, 'data': result}))


def dataInfoRoots(data, recursion=False):
	result = []
	for root in data.tree_for():
		rootNode = dataInfoNode(root, recursion)
		if not rootNode:
			continue
		if not root.next():
			rootNode["last"] = True
		result.append(rootNode)

	return(json.dumps({'success': True, 'data': result}))