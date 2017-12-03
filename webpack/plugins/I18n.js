var Concat = require('webpack-core/lib/ConcatSource');
var vm = require('vm');
var fs = require('fs');
var md5 = require('md5');
var path = require('path');
var recast = require('recast');
var async = require('async');
var merge = require('deepmerge');
var prod = process.env.NODE_ENV === 'production';

var React = require('react');
var ReactDOMServer = require('react-dom/server');

var n = recast.types.namedTypes;
var b = recast.types.builders;
var SEPARATOR = '	';


function I18n(options) {
  this.langList = options.langList;
  this.tmplPath = options.tmplPath;
  this.prodPath = options.prodPath;
  this.jsComment = options.jsComment;
  this.cssComment = options.cssComment;
  this.l10nComment = options.l10nComment;
  this.langComment = options.langComment;
  this.metaComment = options.metaComment;
  this.metaType = options.metaType;
  this.srcBase = options.srcBase;
  this.keepL10nKeys = options.keepL10nKeys;
  this.forProduction = options.forProduction || false;
  this.seoComment = options.seoComment;
  this.seoBlocks = options.seoBlocks;
  this.indexInfoBlock = options.indexInfoBlock;
  this.indexInfoComment = options.indexInfoComment;
}

function getIndexById(chunks, id) {
  var i = 0;
  var il = chunks.length;
  while (i !== il) {
    if (chunks[i].id === id) return i;
    i++;
  }
}

function makeMeta(meta) {
  var getMetaCode = function(key, value) {
    return '<meta name="'+ key + '" content="' + value + '"' + '/>'
  }

  var getTitle = function(value) {
    return '<title>' + value + '</title>';
  }

  var metaCode = '';

  Object.keys(meta).forEach(function(metaKey) {
    metaCode += metaKey === 'title' ? getTitle(meta[metaKey]) : getMetaCode(metaKey, meta[metaKey])
  })



  return metaCode;
}

function sortChunks(chunks) {
  chunks = chunks.slice(0);
  var i = 0;
  var parentId;
  var parentIndex;
  var il = chunks.length;
  var chunk;
  var parents;
  var p;
  var pl;
  var wasShifted = false;
  while (i !== il) {
    chunk = chunks[i];
    parents = chunk.parents;
    p = 0;
    pl = parents.length;
    while (p !== pl) {
      parentId = parents[p];
      parentIndex = getIndexById(chunks, parentId);
      if (parentIndex > i) {
        chunks.unshift.apply(chunks, chunks.splice(parentIndex));
        wasShifted = true;
        i++;
      }
      p++;
    }
    i++;
  }
  if (wasShifted) {
    return sortChunks(chunks);
  } else {
    return chunks;
  }
}

function collectProps(lang, i18nList, prefix, obj) {
  var keys = Object.keys(obj);
  var key;
  var val;
  var type;
  var k = keys.length;
  while (k--) {
    key = keys[k];
    val = obj[key];
    type = typeof val;
    if (type === 'object') {
      if (val[lang]) {
        var index = i18nList.length;
        i18nList[index] = val[lang];
        i18nList[prefix + key] = index;
      } else {
        collectProps(lang, i18nList, prefix + key + '.', val);
      }
    }
  }
}

function flattenMessages(nestedMessages, prefix) {
  'use strict';
  return Object.keys(nestedMessages).reduce(function(messages, key) {
    let value       = nestedMessages[key];
    let prefixedKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      messages[prefixedKey] = value;
    } else {
      Object.assign(messages, flattenMessages(value, prefixedKey));
    }

    return messages;
  }, {});
}

I18n.prototype.apply = function(compiler) {
  var langList = this.langList;
  var tmplPath = this.tmplPath;
  var prodPath = this.prodPath;
  var jsComment = this.jsComment;
  var langComment = this.langComment;
  var l10nComment = this.l10nComment;
  var cssComment = this.cssComment;
  var keepL10nKeys = this.keepL10nKeys;
  var metaType = this.metaType;
  var metaComment = this.metaComment;
  var sourceBase = this.srcBase;
  var forProduction = this.forProduction;
  var seoComment = this.seoComment;
  var indexInfoComment = this.indexInfoComment;
  var seoBlocks = this.seoBlocks;
  var indexInfoBlock = this.indexInfoBlock;

  var i18nFileByLang = {};

  var scriptCode = function (src) {
    src = path.join(sourceBase, src);
    return '<script src="' + src + '"></script>'
  };

  var cssCode = function(href) {
    href = path.join(sourceBase, href);
    return '<link rel="stylesheet" href="' + href + '" />'
  };

  var createSeoBlockElement = function (type, blocks) {
    return blocks && blocks[type] && prod ? (
      ReactDOMServer.renderToStaticMarkup(
        React.createElement(
          blocks[type].component,
          blocks[type].options,
          null
        )
      )
    ) : '';
  };

  compiler.plugin('emit', function(compilation, compileCallback) {
    var assetsScriptsCode = '';
    var assetsCss = '';
    var stats = compilation.getStats().toJson();
    var chunks = sortChunks(stats.chunks);

    var chunk;
    var c = 0;
    var cl = chunks.length;
    while (c !== cl) {
      chunk = chunks[c++];
      if (chunk.initial) {
        assetsScriptsCode += scriptCode('/' + chunk.files[0]);
        if (chunk.files[1]) {
          assetsCss += cssCode('/' +  chunk.files[1])
        }
      }
    }

    var countDown = langList.length;
    async.each(langList, function(lang, callbackForEach) {
      async.waterfall([
        function (callback) {
          fs.readFile(path.join(tmplPath, '../node_modules/@ott/localizer-front/src/l10n/' + lang + '/common.js'), 'utf8', function (err, data) {
            var __l10nCommon = null;
            try {
              __l10nCommon = vm.runInNewContext(data, {});
            } catch (err) {
              callback('Syntax error!! Check /src/meta/' + lang + '/common.js folder \n ' + err);
            }
            callback(null, __l10nCommon);
          });
        },
        function (commonL10n, callback) {
          fs.readFile(path.join(tmplPath, '/l10n/' + lang + '/' + metaType + '.js'), 'utf8', function (err, data) {
            var __l10n = null;
            try {
              __l10n = vm.runInNewContext(data, {});
            } catch (err) {
              callback('Syntax error!! Check /src/meta/' + lang + '/' + metaType + '.js folder \n ' + err);
            }

            var __globall10n = merge(commonL10n || {}, __l10n || {});
            __globall10n = flattenMessages(__globall10n);

            if (keepL10nKeys) {
              __globall10n.__keys = {
                common: Object.keys(flattenMessages(commonL10n || {}))
              };
              __globall10n.__keys[metaType] = Object.keys(flattenMessages(__l10n || {}));
            }

            callback(null, __globall10n);
          });
        },
        function (l10n, callback) {
          var html = 'window.__l10n = ' + JSON.stringify(l10n).replace(/&nbsp;/gi, '\u00a0');
          var hash = md5(html);
          var langFile = '/l10n/'+ lang + '-' + hash + '.js';
          fs.writeFile(path.join(prodPath, langFile), html, function () {
            compilation.assets[langFile] = {
              source: function () {
                return html;
              },
              size: function () {
                return html.length;
              }
            };
            callback(null, langFile);
          });
        },
        function (langFile, callback) {
          fs.readFile(path.join(tmplPath, 'index.html'), 'utf8', function (err, data) {

            var html = data.replace(new RegExp('<\\!\-\-' + langComment + '\-\->', 'g'), lang);

            html = html.replace(
              new RegExp('<\\!\-\-' + jsComment + '\-\->', 'g'),
              (forProduction && scriptCode('/' + i18nFileByLang[lang]) || '') + assetsScriptsCode
            );

            html = html.replace(
              new RegExp('<\\!\-\-' + l10nComment + '\-\->', 'g'),
              scriptCode(langFile)
            );

            html = html.replace(
              new RegExp('<\\!\-\-' + cssComment + '\-\->', 'g'),
              (forProduction && cssCode('/' + i18nFileByLang[lang]) || '') + assetsCss
            );

            html = html.replace(
              new RegExp('<\\!\-\-' + indexInfoComment + '\-\->', 'g'),
              createSeoBlockElement(metaType, indexInfoBlock)
            );

            html = html.replace(
              new RegExp('<\\!\-\-' + seoComment + '\-\->', 'g'),
              createSeoBlockElement(metaType, seoBlocks)
            );

            if (metaType) {
              try {
                html = html.replace(
                  new RegExp('<\\!\-\-' + metaComment + '\-\->', 'g'),
                  makeMeta(require('../../src/meta/' + lang + '/' + metaType))
                );
                callback(null, html);
              } catch (err) {
                callback('Not found file with meta data for product "' + metaType + '". Check /src/meta/' + lang + '/ folder')
              }
            }
          });
        }
      ], function (err, result) {
        if (err && !result) {
          callbackForEach(err);
          !--countDown && compileCallback();
        } else {
          var outputFilename = lang + '.html';
          var html = result;
          if (forProduction) {
            fs.writeFile(path.join(prodPath, outputFilename), html, function () {
              !--countDown && compileCallback();
            });
          } else {
            compilation.assets[outputFilename] = {
              source: function () {
                return html;
              },
              size: function () {
                return html.length;
              }
            };
            !--countDown && compileCallback();
          }
          callbackForEach();
        }
      });
    }, function(err) {
      if( err ) {
        console.log(err);
      }
    });
  });
};

module.exports = I18n;
