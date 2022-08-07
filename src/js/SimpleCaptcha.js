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
        return 'data:image/png;base64,' + (await (new PNGPacker(metaData)).toPNG(img, width, height)).toString('base64');
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
        this.option('secret_key', 'SECRET_KEY');
        this.option('secret_salt', 'SECRET_SALT_');
        this.option('difficulty', 1); // 1 (easy) to 3 (difficult)
        this.option('num_terms', 2); // default
        this.option('min_term', 1); // default
        this.option('max_term', 20); // default
        this.option('has_multiplication', true); // default
        this.option('has_division', true); // default
        this.option('has_equal_sign', true); // default
        this.option('color', 0x121212); // text color
        this.option('background', 0xffffff); // background color
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
            num_terms = Math.max(1, parseInt(this.option('num_terms'))),
            min_term = Math.max(0, parseInt(this.option('min_term'))),
            max_term = Math.max(0, parseInt(this.option('max_term'))),
            has_mult = !!this.option('has_multiplication'),
            has_div = !!this.option('has_division'),
            has_equal = !!this.option('has_equal_sign'),
            color = parseInt(this.option('color')),
            background = parseInt(this.option('background')),
            formula, result, captcha, width, height
        ;

        // generate mathematical formula
        [formula, result] = this.formula(num_terms, min_term, max_term, has_mult, has_div, has_equal, difficulty);

        // compute hmac of result
        this.hmac = await createHash(String(this.option('secret_key')), String(this.option('secret_salt') ? this.option('secret_salt') : '') + String(result));

        // create image captcha with formula depending on difficulty
        [captcha, width, height] = this.image(formula, color, background, difficulty);

        // output image
        this.captcha = await imagepng(captcha, width, height);

        return this;
    }

    formula(terms, min, max, has_mult, has_div, has_equal, difficulty) {
        // generate mathematical formula
        var formula = [], result = 0, factor = 0, divider = 0, i, x;
        for (i=0; i<terms; ++i)
        {
            x = rand(min, max);
            if ((result > x) && rand(0, 1))
            {
                // randomly use plus or minus operator
                x = -x;
            }
            else if (has_mult && (x <= 10) && rand(0, 1))
            {
                // randomly use multiplication factor
                factor = rand(2, 3);
            }
            else if (has_div && (0 === x % 2) && rand(0, 1))
            {
                // randomly use division factor
                divider = 0 === x % 6 ? rand(2, 3) : 2;
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
            else if (0 < divider)
            {
                result += Math.floor(x / divider);
                if (0 > x)
                {
                    formula.push('-');
                    formula.push.apply(formula, String(Math.abs(x)).split(''));
                    formula.push('÷');
                    formula.push.apply(formula, String(divider).split(''));
                }
                else
                {
                    if (0 < i) formula.push('+');
                    formula.push.apply(formula, String(x).split(''));
                    formula.push('÷');
                    formula.push.apply(formula, String(divider).split(''));
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
            divider = 0;
        }
        if (has_equal)
        {
            formula.push('=');
            formula.push('?');
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

            r0 = clamp((background >>> 16) & 0xff),
            g0 = clamp((background >>> 8) & 0xff),
            b0 = clamp(background & 0xff),
            r = clamp((color >>> 16) & 0xff),
            g = clamp((color >>> 8) & 0xff),
            b = clamp(color & 0xff),
            imgbmp = new Uint32Array(wh),
            charbmp, img, c, i, x, y, alpha,
            phase, amplitude
        ;

        // img bitmap
        for (c=((r0 << 16) | (g0 << 8) | (b0)) & 0xffffffff,i=0; i<wh; ++i)
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
                        imgbmp[x0+x + w*(y0+y)] = ((clamp(r0*(1-alpha) + alpha*r) << 16) | (clamp(g0*(1-alpha) + alpha*g) << 8) | (clamp(b0*(1-alpha) + alpha*b))) & 0xffffffff;
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
                img[i] = clamp((c >>> 16) & 0xff);
                img[i+1] = clamp((c >>> 8) & 0xff);
                img[i+2] = clamp(c & 0xff);
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
                },
                "÷": {
                    "width": 11,
                    "height": 8,
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
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
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
                        182,
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
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
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
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
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
                "=": {
                    "width": 12,
                    "height": 6,
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
                        222,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        255,
                        139,
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
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
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
                        255,
                        255,
                        255,
                        255,
                        139,
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
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
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
                "?": {
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
                        255,
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
                        255,
                        94,
                        0,
                        0,
                        0,
                        182,
                        255,
                        182,
                        0,
                        0,
                        0,
                        139,
                        255,
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
                        139,
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
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
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
                        139,
                        255,
                        94,
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
var PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],

    TYPE_IHDR = 0x49484452,
    TYPE_gAMA = 0x67414d41,
    TYPE_tRNS = 0x74524e53,
    TYPE_PLTE = 0x504c5445,
    TYPE_IDAT = 0x49444154,
    TYPE_IEND = 0x49454e44,

    // color-type bits
    COLORTYPE_GRAYSCALE = 0,
    COLORTYPE_PALETTE = 1,
    COLORTYPE_COLOR = 2,
    COLORTYPE_ALPHA = 4, // e.g. grayscale and alpha

    // color-type combinations
    COLORTYPE_PALETTE_COLOR = 3,
    COLORTYPE_COLOR_ALPHA = 6,

    COLORTYPE_TO_BPP_MAP = {
        0: 1,
        2: 3,
        3: 1,
        4: 2,
        6: 4
    },

    GAMMA_DIVISION = 100000
;

function clamp(value)
{
    return Math.max(0, Math.min(255, Math.round(value)));
}
function paethPredictor(left, above, upLeft)
{
    var paeth = left + above - upLeft,
        pLeft = Math.abs(paeth - left),
        pAbove = Math.abs(paeth - above),
        pUpLeft = Math.abs(paeth - upLeft)
    ;

    if (pLeft <= pAbove && pLeft <= pUpLeft) return left;
    if (pAbove <= pUpLeft) return above;
    return upLeft;
}
function filterNone(pxData, pxPos, byteWidth, rawData, rawPos)
{
    pxData.copy(rawData, rawPos, pxPos, pxPos + byteWidth);
}
function filterSumNone(pxData, pxPos, byteWidth)
{
    var sum = 0, length = pxPos + byteWidth;
    for (var i = pxPos; i < length; i++)
    {
        sum += Math.abs(pxData[i]);
    }
    return sum;
}
function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp)
{
    for (var x = 0; x < byteWidth; x++)
    {
        var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        var val = pxData[pxPos + x] - left;
        rawData[rawPos + x] = val;
    }
}
function filterSumSub(pxData, pxPos, byteWidth, bpp)
{
    var sum = 0;
    for (var x = 0; x < byteWidth; x++)
    {
        var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        var val = pxData[pxPos + x] - left;
        sum += Math.abs(val);
    }
    return sum;
}
function filterUp(pxData, pxPos, byteWidth, rawData, rawPos)
{
    for (var x = 0; x < byteWidth; x++)
    {
        var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        var val = pxData[pxPos + x] - up;
        rawData[rawPos + x] = val;
    }
}
function filterSumUp(pxData, pxPos, byteWidth)
{
    var sum = 0, length = pxPos + byteWidth;
    for (var x = pxPos; x < length; x++)
    {
        var up = pxPos > 0 ? pxData[x - byteWidth] : 0;
        var val = pxData[x] - up;
        sum += Math.abs(val);
    }
    return sum;
}
function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp)
{
    for (var x = 0; x < byteWidth; x++)
    {
        var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        var val = pxData[pxPos + x] - ((left + up) >> 1);
        rawData[rawPos + x] = val;
    }
}
function filterSumAvg(pxData, pxPos, byteWidth, bpp)
{
    var sum = 0;
    for (var x = 0; x < byteWidth; x++)
    {
        var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        var val = pxData[pxPos + x] - ((left + up) >> 1);
        sum += Math.abs(val);
    }
    return sum;
}
function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp)
{
    for (var x = 0; x < byteWidth; x++)
    {
        var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        var upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        var val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        rawData[rawPos + x] = val;
    }
}
function filterSumPaeth(pxData, pxPos, byteWidth, bpp)
{
    var sum = 0;
    for (var x = 0; x < byteWidth; x++)
    {
        var left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        var up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        var upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        var val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        sum += Math.abs(val);
    }
    return sum;
}

async function deflate(data, compressionLevel, chunkSize)
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
function getCRCTable()
{
    if (null == crcTable)
    {
        crcTable = new Int32Array(256);
        var i, j, currentCrc;
        for (i=0; i<256; ++i)
        {
            currentCrc = i;
            for (j=0; j<8; ++j)
            {
                currentCrc = currentCrc & 1 ? (0xedb88320 ^ (currentCrc >>> 1)) : (currentCrc >>> 1);
            }
            crcTable[i] = currentCrc;
        }
    }
    return crcTable;
}
function crc32(buffer)
{
    var crcTable = getCRCTable(), crc = -1, i, l;
    for (i=0,l=buffer.length; i<l; ++i)
    {
        crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ (-1);
}
function I1(value, buffer = null, pos = 0)
{
    if (null == buffer) buffer = Buffer.alloc(1);
    if (null == pos) pos = 0;
    buffer[pos] = value;
    return buffer;
}
function I4(value, buffer = null, pos = 0)
{
    if (null == buffer) buffer = Buffer.alloc(4);
    if (null == pos) pos = 0;
    buffer.writeUInt32BE(value, pos);
    return buffer;
}
function i4(value, buffer = null, pos = 0)
{
    if (null == buffer) buffer = Buffer.alloc(4);
    if (null == pos) pos = 0;
    buffer.writeInt32BE(value, pos);
    return buffer;
}

class PNGPacker
{
    _options = null;

    constructor(options) {
        options = options || {};

        options.deflateChunkSize = Math.max(1024, parseInt(options.deflateChunkSize || 32 * 1024));
        options.deflateLevel = Math.min(9, Math.max(0, parseInt(options.deflateLevel != null ? options.deflateLevel : 9)));
        options.deflateStrategy = Math.min(3, Math.max(0, parseInt(options.deflateStrategy != null ? options.deflateStrategy : 3)));
        options.inputHasAlpha = !!(options.inputHasAlpha != null ? options.inputHasAlpha : true);
        options.bitDepth = 8//options.bitDepth || 8;
        options.colorType = Math.min(6, Math.max(0, parseInt(('number' === typeof options.colorType) ? options.colorType : COLORTYPE_COLOR_ALPHA)));

        if (options.colorType !== COLORTYPE_COLOR && options.colorType !== COLORTYPE_COLOR_ALPHA)
        {
            throw new Error('option color type:' + options.colorType + ' is not supported at present');
        }
        /*if (options.bitDepth !== 8)
        {
            throw new Error('option bit depth:' + options.bitDepth + ' is not supported at present');
        }*/
        this._options = options;
    }

    async toPNG(data, width, height) {
        var png = [], filteredData, compressedData, deflateOpts;

        // Signature
        png.push(Buffer.from(PNG_SIGNATURE));

        // Header
        png.push(this.packIHDR(width, height));

        // gAMA
        if (this._options.gamma) png.push(this.packGAMA(this._options.gamma));

        // filter data
        filteredData = this.filterData(Buffer.from(data), width, height);

        // compress data
        deflateOpts = this.getDeflateOptions();
        compressedData = await deflate(filteredData, deflateOpts.level, deflateOpts.chuckSize);
        filteredData = null;

        if (!compressedData || !compressedData.length)
            throw new Error('bad png - invalid compressed data response');

        // Data
        png.push(this.packIDAT(Buffer.from(compressedData)));
        compressedData = null;

        // End
        png.push(this.packIEND());

        return Buffer.concat(png);
    }

    getDeflateOptions() {
        return {
            chunkSize: this._options.deflateChunkSize,
            level: this._options.deflateLevel,
            strategy: this._options.deflateStrategy
        };
    }

    filterData(data, width, height) {
        // convert to correct format for filtering (e.g. right bpp and bit depth)
        // and filter pixel data
        return this._filter(this._bitPack(data, width, height), width, height);
    }

    packIHDR(width, height) {
        var buffer = Buffer.alloc(13);
        I4(width, buffer, 0);
        I4(height, buffer, 4);
        I1(this._options.bitDepth, buffer, 8);  // bit depth
        I1(this._options.colorType, buffer, 9); // colorType
        I1(0, buffer, 10); // compression
        I1(0, buffer, 11); // filter
        I1(0, buffer, 12); // interlace
        return this._packChunk(TYPE_IHDR, buffer);
    }

    packGAMA(gamma) {
        return this._packChunk(TYPE_gAMA, I4(Math.floor(parseFloat(gamma) * GAMMA_DIVISION)));
    }

    packIDAT(data) {
        return this._packChunk(TYPE_IDAT, data);
    }

    packIEND() {
        return this._packChunk(TYPE_IEND, null);
    }

    _bitPack(data, width, height) {
        var inputHasAlpha = this._options.inputHasAlpha,
            outHasAlpha = this._options.colorType === COLORTYPE_COLOR_ALPHA;
        if (inputHasAlpha && outHasAlpha)
        {
            return data;
        }
        if (!inputHasAlpha && !outHasAlpha)
        {
            return data;
        }

        var outBpp = outHasAlpha ? 4 : 3,
            outData = Buffer.alloc(width * height * outBpp),
            inBpp = inputHasAlpha ? 4 : 3,
            inIndex = 0,
            outIndex = 0,
            bgColor = this._options.bgColor || {},
            x, y, red, green, blue, alpha,
            bgRed, bgGreen, bgBlue
        ;

        bgRed = clamp(bgColor.red != null ? bgColor.red : 255);
        bgGreen = clamp(bgColor.green != null ? bgColor.green : 255);
        bgBlue = clamp(bgColor.blue != null ? bgColor.blue : 255);

        for (y = 0; y < height; y++)
        {
            for (x = 0; x < width; x++)
            {
                red = data[inIndex];
                green = data[inIndex + 1];
                blue = data[inIndex + 2];

                if (inputHasAlpha)
                {
                    alpha = data[inIndex + 3];
                    if (!outHasAlpha)
                    {
                        alpha /= 255.0;
                        red = (1 - alpha) * bgRed + alpha * red;
                        green = (1 - alpha) * bgGreen + alpha * green;
                        blue = (1 - alpha) * bgBlue + alpha * blue;
                    }
                }
                else
                {
                    alpha = 255;
                }

                outData[outIndex] = clamp(red);
                outData[outIndex + 1] = clamp(green);
                outData[outIndex + 2] = clamp(blue);
                if (outHasAlpha) outData[outIndex + 3] = clamp(alpha);

                inIndex += inBpp;
                outIndex += outBpp;
            }
        }
        return outData;
    }

    _filter(pxData, width, height) {
        var filters = [
            filterNone,
            filterSub,
            filterUp,
            filterAvg,
            filterPaeth
        ];
        var filterSums = [
            filterSumNone,
            filterSumSub,
            filterSumUp,
            filterSumAvg,
            filterSumPaeth
        ];
        var filterTypes = [0]; // use default to match with python version

        /*if ((null == this._options.filterType) || (-1 === this._options.filterType))
        {
            filterTypes = [0, 1, 2, 3, 4];
        }
        else if ('number' === typeof this._options.filterType)
        {
            filterTypes = [this._options.filterType];
        }
        else
        {
            throw new Error('unrecognised filter types');
        }*/

        var bpp = COLORTYPE_TO_BPP_MAP[this._options.colorType],
            byteWidth = width * bpp,
            rawPos = 0, pxPos = 0,
            rawData = Buffer.alloc((byteWidth + 1) * height),
            sel = filterTypes[0],
            y, i, n = filterTypes.length, min, sum
        ;

        for (y = 0; y < height; y++)
        {
            if (n > 1)
            {
                // find best filter for this line (with lowest sum of values)
                min = Infinity;
                for (i=0; i<n; i++)
                {
                    sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp);
                    if (sum < min)
                    {
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

    _packChunk(type, data = null) {
        var length = data ? data.length : 0,
            buffer = Buffer.alloc(length + 12)
        ;
        I4(length, buffer, 0);
        I4(type, buffer, 4);
        if (data) data.copy(buffer, 8);
        i4(crc32(buffer.slice(4, buffer.length - 4)), buffer, buffer.length - 4);
        return buffer;
    }
}

// export it
return SimpleCaptcha;
});
