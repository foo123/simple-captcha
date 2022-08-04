<?php

define('ROOT', dirname(__FILE__));
include(ROOT.'/../../tico/tico/Tico.php');

tico('http://localhost:8000', ROOT)
    ->option('webroot', ROOT)
    ->option('views', [tico()->path('/views')])
    ->option('case_insensitive_uris', true)
    ->set('captcha', function() {
        include(ROOT.'/../src/php/SimpleCaptcha.php');
        return (new SimpleCaptcha())
            ->option('secret_key', 'SECRET_KEY')
            ->option('secret_salt', 'SECRET_SALT_')
            ->option('difficulty', 2)
            ->option('num_terms', 3)
            ->option('min_term', 1)
            ->option('max_term', 21)
            ->option('color', 0x121212)
            ->option('background', 0xffffff)
            ->reset()
        ;
    })
    ->on('*', '/', function() {

        $msg = '';
        if ('POST' === tico()->requestMethod())
        {
            $msg = tico()->get('captcha')->validate(tico()->request()->request->get('answer', ''), tico()->request()->request->get('hash', '')) ? 'Correct Captcha' : 'Wrong Captcha';
        }
        tico()->output(
            array(
                'title' => 'Index',
                'msg' => $msg
            ),
            'index.tpl.php'
        );

    })
    ->on('*', '/captcha-refresh', function() {

        tico()->output(
            array(
                'captcha' => tico()->get('captcha')->getCaptcha(),
                'hash' => tico()->get('captcha')->getHash()
            ),
            'json'
        );

    })
    ->on(false, function() {

        tico()->output(
            array(),
            '404.tpl.php',
            array('StatusCode' => 404)
        );

    })
    ->serve()
;

exit;