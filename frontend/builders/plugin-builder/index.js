"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const build_angular_1 = require("@angular-devkit/build-angular");
const fs = require("fs");
const operators_1 = require("rxjs/operators");
class PluginBuilder extends build_angular_1.BrowserBuilder {
    patchEntryPoint(contents) {
        fs.writeFileSync(this.entryPointPath, contents);
    }
    buildWebpackConfig(root, projectRoot, host, options) {
        const { pluginName, sharedLibs } = this.options;
        if (!this.options.modulePath) {
            throw Error('Please define modulePath!');
        }
        if (!pluginName) {
            throw Error('Please provide pluginName!');
        }
        const config = super.buildWebpackConfig(root, projectRoot, host, options);
        // Make sure we are producing a single bundle
        delete config.entry.polyfills;
        delete config.optimization.runtimeChunk;
        delete config.optimization.splitChunks;
        delete config.entry.styles;
        config.externals = {
            rxjs: 'rxjs',
            '@angular/common/http': 'ng.http',
            '@angular/core': 'ng.core',
            '@angular/common': 'ng.common',
            '@angular/forms': 'ng.forms',
            '@angular/router': 'ng.router',
            tslib: 'tslib',
            'socket.io-client': 'socket.io-client',
        };
        if (sharedLibs) {
            config.externals = [config.externals];
            const sharedLibsArr = sharedLibs.split(',');
            sharedLibsArr.forEach(sharedLibName => {
                const factoryRegexp = new RegExp(`${sharedLibName}.ngfactory$`);
                config.externals[0][sharedLibName] = sharedLibName; // define external for code
                config.externals.push((context, request, callback) => {
                    if (factoryRegexp.test(request)) {
                        return callback(null, sharedLibName); // define external for factory
                    }
                    callback();
                });
            });
        }
        const ngCompilerPluginInstance = config.plugins.find(x => x.constructor && x.constructor.name === 'AngularCompilerPlugin');
        if (ngCompilerPluginInstance) {
            ngCompilerPluginInstance._entryModule = this.options.modulePath;
        }
        // preserve path to entry point
        // so that we can clear use it within `run` method to clear that file
        this.entryPointPath = config.entry.main[0];
        const [modulePath, moduleName] = this.options.modulePath.split('#');
        const factoryPath = `${modulePath.includes('.') ? modulePath : `${modulePath}/${modulePath}`}.ngfactory`;
        const entryPointContents = `
       export * from '${modulePath}';
       export * from '${factoryPath}';
       import { ${moduleName}NgFactory } from '${factoryPath}';
       export default ${moduleName}NgFactory;
    `;
        this.patchEntryPoint(entryPointContents);
        config.output.filename = `${pluginName}.js`;
        config.output.library = pluginName;
        config.output.libraryTarget = 'umd';
        // workaround to support bundle on nodejs
        config.output.globalObject = `(typeof self !== 'undefined' ? self : this)`;
        return config;
    }
    run(builderConfig) {
        this.options = builderConfig.options;
        // I don't want to write it in my scripts every time so I keep it here
        builderConfig.options.deleteOutputPath = false;
        return super.run(builderConfig).pipe(operators_1.tap(() => {
            // clear entry point so our main.ts is always empty
            this.patchEntryPoint('');
        }));
    }
}
exports.default = PluginBuilder;
