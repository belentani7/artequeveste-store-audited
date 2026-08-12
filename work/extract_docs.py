from pathlib import Path
from bs4 import BeautifulSoup
import subprocess
import zipfile
import re

src = Path('/home/ubuntu/upload')
out = Path('/home/ubuntu/artequeveste-store/work/doc_extract')
out.mkdir(parents=True, exist_ok=True)

for path in sorted(src.iterdir()):
    if path.suffix.lower() not in {'.docx', '.pdf', '.html'}:
        continue
    target = out / f'{path.stem}.txt'
    if path.suffix.lower() == '.pdf':
        subprocess.run(['pdftotext', '-layout', str(path), str(target)], check=False)
    elif path.suffix.lower() == '.docx':
        try:
            with zipfile.ZipFile(path) as z:
                xml = z.read('word/document.xml').decode('utf-8', errors='ignore')
            xml = re.sub(r'</w:p>', '\n', xml)
            xml = re.sub(r'<[^>]+>', '', xml)
            target.write_text(xml, encoding='utf-8')
        except Exception as exc:
            target.write_text(f'ERROR: {exc}', encoding='utf-8')
    else:
        soup = BeautifulSoup(path.read_text(encoding='utf-8', errors='ignore'), 'html.parser')
        target.write_text(soup.get_text('\n'), encoding='utf-8')
    print(f'{path.name}\t{target}\t{target.stat().st_size} bytes')
