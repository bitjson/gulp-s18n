'use strict';

var through = require('through2');
var gutil = require('gulp-util');
var s18n = require('s18n');

var PLUGIN_NAME = 'gulp-s18n';

var localeCaches = {};

module.exports = function(options) {
  options = options || {};
  var cacheId = options.cacheId || 'default';

  function localizeFiles(file, enc, cb) {
    // ignore empty files
    if (file.isNull()) {
      cb(null);
      return;
    }
    if (file.isStream()) {
      cb(new gutil.PluginError(PLUGIN_NAME, 'streaming not supported'));
      return;
    }
    // file is buffer
    for (var id in localeCaches[cacheId].locales) {
      if (id !== localeCaches[cacheId].native) {

        // create clone of file for each locale
        var localizedFile = file.clone();

        // place files in the locale's subdirectory
        localizedFile.path = localizedFile.path.replace(localizedFile.base, localizedFile.base + id + '/');

        var contents = s18n(String(localizedFile.contents), {
          nativeLocale: localeCaches[cacheId].locales[localeCaches[cacheId].native],
          locale: localeCaches[cacheId].locales[id]
        });

        localizedFile.contents = new Buffer(contents);
        plugin.push(localizedFile);
      }
    }

    cb();
  }

  var plugin = through.obj(localizeFiles);
  return plugin;
};


module.exports.setLocales = function(options) {
  options = options || {};
  if (typeof options.native === 'undefined') {
    options.native = 'en';
  }
  if (typeof options.cacheId === 'undefined') {
    options.cacheId = 'default';
  }
  if (typeof options.enforce === 'undefined') {
    options.enforce = 'silent';
  }
  if (options.enforce !== 'silent' && options.enforce !== 'warn' && options.enforce !== 'strict') {
    throw new Error('Unrecognized `enforce` mode passed to setLocales');
    // cb(new gutil.PluginError(PLUGIN_NAME, 'Unrecognized `enforce` mode passed to setLocales'));
  }

  localeCaches[options.cacheId] = {
    'native': options.native,
    locales: {}
  };

  function cacheLocale(file, enc, cb) {
    // ignore empty files
    if (file.isNull()) {
      cb(null);
      return;
    }
    if (file.isStream()) {
      cb(new gutil.PluginError(PLUGIN_NAME, 'streaming not supported'));
      return;
    }
    // file is buffer
    var localeId = file.path.split('/').pop().split('.').shift();
    var locale = JSON.parse(String(file.contents));
    localeCaches[options.cacheId].locales[localeId] = locale;
    cb();
  }

  function enforceLocalization(cb) {
    if (options.enforce !== 'silent') {
      var sendError = false;
      var nativeLocaleId = localeCaches[options.cacheId].native;
      var nativeLocale = localeCaches[options.cacheId].locales[nativeLocaleId];
      for (var thisLocaleId in localeCaches[options.cacheId].locales) {
        var thisLocale = localeCaches[options.cacheId].locales[thisLocaleId];
        var comparison = s18n.compareLocales(
          nativeLocale,
          thisLocale
        );
        if (comparison[1].length > 0) {
          var logType;
          if (options.enforce === 'warn') {
            logType = 'WARN';
          }
          if (options.enforce === 'strict') {
            logType = 'ERROR';
            sendError = true;
          }
          for(var i = 0; i < comparison[1].length; i++){
            var out = logType + ': locale `' + thisLocaleId + '` ';
            out += 'is missing: `' + comparison[1][i].hash + '`, ';
            out += 'native string: `' + comparison[1][i].string + '`';
            gutil.log(out);
          }
        }
      }
      if(sendError){
        cb(new gutil.PluginError(PLUGIN_NAME, 'Locales did not meet enforcement requirements'));
      }
    }
    cb();
  }

  var plugin = through.obj(cacheLocale, enforceLocalization);
  return plugin;
};

module.exports.extract = function(options) {
  options = options || {};
  if (typeof options.native === 'undefined') {
    options.native = 'en';
  }

  var projectLocale = {};
  var canOutput = false;

  function extractFromFile(file, enc, cb) {
    // ignore empty files
    if (file.isNull()) {
      cb(null);
      return;
    }
    if (file.isStream()) {
      cb(new gutil.PluginError(PLUGIN_NAME, 'streaming not supported'));
      return;
    }
    // file is buffer
    canOutput = true;
    var fileLocale = s18n.extract(file.contents, options);
    for (var hash in fileLocale) {
      projectLocale[hash] = fileLocale[hash];
    }
    cb();
  }

  function returnLocale(cb) {
    if (canOutput) {
      var projectLocaleString = s18n.formatLocale(projectLocale, {
        output: 'string'
      });

      plugin.push(new gutil.File({
        cwd: '',
        base: '',
        path: options.native + '.json',
        contents: new Buffer(projectLocaleString)
      }));
    }
    cb();
  }

  var plugin = through.obj(extractFromFile, returnLocale);
  return plugin;
};
