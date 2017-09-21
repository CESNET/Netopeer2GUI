"""
Manipulation with the YANG schemas.
File: schemas.py
Author: Radek Krejci <rkrejci@cesnet.cz>
"""

import os
import errno

from liberouterapi import config

from .error import NetopeerException

INVENTORY = config.modules['netopeer']['usersdata_path']

def inventory_check(path):
	try:
		os.makedirs(path, mode=0o750)
	except OSError as e:
		if e.errno == errno.EEXIST and os.path.isdir(path):
			pass
		elif e.errno == errno.EEXIST:
			raise NetopeerException('User\'s inventory (' + path + ') already exists and it\'s not a directory.')
		else:
			raise NetopeerException('Unable to use inventory path ' + path +' (' + str(e) + ').') 

