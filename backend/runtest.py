#!/usr/bin/python3

"""
Unit tests for the devices.py and the profiles.py files
File: runtest.py
Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
"""

import pymongo
import unittest
import os
import json

from profiles import *
from devices import *

dbClient = pymongo.MongoClient("mongodb://localhost:27017/")
testDb = dbClient["testDb"]
testCol = testDb["tests"]


class TestDeviceSaving(unittest.TestCase):
    """
    Test device database manipulation
    """
    @staticmethod
    def setUpClass():
        try:
            testCol.insert_many([
                {
                    'name': 'Test device',
                    'hostname': 'localhost',
                    'port': 830,
                    'username': 'user',
                    'fingerprint': 'e8fe15b374207a2e6ee99bbbadc87ecd068c17f8',
                    'owner': '__test_user__'
                },
                {
                    'name': 'Basement router',
                    'hostname': 'localhost',
                    'port': 831,
                    'username': 'admin',
                    'fingerprint': 'e8fe15b374207a2e6ee99bbbadc87ecd068c17f8',
                    'owner': '__test_user__'
                },
                {
                    'name': 'Example server',
                    'hostname': 'example.com',
                    'port': 888,
                    'username': 'admin',
                    'fingerprint': 'e8fe15b374207a2e6ee99bbbadc87ecd068c17f8',
                    'owner': '__test_user__'
                }
            ])
        except Exception as e:
            print("Make sure mongodb daemon is running!")
            exit(1)

    @staticmethod
    def tearDownClass():
        testCol.delete_many({})

    def test_device_get_and_insert(self):
        self.assertEqual(len(get_saved_devices('__test_user__', testCol)), 3)
        self.assertEqual(str(
            type(add_device('__test_user__', {'hostname': 'localhost', 'port': 355, 'username': 'admin'}, testCol))),
                         "<class 'str'>")
        self.assertFalse(add_device('__test_user__', {'hostname': 'localhost'}, testCol))
        self.assertEqual(len(get_saved_devices('__test_user__', testCol)), 4)


class TestProfiles(unittest.TestCase):
    """
    Test manipulating profiles
    """

    @staticmethod
    def setUpClass():
        clear_profile_cache()

    @staticmethod
    def tearDownClass():
        os.remove('userfiles/__test_user__.json')
        os.remove('userfiles/__test_user_init__.json')
        clear_profile_cache()

    @staticmethod
    def tearDown():
        write_user_profiles('__test_user__', {'active': 'default',
                                              'profiles': [{'name': 'default',
                                                            'connectOnLogin': False}]})  # Back to initial state

    def test_data_init(self):
        self.assertEqual(read_user_profiles('__test_user_init__'),
                         {'active': 'default', 'profiles': [{'name': 'default', 'connectOnLogin': False}]})

    def test_data_write(self):
        self.assertFalse(write_user_profiles('__test_user__', {}))
        self.assertTrue(write_user_profiles('__test_user__',
                                            {'active': 'default', 'profiles': [{'name': 'default'}, {'name': 'test'}]}))

    def test_set_remove_and_get(self):
        self.assertEqual(get_profile_names('__test_user__'), ['default'])
        self.assertTrue(add_profile('__test_user__', 'test_profile'))
        self.assertEqual(get_profile_names('__test_user__'), ['default', 'test_profile'])
        self.assertTrue(remove_profile('__test_user__', 'default'))
        self.assertEqual(get_profile_names('__test_user__'), ['test_profile'])
        self.assertFalse(remove_profile('__test_user__', 'default'))

    def test_active_profile(self):
        self.assertEqual(get_active_profile('__test_user__'), 'default')
        self.assertTrue(add_profile('__test_user__', 'test_profile'))
        self.assertTrue(set_active_profile('__test_user__', 'test_profile'))
        self.assertFalse(set_active_profile('__test_user__', 'nonexistent_profile'))
        self.assertEqual(get_active_profile('__test_user__'), 'test_profile')
        self.assertTrue(remove_profile('__test_user__', 'test_profile'))
        self.assertEqual(get_active_profile('__test_user__'), '')
        self.assertTrue(set_active_profile('__test_user__', 'default'))

    def test_should_connect_on_login(self):
        self.assertFalse(should_connect_on_login('__test_user__', 'default'))
        self.assertTrue(set_connect_on_login('__test_user__', 'default', True))
        self.assertTrue(should_connect_on_login('__test_user__', 'default'))
        self.assertFalse(should_connect_on_login('__test_user__', 'nonexistent_profile'))
        self.assertFalse(set_connect_on_login('__test_user__', 'nonexistent_profile', True))


if __name__ == "__main__":
    unittest.main()
