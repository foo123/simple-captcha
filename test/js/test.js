"use strict";

var SimpleCaptcha = require('../../src/js/SimpleCaptcha.js'),
    echo = console.log;

async function test()
{
    const captcha = (new SimpleCaptcha())
            .option('secret_key', 'SECRET_KEY')
            .option('secret_salt', 'SECRET_SALT_')
            .option('num_terms', 2)
            .option('max_num_terms', 3) // -1 means constant num_terms
            .option('min_term', 1)
            .option('max_term', 21)
            .option('color', 0x121212) // text color
            .option('background', 0xffffff) // background color
    ;

    captcha.reset();
    captcha.option('difficulty', 2); // 0 (easy) to 3 (difficult)
    captcha.option('distortion_type', 1); // 1: position distortion

    echo(await captcha.getCaptcha());
    echo();
    echo(await captcha.getHash());

    echo("\n");

    captcha.reset();
    captcha.option('difficulty', 2); // 0 (easy) to 3 (difficult)
    captcha.option('distortion_type', 2); // 2: scale distortion

    echo(await captcha.getCaptcha());
    echo();
    echo(await captcha.getHash());
}

echo('SimpleCaptcha.VERSION ' + SimpleCaptcha.VERSION);

test();