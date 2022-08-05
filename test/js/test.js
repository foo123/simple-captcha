"use strict";

var SimpleCaptcha = require('../../src/js/SimpleCaptcha.js'),
    echo = console.log;

async function test()
{
    var captcha = (new SimpleCaptcha())
            .option('secret_key', 'SECRET_KEY')
            .option('secret_salt', 'SECRET_SALT_')
            .option('difficulty', 2) // 1 (easy) to 3 (difficult)
            .option('num_terms', 3)
            .option('min_term', 1)
            .option('max_term', 21)
            .option('color', 0x121212) // text color
            .option('background', 0xffffff) // background color
            .reset();

    echo(await captcha.getCaptcha());
    echo();
    echo(await captcha.getHash());

}

test();