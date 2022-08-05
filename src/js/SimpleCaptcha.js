/**
*   SimpleCaptcha
*   Simple image-based macthematical captcha
*
*   @version 2.0.0
*   https://github.com/foo123/simple-captcha
*
**/
!function(root, name, factory) {
"use strict";
if (('object' === typeof module) && module.exports) /* CommonJS */
    (module.$deps = module.$deps||{}) && (module.exports = module.$deps[name] = factory.call(root));
else if (('function' === typeof define) && define.amd && ('function' === typeof require) && ('function' === typeof require.specified) && require.specified(name) /*&& !require.defined(name)*/) /* AMD */
    define(name, ['module'], function(module) {factory.moduleUri = module.uri; return factory.call(root);});
else if (!(name in root)) /* Browser/WebWorker/.. */
    (root[name] = factory.call(root)||1) && ('function' === typeof(define)) && define.amd && define(function() {return root[name];});
}(  /* current root */          'undefined' !== typeof self ? self : this,
    /* module name */           "SimpleCaptcha",
    /* module factory */        function ModuleFactory__SimpleCaptcha(undef) {
"use strict";

var HAS = Object.prototype.hasOwnProperty,
    toString = Object.prototype.toString,
    isNode = ("undefined" !== typeof global) && ("[object global]" === toString.call(global)),
    isBrowser = ("undefined" !== typeof window) && ("[object Window]" === toString.call(window))
;

function rand(m, M)
{
    return Math.round(m + (M-m)*Math.random());
}

async function createHash(key, data)
{
    var hmac = '';
    if (isNode)
    {
        try {
            hmac = require('crypto').createHmac('sha256', key).update(data).digest('hex');
        } catch (e) {
            hmac = String(data);
        }
    }
    else if (isBrowser)
    {
        try {
            hmac = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', (new TextEncoder()).encode(data)))).map(function(b) {return b.toString(16).padStart(2, '0');}).join('');
        } catch (e) {
            hmac = String(data);
        }
    }
    else
    {
        hmac = String(data);
    }
    return hmac;
}

async function imagepng(img, width, height, metaData)
{
    metaData = metaData || {};
    if (isNode)
    {
        var packer = new Packer(metaData);
        var chunks = [];

        // Signature
        chunks.push(Buffer.from(constants.PNG_SIGNATURE));

        // Header
        chunks.push(packer.packIHDR(width, height));
        if (metaData.gamma) chunks.push(packer.packGAMA(metaData.gamma));

        var filteredData = packer.filterData(Buffer.from(img), width, height);

        // compress it
        var deflateOpts = packer.getDeflateOptions();
        var compressedData = await zlib_deflate(filteredData, deflateOpts.level, deflateOpts.chuckSize);
        filteredData = null;

        if (!compressedData || !compressedData.length) throw new Error('bad png - invalid compressed data response');
        chunks.push(packer.packIDAT(Buffer.from(compressedData)));

        // End
        chunks.push(packer.packIEND());

        return 'data:image/png;base64,' + Buffer.concat(chunks).toString('base64');
    }
    else if (isBrowser)
    {
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'), imgData;

        canvas.width = width;
        canvas.height = height;

        ctx.createImageData(width, height);
        imgData = ctx.getImageData(0, 0, width, height);
        imgData.data.set(img, 0);
        ctx.putImageData(imgData, 0, 0);

        return canvas.toDataURL('image/png');
    }
    return '';
}

class SimpleCaptcha
{
    static VERSION = '2.0.0';

    opts = null;
    captcha = null;
    hmac = null;

    constructor() {
        this.captcha = null;
        this.hmac = null;
        this.opts = {};
        this
            .option('secret_key', 'SECRET_KEY')
            .option('secret_salt', 'SECRET_SALT_')
            .option('difficulty', 1) // 1 (easy) to 3 (difficult)
            .option('num_terms', 2)
            .option('min_term', 1)
            .option('max_term', 20)
            .option('color', 0x121212) // text color
            .option('background', 0xffffff) // background color
        ;
    }

    option(key, val = null) {
        var nargs = arguments.length;
        if (1 == nargs)
        {
            return HAS.call(this.opts, key) ? this.opts[key] : undef;
        }
        else if (1 < nargs)
        {
            this.opts[key] = val;
        }
        return this;
    }

    async getCaptcha() {
        if (!this.captcha) await this.generate();
        return this.captcha;
    }

    async getHash() {
        if (!this.captcha) await this.generate();
        return this.hmac;
    }

    reset() {
        this.captcha = null;
        this.hmac = null;
        return this;
    }

    async validate(answer = null, hmac = null) {
        if ((null == answer) || (null == hmac)) return false;
        var hash = await createHash(String(this.option('secret_key')), String(this.option('secret_salt') ? this.option('secret_salt') : '') + String(answer));
        return hash === hmac;
    }

    async generate() {
        var difficulty = Math.min(3, Math.max(1, parseInt(this.option('difficulty')))),
            num_terms = Math.max(2, parseInt(this.option('num_terms'))),
            min_term = Math.max(0, parseInt(this.option('min_term'))),
            max_term = Math.max(0, parseInt(this.option('max_term'))),
            color = parseInt(this.option('color')),
            background = parseInt(this.option('background')),
            formula, result, captcha, width, height
        ;

        // generate mathematical formula
        [formula, result] = this.formula(num_terms, min_term, max_term, difficulty);

        // compute hmac of result
        this.hmac = await createHash(String(this.option('secret_key')), String(this.option('secret_salt') ? this.option('secret_salt') : '') + String(result));

        // create image captcha with formula depending on difficulty
        [captcha, width, height] = this.image(formula, color, background, difficulty);

        // output image
        this.captcha = await imagepng(captcha, width, height);

        return this;
    }

    formula(terms, min, max, difficulty) {
        // generate mathematical formula
        var formula = [], result = 0, factor = 0, i, x;
        for (i=0; i<terms; ++i)
        {
            x = rand(min, max);
            if ((result > x) && rand(0, 1))
            {
                // randomly use plus or minus operator
                x = -x;
            }
            else if ((1 < difficulty) && (x <= 5) && rand(0, 1))
            {
                // randomly use multiplication factor
                factor = rand(2, 3);
            }
            if (0 < factor)
            {
                result += x * factor;
                if (0 > x)
                {
                    formula.push('-');
                    formula.push.apply(formula, String(Math.abs(x)).split(''));
                    formula.push('×');
                    formula.push.apply(formula, String(factor).split(''));
                }
                else
                {
                    if (0 < i) formula.push('+');
                    formula.push.apply(formula, String(x).split(''));
                    formula.push('×');
                    formula.push.apply(formula, String(factor).split(''));
                }
            }
            else
            {
                result += x;
                if (0 > x)
                {
                    formula.push('-');
                    formula.push.apply(formula, String(Math.abs(x)).split(''));
                }
                else
                {
                    if (0 < i) formula.push('+');
                    formula.push.apply(formula, String(x).split(''));
                }
            }
            factor = 0;
        }
        return [formula, result];
    }

    image(chars, color, background, difficulty) {
        var bitmaps = this.chars(),

            cw = bitmaps.width,
            ch = bitmaps.height,
            n = chars.length,
            space = 1,
            x0 = 10,
            y0 = 10,
            w = n * cw + (n-1) * space + 2 * x0,
            h = ch + 2 * y0,
            wh = w*h,

            r0 = (background >> 16) & 0xff,
            g0 = (background >> 8) & 0xff,
            b0 = (background) & 0xff,
            r = (color >> 16) & 0xff,
            g = (color >> 8) & 0xff,
            b = (color) & 0xff,
            imgbmp = new Array(wh),
            charbmp, img, c, i, x, y, alpha,
            phase, amplitude
        ;

        // img bitmap
        for (c=((r0 << 16) | (g0 << 8) | (b0)) & 0xffffff,i=0; i<wh; ++i)
            imgbmp[i] = c;

        // render chars
        for (i=0; i<n; ++i)
        {
            c = chars[i];
            charbmp = bitmaps.chars[c].bitmap;
            for (x=0; x<cw; ++x)
            {
                for (y=0; y<ch; ++y)
                {
                    alpha = charbmp[x + cw*y];
                    if (0 < alpha)
                    {
                        alpha = alpha / 255.0;
                        imgbmp[x0+x + w*(y0+y)] = ((parseInt(r0*(1-alpha) + alpha*r) & 0xff) << 16) | (((parseInt(g0*(1-alpha) + alpha*g) & 0xff) << 8)) | ((parseInt(b0*(1-alpha) + alpha*b) & 0xff)) & 0xffffff;
                    }
                }
            }
            x0 += cw + space;
        }

        // create distorted image data based on difficulty level
        img = new Uint8Array(4*wh);
        phase = rand(0, 2) * 3.14 / 2.0;
        amplitude = 3 == difficulty ? 5.0 : (2 == difficulty ? 3.0 : 1.5);
        for (y=0; y<h; ++y)
        {
            y0 = y;
            for (x=0; x<w; ++x)
            {
                x0 = x;
                y0 = Math.max(0, Math.min(h-1, Math.round(y + amplitude * Math.sin(phase + 6.28 * 2 * x / w))));
                c = imgbmp[x0 + w*y0];
                i = 4*(x + w*y);
                img[i] = (c >> 16) & 0xff;
                img[i+1] = (c >> 8) & 0xff;
                img[i+2] = (c) & 0xff;
                img[i+3] = 255;
            }
        }

        // free memory
        bitmaps = null;
        imgbmp = null;

        return [img, w, h];
    }

    chars() {
        return {
            "fontSize": 20,
            "width": 12,
            "height": 15,
            "chars": {
                "0": {
                    "width": 12,
                    "height": 15,
                    "bitmap": [
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        255,
                        0,
                        0,
                        0,
                        222,
                        255,
                        139,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        0,
                        48,
                        255,
                        182,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        94,
                        255,
                        255,
                        0,
                        0,
                        0,
                        222,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                "1": {
                    "width": 12,
                    "height": 15,
                    "bitmap": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        255,
                        222,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        48,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                "2": {
                    "width": 12,
                    "height": 15,
                    "bitmap": [
                        0,
                        0,
                        0,
                        255,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        139,
                        0,
                        0,
                        0,
                        222,
                        255,
                        139,
                        0,
                        0,
                        0,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        94,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0,
                        94,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0
                    ]
                },
                "3": {
                    "width": 12,
                    "height": 15,
                    "bitmap": [
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        182,
                        0,
                        0,
                        0,
                        255,
                        255,
                        48,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        94,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        182,
                        255,
                        139,
                        0,
                        0,
                        0,
                        139,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                "4": {
                    "width": 12,
                    "height": 15,
                    "bitmap": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        182,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        182,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        48,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        139,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        222,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        48,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        48,
                        255,
                        139,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        139,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        48,
                        0,
                        139,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0
                    ]
                },
                "5": {
                    "width": 12,
                    "height": 15,
                    "bitmap": [
                        0,
                        0,
                        94,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        222,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        94,
                        255,
                        255,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        139,
                        0,
                        0,
                        0,
                        94,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        182,
                        255,
                        139,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                "6": {
                    "width": 12,
                    "height": 15,
                    "bitmap": [
                        0,
                        0,
                        0,
                        94,
                        255,
                        255,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        182,
                        0,
                        0,
                        0,
                        182,
                        255,
                        139,
                        0,
                        0,
                        0,
                        222,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        139,
                        0,
                        255,
                        255,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        222,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0,
                        0,
                        94,
                        255,
                        255,
                        222,
                        0,
                        0,
                        0,
                        139,
                        255,
                        182,
                        0,
                        0,
                        94,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        94,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        48,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        255,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        139,
                        255,
                        222,
                        0,
                        0,
                        0,
                        139,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                "7": {
                    "width": 12,
                    "height": 15,
                    "bitmap": [
                        0,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        48,
                        0,
                        0,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        94,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                "8": {
                    "width": 12,
                    "height": 15,
                    "bitmap": [
                        0,
                        0,
                        0,
                        182,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        255,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        182,
                        0,
                        0,
                        0,
                        182,
                        255,
                        139,
                        0,
                        0,
                        0,
                        139,
                        255,
                        94,
                        0,
                        0,
                        0,
                        48,
                        255,
                        182,
                        0,
                        0,
                        0,
                        139,
                        255,
                        94,
                        0,
                        0,
                        0,
                        48,
                        255,
                        182,
                        0,
                        0,
                        0,
                        48,
                        255,
                        182,
                        0,
                        0,
                        0,
                        139,
                        255,
                        94,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        255,
                        255,
                        255,
                        255,
                        94,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        255,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        139,
                        0,
                        0,
                        0,
                        94,
                        255,
                        182,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        48,
                        0,
                        0,
                        182,
                        255,
                        139,
                        0,
                        0,
                        0,
                        94,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        255,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                "9": {
                    "width": 12,
                    "height": 15,
                    "bitmap": [
                        0,
                        0,
                        0,
                        182,
                        255,
                        255,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        139,
                        255,
                        182,
                        0,
                        0,
                        0,
                        139,
                        255,
                        94,
                        0,
                        0,
                        0,
                        222,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        222,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        255,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        48,
                        0,
                        0,
                        182,
                        255,
                        182,
                        0,
                        0,
                        0,
                        182,
                        255,
                        255,
                        48,
                        0,
                        0,
                        0,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        222,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        0,
                        182,
                        255,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        222,
                        0,
                        0,
                        0,
                        182,
                        255,
                        48,
                        0,
                        0,
                        0,
                        48,
                        255,
                        182,
                        0,
                        0,
                        0,
                        139,
                        255,
                        222,
                        0,
                        0,
                        0,
                        222,
                        255,
                        48,
                        0,
                        0,
                        0,
                        0,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        94,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                "+": {
                    "width": 12,
                    "height": 10,
                    "bitmap": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                "-": {
                    "width": 7,
                    "height": 2,
                    "bitmap": [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        222,
                        255,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                },
                "×": {
                    "width": 12,
                    "height": 9,
                    "bitmap": [
                        0,
                        0,
                        222,
                        48,
                        0,
                        0,
                        0,
                        0,
                        182,
                        94,
                        0,
                        0,
                        0,
                        0,
                        255,
                        255,
                        48,
                        0,
                        0,
                        139,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        255,
                        0,
                        139,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        94,
                        255,
                        222,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        48,
                        255,
                        255,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        255,
                        0,
                        139,
                        255,
                        182,
                        0,
                        0,
                        0,
                        0,
                        0,
                        255,
                        255,
                        48,
                        0,
                        0,
                        139,
                        255,
                        139,
                        0,
                        0,
                        0,
                        0,
                        222,
                        48,
                        0,
                        0,
                        0,
                        0,
                        182,
                        94,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0
                    ]
                }
            }
        };
    }
}

// PNG utilities
var APNG_DISPOSE_OP_NONE = 0,
    APNG_DISPOSE_OP_BACKGROUND = 1,
    APNG_DISPOSE_OP_PREVIOUS = 2,
    APNG_BLEND_OP_SOURCE = 0,
    APNG_BLEND_OP_OVER = 1;

var constants = {

  PNG_SIGNATURE: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],

  TYPE_IHDR: 0x49484452,
  TYPE_IEND: 0x49454e44,
  TYPE_IDAT: 0x49444154,
  TYPE_PLTE: 0x504c5445,
  TYPE_tRNS: 0x74524e53,
  TYPE_gAMA: 0x67414d41,

  // color-type bits
  COLORTYPE_GRAYSCALE: 0,
  COLORTYPE_PALETTE: 1,
  COLORTYPE_COLOR: 2,
  COLORTYPE_ALPHA: 4, // e.g. grayscale and alpha

  // color-type combinations
  COLORTYPE_PALETTE_COLOR: 3,
  COLORTYPE_COLOR_ALPHA: 6,

  COLORTYPE_TO_BPP_MAP: {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4
  },

  GAMMA_DIVISION: 100000
};

async function zlib_deflate(data, compressionLevel, chunkSize)
{
    var opts = {
        chunkSize: null == chunkSize ? 16*1024 : chunkSize,
    };
    if (null != compressionLevel) opts.level = compressionLevel;
    return await (new Promise(function(resolve) {
        require('zlib').deflate(data instanceof Buffer ? data : Buffer.from(data), opts, function(err, zdata) {
            resolve(err ? null : zdata);
        });
    }));
}

var crcTable = null;
function computeCRCTable()
{
    if (null == crcTable)
    {
        crcTable = new Int32Array(256);
        for (var i = 0; i < 256; ++i)
        {
            var currentCrc = i;
            for (var j = 0; j < 8; ++j)
            {
                if (currentCrc & 1)
                {
                    currentCrc = 0xedb88320 ^ (currentCrc >>> 1);
                }
                else
                {
                    currentCrc = currentCrc >>> 1;
                }
            }
            crcTable[i] = currentCrc;
        }
    }
    return crcTable;
}
function CrcStream()
{
  this._crc = -1;
}
CrcStream.prototype.write = function(data) {
    var crcTable = computeCRCTable();
    for (var i = 0, l = data.length; i < l; ++i)
    {
        this._crc = crcTable[(this._crc ^ data[i]) & 0xff] ^ (this._crc >>> 8);
    }
    return true;
};
CrcStream.prototype.crc32 = function() {
  return this._crc ^ -1;
};
CrcStream.crc32 = function(buf) {
    var crcTable = computeCRCTable();
    var crc = -1;
    for (var i = 0, l = buf.length; i < l; ++i)
    {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ -1;
};

function bitPacker(data, width, height, options)
{
  var outHasAlpha = options.colorType === constants.COLORTYPE_COLOR_ALPHA;
  if (options.inputHasAlpha && outHasAlpha) {
    return data;
  }
  if (!options.inputHasAlpha && !outHasAlpha) {
    return data;
  }

  var outBpp = outHasAlpha ? 4 : 3;
  var outData = Buffer.alloc(width * height * outBpp);
  var inBpp = options.inputHasAlpha ? 4 : 3;
  var inIndex = 0;
  var outIndex = 0;

  var bgColor = options.bgColor || {};
  if (bgColor.red === undefined) {
    bgColor.red = 255;
  }
  if (bgColor.green === undefined) {
    bgColor.green = 255;
  }
  if (bgColor.blue === undefined) {
    bgColor.blue = 255;
  }

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var red = data[inIndex];
      var green = data[inIndex + 1];
      var blue = data[inIndex + 2];

      var alpha;
      if (options.inputHasAlpha) {
        alpha = data[inIndex + 3];
        if (!outHasAlpha) {
          alpha /= 255;
          red = Math.min(Math.max(Math.round((1 - alpha) * bgColor.red + alpha * red), 0), 255);
          green = Math.min(Math.max(Math.round((1 - alpha) * bgColor.green + alpha * green), 0), 255);
          blue = Math.min(Math.max(Math.round((1 - alpha) * bgColor.blue + alpha * blue), 0), 255);
        }
      }
      else {
        alpha = 255;
      }

      outData[outIndex] = red;
      outData[outIndex + 1] = green;
      outData[outIndex + 2] = blue;
      if (outHasAlpha) {
        outData[outIndex + 3] = alpha;
      }

      inIndex += inBpp;
      outIndex += outBpp;
    }
  }

  return outData;
}

function paethPredictor(left, above, upLeft)
{

  var paeth = left + above - upLeft;
  var pLeft = Math.abs(paeth - left);
  var pAbove = Math.abs(paeth - above);
  var pUpLeft = Math.abs(paeth - upLeft);

  if (pLeft <= pAbove && pLeft <= pUpLeft) {
    return left;
  }
  if (pAbove <= pUpLeft) {
    return above;
  }
  return upLeft;
}

function filterNone(pxData, pxPos, byteWidth, rawData, rawPos) {
  pxData.copy(rawData, rawPos, pxPos, pxPos + byteWidth);
}

function filterSumNone(pxData, pxPos, byteWidth) {

  var sum = 0;
  var length = pxPos + byteWidth;

  for (var i = pxPos; i < length; i++) {
    sum += Math.abs(pxData[i]);
  }
  return sum;
}

function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {

  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var val = pxData[pxPos + x] - left;

    rawData[rawPos + x] = val;
  }
}

function filterSumSub(pxData, pxPos, byteWidth, bpp) {

  var sum = 0;
  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var val = pxData[pxPos + x] - left;

    sum += Math.abs(val);
  }

  return sum;
}

function filterUp(pxData, pxPos, byteWidth, rawData, rawPos) {

  for (var x = 0; x < byteWidth; x++) {

    var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    var val = pxData[pxPos + x] - up;

    rawData[rawPos + x] = val;
  }
}

function filterSumUp(pxData, pxPos, byteWidth) {

  var sum = 0;
  var length = pxPos + byteWidth;
  for (var x = pxPos; x < length; x++) {

    var up = pxPos > 0 ? pxData[x - byteWidth] : 0;
    var val = pxData[x] - up;

    sum += Math.abs(val);
  }

  return sum;
}

function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {

  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    var val = pxData[pxPos + x] - ((left + up) >> 1);

    rawData[rawPos + x] = val;
  }
}

function filterSumAvg(pxData, pxPos, byteWidth, bpp) {

  var sum = 0;
  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    var val = pxData[pxPos + x] - ((left + up) >> 1);

    sum += Math.abs(val);
  }

  return sum;
}

function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {

  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    var upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
    var val = pxData[pxPos + x] - paethPredictor(left, up, upleft);

    rawData[rawPos + x] = val;
  }
}

function filterSumPaeth(pxData, pxPos, byteWidth, bpp) {
  var sum = 0;
  for (var x = 0; x < byteWidth; x++) {

    var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
    var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
    var upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
    var val = pxData[pxPos + x] - paethPredictor(left, up, upleft);

    sum += Math.abs(val);
  }

  return sum;
}

var filters = {
  0: filterNone,
  1: filterSub,
  2: filterUp,
  3: filterAvg,
  4: filterPaeth
};

var filterSums = {
  0: filterSumNone,
  1: filterSumSub,
  2: filterSumUp,
  3: filterSumAvg,
  4: filterSumPaeth
};

function filter(pxData, width, height, options, bpp)
{
  var filterTypes;
  if (!('filterType' in options) || options.filterType === -1) {
    filterTypes = [0, 1, 2, 3, 4];
  }
  else if (typeof options.filterType === 'number') {
    filterTypes = [options.filterType];
  }
  else {
    throw new Error('unrecognised filter types');
  }

  var byteWidth = width * bpp;
  var rawPos = 0;
  var pxPos = 0;
  var rawData = Buffer.alloc((byteWidth + 1) * height);
  var sel = filterTypes[0];

  for (var y = 0; y < height; y++) {

    if (filterTypes.length > 1) {
      // find best filter for this line (with lowest sum of values)
      var min = Infinity;

      for (var i = 0; i < filterTypes.length; i++) {
        var sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp);
        if (sum < min) {
          sel = filterTypes[i];
          min = sum;
        }
      }
    }

    rawData[rawPos] = sel;
    rawPos++;
    filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp);
    rawPos += byteWidth;
    pxPos += byteWidth;
  }
  return rawData;
}

var Packer = function(options) {
  this._options = options;

  options.deflateChunkSize = options.deflateChunkSize || 32 * 1024;
  options.deflateLevel = options.deflateLevel != null ? options.deflateLevel : 9;
  options.deflateStrategy = options.deflateStrategy != null ? options.deflateStrategy : 3;
  options.inputHasAlpha = options.inputHasAlpha != null ? options.inputHasAlpha : true;
  //options.deflateFactory = options.deflateFactory || FILTER.Util.ZLib.createDeflate;
  options.bitDepth = options.bitDepth || 8;
  options.colorType = (typeof options.colorType === 'number') ? options.colorType : constants.COLORTYPE_COLOR_ALPHA;

  if (options.colorType !== constants.COLORTYPE_COLOR && options.colorType !== constants.COLORTYPE_COLOR_ALPHA) {
    throw new Error('option color type:' + options.colorType + ' is not supported at present');
  }
  if (options.bitDepth !== 8) {
    throw new Error('option bit depth:' + options.bitDepth + ' is not supported at present');
  }
};

Packer.prototype.getDeflateOptions = function() {
  return {
    chunkSize: this._options.deflateChunkSize,
    level: this._options.deflateLevel,
    strategy: this._options.deflateStrategy
  };
};

Packer.prototype.createDeflate = function() {
  return this._options.deflateFactory(this.getDeflateOptions());
};

Packer.prototype.filterData = function(data, width, height) {
  // convert to correct format for filtering (e.g. right bpp and bit depth)
  var packedData = bitPacker(data, width, height, this._options);

  // filter pixel data
  var bpp = constants.COLORTYPE_TO_BPP_MAP[this._options.colorType];
  var filteredData = filter(packedData, width, height, this._options, bpp);
  return filteredData;
};

Packer.prototype._packChunk = function(type, data) {

  var len = (data ? data.length : 0);
  var buf = Buffer.alloc(len + 12);

  buf.writeUInt32BE(len, 0);
  buf.writeUInt32BE(type, 4);

  if (data) {
    data.copy(buf, 8);
  }

  buf.writeInt32BE(CrcStream.crc32(buf.slice(4, buf.length - 4)), buf.length - 4);
  return buf;
};

Packer.prototype.packGAMA = function(gamma) {
  var buf = Buffer.alloc(4);
  buf.writeUInt32BE(Math.floor(gamma * constants.GAMMA_DIVISION), 0);
  return this._packChunk(constants.TYPE_gAMA, buf);
};

Packer.prototype.packIHDR = function(width, height) {

  var buf = Buffer.alloc(13);
  buf.writeUInt32BE(width, 0);
  buf.writeUInt32BE(height, 4);
  buf[8] = this._options.bitDepth;  // Bit depth
  buf[9] = this._options.colorType; // colorType
  buf[10] = 0; // compression
  buf[11] = 0; // filter
  buf[12] = 0; // interlace

  return this._packChunk(constants.TYPE_IHDR, buf);
};

Packer.prototype.packIDAT = function(data) {
  return this._packChunk(constants.TYPE_IDAT, data);
};

Packer.prototype.packIEND = function() {
  return this._packChunk(constants.TYPE_IEND, null);
};

// export it
return SimpleCaptcha;
});
