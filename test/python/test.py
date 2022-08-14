import os, sys

DIR = os.path.dirname(os.path.abspath(__file__))

def import_module(name, path):
    import imp
    try:
        mod_fp, mod_path, mod_desc  = imp.find_module(name, [path])
        mod = getattr( imp.load_module(name, mod_fp, mod_path, mod_desc), name )
    except ImportError as exc:
        mod = None
        sys.stderr.write("Error: failed to import module ({})".format(exc))
    finally:
        if mod_fp: mod_fp.close()
    return mod

# import the SimpleCaptcha.py (as a) module, probably you will want to place this in another dir/package
SimpleCaptcha = import_module('SimpleCaptcha', os.path.join(DIR, '../../src/python/'))
if not SimpleCaptcha:
    print ('Could not load the SimpleCaptcha Module')
    sys.exit(1)
else:
    pass

def test():
    # difficulty 0 (easy) to 3 (difficult)
    # max_num_terms -1 means constant num_terms
    # distortion is image distortion based on difficulty
    captcha = SimpleCaptcha().option('secret_key', 'SECRET_KEY').option('secret_salt', 'SECRET_SALT_').option('difficulty', 2).option('distortion', {'2':4.0}).option('num_terms', 2).option('max_num_terms', 4).option('min_term', 1).option('max_term', 21).option('color', 0x121212).option('background', 0xffffff)

    captcha.reset()

    print(captcha.getCaptcha())
    print("\n")
    print(captcha.getHash())


print('SimpleCaptcha.VERSION ' + SimpleCaptcha.VERSION)

test()