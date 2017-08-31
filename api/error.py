#!/bin/python3

from liberouterapi.error import ApiException

class NetopeerException(ApiException):
    status_code = 500
