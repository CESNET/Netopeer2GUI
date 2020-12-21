/**
 MIT License

 Copyright (c) 2018 Alexey Zuev

 Available from https://github.com/alexzuza/angular-plugin-architecture/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

import * as core from '@angular/core';
import * as common from '@angular/common';
import * as forms from '@angular/forms';
import * as router from '@angular/router';
import * as rxjs from 'rxjs';
import * as tslib from 'tslib';
import * as socketIo from 'socket.io-client';
import * as http from '@angular/common/http';
import * as lib from '../../netconf-lib';


export const TOOL_EXTERNALS_MAP = {
    'ng.http': http,
    'ng.core': core,
    'ng.common': common,
    'ng.forms': forms,
    'ng.router': router,
    rxjs,
    tslib,
    socketIo,
    netconf_lib: { ...lib, ...require('netconf-lib/netconf-lib.ngfactory') }
};

declare let require: any;
