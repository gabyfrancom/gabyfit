import os,pathlib,re
d=pathlib.Path('dist')
metadata=(d/'APK-METADATA.txt').read_text()
assert "package: name='com.gabyfit.sync.v2'" in metadata,'Unexpected application ID'
assert "versionCode='5'" in metadata,'Unexpected version'
if os.environ.get('TRUSTED_PUSH')=='true':
    text=(d/'APK-SIGNATURE.txt').read_text()
    match=re.search(r'Signer #1 certificate SHA-256 digest: ([0-9a-fA-F:]+)',text)
    assert match,'Signing certificate missing'
    assert match[1].replace(':','').lower()==os.environ['EXPECTED_CERT_SHA256'],'Signing identity changed'
print('PASS: APK package, version and stable certificate for trusted releases.')
