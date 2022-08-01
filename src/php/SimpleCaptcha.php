<?php
/**
*   SimpleCaptcha
*   Simple image-based macthematical captcha
*
*   @version 1.1.0
*   https://github.com/foo123/simple-captcha
*
**/

if (!class_exists('SimpleCaptcha', false))
{
class SimpleCaptcha
{
    const VERSION = '1.1.0';

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
            ->option('color2', 0x717171) // secondary text color
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

        // compute mathematical formula
        $n_2 = $n / 2;
        $str1 = '';
        $str2 = '';
        $nums = array();
        $sum = 0;
        for ($i=0; $i<$n; ++$i)
        {
            $x = (int)mt_rand($min, $max);
            // randomly use plus or minus operator
            if (($sum > $x) && mt_rand(0, 1)) $x = -$x;
            $sum += $x;
            if (0 < $i) $nums[] = 0 > $x ? '-' : '+';
            $nums[] = abs($x);
            if ($i >= $n_2)
            {
                $str2 .= (0 == $i ? '' : (0 > $x ? '' : '+')) . (string)$x;
            }
            else
            {
                $str1 .= (0 == $i ? '' : (0 > $x ? '' : '+')) . (string)$x;
            }
        }
        $str = $str1 . $str2;

        // compute hmac hash of formula
        $algo = function_exists('hash') ? 'sha256' : 'sha1';
        $this->hmac = hash_hmac($algo, (string)($this->option('secret_salt') ? $this->option('secret_salt') : '') . (string)$sum, $this->option('secret_key'));

        // create captcha image (with some padding)
        $background = (int)$this->option('background');
        $color1 = (int)$this->option('color');
        $color2 = (int)(is_null($this->option('color2')) ? $color1 : $this->option('color2'));
        $font = 5;
        $fw = imagefontwidth($font);
        $fh = imagefontheight($font);
        $w = strlen($str) * $fw + 25;
        $h = $fh + 25;
        $img = imagecreate($w, $h);
        $bg = imagecolorallocate($img, ($background >> 16) & 0xff, ($background >> 8) & 0xff, $background & 0xff);
        $c1 = imagecolorallocate($img, ($color1 >> 16) & 0xff, ($color1 >> 8) & 0xff, $color1 & 0xff);
        $c2 = imagecolorallocate($img, ($color2 >> 16) & 0xff, ($color2 >> 8) & 0xff, $color2 & 0xff);

        // Write the string, with some padding
        // depending on difficulty level
        switch($difficulty)
        {
            case 3: // difficult
                $n = count($nums);
                $sum = 0;
                for ($i=0; $i<$n; ++$i)
                {
                    $str = $nums[$i];
                    imagestring($img, $font, $sum*$fw+12, mt_rand(0, 1) ? 10 : 15, $str, mt_rand(0, 1) ? $c2 : $c1);
                    $sum += strlen($str);
                }
                break;
            case 2: // medium
                $updown = mt_rand(0, 1);
                imagestring($img, $font, 10, $updown ? 15 : 10, $str1, $c1);
                imagestring($img, $font, strlen($str1)*$fw+12, $updown ? 10 : 15, $str2, $c2);
                break;
            case 1: // easy
            default:
                imagestring($img, $font, 10, 10, $str, $c1);
                break;
        }

        ob_start();
        imagepng($img);
        $this->captcha = 'data:image/png;base64,' . base64_encode(ob_get_clean());
        imagedestroy($img);

        return $this;
    }
}
}
