# simple-captcha

Simple, image-based, mathematical captcha, with increasing levels of difficulty for PHP, JavaScript, Python

version **2.0.0**

![SimpleCaptcha](/simple-captcha.jpg)

**see also:**

* [ModelView](https://github.com/foo123/modelview.js) a simple, fast, powerful and flexible MVVM framework for JavaScript
* [tico](https://github.com/foo123/tico) a tiny, super-simple MVC framework for PHP
* [LoginManager](https://github.com/foo123/LoginManager) a simple, barebones agnostic login manager for PHP, JavaScript, Python
* [SimpleCaptcha](https://github.com/foo123/simple-captcha) a simple, image-based, mathematical captcha with increasing levels of difficulty for PHP, JavaScript, Python
* [Dromeo](https://github.com/foo123/Dromeo) a flexible, and powerful agnostic router for PHP, JavaScript, Python
* [PublishSubscribe](https://github.com/foo123/PublishSubscribe) a simple and flexible publish-subscribe pattern implementation for PHP, JavaScript, Python
* [Importer](https://github.com/foo123/Importer) simple class &amp; dependency manager and loader for PHP, JavaScript, Python
* [Contemplate](https://github.com/foo123/Contemplate) a fast and versatile isomorphic template engine for PHP, JavaScript, Python
* [HtmlWidget](https://github.com/foo123/HtmlWidget) html widgets, made as simple as possible, both client and server, both desktop and mobile, can be used as (template) plugins and/or standalone for PHP, JavaScript, Python (can be used as [plugins for Contemplate](https://github.com/foo123/Contemplate/blob/master/src/js/plugins/plugins.txt))
* [Paginator](https://github.com/foo123/Paginator)  simple and flexible pagination controls generator for PHP, JavaScript, Python
* [Formal](https://github.com/foo123/Formal) a simple and versatile (Form) Data validation framework based on Rules for PHP, JavaScript, Python
* [Dialect](https://github.com/foo123/Dialect) a cross-vendor &amp; cross-platform SQL Query Builder, based on [GrammarTemplate](https://github.com/foo123/GrammarTemplate), for PHP, JavaScript, Python
* [DialectORM](https://github.com/foo123/DialectORM) an Object-Relational-Mapper (ORM) and Object-Document-Mapper (ODM), based on [Dialect](https://github.com/foo123/Dialect), for PHP, JavaScript, Python
* [Unicache](https://github.com/foo123/Unicache) a simple and flexible agnostic caching framework, supporting various platforms, for PHP, JavaScript, Python
* [Xpresion](https://github.com/foo123/Xpresion) a simple and flexible eXpression parser engine (with custom functions and variables support), based on [GrammarTemplate](https://github.com/foo123/GrammarTemplate), for PHP, JavaScript, Python
* [Regex Analyzer/Composer](https://github.com/foo123/RegexAnalyzer) Regular Expression Analyzer and Composer for PHP, JavaScript, Python


**Example:**

```php
// setup
$captcha = (new SimpleCaptcha())
    ->option('secret_key', 'SECRET_KEY')
    ->option('secret_salt', 'SECRET_SALT_')
    ->option('difficulty', 1) // 1 (easy) to 3 (difficult)
    ->option('has_multiplication', true) // default for difficulty > 1
    ->option('has_division', true) // default for difficulty > 1
    ->option('num_terms', 2) // default
    ->option('min_term', 1)
    ->option('max_term', 21)
    ->option('color', 0x121212) // text color
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