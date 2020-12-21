"""
Saved device profile manipulation
File: profiles.py
Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
"""
import json
import os
from typing import Callable, List
from flask import request

from .devices import get_device_by_id

"""
Profile entry format:
'profiles': [{
    'name': 'profile name',
    'connectOnLogin': bool
    'devices': [
        {
            'id': device id,
            'subscriptions': [list of channels ](optional)
        }
    ] (optional)
}]
"""

# Get path to server root
SITE_ROOT = os.path.realpath(os.path.dirname(__file__))

"""
File manipulation and cache
"""
file_cache = {}

def get_user_file(username):
    """
    Get a path to a file, where user data are stored
    :param username: Username of a user requesting the data
    :return: Full path to a file containing user's profile data
    """
    return os.path.join(SITE_ROOT, 'userfiles', username + '.json')


def clear_profile_cache():
    """
    Clear local cache of profile data. Should be used only when deleting profile files.
    :return: Does not return a value
    """
    global file_cache
    file_cache = {}

def read_user_profiles(username: str) -> object:
    """
    Returns all data saved in user's profile file. If data are in cache, cached data are returned.
    If data for specified user are not in cache, user's profile file is opened and parsed, then added to cache.
    If user's profile file does not exist, a new file is created with default values.
    :param username: Username of a user requesting the data
    :return: Dictionary containing these values: 'active' (string - profile name) and 'profiles' (list of dictionaries)
    """
    global file_cache
    if username in file_cache.keys():
        return file_cache[username]
    else:
        file = get_user_file(username)
        with open(file, 'a+') as f:
            try:
                f.seek(0)
                data = json.load(f)
            except Exception as e:  # File did not exist or was not a valid JSON
                f.seek(0)
                json.dump({'active': 'default', 'profiles': [{'name': 'default', 'connectOnLogin': False}]}, f)
                data = {'active': 'default', 'profiles': [{'name': 'default', 'connectOnLogin': False}]}
                f.truncate()
        file_cache[username] = data
        return data


def write_user_profiles(username: str, profiles: object) -> bool:
    """
    Writes data to user's profile file and updates cache
    :param username: Username of a user requesting the data
    :param profiles: Object of data, that should be written to the file. Has to contain 'active', 'profiles' and 'connectOnLogin' keys
    :return: True if data was written correctly, False otherwise.
    """
    if 'active' in profiles.keys() and 'profiles' in profiles.keys():
        file = get_user_file(username)
        with open(file, 'w+') as f:
            try:
                json.dump(profiles, f)
                f.truncate()
                file_cache[username] = profiles
                return True
            except Exception as e:
                print(e.message)
                return False
    else:
        return False


"""
Helper functions
"""

def get_profile_names(username: str) -> list:
    """
    Return a list of profile names that user had saved
    :param username: Username of a user requesting the data
    :return: List of strings, profile names
    """
    data = read_user_profiles(username)
    return [x['name'] for x in data['profiles']]


def get_profiles(username: str) -> object:
    """
    Returns a list of profile information. Items of the list are dictionaries containing profile name and saved devices.
    :param username: Username of a user requesting the data
    :return: list of dictionaries containing keys 'name' (string, profile name) and 'devices' (list of dictionaries)
    """
    data = read_user_profiles(username)
    return data['profiles']


def does_profile_exist(username: str, profile_name: str) -> bool:
    return profile_name in get_profile_names(username)


"""
Toggling connection on login
"""

def should_connect_on_login(username: str, profile_name: str) -> bool:
    """
    Check whether profile should be connected when user logs in, if the profile is active
    :param profile_name: Name of the profile to check
    :param username: Username of a user requesting the data
    :return: True if the devices in profile should be connected when user logs in, if the profile is active.
    """
    profiles = get_profiles(username)
    for i in range(len(profiles)):
        if profiles[i]['name'] == profile_name:
            return profiles[i]['connectOnLogin']
    return False

def set_connect_on_login(username: str, profile_name: str, value: bool) -> bool:
    """
    Set whether devices in the profile should be connected on login, if the profile is active
    :param username: Username of a user requesting the data
    :param profile_name: Name of the profile to set the value to
    :param value: True if the profile devices should be connected on login, false if not
    :return: True if data were written successfully, False otherwise
    """
    data = read_user_profiles(username)
    for i in range(len(data['profiles'])):
        if data['profiles'][i]['name'] == profile_name:
            data['profiles'][i]['connectOnLogin'] = value
            return write_user_profiles(username, data)
    return False


"""
Active profile manipulation
"""

def set_active_profile(username, profile_name):
    """
    Sets a profile as active when user logs in.
    :param username: Username of a user requesting the data
    :param profile_name: Name of the profile to set as active
    :return: True if data was written successfully, False if profile did not exist or there was an error writing data.
    """
    profiles = get_profiles(username)
    if does_profile_exist(username, profile_name):
        return write_user_profiles(username,
                                   {'active': profile_name, 'profiles': profiles})
    else:
        return False


def get_active_profile(username):
    """
    Returns a name of the profile, that has been set as active. If no profile is active, returns empty string.
    :param username: Username of a user requesting the data
    :return: Name of the currently active profile or empty string if no profile was active
    """
    profiles = read_user_profiles(username)
    return profiles['active']


def get_on_login_profile(username, db_conn):
    """
    Get active profile data, including device information from the database.
    :param username: Username of a user requesting the data
    :param db_conn: Link to database connection, that contains saved devices
    :return: Dictionary containing name of the profile and list of devices
    """
    active = get_active_profile(username)
    if active == '':
        return {'devices': [], 'name': '', 'connectOnLogin': False}
    else:
        return {
            'devices': get_profile_devices(username, active, db_conn),
            'name': active,
            'connectOnLogin': should_connect_on_login(username, active)
        }


"""
Adding / removing profiles
"""

def add_profile(username, profile_name):
    """
    Add a new profile
    :param username: Username of a user requesting the data
    :param profile_name: Name of the new profile
    :return: True if data were written successfully, False if profile did already exist or there was an error writing data.
    """
    profiles = read_user_profiles(username)
    if not does_profile_exist(username, profile_name):
        profiles['profiles'].append({'name': profile_name, 'connectOnLogin': False})
        return write_user_profiles(username, profiles)
    else:
        return False


def remove_profile(username, profile_name):
    """
    Remove a profile from user's file. If removed profile was an active profile, active profile is set to empty string.
    :param username: Username of a user requesting the change
    :param profile_name: Name of the profile to be removed
    :return:
    """
    profiles = read_user_profiles(username)
    if does_profile_exist(username, profile_name):
        if profiles['active'] == profile_name:
            profiles['active'] = ''
        profiles['profiles'][:] = [d for d in profiles['profiles'] if d.get('name') != profile_name]
        return write_user_profiles(username, profiles)
    else:
        return False


"""
Notification subscriptions
"""

def set_subscription_channels(username, profile_name, device_id, channels):
    """

    :param username: Username of a user requesting the data
    :param profile_name:
    :param device_id:
    :param channels:
    :return:
    """
    if does_profile_exist(username, profile_name):
        profiles = get_profiles(username)
        for i in range(len(profiles)):
            if profiles[i]['name'] == profile_name and 'devices' in profiles[i].keys():
                for j in range(len(profiles[i]['devices'])):
                    if profiles[i]['devices'][j]['id'] == device_id:
                        profiles[i]['devices'][j]['subscriptions'] = channels
                        return write_user_profiles(username,
                                                   {'active': get_active_profile(username), 'profiles': profiles})
    return False


def get_subscription_channels(username, profile_name, device_id):
    """

    :param username: Username of a user requesting the data
    :param profile_name:
    :param device_id:
    :return:
    """
    if does_profile_exist(username, profile_name):
        profiles = get_profiles(username)
        for i in range(len(profiles)):
            if profiles[i]['name'] == profile_name and 'devices' in profiles[i].keys():
                for j in range(len(profiles[i]['devices'])):
                    if profiles[i]['devices'][j]['id'] == device_id:
                        return profiles[i]['devices'][j]['subscriptions']
    return []


def get_set_subscription_channels(username: str, profile_name: str, device_id, fn: Callable[[List], List]) -> bool:
    """
    Finds a list of subscription channels and passes it as an argument to function fn. After function fn is completed, saves
    changed channel list to user's save file
    :param username: Username of a user requesting the data
    :param profile_name:
    :param device_id:
    :param fn: Function to perform on a channel list. Should return edited list and accept one argument - current list of channels
    :return: True if edit was successful, False otherwise. May return false if write failed or if profile or device was not found.
    """
    if does_profile_exist(username, profile_name):
        profiles = get_profiles(username)
        for i in range(len(profiles)):
            if profiles[i]['name'] == profile_name and 'devices' in profiles[i].keys():
                for j in range(len(profiles[i]['devices'])):
                    if profiles[i]['devices'][j]['id'] == device_id:
                        profiles[i]['devices'][j]['subscriptions'] = fn(profiles[i]['devices'][j]['subscriptions'])
                        return write_user_profiles(username,
                                                   {'active': get_active_profile(username), 'profiles': profiles})
    return False


def add_subscription_channel(username, profile_name, device_id, channel):
    """

    :param username: Username of a user requesting the data
    :param profile_name:
    :param device_id:
    :param channel:
    :return:
    """
    def append_channel(subscriptions):
        subscriptions.append(channel)
        return subscriptions

    get_set_subscription_channels(username, profile_name, device_id, append_channel)


def remove_subscription_channel(username, profile_name, device_id, channel):
    """

    :param username: Username of a user requesting the data
    :param profile_name:
    :param device_id:
    :param channel:
    :return:
    """
    def remove_channel(subscriptions):
        subscriptions.remove(channel)
        return subscriptions

    get_set_subscription_channels(username, profile_name, device_id, remove_channel)


"""
Profile devices
"""

def set_profile_devices(username: str, profile_name: str, devices: list) -> bool:
    """
    Set which devices are in user's profile
    :param username: Username of a user requesting the data
    :param profile_name:
    :param devices: list of device objects. Objects HAVE TO contain id and CAN contain subscription channel list
    :return:
    """
    profiles = get_profiles(username)
    for i in range(len(profiles)):
        if profiles[i]['name'] == profile_name:
            profiles[i]['devices'] = devices
            return write_user_profiles(username, {'active': get_active_profile(username), 'profiles': profiles})
    return False

def get_profile_devices_raw(username: str, profile_name: str) -> list:
    """
    Returns a list of device ids, that are saved in a profile.
    Used for testing purposes.
    :param username: Username of a user requesting the data
    :param profile_name:
    :return: list of objects containing device ID and notification subscription channel list (if present)
    """
    profiles = get_profiles(username)
    for i in range(len(profiles)):
        if profiles[i]['name'] == profile_name and 'devices' in profiles[i].keys():
            return profiles[i]['devices']
    return []


def get_profile_devices(username, profile_name, db_coll):
    """

    :param username:
    :param profile_name:
    :param db_coll:
    :return:
    """
    profiles = get_profiles(username)
    for i in range(len(profiles)):
        if profiles[i]['name'] == profile_name and 'devices' in profiles[i].keys():
            val = []
            for device in profiles[i]['devices']:
                val.append(get_device_by_id(device['id'], db_coll))
            return val
    return []
