<?php

$img = imagecreatefromjpeg("./tile.jpg");
if ($img)
{
    $width = imagesx($img);
    $height = imagesy($img);
    $size = $width*$height*4;
    $data = array_fill(0, $size, 0);
    for ($i=0,$x=0,$y=0; $i<$size; $i+=4,++$x)
    {
        if ($x >= $width)
        {
            $x = 0;
            ++$y;
        }
        $c = imagecolorat($img, $x, $y);
        $rgba = imagecolorsforindex($img, $c);
        $data[$i + 0] = $rgba['red'];
        $data[$i + 1] = $rgba['green'];
        $data[$i + 2] = $rgba['blue'];
        $data[$i + 3] = $rgba['alpha'];
    }
    echo json_encode(array('image'=>$data,'width'=>$width,'height'=>$height));
}