<?php $this->extend('content.tpl.php'); ?>

<?php $this->start('content'); ?>
<p><b>SimpleCaptcha w/ Tico</b> Index page</p>
<form method="post">
<input id="hash" name="hash" type="hidden" value="<?php echo tico()->get('captcha')->getHash(); ?>" />
<label for="answer">Compute the result <img id="captcha" src="<?php echo tico()->get('captcha')->getCaptcha(); ?>" style="display:inline-block;vertical-align:middle" />:</label><a href="javascript:void()"  style="display:inline-block;vertical-align:middle;font-size:12px" onclick="return refresh()">(refresh)</a>
<input id="answer" name="answer" type="text" value="" placeholder="result" /><?php if (!empty($msg)) { ?><b><?php echo $msg; ?></b><?php } ?>
<button type="submit">Submit</button>
</form>
<script type="text/javascript">
function refresh()
{
    fetch("<?php echo tico()->uri('/captcha-refresh'); ?>")
    .then(res => res.json())
    .then(res => {
        document.getElementById('hash').value = res.hash;
        document.getElementById('captcha').src = res.captcha;
    })
    ;
    return false;
}
</script>
<?php $this->end('content'); ?>
