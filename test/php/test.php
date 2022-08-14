<?php

include(dirname(__FILE__).'/../../src/php/SimpleCaptcha.php');

function test()
{
    $captcha = (new SimpleCaptcha())
            ->option('secret_key', 'SECRET_KEY')
            ->option('secret_salt', 'SECRET_SALT_')
            ->option('difficulty', 2) // 0 (easy) to 3 (difficult)
            ->option('distortion', ['2'=>4.0]) // image distortion based on difficulty
            ->option('num_terms', 2)
            ->option('max_num_terms', 4) // -1 means constant num_terms
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

echo 'SimpleCaptcha::VERSION ' . SimpleCaptcha::VERSION . PHP_EOL;

test();