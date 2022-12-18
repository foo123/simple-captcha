##
#   SimpleCaptcha
#   Simple image-based macthematical captcha
#
#   @version 2.5.0
#   https://github.com/foo123/simple-captcha
#
##
import math, random, base64, hmac, hashlib, zlib, struct

class SimpleCaptcha:
    """
    SimpleCaptcha
    https://github.com/foo123/simple-captcha
    """
    VERSION = '2.5.0'

    def __init__(self):
        self.captcha = None
        self.hmac = None
        self.opts = {}
        self.option('secret_key', 'SECRET_KEY')
        self.option('secret_salt', 'SECRET_SALT_')
        self.option('difficulty', 1) # 0 (very easy) to 3 (more difficult)
        self.option('distortion_type', 1) # distortion type: 1: position distortion, 2: scale distortion
        self.option('distortion', None) # distortion amplitudes by difficulty
        self.option('num_terms', 2) # default
        self.option('max_num_terms', -1) # default, same as num_terms
        self.option('min_term', 1) # default
        self.option('max_term', 20) # default
        self.option('has_multiplication', True) # default
        self.option('has_division', True) # default
        self.option('has_equal_sign', True) # default
        self.option('color', 0x121212) # text color
        self.option('background', 0xffffff) # background color

    def option(self, *args):
        nargs = len(args)
        if 1 == nargs:
            key = str(args[0])
            return self.opts[key] if key in self.opts else None
        elif 1 < nargs:
            key = str(args[0])
            val = args[1]
            self.opts[key] = val
        return self

    def getCaptcha(self):
        if not self.captcha: self.generate()
        return self.captcha

    def getHash(self):
        if not self.captcha: self.generate()
        return self.hmac

    def reset(self):
        self.captcha = None
        self.hmac = None
        return self

    def validate(self, answer = None, hmac = None):
        if (answer is None) or (hmac is None): return False
        hash = createHash(str(self.option('secret_key')), str(self.option('secret_salt') if self.option('secret_salt') else '') + str(answer))
        return hash_equals(hash, hmac)

    def generate(self):
        difficulty = min(3, max(0, int(self.option('difficulty'))))
        distortion_type = min(2, max(0, self.option('distortion_type')))
        distortion = self.option('distortion')
        num_terms = max(1, int(self.option('num_terms')))
        max_num_terms = int(self.option('max_num_terms'))
        min_term = max(0, int(self.option('min_term')))
        max_term = max(0, int(self.option('max_term')))
        has_mult = bool(self.option('has_multiplication'))
        has_div = bool(self.option('has_division'))
        has_equal = bool(self.option('has_equal_sign'))
        color = self.option('color')
        background = self.option('background')

        if (not isinstance(color, list)) and (not isinstance(color, dict)): color = [color]
        if (not isinstance(background, list)) and (not isinstance(background, dict)): background = [background]
        if isinstance(color, list): color = list(map(lambda x: int(x), color))
        if isinstance(background, list): background = list(map(lambda x: int(x), background))

        if max_num_terms > num_terms:
            num_terms = rand(num_terms, max_num_terms)

        # generate mathematical formula
        formula, result = self.formula(num_terms, min_term, max_term, has_mult, has_div, has_equal, difficulty)

        # compute hmac of result
        self.hmac = createHash(str(self.option('secret_key')), str(self.option('secret_salt') if self.option('secret_salt') else '') + str(result))

        # create image captcha with formula depending on difficulty
        captcha, width, height = self.image(formula, color, background, difficulty, distortion_type, distortion)

        # output image
        self.captcha = imagepng(captcha, width, height)

        return self

    def formula(self, terms, min, max, has_mult, has_div, has_equal, difficulty):
        # generate mathematical formula
        formula = []
        result = 0
        factor = 0
        divider = 0
        for i in range(terms):
            x = rand(min, max)

            if (result > x) and rand(0, 1):
                # randomly use plus or minus operator
                x = -x
            elif has_mult and (x <= 10) and rand(0, 1):
                # randomly use multiplication factor
                factor = rand(2, 3)
            elif has_div and (0 == x % 2) and rand(0, 1):
                # randomly use division factor
                divider = rand(2, 3) if 0 == x % 3 else 2

            if 0 < factor:
                result += x * factor
                if 0 > x:
                    formula.append('-')
                    formula.extend(split(abs(x)))
                    formula.append('×')
                    formula.extend(split(factor))
                else:
                    if 0 < i: formula.append('+')
                    formula.extend(split(x))
                    formula.append('×')
                    formula.extend(split(factor))

            elif 0 < divider:
                result += math.floor(x / divider)
                if 0 > x:
                    formula.append('-')
                    formula.extend(split(abs(x)))
                    formula.append('÷')
                    formula.extend(split(divider))
                else:
                    if 0 < i: formula.append('+')
                    formula.extend(split(x))
                    formula.append('÷')
                    formula.extend(split(divider))

            else:
                result += x
                if 0 > x:
                    formula.append('-')
                    formula.extend(split(abs(x)))
                else:
                    if 0 < i: formula.append('+')
                    formula.extend(split(x))

            factor = 0
            divider = 0

        if has_equal:
            formula.append('=')
            formula.append('?')

        return (formula, result)

    def image(self, chars, color, background, difficulty, distortion_type, distortion):
        bitmaps = _chars()

        cw = bitmaps['width']
        ch = bitmaps['height']
        n = len(chars)
        space = 1
        x0 = 10
        y0 = 10
        w = n * cw + (n-1) * space + 2 * x0
        h = ch + 2 * y0
        wh = w*h

        # img bitmap
        imgb = [0] * wh
        img = [0] * (wh << 2)
        x1 = 0
        y1 = h/2
        x2 = w-1
        y2 = h/2
        x = 0
        y = 0;
        j = 0;
        for i in range(wh):
            if x >= w:
                x = 0
                y += 1
            c = colorAt(x, y, background, x1, y1, x2, y2)
            j = i << 2;
            img[j + 0] = c[0]
            img[j + 1] = c[1]
            img[j + 2] = c[2]
            img[j + 3] = 255
            x += 1

        # render chars
        for c in chars:
            charbmp = bitmaps['chars'][c]['bitmap']
            x1 = 0
            y1 = rand(0, ch-1)
            x2 = cw-1
            y2 = rand(0, ch-1)
            for x in range(cw):
                for y in range(ch):
                    alpha = charbmp[x + cw*y]
                    if 0 < alpha:
                        imgb[x0+x + w*(y0+y)] = alpha

            x0 += cw + space

        if (0 < difficulty) and (0 < distortion_type):
            if 2 == distortion_type:
                # create scale-distorted image data based on difficulty level
                phase = float(rand(0, 2)) * 3.14 / 2.0
                amplitude = float(distortion[str(difficulty)]) if isinstance(distortion, dict) and (str(difficulty) in distortion) else (0.5 if 3 == difficulty else (0.25 if 2 == difficulty else 0.15))
                x0 = max(0, round((w - n*(1.0+amplitude)*cw - (n-1)*space) / 2))
                for k in range(n):
                    scale = (1.0 + amplitude * math.sin(phase + 6.28 * 2 * k / n))
                    sw = min(w, round(scale * cw))
                    sh = min(h, round(scale * ch))
                    y0 = max(0, round((h - sh) / 2))
                    x1 = 0
                    y1 = sh/2
                    x2 = sw
                    y2 = sh/2
                    for ys in range(sh):
                        y = max(0, min(h-1, round(10 + ys / scale)))
                        for xs in range(sw):
                            x = max(0, min(w-1, round(10 + k*(cw+space) + xs / scale)))
                            alpha = imgb[x + y*w]
                            if 0 < alpha:
                                alpha /= 255.0
                                c = colorAt(xs, ys, color, x1, y1, x2, y2)
                                j = ((x0+xs + (y0+ys)*w) << 2)
                                img[j  ] = clamp(img[j  ]*(1-alpha) + alpha*c[0])
                                img[j+1] = clamp(img[j+1]*(1-alpha) + alpha*c[1])
                                img[j+2] = clamp(img[j+2]*(1-alpha) + alpha*c[2])
                    x0 += space + sw
            else:
                # create position-distorted image data based on difficulty level
                phase = float(rand(0, 2)) * 3.14 / 2.0
                amplitude = float(distortion[str(difficulty)]) if isinstance(distortion, dict) and (str(difficulty) in distortion) else (5.0 if 3 == difficulty else (3.0 if 2 == difficulty else 1.5))
                yw = 0
                x1 = 0
                y1 = ch/2
                x2 = cw
                y2 = ch/2
                for y in range(h):
                    y0 = y
                    for x in range(w):
                        x0 = x
                        y0 = max(0, min(h-1, round(y + amplitude * math.sin(phase + 6.28 * 2.0 * x / w))))
                        alpha = imgb[x0 + y0*w]
                        if 0 < alpha:
                            alpha /= 255.0
                            xc = x - 10 + space - math.floor((x - 10 + space)/(cw + space))*(cw + space)
                            yc = y - 10
                            c = colorAt(xc, yc, color, x1, y1, x2, y2)
                            j = ((x + yw) << 2)
                            img[j  ] = clamp(img[j  ]*(1-alpha) + alpha*c[0])
                            img[j+1] = clamp(img[j+1]*(1-alpha) + alpha*c[1])
                            img[j+2] = clamp(img[j+2]*(1-alpha) + alpha*c[2])
                    yw += w
        else:
            # create non-distorted image data
            x1 = 0
            y1 = ch/2
            x2 = cw
            y2 = ch/2
            yw = 0
            for y in range(h):
                for x in range(w):
                    i = x + yw
                    alpha = imgb[i]
                    if 0 < alpha:
                        alpha /= 255.0
                        # x = x0 + i*cw + (i-1)*space + xc
                        # xc = x - x0 + space - i*(cw + space)
                        xc = x - 10 + space - math.floor((x - 10 + space)/(cw + space))*(cw + space)
                        yc = y - 10
                        c = colorAt(xc, yc, color, x1, y1, x2, y2)
                        j = (i << 2)
                        img[j  ] = clamp(img[j  ]*(1-alpha) + alpha*c[0])
                        img[j+1] = clamp(img[j+1]*(1-alpha) + alpha*c[1])
                        img[j+2] = clamp(img[j+2]*(1-alpha) + alpha*c[2])
                yw += w

        # free memory
        bitmaps = None
        imgb = None

        return (img, w, h)


def rand(m, M):
    return random.randrange(m, M+1)

def split(s):
    return [c for c in str(s)]

def hash_equals(h1, h2):
    n1 = len(h1)
    n2 = len(h2)
    n = max(n1, n2)
    res = True
    for i in range(n):
        if i >= n1:
            res = res and False
        elif i >= n2:
            res = res and False
        else:
            res = res and (h1[i] == h2[i])
    return res

def createHash(key, data):
    return str(hmac.new(bytes(str(key), 'utf-8'), msg=bytes(str(data), 'utf-8'), digestmod=hashlib.sha256).hexdigest())

def imagepng(img, width, height, metaData=dict()):
    return 'data:image/png;base64,' + base64.b64encode(PNGPacker(metaData).toPNG(img, width, height)).decode("ascii")

def colorAt(x, y, colors, x1, y1, x2, y2):
    if isinstance(colors, dict) and ('image' in colors) and ('width' in colors) and ('height' in colors):
        return patternAt(x, y, colors)
    # linear gradient interpolation between colors
    dx = x2 - x1
    dy = y2 - y1
    vert = 0 == dx
    hor = 0 == dy
    f = 2*dx*dy
    l = len(colors) - 1
    px = x - x1
    py = y - y1
    t = 0 if hor and vert else (py/dy if vert else (px/dx if hor else (px*dy + py*dx)/f))
    if 0 >= t:
        c0 = c1 = 0
        t = 0
    elif 1 <= t:
        c0 = c1 = l
        t = 1
    else:
        c0 = math.floor(l*t)
        c1 = c0 if l == c0 else (c0 + 1)
    rgb0 = colors[c0]
    rgb1 = colors[c1]
    t = (l*t - c0)/(c1 - c0) if c1 > c0 else t
    return [
    clamp((1-t)*((rgb0 >> 16) & 255) + t*((rgb1 >> 16) & 255)),
    clamp((1-t)*((rgb0 >> 8) & 255) + t*((rgb1 >> 8) & 255)),
    clamp((1-t)*((rgb0) & 255) + t*((rgb1) & 255))
    ]

def patternAt(x, y, pattern):
    x = round(x) % pattern['width']
    y = round(y) % pattern['height']
    if 0 > x: x += pattern['width']
    if 0 > y: y += pattern['height']
    i = (x + y*pattern['width']) << 2
    return [
    pattern['image'][i + 0],
    pattern['image'][i + 1],
    pattern['image'][i + 2]
    ]

def _chars():
    return {
        "fontSize": 20,
        "width": 12,
        "height": 15,
        "chars": {
            "0": {
                "width": 12,
                "height": 15,
                "bitmap": [
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    255,
                    0,
                    0,
                    0,
                    222,
                    255,
                    139,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    48,
                    255,
                    182,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    94,
                    255,
                    255,
                    0,
                    0,
                    0,
                    222,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "1": {
                "width": 12,
                "height": 15,
                "bitmap": [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    255,
                    222,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    48,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "2": {
                "width": 12,
                "height": 15,
                "bitmap": [
                    0,
                    0,
                    0,
                    255,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    139,
                    0,
                    0,
                    0,
                    222,
                    255,
                    139,
                    0,
                    0,
                    0,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    94,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    94,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0
                ]
            },
            "3": {
                "width": 12,
                "height": 15,
                "bitmap": [
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    182,
                    0,
                    0,
                    0,
                    255,
                    255,
                    48,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    94,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    182,
                    255,
                    139,
                    0,
                    0,
                    0,
                    139,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "4": {
                "width": 12,
                "height": 15,
                "bitmap": [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    182,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    182,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    48,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    139,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    222,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    48,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    48,
                    255,
                    139,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    139,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    48,
                    0,
                    139,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0
                ]
            },
            "5": {
                "width": 12,
                "height": 15,
                "bitmap": [
                    0,
                    0,
                    94,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    222,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    94,
                    255,
                    255,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    139,
                    0,
                    0,
                    0,
                    94,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    182,
                    255,
                    139,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "6": {
                "width": 12,
                "height": 15,
                "bitmap": [
                    0,
                    0,
                    0,
                    94,
                    255,
                    255,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    182,
                    0,
                    0,
                    0,
                    182,
                    255,
                    139,
                    0,
                    0,
                    0,
                    222,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    139,
                    0,
                    255,
                    255,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    222,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    94,
                    255,
                    255,
                    222,
                    0,
                    0,
                    0,
                    139,
                    255,
                    182,
                    0,
                    0,
                    94,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    94,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    48,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    255,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    139,
                    255,
                    222,
                    0,
                    0,
                    0,
                    139,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "7": {
                "width": 12,
                "height": 15,
                "bitmap": [
                    0,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    48,
                    0,
                    0,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    94,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "8": {
                "width": 12,
                "height": 15,
                "bitmap": [
                    0,
                    0,
                    0,
                    182,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    182,
                    0,
                    0,
                    0,
                    182,
                    255,
                    139,
                    0,
                    0,
                    0,
                    139,
                    255,
                    94,
                    0,
                    0,
                    0,
                    48,
                    255,
                    182,
                    0,
                    0,
                    0,
                    139,
                    255,
                    94,
                    0,
                    0,
                    0,
                    48,
                    255,
                    182,
                    0,
                    0,
                    0,
                    48,
                    255,
                    182,
                    0,
                    0,
                    0,
                    139,
                    255,
                    94,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    255,
                    255,
                    255,
                    255,
                    94,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    255,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    139,
                    0,
                    0,
                    0,
                    94,
                    255,
                    182,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    48,
                    0,
                    0,
                    182,
                    255,
                    139,
                    0,
                    0,
                    0,
                    94,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    255,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "9": {
                "width": 12,
                "height": 15,
                "bitmap": [
                    0,
                    0,
                    0,
                    182,
                    255,
                    255,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    182,
                    0,
                    0,
                    0,
                    139,
                    255,
                    94,
                    0,
                    0,
                    0,
                    222,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    222,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    48,
                    0,
                    0,
                    182,
                    255,
                    182,
                    0,
                    0,
                    0,
                    182,
                    255,
                    255,
                    48,
                    0,
                    0,
                    0,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    222,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    0,
                    182,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    222,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    48,
                    255,
                    182,
                    0,
                    0,
                    0,
                    139,
                    255,
                    222,
                    0,
                    0,
                    0,
                    222,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    94,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "+": {
                "width": 12,
                "height": 10,
                "bitmap": [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "-": {
                "width": 7,
                "height": 2,
                "bitmap": [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "×": {
                "width": 12,
                "height": 9,
                "bitmap": [
                    0,
                    0,
                    222,
                    48,
                    0,
                    0,
                    0,
                    0,
                    182,
                    94,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    48,
                    0,
                    0,
                    139,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    0,
                    139,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    94,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    255,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    0,
                    139,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    48,
                    0,
                    0,
                    139,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    222,
                    48,
                    0,
                    0,
                    0,
                    0,
                    182,
                    94,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "÷": {
                "width": 11,
                "height": 8,
                "bitmap": [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    182,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "=": {
                "width": 12,
                "height": 6,
                "bitmap": [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    139,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    139,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    139,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ]
            },
            "?": {
                "width": 12,
                "height": 15,
                "bitmap": [
                    0,
                    0,
                    0,
                    222,
                    255,
                    255,
                    255,
                    255,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    255,
                    94,
                    0,
                    0,
                    0,
                    182,
                    255,
                    182,
                    0,
                    0,
                    0,
                    139,
                    255,
                    255,
                    0,
                    0,
                    0,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    48,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    182,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    182,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    48,
                    255,
                    222,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    94,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    94,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    94,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    139,
                    255,
                    94,
                    0,
                    0,
                    0,
                    0,
                    0
                ]
            }
        }
    }



# PNG utilities
PNG_SIGNATURE = b"\x89\x50\x4e\x47\x0d\x0a\x1a\x0a"

# color-type bits
COLORTYPE_GRAYSCALE = 0
COLORTYPE_PALETTE = 1
COLORTYPE_COLOR = 2
COLORTYPE_ALPHA = 4 # e.g. grayscale and alpha

# color-type combinations
COLORTYPE_PALETTE_COLOR = 3
COLORTYPE_COLOR_ALPHA = 6

COLORTYPE_TO_BPP_MAP = {
    '0': 1,
    '2': 3,
    '3': 1,
    '4': 2,
    '6': 4
}

GAMMA_DIVISION = 100000

def clamp(value):
    return max(0, min(255, round(value)))

def paethPredictor(left, above, upLeft):
    paeth = left + above - upLeft
    pLeft = abs(paeth - left)
    pAbove = abs(paeth - above)
    pUpLeft = abs(paeth - upLeft)

    if pLeft <= pAbove and pLeft <= pUpLeft: return left
    if pAbove <= pUpLeft: return above
    return upLeft

def filterNone(pxData, pxPos, byteWidth, rawData, rawPos, bpp):
    rawData[rawPos:rawPos+byteWidth] = pxData[pxPos:pxPos+byteWidth]

def filterSumNone(pxData, pxPos, byteWidth, bpp):
    sum = 0
    for i in range(pxPos, pxPos + byteWidth):
        sum += abs(pxData[i])
    return sum

def filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp):
    for x in range(byteWidth):
        left = pxData[pxPos + x - bpp] if x >= bpp else 0
        val = pxData[pxPos + x] - left
        rawData[rawPos + x] = ubyte(val)

def filterSumSub(pxData, pxPos, byteWidth, bpp):
    sum = 0
    for x in range(byteWidth):
        left = pxData[pxPos + x - bpp] if x >= bpp else 0
        val = pxData[pxPos + x] - left
        sum += abs(val)
    return sum

def filterUp(pxData, pxPos, byteWidth, rawData, rawPos, bpp):
    for x in range(byteWidth):
        up = pxData[pxPos + x - byteWidth] if pxPos > 0 else 0
        val = pxData[pxPos + x] - up
        rawData[rawPos + x] = ubyte(val)

def filterSumUp(pxData, pxPos, byteWidth, bpp):
    sum = 0
    for x in range(pxPos, pxPos + byteWidth):
        up = pxData[x - byteWidth] if pxPos > 0 else 0
        val = pxData[x] - up
        sum += abs(val)
    return sum

def filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp):
    for x in range(byteWidth):
        left = pxData[pxPos + x - bpp] if x >= bpp else 0
        up = pxData[pxPos + x - byteWidth] if pxPos > 0 else 0
        val = pxData[pxPos + x] - ((left + up) >> 1)
        rawData[rawPos + x] = ubyte(val)

def filterSumAvg(pxData, pxPos, byteWidth, bpp):
    sum = 0
    for x in range(byteWidth):
        left = pxData[pxPos + x - bpp] if x >= bpp else 0
        up = pxData[pxPos + x - byteWidth] if pxPos > 0 else 0
        val = pxData[pxPos + x] - ((left + up) >> 1)
        sum += abs(val)
    return sum

def filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp):
    for x in range(byteWidth):
        left = pxData[pxPos + x - bpp] if x >= bpp else 0
        up = pxData[pxPos + x - byteWidth] if pxPos > 0 else 0
        upleft = pxData[pxPos + x - (byteWidth + bpp)] if pxPos > 0 and x >= bpp else 0
        val = pxData[pxPos + x] - paethPredictor(left, up, upleft)
        rawData[rawPos + x] = ubyte(val)

def filterSumPaeth(pxData, pxPos, byteWidth, bpp):
    sum = 0
    for x in range(byteWidth):
        left = pxData[pxPos + x - bpp] if x >= bpp else 0
        up = pxData[pxPos + x - byteWidth] if pxPos > 0 else 0
        upleft = pxData[pxPos + x - (byteWidth + bpp)] if pxPos > 0 and x >= bpp else 0
        val = pxData[pxPos + x] - paethPredictor(left, up, upleft)
        sum += abs(val)
    return sum


def deflate(data, compressionLevel=-1, chunkSize=None):
    #chunkSize = 16*1024 if chunkSize is None else chunkSize
    compressor = zlib.compressobj(level=compressionLevel)
    zdata = compressor.compress(data)
    zdata += compressor.flush()
    return zdata

def crc32(data):
    return zlib.crc32(data)

def ubyte(value):
    return value & 255

def I1(value):
    return struct.pack('!B', value & 255)

def I4(value):
    return struct.pack('!I', value & 0xffffffff)

def i4(value):
    return struct.pack('!i', value)

class PNGPacker:
    def __init__(self, options=dict()):
        options['deflateChunkSize'] = max(1024, int(options['deflateChunkSize'] if ('deflateChunkSize' in options) else 32 * 1024))
        options['deflateLevel'] = min(9, max(0, int(options['deflateLevel'] if ('deflateLevel' in options) else 9)))
        options['deflateStrategy'] = min(3, max(0, int(options['deflateStrategy'] if ('deflateStrategy' in options) else 3)))
        options['inputHasAlpha'] = bool(options['inputHasAlpha'] if ('inputHasAlpha' in options) else True)
        options['bitDepth'] = 8 #int(options['bitDepth'] if 'bitDepth' in options else 8)
        options['colorType'] = min(6, max(0, int(options['colorType'] if ('colorType' in options) else COLORTYPE_COLOR_ALPHA)))

        if (options['colorType'] != COLORTYPE_COLOR) and (options['colorType'] != COLORTYPE_COLOR_ALPHA):
            raise Exception('option color type:' + str(options['colorType']) + ' is not supported at present')

       #if options['bitDepth'] != 8:
       #    raise Exception('option bit depth:' + str(options['bitDepth']) + ' is not supported at present')
        self._options = options

    def toPNG(self, data, width, height):
        # Signature
        png = PNG_SIGNATURE

        # Header
        png += self.packIHDR(width, height)

        # gAMA
        if 'gamma' in self._options:
            png += self.packGAMA(self._options['gamma'])

        # filter data
        filteredData = self.filterData(data, width, height)

        # compress data
        deflateOpts = self.getDeflateOptions()
        compressedData = deflate(bytes(filteredData), deflateOpts['level'], deflateOpts['chunkSize'])
        filteredData = None

        # Data
        png += self.packIDAT(compressedData)
        compressedData = None

        # End
        png += self.packIEND()

        return png

    def getDeflateOptions(self):
        return {
            'chunkSize': self._options['deflateChunkSize'],
            'level': self._options['deflateLevel'],
            'strategy': self._options['deflateStrategy']
        }

    def filterData(self, data, width, height):
        # convert to correct format for filtering (e.g. right bpp and bit depth)
        # and filter pixel data
        return self._filter(self._bitPack(data, width, height), width, height)

    def packIHDR(self, width, height):
        IHDR = I4(width) + I4(height)
        IHDR += I1(self._options['bitDepth']) # bit depth
        IHDR += I1(self._options['colorType']) # color type
        IHDR += I1(0) # compression
        IHDR += I1(0) # filter
        IHDR += I1(0) # interlace
        return self._packChunk('IHDR', IHDR)

    def packGAMA(self, gamma):
        return self._packChunk('gAMA', I4(math.floor(float(gamma) * GAMMA_DIVISION)))

    def packIDAT(self, data):
        return self._packChunk('IDAT', data)

    def packIEND(self):
        return self._packChunk('IEND', None)

    def _bitPack(self, data, width, height):
        outHasAlpha = ('colorType' in self._options) and self._options['colorType'] == COLORTYPE_COLOR_ALPHA
        inputHasAlpha = ('inputHasAlpha' in self._options) and bool(self._options['inputHasAlpha'])

        if inputHasAlpha and outHasAlpha: return data
        if (not inputHasAlpha) and (not outHasAlpha): return data

        outBpp = 4 if outHasAlpha else 3
        outData = [0] * (width * height * outBpp)
        inBpp = 4 if inputHasAlpha else 3
        inIndex = 0
        outIndex = 0

        bgColor = self._options['bgColor'] if 'bgColor' in self._options else {}
        bgRed = clamp(bgColor['red'] if 'red' in bgColor else 255)
        bgGreen = clamp(bgColor['green'] if 'green' in bgColor else 255)
        bgBlue = clamp(bgColor['blue'] if 'blue' in bgColor else 255)

        for y in range(height):
            for x in range(width):
                red = data[inIndex]
                green = data[inIndex + 1]
                blue = data[inIndex + 2]

                if inputHasAlpha:
                    alpha = data[inIndex + 3]
                    if not outHasAlpha:
                        alpha = float(alpha) / 255.0
                        red = (1 - alpha) * bgRed + alpha * red
                        green = (1 - alpha) * bgGreen + alpha * green
                        blue = (1 - alpha) * bgBlue + alpha * blue
                else:
                    alpha = 255

                outData[outIndex] = clamp(red)
                outData[outIndex + 1] = clamp(green)
                outData[outIndex + 2] = clamp(blue)
                if outHasAlpha: outData[outIndex + 3] = clamp(alpha)

                inIndex += inBpp
                outIndex += outBpp

        return outData

    def _filter(self, pxData, width, height):
        filters = [
          filterNone,
          filterSub,
          filterUp,
          filterAvg,
          filterPaeth
        ]

        filterSums = [
          filterSumNone,
          filterSumSub,
          filterSumUp,
          filterSumAvg,
          filterSumPaeth
        ]

        filterTypes = [0] # make it default

        #if (not 'filterType' in self._options) or (self._options['filterType'] == -1):
        #    filterTypes = [0, 1, 2, 3, 4]
        #elif int(self._options['filterType']) == self._options['filterType']:
        #    filterTypes = [self._options['filterType']]
        #else:
        #    raise Exception('unrecognised filter types')

        bpp = COLORTYPE_TO_BPP_MAP[str(self._options['colorType'])]
        byteWidth = width * bpp
        rawPos = 0
        pxPos = 0
        rawData = [0] * ((byteWidth + 1) * height)
        sel = filterTypes[0]
        n = len(filterTypes)

        for y in range(height):
            if n > 1:
                # find best filter for this line (with lowest sum of values)
                min = math.inf
                for i in range(n):
                    sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp)
                    if sum < min:
                        sel = filterTypes[i]
                        min = sum

            rawData[rawPos] = sel
            rawPos += 1
            filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp)
            rawPos += byteWidth
            pxPos += byteWidth
        return rawData

    def _packChunk(self, type, data = None):
        block = str(type).encode('ascii')
        length = 0
        if data is not None:
            if isinstance(data, list): data = bytes(data)
            length = len(data)
            block += data
        return I4(length) + block + I4(crc32(block))


__all__ = ['SimpleCaptcha']