<?php

include(dirname(__FILE__).'/../../src/php/SimpleCaptcha.php');

function test()
{
    $captcha = (new SimpleCaptcha())
            ->option('secret_key', 'SECRET_KEY')
            ->option('secret_salt', 'SECRET_SALT_')
            ->option('difficulty', 2) // 1 (easy) to 3 (difficult)
            ->option('num_terms', 2)
            ->option('min_term', 1)
            ->option('max_term', 21)
            ->option('color', 0x121212) // text color
            ->option('background', 0xffffff) // background color
    ;

    $captcha->reset();

    echo $captcha->getCaptcha() . PHP_EOL;
    echo PHP_EOL;
    echo $captcha->getHash() . PHP_EOL;
}

test();