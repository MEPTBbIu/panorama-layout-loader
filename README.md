# panorama-layout-loader

[![npm][npm]][npm-url]
[![chat][chat]][chat-url]

> Panorama XML layout files loader for webpack

## Install

```bash
npm i panorama-layout-loader
# or
yarn add panorama-layout-loader
```

## Usage

By default every local `<Image src="image.png"></Image>` and `<include src="script.js">` is required (`require('./image.png')`). You may need to specify loaders for images in your configuration (recommended `file-loader`, `url-loader` or `entry-loader`).

You can specify which tag-attribute combination should be processed by this loader via the query parameter `attrs`. Pass an array or a space-separated list of `<tag>:<attribute>` combinations. (Default: `['include:src', 'Image:src']`).

Attributes also can be specified without tag, like `:<attribute>`.

```js
{
  test: /\.(xml)$/,
  use: {
    loader: 'panorama-layout-loader',
    options: {
      attrs: [':data-src']
    }
  }
}
```

To completely disable tag-attribute processing (for instance, if you're handling image loading on the client side) you can pass in `attrs=false`.

## Examples

With this configuration:

```js
{
  module: {
    rules: [
      { test: /\.jpg$/, use: [ "file-loader" ] },
      { test: /\.png$/, use: [ "url-loader?mimetype=image/png" ] }
    ]
  },
  output: {
    publicPath: "http://cdn.example.com/[hash]/"
  }
}
```

``` html
<!-- file.html -->
<img src="image.png" data-src="image2x.png" >
```

```js
require("panorama-layout-loader!./file.html");

// => '<Image src="http://cdn.example.com/49eba9f/a992ca.png" data-src="image2x.png"></Image>'
```

Check out [html-loader](https://github.com/webpack-contrib/html-loader) for more examples

### Interpolation

You can use `interpolateRequire` flag to use `require` in template, like so:

```js
require("panorama-layout-loader?interpolateRequire!./file.html");
```

```html
<#list list as list>
  <a href="${list.href!}" />${list.name}</a>
</#list>

<Image src="${require(`./images/gallery.png`)}"></Image>

<div>${require(`./components/gallery.html`)}</div>
```

Unlike [html-loader](https://github.com/webpack-contrib/html-loader) backtick is the only possible quotes type there.

### Export into XML files

In most cases you need to export XML into their own _.xml_ file.
Unlike [html-loader](https://github.com/webpack-contrib/html-loader), there is no need to use _extract-loader_,
because here it compiles dependencies at runtime.
To save it to file you may want to use [file-loader](https://github.com/webpack/file-loader),
like with [html-loader](https://github.com/webpack-contrib/html-loader).

If you want to use generated string in your JS file,
you can chain it with [raw-loader](https://github.com/webpack/raw-loader),
instead of [file-loader](https://github.com/webpack/file-loader).

[npm]: https://img.shields.io/npm/v/panorama-layout-loader.svg
[npm-url]: https://npmjs.com/package/panorama-layout-loader

[chat]: https://img.shields.io/badge/gitter-webpack%2Fwebpack-brightgreen.svg
[chat-url]: https://gitter.im/webpack/webpack
