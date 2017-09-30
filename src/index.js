/* eslint-disable
  import/order,
  import/first,
  no-param-reassign,
*/
import LoaderError from './Error';
import loaderUtils from 'loader-utils';
import validateOptions from 'schema-utils';

import url from 'url';
import attrs from './lib/attrs';
import minifier from 'html-minifier';
import vm from 'vm';
import asyncEach from 'async-each';

const schema = require('./options');

function randomize() {
  return `link__${Math.random()}`;
}

function unwrapLoaderResult(src, filename, publicPath) {
  publicPath = typeof publicPath === 'function' ? publicPath(filename) : publicPath;

  const script = new vm.Script(src, {
    filename,
    displayErrors: true,
  });
  const sandbox = {
    module: {},
    exports: {},
    require(resourcePath) {
      throw new Error(`Can't load '${resourcePath}', because require is not allowed`);
    },
    __webpack_public_path__: publicPath,
  };
  sandbox.module.exports = sandbox.exports;

  script.runInNewContext(sandbox);

  const exported = sandbox.exports;
  if (exported == null) return '';
  if (typeof exported !== 'object') return exported;
  return JSON.stringify(exported).slice(1, -1);
}

export default function loader(html) {
  const options = loaderUtils.getOptions(this) || {};

  validateOptions(schema, options, 'Panorama Layout Loader');

  const { root } = options;
  const publicPath = options.publicPath || this.options.output.publicPath || '/';

  let attributes = ['include:src', 'Image:src'];

  if (options.attrs != null) {
    if (typeof options.attrs === 'string') attributes = options.attrs.split(' ');
    else if (Array.isArray(options.attrs)) attributes = options.attrs;
    else if (options.attrs === false) attributes = [];
    else {
      throw new LoaderError({
        name: 'AttributesError',
        message: 'Invalid attribute value found',
      });
    }
  }

  const links = attrs(html, (tag, attr, value) => {
    // Ignore values starting with a protocol ('s2r://', 'file://').
    if (url.parse(value).protocol != null) return false;

    const item = `${tag}:${attr}`;

    const result = attributes.find(a => item.indexOf(a) >= 0);

    return !!result;
  });

  links.reverse();

  const data = {};

  html = [html];

  links.forEach((link) => {
    if (!loaderUtils.isUrlRequest(link.value, root)) return;

    const uri = url.parse(link.value);

    if (uri.hash != null) {
      uri.hash = null;

      link.value = uri.format();
      link.length = link.value.length;
    }

    let ident;
    do { ident = randomize(); } while (data[ident]);
    data[ident] = link.value;

    const item = html.pop();

    html.push(item.substr(link.start + link.length));
    html.push(ident);
    html.push(item.substr(0, link.start));
  });

  html = html.reverse().join('');

  if (options.interpolateRequire) {
    const regex = /\$\{require\(`[^`)]*`\)\}/g;
    let result;

    const requires = [];

    // eslint-disable-next-line no-cond-assign
    while (result = regex.exec(html)) {
      requires.push({
        length: result[0].length,
        start: result.index,
        value: result[0],
      });
    }

    requires.reverse();

    html = [html];

    requires.forEach((link) => {
      const item = html.pop();

      let ident;
      do { ident = randomize(); } while (data[ident]);
      data[ident] = link.value.substring(11, link.length - 3);

      html.push(item.substr(link.start + link.length));
      html.push(ident);
      html.push(item.substr(0, link.start));
    });

    html = html.reverse().join('');
  }

  if (options.minimize || this.minimize) {
    let minimize = Object.create({
      collapseWhitespace: true,
      conservativeCollapse: true,
      useShortDoctype: true,
      keepClosingSlash: true,
      minifyJS: true,
      minifyCSS: true,
      removeComments: true,
      removeAttributeQuotes: true,
      removeStyleTypeAttributes: true,
      removeScriptTypeAttributes: true,
      removeCommentsFromCDATA: true,
      removeCDATASectionsFromCDATA: true,
    });

    if (typeof options.minimize === 'object') {
      minimize = Object.assign(minimize, options.minimize);
    }

    html = minifier.minify(html, minimize);
  }

  const done = this.async();
  asyncEach(html.match(/link__[0-9.]+/g) || [], (match, callback) => {
    if (!data[match]) {
      callback();
      return;
    }

    this.loadModule(data[match], (err, source) => {
      if (err) callback(err);

      const sourceExports = options.unwrap === false ? source : unwrapLoaderResult(
        source,
        loaderUtils.urlToRequest(data[match], root),
        publicPath,
      );
      html = html.replace(match, sourceExports);
      callback();
    });
  }, (err) => {
    done(err, err ? null : html);
  });
}
