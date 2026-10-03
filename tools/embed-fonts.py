# embed-fonts.py — 게임에 쓰는 글자만 남긴 글꼴을 css/fonts.css 에 base64로 넣는다(인터넷 없이도 글꼴이 보이게, 24단계)
# 실행: pip install fonttools brotli  →  python3 tools/embed-fonts.py
# 글꼴: 갈무리(Galmuri11·Galmuri11 Bold·Galmuri14, OFL, npm 'galmuri' 꾸러미) · Nanum Brush Script · Song Myung(OFL, Google Fonts)
# 새 글자(카드 이름·대사)를 넣으면 다시 실행한다. 빠진 글자는 index.html 의 CDN 글꼴(온라인일 때)이나 시스템 글꼴로 보인다
import base64, glob, io, json, os, re, tarfile, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'}

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()

def charset():
    s = set(chr(c) for c in range(0x20, 0x7f))
    files = glob.glob(os.path.join(ROOT, 'data', '*.js')) + glob.glob(os.path.join(ROOT, 'js', '*.js')) + [os.path.join(ROOT, 'index.html'), os.path.join(ROOT, 'css', 'style.css')]
    for f in files:
        s |= set(c for c in open(f, encoding='utf-8').read() if ord(c) >= 0x20 and c not in '﻿')
    return ''.join(sorted(s))

def ranges(text):
    cps = sorted(set(ord(c) for c in text))
    out, a = [], None
    for i, c in enumerate(cps):
        if a is None: a = c
        if i + 1 == len(cps) or cps[i + 1] != c + 1:
            out.append('U+%X' % a if a == c else 'U+%X-%X' % (a, c))
            a = None
    return ', '.join(out)

def shrink(data, text):
    f = TTFont(io.BytesIO(data))
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']; opt.name_IDs = ['*']; opt.notdef_outline = True
    sub = subset.Subsetter(opt); sub.populate(text=text); sub.subset(f)
    b = io.BytesIO(); f.flavor = 'woff2'; f.save(b)
    return b.getvalue()

def galmuri():
    meta = json.loads(get('https://registry.npmjs.org/galmuri/latest'))
    tar = tarfile.open(fileobj=io.BytesIO(get(meta['dist']['tarball'])))
    pick = lambda name: tar.extractfile('package/dist/' + name).read()
    return meta['version'], [('Galmuri11', 400, pick('Galmuri11.ttf')), ('Galmuri11', 700, pick('Galmuri11-Bold.ttf')), ('Galmuri14', 400, pick('Galmuri14.ttf'))]

def google(family):
    # 브라우저가 아닌 UA 로 물으면 unicode-range 로 쪼개지 않은 TTF 하나를 준다
    css = urllib.request.urlopen(urllib.request.Request('https://fonts.googleapis.com/css2?family=' + family.replace(' ', '+'), headers={'User-Agent': 'Wget/1.0'})).read().decode()
    return get(re.search(r'url\((https://[^)]+)\)', css).group(1))

def card_names():
    # 먹 틀 카드 이름(Nanum Brush Script)에만 쓰는 글자: data/cards.js 의 카드 이름
    src = open(os.path.join(ROOT, 'data', 'cards.js'), encoding='utf-8').read()
    names = re.findall(r"C\('[A-Z]\d+', '([^']+)'", src) + re.findall(r"name:\s*'([^']+)'", src)
    return ''.join(sorted(set(''.join(names)) | set(chr(c) for c in range(0x20, 0x7f))))

def face(family, weight, data, text):
    return ("@font-face { font-family: '%s'; font-style: normal; font-weight: %d; font-display: swap;\n  unicode-range: %s;\n  src: url(data:font/woff2;base64,%s) format('woff2'); }\n"
            % (family, weight, ranges(text), base64.b64encode(data).decode()))

def main():
    text = charset()
    ver, gm = galmuri()
    css = ['/* fonts.css — tools/embed-fonts.py 가 만든다(손으로 고치지 않는다). 갈무리 %s · Nanum Brush Script · Song Myung, 모두 SIL OFL 1.1.\n   게임에 쓰는 글자 %d자만 담았다. unicode-range 밖의 글자는 CDN 글꼴이나 시스템 글꼴로 보인다 */\n' % (ver, len(text))]
    for fam, w, data in gm:
        css.append(face(fam, w, shrink(data, text), text))
    names = card_names()
    css.append(face('Nanum Brush Script', 400, shrink(google('Nanum Brush Script'), names), names))
    digits = '0123456789X+-'   # 비용 보석(Song Myung)
    css.append(face('Song Myung', 400, shrink(google('Song Myung'), digits), digits))
    path = os.path.join(ROOT, 'css', 'fonts.css')
    open(path, 'w', encoding='utf-8').write(''.join(css))
    print('%s: %d KB, 글자 %d자' % (os.path.relpath(path, ROOT), os.path.getsize(path) // 1024, len(text)))

if __name__ == '__main__':
    main()
