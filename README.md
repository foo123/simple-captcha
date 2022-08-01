# simple-captcha

Simple, image-based, mathematical captcha, with increasing levels of difficulty

version **1.1.0**

![SimpleCaptcha](/simple-captcha.jpg)


**Example:**

```php
// setup
$captcha = (new SimpleCaptcha())
    ->option('secret_key', 'SECRET_KEY')
    ->option('secret_salt', 'SECRET_SALT_')
    ->option('difficulty', 1) // 1 (easy) to 3 (difficult)
    ->option('num_terms', 2)
    ->option('min_term', 1)
    ->option('max_term', 21)
    ->option('color', 0x121212) // text color
    ->option('color2', 0x717171) // secondary text color
    ->option('background', 0xffffff) // background color
    ->reset()
;
```

```html
<!-- use it -->

<form action="/validate" method="post">
<!-- you can store the captcha hash in the $_SESSION or in $_COOKIE as well -->
<input type="hidden" name="hash" value="<?php echo $captcha->getHash(); ?>" />
Compute result <img src="<?php echo $captcha->getCaptcha(); ?>" /> <input type="text" name="answer" value="" />
<button type="submit">Submit</button>
</form>
```

```php
// use it
$app->on('/validate', function() use ($captcha) {
    // you can store the captcha hash in the $_SESSION or in $_COOKIE as well
    if ($captcha->validate($_POST['answer'], $_POST['hash']))
    {
    // correct captcha
    }
    else
    {
    // wrong captcha
    }
});
```