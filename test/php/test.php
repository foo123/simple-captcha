<?php

include(dirname(__FILE__).'/../../src/php/SimpleCaptcha.php');

$tile = json_decode(file_get_contents(dirname(__FILE__).'/../tile.json'), true);

function test()
{
    global $tile;

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
    $captcha->option('color', [0xff0000, 0xffff00, 0x0000ff, 0x00ff00]); // text color gradient
    $captcha->option('background', /*0x1Da1C1*/$tile); // background color/pattern

    echo $captcha->getCaptcha() . PHP_EOL;
    echo PHP_EOL;
    echo $captcha->getHash() . PHP_EOL;

    echo PHP_EOL . PHP_EOL;

    $captcha->reset();
    $captcha->option('difficulty', 2); // 0 (easy) to 3 (difficult)
    $captcha->option('distortion_type', 2); // 2: scale distortion
    $captcha->option('color', 0xffffff); // text color
    $captcha->option('background', [0xff0000, 0xffff00, 0x00ff00, 0x0000ff]); // background color gradient

    echo $captcha->getCaptcha() . PHP_EOL;
    echo PHP_EOL;
    echo $captcha->getHash() . PHP_EOL;
}

echo 'SimpleCaptcha::VERSION ' . SimpleCaptcha::VERSION . PHP_EOL;

test();