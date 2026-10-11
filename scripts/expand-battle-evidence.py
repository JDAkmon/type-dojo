"""Refresh only the extra species/move evidence needed by offline move battles."""
import json
from pathlib import Path
from urllib.request import urlopen

root = Path(__file__).resolve().parents[1]
path = root / 'assets/data/move-evidence.json'
evidence = json.loads(path.read_text(encoding='utf-8'))
base = 'https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2'
def fetch(kind, ident):
    with urlopen(f'{base}/{kind}/{ident}/index.json', timeout=20) as response:
        return json.load(response)
def generation(value):
    return int(value['url'].rstrip('/').split('/')[-1])

for ident in [10, 21, 98, 231, 246]:
    m = fetch('move', ident)
    evidence['moves'][m['name']] = {
        'id': m['id'], 'type': m['type']['name'], 'power': m['power'],
        'damageClass': m['damage_class']['name'], 'generation': generation(m['generation']),
        'pastTypes': [{'generation': generation(p['generation']), 'type': p['type']['name']} for p in m['past_values'] if p.get('type')],
    }
for ident in [4, 25, 114]:
    p = fetch('pokemon', ident)
    evidence['pokemon'][str(ident)]['moves'] = [
        {'slug': m['move']['name'], 'details': [{'versionGroup': d['version_group']['name'], 'method': d['move_learn_method']['name'], 'level': d['level_learned_at']} for d in m['version_group_details']]}
        for m in p['moves'] if m['move']['name'] in evidence['moves']
    ]
path.write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')
print('Verified extra move data and exact learnsets for Charmander, Pikachu, and Tangela.')
