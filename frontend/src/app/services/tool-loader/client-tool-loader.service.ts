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

// @ts-ignore
import { Injectable, NgModuleFactory } from '@angular/core';
import { TOOL_EXTERNALS_MAP } from './tool-externals';
import {ToolConfigProvider} from '../tool-config.provider';
import {ToolLoaderService} from './tool-loader.service';

const SystemJS = window.System;


@Injectable()
export class ClientToolLoaderService extends ToolLoaderService {
    constructor(private configProvider: ToolConfigProvider) {
        super();
    }

    provideExternals() {
        Object.keys(TOOL_EXTERNALS_MAP).forEach(externalKey =>
            window.define(externalKey, [], () => TOOL_EXTERNALS_MAP[externalKey])
        );
    }

    load<T>(pluginName): Promise<NgModuleFactory<T>> {
        const { config } = this.configProvider;
        if (!config[pluginName]) {
            throw Error(`Can't find appropriate plugin`);
        }

        const depsPromises = (config[pluginName].deps || []).map(dep => {
            return SystemJS.import(config[dep].path).then(m => {
                window['define'](dep, [], () => m.default);
            });
        });

        if (typeof TOOL_EXTERNALS_MAP.netconf_lib === 'string') {
            depsPromises.push(SystemJS.import('/assets/libnetconf/tools/netconf-lib.js').then(m => {
                TOOL_EXTERNALS_MAP.netconf_lib = m.default;
                window['define']('netconf-lib', [], () => m.default);
                console.log('Defined netconf-lib');
            }));
        }

        return Promise.all(depsPromises).then(() => {
            return SystemJS.import(config[pluginName].path).then(
                module => module.default.default
            );
        });
    }
}
