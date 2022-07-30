<?php
/**
*   SimpleCaptcha
*   Simple image-based macthematical captcha
*
*   @version 1.0.0
*   https://github.com/foo123/simple-captcha
*
**/

if (!class_exists('SimpleCaptcha', false))
{
class SimpleCaptcha
{
    const VERSION = '1.0.0';

    private $opts = null;
    private $captcha = null;
    private $hmac = null;

    public function __construct()
    {
        $this->captcha = null;
        $this->hmac = null;
        $this->opts = array();
        $this
            ->option('secret_key', 'SECRET_KEY')
            ->option('secret_salt', 'SECRET_SALT_')
            ->option('num_terms', 2)
            ->option('min_term', 0)
            ->option('max_term', 20)
            ->option('color', 0x0)
            ->option('background', 0xffffff)
        ;
    }

    public function option($key, $val = null)
    {
        $nargs = func_num_args();
        if (1 == $nargs)
        {
            return isset($this->opts[$key]) ? $this->opts[$key] : null;
        }
        elseif (1 < $nargs)
        {
            $this->opts[$key] = $val;
        }
        return $this;
    }


    public function getCaptcha()
    {
        if (empty($this->captcha)) $this->gen();
        return $this->captcha;
    }

    public function getHash()
    {
        if (empty($this->captcha)) $this->gen();
        return $this->hmac;
    }

    public function validate($answer = null, $hmac = null)
    {
        if ((null == $answer) || empty($hmac)) return false;
        $algo = function_exists('hash') ? 'sha256' : 'sha1';
        $hash = hash_hmac($algo, (string)($this->option('secret_salt') ? $this->option('secret_salt') : '') . (string)$answer, $this->option('secret_key'));
        return hash_equals($hash, $hmac);
    }

    private function gen()
    {
        $n = max(2, (int)$this->option('num_terms'));
        $min = max(0, (int)$this->option('min_term'));
        $max = max(0, (int)$this->option('max_term'));
        $m = strlen((string)$max);
        // compute mathematical formula
        $str = ''; $sum = 0;
        for ($i=0; $i<$n; ++$i)
        {
            $x = (int)mt_rand($min, $max);
            $sum += $x;
            $str .= (0 == $i ? '' : '+') . (string)$x;
        }

        // compute hmac hash of formula
        $algo = function_exists('hash') ? 'sha256' : 'sha1';
        $this->hmac = hash_hmac($algo, (string)($this->option('secret_salt') ? $this->option('secret_salt') : '') . (string)$sum, $this->option('secret_key'));

        // create captcha image (with some padding)
        $color = (int)$this->option('color');
        $background = (int)$this->option('background');
        $w = $n*$m*20+20; $h = 16+20; $font = 5;
        $img = imagecreate($w, $h);
        $bg = imagecolorallocate($img, ($background >> 16) & 0xff, ($background >> 8) & 0xff, $background & 0xff);
        // Write the string, with some padding
        imagestring($img, $font, 10, 10, $str, imagecolorallocate($img, ($color >> 16) & 0xff, ($color >> 8) & 0xff, $color & 0xff));
        ob_start();
        imagepng($img);
        $this->captcha = 'data:image/png;base64,' . base64_encode(ob_get_clean());
        imagedestroy($img);

        return $this;
    }
}
}
