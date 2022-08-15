<?php

include(dirname(__FILE__).'/../../src/php/SimpleCaptcha.php');

function test()
{
    $captcha = (new SimpleCaptcha())
            ->option('secret_key', 'SECRET_KEY')
            ->option('secret_salt', 'SECRET_SALT_')
            ->option('num_terms', 2)
            ->option('max_num_terms', 3) // -1 means constant num_terms
            ->option('min_term', 1)
            ->option('max_term', 21)
            ->option('color', 0x121212) // text color
            ->option('background', 0xffffff) // background color
    ;

    $captcha->reset();
    $captcha->option('difficulty', 2); // 0 (easy) to 3 (difficult)
    $captcha->option('distortion_type', 1); // 1: position distortion

    echo $captcha->getCaptcha() . PHP_EOL;
    echo PHP_EOL;
    echo $captcha->getHash() . PHP_EOL;

    echo PHP_EOL . PHP_EOL;

    $captcha->reset();
    $captcha->option('difficulty', 2); // 0 (easy) to 3 (difficult)
    $captcha->option('distortion_type', 2); // 2: scale distortion

    echo $captcha->getCaptcha() . PHP_EOL;
    echo PHP_EOL;
    echo $captcha->getHash() . PHP_EOL;
}

echo 'SimpleCaptcha::VERSION ' . SimpleCaptcha::VERSION . PHP_EOL;

test();