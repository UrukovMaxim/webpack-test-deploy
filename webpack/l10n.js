'use strict';

const fs = require('fs');
const vm = require('vm');
const util = require('util');
const path = require('path');
const async = require('async');
const shell = require('shelljs');

const _ = require('lodash');
const chalk = require('chalk');
const mkdirp = require('mkdirp');

const api = require('./l10n/rest');
const merge = require('./l10n/merge');
const flatten = require('./l10n/flatten');
const { generateAst, updateAst, generateSource } = require('./l10n/ast');

const localesConfig = require('./locales');

const pwd = process.env.PWD;
const args = process.argv.slice(2);
const configPath = './l10n/config.json';

const dirs = {
  l10n: path.join(pwd, 'src/l10n'),
  keys: './l10n/keys',
  local: './l10n/local',
  master: './l10n/master',
  remote: './l10n/remote',
  upload: './l10n/upload'
};

function makeDirs(callback) {
  async.each([dirs.local, dirs.master, dirs.remote, dirs.upload, dirs.keys], mkdirp, (err) => {
    callback(err);
  });
}

function getLocalePath(localeName, projectName) {
  const localeDir = path.join(dirs.l10n, localeName);
  const localePath = path.join(localeDir, `${projectName}.js`);

  return localePath;
}

function parseLocale({ name: locale, project: { name: project }}, source, callback) {
  let data;

  try {
    data = vm.runInNewContext(source, {});
    data = flatten(data, '', true);
  } catch (err) {
    console.log(chalk.red('ERROR:'), err);
    data = {};
  }

  callback(null, {
    locale,
    project,
    data,
    source,
    path,
    dump: false
  });
}

function loadLocale(locale, callback) {
  const path = getLocalePath(locale.name, locale.project.name);

  fs.readFile(path, (err, res) => {
    if (err) {
      callback(err);
    } else {
      parseLocale(locale, res ? res.toString('utf8') : '', callback);
    }
  });
}

function dumpLocale(locale, callback) {
  loadLocale(locale, (err, res) => {
    if (!err) {
      const json = JSON.stringify(res.data, null, 2);
      const path = `${dirs.local}/${res.locale}_${res.project}.json`;

      fs.writeFile(path, json, callback);
    } else {
      callback(null);
    }
  })
}

function dumpMasterLocale(locale, callback) {
  const cmd = `git show origin/master:src/l10n/${locale.name}/${locale.project.name}.js`;

  shell.exec(cmd, { silent: true }, (status, output) => {
    if (!status) {
      parseLocale(locale, output ? output.toString('utf8') : '', (err, res) => {
        const json = JSON.stringify(res.data, null, 2);
        const path = `${dirs.master}/${res.locale}_${res.project}.json`;

        fs.writeFile(path, json, callback);
      });
    } else {
      callback(null, null);
    }
  })
}

function loadDump(locale, location, callback) {
  const { name: localeName, project: { name: projectName } } = locale;

  const path = `${location}/${localeName}_${projectName}.json`;
  fs.readFile(path, (err, res) => {
    callback(null, {
      locale: localeName,
      project: projectName,
      data: JSON.parse(err ? null : res),
      source: '',
      path,
      dump: true
    });
  })
}

function loadKeys(locale, callback) {
  const path = `${dirs.keys}/ru_${locale.project.name}.json`;
  fs.readFile(path, (err, res) => {
    callback(null, JSON.parse(err ? null : res));
  })
}

function makeConfig(locales, branch, callback) {
  const localesList = [];

  const projects = _.uniq(_.map(locales, 'project.name'));
  api.projects((err, list) => {
    list = list.filter((project) => projects.includes(project.name));

    async.each(list, (project, callback) => {
      api.locales(project, (err, list) => {
        const projectLocales = locales
          .filter(locale => locale.project.name === project.name)
          .map(locale => locale.name);

        list
          .filter((locale) => projectLocales.includes(locale.name))
          .forEach((locale) => localesList.push(Object.assign(locale, { branch })));

        callback(err);
      })
    }, (err) => {
      if (!err) {
        const json = JSON.stringify(localesList, null, 2);
        fs.writeFile(configPath, json, callback);
      } else {
        callback(err);
      }
    });

  });
}

function loadConfig(callback) {
  fs.readFile(configPath, 'utf-8', (err, res) => {
    if (err) {
      console.log(chalk.red('config parse error! do "npm run l10n init [branch] [locales] [project]"'));
      callback(err, null);
      return;
    }

    const config = JSON.parse(res.toString('utf-8'));
    callback(err, config);
  });
}

function getLocalConfigLocales(callback) {
  const locales = Object
    .keys(localesConfig)
    .reduce((result, project) => {
      localesConfig[project].forEach((locale) => {
        result.push({
          name: locale,
          project: {
            name: project
          }
        })
      });
      return result;
    }, []);

  callback && callback(
    null,
    locales
  );

  return locales;
}

function downloadAndWriteLocale(locale, callback) {
  api.download(locale, (err, res) => {
    const path = `${dirs.remote}/${res.locale.name}_${res.locale.project.name}.json`;
    fs.writeFile(path, res.data, callback);
  });
}

function downloadAndWriteKeys(locale, callback) {
  if (locale.name === 'ru') {
    api.keys(locale, (err, keys) => {
      const path = `${dirs.keys}/${locale.name}_${locale.project.name}.json`;
      const json = JSON.stringify(keys, null, 2);

      fs.writeFile(path, json, callback);
    });
  } else {
    callback(null, []);
  }
}

function makeUploadFiles(locale, callback) {
  async.parallel([
    async.apply(loadDump, locale, dirs.local),
    async.apply(loadDump, locale, dirs.master),
    async.apply(loadDump, locale, dirs.remote),
    async.apply(loadKeys, locale)
  ], (err, res) => {
    const diff = merge.apply(this, [...res, locale.branch]);

    if (diff.hasConflicts) {
      callback('has conflicts');
    } else {
      const json = JSON.stringify(diff.result, null, 2);
      const path = `${dirs.upload}/${locale.name}_${locale.project.name}.json`;

      fs.writeFile(path, json, callback);
    }
  });
}

function applyRemoteChanges(locale, callback) {
  const ruLocale = {
    name: 'ru',
    project: {
      name: locale.project.name
    }
  };
  async.parallel([
    async.apply(loadLocale, ruLocale),
    async.apply(loadDump, locale, dirs.remote)
  ], (err, res) => {
    const [ local, remote ] = res;

    if (local && remote) {
      let ast = generateAst(local.source);
      ast = updateAst(ast, remote.data);
      const source = generateSource(ast, local.source);

      const path = getLocalePath(locale.name, locale.project.name);
      if (!args.includes('emulate')) {
        fs.writeFileSync(path, source);
      }
    }

    callback(null);
  });
}

function main(cmd, args, callback) {
  switch(cmd) {
    case 'init': {
      const branch = args[1];
      const projects = (args[0] || '').split(',');

      const locales = getLocalConfigLocales().filter(locale => {
        return projects.includes(locale.project.name)
      });

      async.waterfall([
        makeDirs,
        makeConfig.bind(null, locales, branch)
      ], (err) => {
        if (err) {
          console.log(chalk.red('ERROR:', JSON.stringify(err, null, 2)));
        } else {
          console.log(
            chalk.green('OK'), 'INIT \n',
            chalk.blue('branch:'), branch,
            chalk.blue('\n projects:'), projects.join(', ')
          );
        }

        callback(err);
      });
    } break;

    case 'download': {
      async.waterfall([
        makeDirs,
        loadConfig,
        (locales, callback) => async.eachLimit(locales, 2, downloadAndWriteLocale, (err) => callback(err, locales)),
        (locales, callback) => async.eachLimit(locales, 2, downloadAndWriteKeys, callback)
      ], (err) => {
        if (err) {
          console.log(chalk.red('ERROR:', JSON.stringify(err, null, 2)));
        } else {
          console.log(chalk.green('OK'), 'DOWNLOAD');
        }

        callback(err);
      });
    } break;

    case 'dump': {
      async.waterfall([
        makeDirs,
        getLocalConfigLocales,
        (locales, callback) => async.each(locales, dumpLocale, (err) => callback(err, locales)),
        (locales, callback) => async.each(locales, dumpMasterLocale, callback)
      ], (err) => {
        if (err) {
          console.log(chalk.red('ERROR:', JSON.stringify(err, null, 2)));
        } else {
          console.log(chalk.green('OK'), 'DUMP');
        }
        callback(err);
      });
    } break;

    case 'merge': {
      async.waterfall([
        makeDirs,
        loadConfig,
        (locales, callback) => async.each(locales, makeUploadFiles, callback)
      ], (err) => {
        if (err) {
          console.log(chalk.red('ERROR:', JSON.stringify(err, null, 2)));
        } else {
          console.log(chalk.green('OK'), 'MERGE');
        }

        callback(err);
      });
    } break;

    case 'upload': {
      async.waterfall([
        makeDirs,
        loadConfig,
        (locales, callback) => async.eachLimit(locales, 2, api.upload.bind(null, dirs.upload), callback)
      ], (err) => {
        if (err) {
          console.log(chalk.red('ERROR:', JSON.stringify(err, null, 2)));
        } else {
          console.log(chalk.green('OK'), 'UPLOAD');
        }

        callback(err);
      });
    } break;

    case 'tag': {
      async.waterfall([
        makeDirs,
        loadConfig,
        (locales, callback) => async.eachLimit(locales, 2, (locale, callback) => {
          if (locale.name === 'ru') {
            api.tag(locale, callback);
          } else {
            callback(null);
          }
        }, callback)
      ], (err) => {
        if (err) {
          console.log(chalk.red('ERROR:', JSON.stringify(err, null, 2)));
        } else {
          console.log(chalk.green('OK'), 'TAG');
        }

        callback(err);
      });
    } break;

    case 'untag': {
      async.waterfall([
        makeDirs,
        loadConfig,
        (locales, callback) => async.eachLimit(locales, 2, (locale, callback) => {
          if (locale.name === 'ru') {
            api.untag(locale, callback);
          } else {
            callback(null);
          }
        }, callback)
      ], (err) => {
        if (err) {
          console.log(chalk.red('ERROR:', JSON.stringify(err, null, 2)));
        } else {
          console.log(chalk.green('OK'), 'TAG');
        }

        callback(err);
      });
    } break;

    case 'diff': {
      async.waterfall([
        makeDirs,
        loadConfig,
        (locales, callback) => async.each(locales, applyRemoteChanges, callback)
      ], (err) => {
        if (err) {
          console.log(chalk.red('ERROR:', JSON.stringify(err, null, 2)));
        } else {
          console.log(chalk.green('OK'), 'DIFF');
        }

        callback(err);
      });
    } break;

    case 'legacy': {
      const locale = {
        name: 'ru',
        project: {
          name: 'legacy'
        }
      };
      async.parallel([
        async.apply(loadDump, locale, dirs.local),
        async.apply(loadDump, locale, dirs.remote),
        async.apply(loadKeys, locale)
      ], (err, [ local, remote ]) => {

        let localValues = Object.keys(local.data).map((key) => local.data[key]).sort();
        let remoteValues = Object.keys(remote.data).map((key) => remote.data[key]).sort();

        console.log('local', localValues.length, 'remote', remoteValues.length);

        localValues = [...new Set(localValues)];
        remoteValues = [...new Set(remoteValues)];

        console.log('local', localValues.length, 'remote', remoteValues.length);

        let intersection = localValues.filter(function(n) {
          return remoteValues.indexOf(n) != -1;
        });

        console.log('intersection', intersection.length);
        console.log(intersection);

        callback(null);
      });

    } break;

    case 'test': {
      require('./l10n/test/test')();
      callback(null);
    } break;

    case 'help':
    default: {
      callback(null);
    }
  }
}

const commands = (args && args[0] || 'help').split(':');
const params = args && args.splice(1);

async.eachSeries(commands, (command, callback) => {
  main(command, params, callback);
});
