<?php
/**
*   SimpleCaptcha
*   Simple image-based macthematical captcha
*
*   @version 1.2.0
*   https://github.com/foo123/simple-captcha
*
**/

if (!class_exists('SimpleCaptcha', false))
{
class SimpleCaptcha
{
    const VERSION = '1.2.0';

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
            ->option('difficulty', 1) // 1 (easy) to 3 (difficult)
            ->option('num_terms', 2)
            ->option('min_term', 1)
            ->option('max_term', 20)
            ->option('color', 0x121212) // text color
            ->option('background', 0xffffff) // background color
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

    public function reset()
    {
        $this->captcha = null;
        $this->hmac = null;
        return $this;
    }

    public function validate($answer = null, $hmac = null)
    {
        if ((null == $answer) || empty($hmac)) return false;
        $algo = function_exists('hash') ? 'sha256' : 'sha1';
        $hash = hash_hmac($algo, (string)$this->option('secret_salt') . (string)$answer, (string)$this->option('secret_key'));
        return hash_equals($hash, $hmac);
    }

    private function gen()
    {
        $difficulty = min(3, max(1, (int)$this->option('difficulty')));
        $n = max(2, (int)$this->option('num_terms'));
        $min = max(0, (int)$this->option('min_term'));
        $max = max(0, (int)$this->option('max_term'));

        // generate mathematical formula
        $str = '';
        $sum = 0;
        $factor = 0;
        for ($i=0; $i<$n; ++$i)
        {
            $x = (int)mt_rand($min, $max);
            // randomly use plus or minus operator
            if (($sum > $x) && mt_rand(0, 1)) $x = -$x;
            else if (($x <= 5) && mt_rand(0, 1)) $factor = (int)mt_rand(2, 3);
            if (0 < $factor)
            {
                // randomly use multiplication factor
                $sum += $x * $factor;
                $str .= (0 == $i ? '' : '+') . ((string)$x) . '*' . ((string)$factor);
                $factor = 0;
            }
            else
            {
                $sum += $x;
                $str .= (0 == $i ? '' : (0 > $x ? '' : '+')) . ((string)$x);
            }
        }

        // compute hmac of result
        $algo = function_exists('hash') ? 'sha256' : 'sha1';
        $this->hmac = hash_hmac($algo, (string)($this->option('secret_salt') ? $this->option('secret_salt') : '') . (string)$sum, $this->option('secret_key'));

        // create image (with some padding)
        $background = (int)$this->option('background');
        $color1 = (int)$this->option('color');
        $font = 5;
        $fw = imagefontwidth($font);
        $fh = imagefontheight($font);
        $w = strlen($str) * $fw + 25;
        $h = $fh + 20;
        if (1 < $difficulty) $h += 5;
        $img0 = imagecreate($w, $h);
        $bg = imagecolorallocate($img0, ($background >> 16) & 0xff, ($background >> 8) & 0xff, $background & 0xff);
        $c1 = imagecolorallocate($img0, ($color1 >> 16) & 0xff, ($color1 >> 8) & 0xff, $color1 & 0xff);

        // write the string, with some padding
        imagestring($img0, $font, 10, 10, $str, $c1);

        // distort depending on difficulty level
        $img = imagecreate($w, $h);
        $bg = imagecolorallocate($img, ($background >> 16) & 0xff, ($background >> 8) & 0xff, $background & 0xff);
        $c1 = imagecolorallocate($img, ($color1 >> 16) & 0xff, ($color1 >> 8) & 0xff, $color1 & 0xff);
        for ($y=0; $y<$h; ++$y)
        {
            $y0 = $y;
            for ($x=0; $x<$w; ++$x)
            {
                $x0 = $x;
                $y0 = max(0, min($h-1, round($y + $difficulty * 1.2 * sin(6.28 * 2 * $x / $w))));
                imagesetpixel($img, $x, $y, imagecolorat($img0, $x0, $y0));
            }
        }
        // free memory
        imagedestroy($img0);

        // output image
        ob_start(); imagepng($img);
        $this->captcha = 'data:image/png;base64,' . base64_encode(ob_get_clean());

        // free memory
        imagedestroy($img);

        return $this;
    }
}
}
