import os, sys, json

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

tile = json.load(open(DIR+'/../tile.json'))
def tile_pattern(x, y):
    x = x % tile['width']
    y = y % tile['height']
    if 0 > x: x += tile['width']
    if 0 > y: y += tile['height']
    i = (x + y*tile['width']) << 2
    return [tile['image'][i  ], tile['image'][i+1], tile['image'][i+2]]

def test():
    # max_num_terms -1 means constant num_terms
    captcha = SimpleCaptcha().option('secret_key', 'SECRET_KEY').option('secret_salt', 'SECRET_SALT_').option('num_terms', 2).option('max_num_terms', 3).option('min_term', 1).option('max_term', 21).option('color', 0x121212).option('background', 0xffffff)

    captcha.reset()
    captcha.option('difficulty', 2) # difficulty 0 (easy) to 3 (difficult)
    captcha.option('distortion_type', 1) # 1: position distortion
    captcha.option('color', [0xff0000, 0xffff00, 0x0000ff, 0x00ff00]) # text color gradient
    captcha.option('background', tile_pattern) # background color/pattern

    print(captcha.getCaptcha())
    print("\n")
    print(captcha.getHash())

    print("\n")

    captcha.reset()
    captcha.option('difficulty', 2) # difficulty 0 (easy) to 3 (difficult)
    captcha.option('distortion_type', 2) # 2: scale distortion
    captcha.option('color', 0xffffff) # text color
    captcha.option('background', [0xff0000, 0xffff00, 0x00ff00, 0x0000ff]) # background color gradient

    print(captcha.getCaptcha())
    print("\n")
    print(captcha.getHash())


print('SimpleCaptcha.VERSION ' + SimpleCaptcha.VERSION)

test()