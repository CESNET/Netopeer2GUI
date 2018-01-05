"""
NETCONF data helper functions
File: data.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

import json
import os

import libyang as ly
import netconf2 as nc

def dataInfoNode(node, parent=None, recursion=False):
	schema = node.schema()
	casted = node.subtype()

	if node.dflt():
		return None

	if parent and schema.nodetype() == ly.LYS_LEAFLIST:
		# find previous instance and just add value
		for child in parent["children"]:
			if child["info"]["name"] == schema.name():
				child["value"].append(casted.value_str())
				if not node.next():
					child["last"] = True
				return None

	info = {}
	info["type"] = schema.nodetype()
	info["module"] = schema.module().name()
	info["name"] = schema.name()
	info["dsc"] = schema.dsc()
	info["config"] = True if schema.flags() & ly.LYS_CONFIG_W else False

	result = {}
	if info["type"] == ly.LYS_LEAF:
		result["value"] = casted.value_str()
	elif info["type"] == ly.LYS_LEAFLIST:
		result["value"] = [casted.value_str()]
	elif recursion:
		result["children"] = []
		if node.child():
			for child in node.child().tree_for():
				childNode = dataInfoNode(child, result, True)
				if not childNode:
					continue
				if not child.next():
					childNode["last"] = True
				result["children"].append(childNode)

		if info["type"] == ly.LYS_LIST:
			result["keys"] = []
			index = 0
			for key in schema.subtype().keys():
				if len(result["children"]) <= index:
					break
				if key.subtype().name() == result["children"][index]["info"]["name"]:
					result["keys"].append(result["children"][index]["value"])
					result["children"][index]["info"]["key"] = True
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
			if not child.next():
				childNode["last"] = True
			result["children"].append(childNode)

	return(json.dumps({'success': True, 'data': result}))


def dataInfoRoots(data, recursion=False):
	top = {}
	top["children"] = []
	for root in data.tree_for():
		rootNode = dataInfoNode(root, top, recursion)
		if not rootNode:
			continue
		if not root.next():
			rootNode["last"] = True
		top["children"].append(rootNode)

	return(json.dumps({'success': True, 'data': top["children"]}))