# simple-captcha

Simple, image-based, mathematical captcha

version **1.0.0**

![SimpleCaptcha](/simple-captcha.jpg)


**Example:**

```php
// setup
$captcha = return (new SimpleCaptcha())
    ->option('secret_key', 'SECRET_KEY')
    ->option('secret_salt', 'SECRET_SALT_')
    ->option('num_terms', 2)
    ->option('min_term', 1)
    ->option('max_term', 21)
;
```

```html
<!-- use it -->

<form action="/validate" method="post">
<input type="hidden" name="hash" value="<?php echo $captcha->getHash(); ?>" />
Compute result <img src="<?php echo $captcha->getCaptcha(); ?>" /> <input type="text" name="answer" value="" />
<button type="submit">Submit</button>
</form>
```

```php
// use it
$app->on('/validate', function() use ($captcha) {
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